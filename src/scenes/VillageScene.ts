import Phaser from 'phaser';
import { BEGINNERS_VILLAGE, type MapDefinition } from '../world';
import { BUILDING_REGISTRY, HUNTING_ZONE_REGISTRY } from '../world';
import { checkZoneAccess } from '../world/zoneAccess';
import type { BuildingDefinition } from '../world/BuildingDefinition';
import { calculateMovementVelocity, DEFAULT_MOVE_SPEED } from '../player';
import { PhaserInputAdapter } from '../player/movement/PhaserInputAdapter';
import { ZoneWarningModal } from '../ui/zone-warning';
import '../ui/zone-warning/zone-warning.css';

// Landmark IDs that correspond to interactable buildings
const BUILDING_LANDMARK_IDS = new Set([
  'math-building',
  'library',
  'science-lab',
  'tech-workshop',
]);

// Maps map landmark ID → BuildingDefinition ID
const LANDMARK_TO_BUILDING_ID: Record<string, string> = {
  'math-building': 'math-building',
  'library': 'general-knowledge-library',
  'science-lab': 'science-laboratory',
  'tech-workshop': 'technology-workshop',
};

// Player must be within this many pixels (Chebyshev) to interact
const INTERACTION_RANGE = 80;

// Danger delta threshold for mandatory warning
const PLAYER_TEST_LEVEL = 1; // placeholder: replaced by real PlayerData in Phase 17

export interface SceneTransitionData {
  spawnPosition?: { x: number; y: number };
}

export class VillageScene extends Phaser.Scene {
  static readonly KEY = 'VillageScene';

  private mapData: MapDefinition = BEGINNERS_VILLAGE;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private inputAdapter!: PhaserInputAdapter;
  private spawnPosition: { x: number; y: number } = { x: 600, y: 550 };
  private isTransitioning = false;
  private zoneWarningModal: ZoneWarningModal = new ZoneWarningModal();

  // Interaction prompt
  private interactPrompt!: Phaser.GameObjects.Text;
  private nearbyBuilding: BuildingDefinition | null = null;

  constructor() {
    super({ key: VillageScene.KEY });
  }

  init(data?: SceneTransitionData): void {
    this.isTransitioning = false;
    this.nearbyBuilding = null;
    if (data?.spawnPosition) {
      this.spawnPosition = { ...data.spawnPosition };
    } else {
      this.spawnPosition = { x: 600, y: 550 };
    }
  }

  create(): void {
    const { width, height } = this.mapData.bounds;

    this.physics.world.setBounds(0, 0, width, height);

    // ── Background ──────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x234428, 1);
    bg.fillRect(0, 0, width, height);
    bg.lineStyle(1, 0x1b3720, 0.4);
    for (let x = 0; x < width; x += 64) bg.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 64) bg.lineBetween(0, y, width, y);

    // Roads and plaza
    bg.fillStyle(0x756b53, 0.85);
    bg.fillCircle(600, 400, 140);
    bg.fillRect(560, 400, 80, 400);
    bg.fillRect(160, 360, 800, 80);

    // ── Obstacles & Landmarks ────────────────────────────────────
    this.obstacles = this.physics.add.staticGroup();
    this.createLandmarks();

    // ── Player ───────────────────────────────────────────────────
    this.createPlayer();

    // ── Zone exits (village gate to hunting ground) ──────────────
    this.createExits();

    // ── Input ────────────────────────────────────────────────────
    this.inputAdapter = new PhaserInputAdapter(this);

    // ── Camera ───────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // ── Interaction prompt (hidden by default) ────────────────────
    this.interactPrompt = this.add.text(0, 0, '', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 5 },
    }).setDepth(10).setVisible(false);

    // ── HUD ──────────────────────────────────────────────────────
    this.add.text(16, 16,
      `${this.mapData.name} (Lv. ${this.mapData.entryRequirements.recommendedMinLevel}–${this.mapData.entryRequirements.recommendedMaxLevel})`,
      { fontFamily: 'Arial', fontSize: '16px', color: '#f0c060', backgroundColor: '#111827dd', padding: { x: 8, y: 4 } },
    ).setScrollFactor(0);

    this.add.text(16, 46, 'Move: WASD / Arrow Keys  |  Approach buildings to interact', {
      fontFamily: 'Arial', fontSize: '12px', color: '#9ca3af',
      backgroundColor: '#111827aa', padding: { x: 6, y: 2 },
    }).setScrollFactor(0);

    // ── Interact key (Space / Enter) ─────────────────────────────
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.attemptInteract());
      this.input.keyboard.on('keydown-ENTER', () => this.attemptInteract());
    }
  }

  update(): void {
    if (this.isTransitioning || !this.player?.body) return;

    const inputState = this.inputAdapter.getInputState();
    const velocity = calculateMovementVelocity(inputState, DEFAULT_MOVE_SPEED);
    this.player.setVelocity(velocity.vx, velocity.vy);

    this.checkBuildingProximity();
  }

  // ── Landmark creation ──────────────────────────────────────────
  private createLandmarks(): void {
    for (const landmark of this.mapData.landmarks) {
      const { x, y } = landmark.position;
      const { width, height, color, name } = landmark;

      const gfx = this.add.graphics();
      gfx.fillStyle(color, 1);
      gfx.fillRect(x - width / 2, y - height / 2, width, height);
      gfx.lineStyle(2, 0xffffff, 0.4);
      gfx.strokeRect(x - width / 2, y - height / 2, width, height);

      // Building label
      const isBuildingLandmark = BUILDING_LANDMARK_IDS.has(landmark.id);
      this.add.text(x, y - height / 2 - 14, name, {
        fontFamily: 'Arial', fontSize: '11px', color: '#ffffff',
        backgroundColor: isBuildingLandmark ? '#3b1d0888' : '#00000088',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      if (isBuildingLandmark) {
        // "Press SPACE" hint label under buildings
        this.add.text(x, y + height / 2 + 10, '[SPACE] Enter', {
          fontFamily: 'Arial', fontSize: '10px', color: '#fcd34d',
          backgroundColor: '#00000088', padding: { x: 3, y: 1 },
        }).setOrigin(0.5);
      }

      // Static physics body
      const body = this.add.rectangle(x, y, width, height);
      this.physics.add.existing(body, true);
      this.obstacles.add(body);
    }
  }

  // ── Player creation ────────────────────────────────────────────
  private createPlayer(): void {
    if (!this.textures.exists('player-placeholder')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x3b82f6, 1);
      g.fillRect(0, 0, 28, 36);
      g.fillStyle(0xfde047, 1);
      g.fillRect(4, 4, 20, 12);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeRect(0, 0, 28, 36);
      g.generateTexture('player-placeholder', 28, 36);
      g.destroy();
    }

    this.player = this.physics.add.sprite(
      this.spawnPosition.x,
      this.spawnPosition.y,
      'player-placeholder',
    );
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(24, 28);
    this.player.body.setOffset(2, 6);
    this.physics.add.collider(this.player, this.obstacles);
  }

  // ── Exit gateway (village → hunting ground) ────────────────────
  private createExits(): void {
    for (const conn of this.mapData.connections) {
      const { x, y } = conn.exitPosition;
      const { exitWidth, exitHeight, targetMapId, entryPosition } = conn;

      const exitGfx = this.add.graphics();
      exitGfx.fillStyle(0xf59e0b, 0.4);
      exitGfx.fillRect(x - exitWidth / 2, y - exitHeight / 2, exitWidth, exitHeight);
      exitGfx.lineStyle(2, 0xf59e0b, 0.9);
      exitGfx.strokeRect(x - exitWidth / 2, y - exitHeight / 2, exitWidth, exitHeight);

      this.add.text(x, y - exitHeight / 2 - 14, 'To Hunting Ground →', {
        fontFamily: 'Arial', fontSize: '11px', color: '#fbbf24',
        backgroundColor: '#000000aa', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      const zone = this.add.zone(x, y, exitWidth, exitHeight);
      this.physics.add.existing(zone, true);

      this.physics.add.overlap(this.player, zone, () => {
        // General hunting ground — use risk check
        this.initiateZoneEntry(targetMapId, entryPosition, 'beginners-hunting-ground');
      });
    }
  }

  // ── Building proximity check ───────────────────────────────────
  private checkBuildingProximity(): void {
    const px = this.player.x;
    const py = this.player.y;

    let nearest: BuildingDefinition | null = null;
    let nearestDist = Infinity;

    for (const landmark of this.mapData.landmarks) {
      if (!BUILDING_LANDMARK_IDS.has(landmark.id)) continue;
      const bldId = LANDMARK_TO_BUILDING_ID[landmark.id];
      const bld = BUILDING_REGISTRY[bldId];
      if (!bld) continue;

      const dx = Math.abs(px - landmark.position.x);
      const dy = Math.abs(py - landmark.position.y);
      const chebyshev = Math.max(dx, dy);
      if (chebyshev < INTERACTION_RANGE && chebyshev < nearestDist) {
        nearestDist = chebyshev;
        nearest = bld;
      }
    }

    this.nearbyBuilding = nearest;

    if (nearest) {
      this.interactPrompt
        .setText(`${nearest.name}\n[SPACE / ENTER] Enter`)
        .setPosition(this.player.x - 60, this.player.y - 80)
        .setVisible(true);
    } else {
      this.interactPrompt.setVisible(false);
    }
  }

  // ── Interaction handler ────────────────────────────────────────
  private attemptInteract(): void {
    if (this.isTransitioning || !this.nearbyBuilding) return;

    const building = this.nearbyBuilding;
    const zoneId = building.huntingZoneIds[0];
    if (!zoneId) return;

    const huntingZone = HUNTING_ZONE_REGISTRY[zoneId];
    if (!huntingZone) return;

    this.initiateZoneEntry(zoneId, { x: 300, y: 300 }, zoneId, building.name);
  }

  // ── Zone entry with optional risk warning ─────────────────────
  private initiateZoneEntry(
    targetMapId: string,
    entryPosition: { x: number; y: number },
    huntingZoneId: string,
    zoneName?: string,
  ): void {
    if (this.isTransitioning) return;

    const huntingZone = HUNTING_ZONE_REGISTRY[huntingZoneId];
    if (!huntingZone) {
      this.doTransition(targetMapId, entryPosition);
      return;
    }

    const displayName = zoneName ?? huntingZone.name;
    const check = checkZoneAccess(
      PLAYER_TEST_LEVEL,
      huntingZone.averageMonsterLevel,
      displayName,
      huntingZone.recommendedMinLevel,
    );

    if (check.isDangerous) {
      // Stop player movement during modal
      this.player.setVelocity(0, 0);

      this.zoneWarningModal.show(check, displayName, (confirmed) => {
        if (confirmed) {
          this.doTransition(targetMapId, entryPosition);
        }
        // If cancelled, player retains control — no forced block
      });
    } else {
      this.doTransition(targetMapId, entryPosition);
    }
  }

  private doTransition(targetMapId: string, entryPosition: { x: number; y: number }): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.player.setVelocity(0, 0);

    this.cameras.main.fade(300, 10, 10, 15, false, (_camera: unknown, progress: number) => {
      if (progress === 1) {
        this.scene.start('HuntingScene', { spawnPosition: entryPosition, zoneId: targetMapId });
      }
    });
  }

  shutdown(): void {
    this.zoneWarningModal.destroy();
  }
}
