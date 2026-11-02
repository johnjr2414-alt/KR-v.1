import Phaser from 'phaser';
import { BEGINNERS_VILLAGE, type MapDefinition } from '../world';
import { calculateMovementVelocity, DEFAULT_MOVE_SPEED } from '../player';
import { PhaserInputAdapter } from '../player/movement/PhaserInputAdapter';

export interface SceneTransitionData {
  spawnPosition?: { x: number; y: number };
}

/**
 * VillageScene — visual representation of Beginners Village.
 *
 * Implements:
 * - Map boundary rendering and collision
 * - Placeholder landmarks and buildings as solid obstacles
 * - Player sprite placeholder with name tag
 * - Directional movement via WASD and Arrow keys
 * - Zone transitions to connected areas
 */
export class VillageScene extends Phaser.Scene {
  static readonly KEY = 'VillageScene';

  private mapData: MapDefinition = BEGINNERS_VILLAGE;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private exitZones!: Phaser.GameObjects.Zone[];
  private inputAdapter!: PhaserInputAdapter;
  private spawnPosition: { x: number; y: number } = { x: 600, y: 550 };
  private isTransitioning = false;

  constructor() {
    super({ key: VillageScene.KEY });
  }

  init(data?: SceneTransitionData): void {
    this.isTransitioning = false;
    if (data?.spawnPosition) {
      this.spawnPosition = { ...data.spawnPosition };
    } else {
      this.spawnPosition = { x: 600, y: 550 };
    }
  }

  create(): void {
    const { width, height } = this.mapData.bounds;

    // Set world physics bounds
    this.physics.world.setBounds(0, 0, width, height);

    // Draw background ground (grassy village tone)
    const bg = this.add.graphics();
    bg.fillStyle(0x234428, 1);
    bg.fillRect(0, 0, width, height);

    // Draw grid lines to visually indicate map scale
    bg.lineStyle(1, 0x1b3720, 0.4);
    for (let x = 0; x < width; x += 64) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 64) {
      bg.lineBetween(0, y, width, y);
    }

    // Draw village plaza path around fountain
    bg.fillStyle(0x756b53, 0.85);
    bg.fillCircle(600, 400, 140);
    bg.fillRect(560, 400, 80, 400); // south road
    bg.fillRect(160, 360, 800, 80); // horizontal main street

    // Create obstacle group
    this.obstacles = this.physics.add.staticGroup();

    // Create landmarks/buildings as collision obstacles
    this.createLandmarks();

    // Create player placeholder
    this.createPlayer();

    // Create zone transition exits
    this.createExits();

    // Setup input controller
    this.inputAdapter = new PhaserInputAdapter(this);

    // Setup camera follow with world bounds
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // Add HUD banner
    const hud = this.add.text(16, 16, `${this.mapData.name} (Lv. ${this.mapData.entryRequirements.recommendedMinLevel}–${this.mapData.entryRequirements.recommendedMaxLevel})`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#f0c060',
      backgroundColor: '#111827dd',
      padding: { x: 8, y: 4 },
    });
    hud.setScrollFactor(0);

    const helpText = this.add.text(16, 46, 'Move: WASD or Arrow Keys', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#9ca3af',
      backgroundColor: '#111827aa',
      padding: { x: 6, y: 2 },
    });
    helpText.setScrollFactor(0);
  }

  update(): void {
    if (this.isTransitioning || !this.player || !this.player.body) {
      return;
    }

    const inputState = this.inputAdapter.getInputState();
    const velocity = calculateMovementVelocity(inputState, DEFAULT_MOVE_SPEED);

    this.player.setVelocity(velocity.vx, velocity.vy);
  }

  private createLandmarks(): void {
    for (const landmark of this.mapData.landmarks) {
      const { x, y } = landmark.position;
      const { width, height, color, name } = landmark;

      // Draw obstacle visual box
      const gfx = this.add.graphics();
      gfx.fillStyle(color, 1);
      gfx.fillRect(x - width / 2, y - height / 2, width, height);
      gfx.lineStyle(2, 0xffffff, 0.4);
      gfx.strokeRect(x - width / 2, y - height / 2, width, height);

      // Label
      this.add.text(x, y - height / 2 - 12, name, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      // Create static physics collider
      const body = this.add.rectangle(x, y, width, height);
      this.physics.add.existing(body, true);
      this.obstacles.add(body);
    }
  }

  private createPlayer(): void {
    // Generate simple placeholder texture if it does not exist
    if (!this.textures.exists('player-placeholder')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Body
      g.fillStyle(0x3b82f6, 1);
      g.fillRect(0, 0, 28, 36);
      // Head/Visor
      g.fillStyle(0xfde047, 1);
      g.fillRect(4, 4, 20, 12);
      // Outline
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

    // Collide with buildings and landmarks
    this.physics.add.collider(this.player, this.obstacles);
  }

  private createExits(): void {
    this.exitZones = [];

    for (const conn of this.mapData.connections) {
      const { x, y } = conn.exitPosition;
      const { exitWidth, exitHeight, targetMapId, entryPosition } = conn;

      // Visual indicator for exit gateway
      const exitGfx = this.add.graphics();
      exitGfx.fillStyle(0xf59e0b, 0.4);
      exitGfx.fillRect(x - exitWidth / 2, y - exitHeight / 2, exitWidth, exitHeight);
      exitGfx.lineStyle(2, 0xf59e0b, 0.9);
      exitGfx.strokeRect(x - exitWidth / 2, y - exitHeight / 2, exitWidth, exitHeight);

      this.add.text(x, y - exitHeight / 2 - 14, 'To Hunting Ground →', {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#fbbf24',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      // Trigger zone
      const zone = this.add.zone(x, y, exitWidth, exitHeight);
      this.physics.add.existing(zone, true);
      this.exitZones.push(zone);

      this.physics.add.overlap(this.player, zone, () => {
        this.handleZoneTransition(targetMapId, entryPosition);
      });
    }
  }

  private handleZoneTransition(targetMapId: string, entryPosition: { x: number; y: number }): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.player.setVelocity(0, 0);

    // Camera fade effect
    this.cameras.main.fade(300, 10, 10, 15, false, (_camera: unknown, progress: number) => {
      if (progress === 1) {
        if (targetMapId === 'beginners-hunting-ground') {
          this.scene.start('HuntingScene', { spawnPosition: entryPosition });
        }
      }
    });
  }
}
