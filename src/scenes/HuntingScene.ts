import Phaser from 'phaser';
import { BEGINNERS_HUNTING_GROUND, HUNTING_ZONE_REGISTRY, type MapDefinition } from '../world';
import type { HuntingZoneDefinition } from '../world/HuntingZoneDefinition';
import { calculateMovementVelocity, DEFAULT_MOVE_SPEED, playerSessionManager } from '../player';
import { PhaserInputAdapter } from '../player/movement/PhaserInputAdapter';
import type { SceneTransitionData } from './VillageScene';
import { monsterSpawner } from '../monsters';
import { MonsterSprite } from './monsters/MonsterSprite';
import type { MonsterDefinition } from '../core/types/monster';
import { ExplorationUIManager } from '../ui/exploration-hud';
import {
  ProceduralAnimationBuilder,
  evaluatePlayerAnimationState,
  type Direction,
} from './animations';

/** Number of monsters to spawn per zone visit. */
const MONSTERS_PER_ZONE = 6;

/**
 * HuntingScene — visual representation of a hunting zone.
 *
 * Implements:
 * - Hunting ground map environment (darker wilderness palette)
 * - Map boundary and obstacle collisions
 * - Player placeholder movement
 * - Monster spawning from zone configuration
 * - Proximity-based interaction prompt ("[SPACE] Fight")
 * - Encounter initiation (logs monster; actual battle in Phase 12)
 * - Return exit gateway back to Beginners Village
 */
export class HuntingScene extends Phaser.Scene {
  static readonly KEY = 'HuntingScene';

  private mapData: MapDefinition = BEGINNERS_HUNTING_GROUND;
  private zoneData: HuntingZoneDefinition = BEGINNERS_HUNTING_GROUND as unknown as HuntingZoneDefinition;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private inputAdapter!: PhaserInputAdapter;
  private spawnPosition: { x: number; y: number } = { x: 100, y: 400 };
  private isTransitioning = false;

  /** All currently active monster sprites. */
  private monsterSprites: MonsterSprite[] = [];
  /** The monster nearest to the player (if within detection radius). */
  private nearbyMonster: MonsterSprite | null = null;
  /** Interaction keys. */
  private interactKey!: Phaser.Input.Keyboard.Key;
  private explorationUI: ExplorationUIManager | null = null;
  private currentDirection: Direction = 'down';

  constructor() {
    super({ key: HuntingScene.KEY });
  }

  init(data?: SceneTransitionData & { zoneId?: string }): void {
    this.isTransitioning = false;
    this.nearbyMonster = null;
    this.monsterSprites = [];

    if (data?.spawnPosition) {
      this.spawnPosition = { ...data.spawnPosition };
    } else {
      this.spawnPosition = { x: 100, y: 400 };
    }

    // Resolve zone from passed ID, fall back to General Hunting Ground
    if (data?.zoneId && HUNTING_ZONE_REGISTRY[data.zoneId]) {
      this.zoneData = HUNTING_ZONE_REGISTRY[data.zoneId];
    } else {
      // Default: General Beginner Zone
      const fallbackId = Object.keys(HUNTING_ZONE_REGISTRY)[4] ?? Object.keys(HUNTING_ZONE_REGISTRY)[0];
      this.zoneData = HUNTING_ZONE_REGISTRY[fallbackId];
    }
  }

  create(): void {
    // Save on entering hunting zone
    void playerSessionManager.saveSession();

    const { width, height } = this.mapData.bounds;

    this.physics.world.setBounds(0, 0, width, height);

    // Dark wilderness ground
    const bg = this.add.graphics();
    bg.fillStyle(0x19281a, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle grid
    bg.lineStyle(1, 0x121e13, 0.4);
    for (let x = 0; x < width; x += 64) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 64) {
      bg.lineBetween(0, y, width, y);
    }

    // Dirt trails
    bg.fillStyle(0x3a3328, 0.7);
    bg.fillRect(0, 360, width, 80);

    this.obstacles = this.physics.add.staticGroup();

    this.createPlaceholderObstacles();
    this.createPlayer();
    this.createExits();
    this.spawnMonsters();

    // Register interaction key
    this.interactKey = (this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin)
      .addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.inputAdapter = new PhaserInputAdapter(this);

    // ── Exploration HUD and Panels Coordinator ──────────────────
    this.explorationUI = new ExplorationUIManager({
      scene: this,
      inputAdapter: this.inputAdapter,
      playerSprite: this.player,
      onQuitToMenu: () => {
        this.cameras.main.fade(300, 10, 10, 15, false, (_camera: unknown, progress: number) => {
          if (progress === 1) {
            this.scene.start('BootScene');
          }
        });
      },
    });

    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // Zone title label (top right to avoid overlapping HUD)
    const zoneName = this.zoneData.name ?? this.mapData.name;
    this.add.text(
      width - 16, 16,
      `${zoneName}  (Lv. ${this.mapData.entryRequirements.recommendedMinLevel}–${this.mapData.entryRequirements.recommendedMaxLevel})`,
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ef4444',
        backgroundColor: '#111827dd',
        padding: { x: 8, y: 4 },
      },
    ).setScrollFactor(0).setOrigin(1, 0);
  }

  update(): void {
    if (this.isTransitioning || !this.player || !this.player.body || this.explorationUI?.isPanelOpen()) {
      if (this.player?.anims && this.player.anims.isPlaying && this.player.anims.currentAnim?.key.includes('walk')) {
        this.player.play(`player-idle-${this.currentDirection}`, true);
      }
      return;
    }

    const inputState = this.inputAdapter.getInputState();
    const velocity = calculateMovementVelocity(inputState, DEFAULT_MOVE_SPEED);
    this.player.setVelocity(velocity.vx, velocity.vy);

    // Update animation state based on velocity
    const animState = evaluatePlayerAnimationState(velocity.vx, velocity.vy, this.currentDirection);
    this.currentDirection = animState.direction;
    if (this.player.anims.currentAnim?.key !== animState.animationKey) {
      this.player.play(animState.animationKey, true);
    }

    this.updateMonsterProximity();

    if (this.nearbyMonster && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.initiateEncounter(this.nearbyMonster.getDefinition());
    }
  }

  // ─── Private — Monster spawning ─────────────────────────────────────────────

  private spawnMonsters(): void {
    const { width, height } = this.mapData.bounds;
    const plan = monsterSpawner.generateSpawnPlan(
      this.zoneData,
      { width, height },
      MONSTERS_PER_ZONE,
    );

    for (const { definition, position } of plan) {
      const sprite = new MonsterSprite(this, position.x, position.y, definition);

      // Register detection overlap between player and monster zone
      // (registered after player creation — player exists at this point)
      this.physics.add.overlap(this.player, sprite.detectionZone, () => {
        if (this.nearbyMonster !== sprite) {
          if (this.nearbyMonster) this.nearbyMonster.hidePrompt();
          this.nearbyMonster = sprite;
          sprite.showPrompt();
        }
      });

      this.monsterSprites.push(sprite);
    }
  }

  /**
   * Each frame: if the player is no longer within detection radius of the
   * last known nearby monster, clear the reference and hide the prompt.
   * We use distance-check rather than overlap-clear because Phaser static-zone
   * overlaps do not fire an "exit" callback.
   */
  private updateMonsterProximity(): void {
    // Manually check distance since static-zone overlaps don't auto-clear
    if (this.nearbyMonster) {
      const px = this.player.x;
      const py = this.player.y;
      const mx = this.nearbyMonster.x;
      const my = this.nearbyMonster.y;
      const def = this.nearbyMonster.getDefinition();
      const distSq = (px - mx) ** 2 + (py - my) ** 2;
      const threshSq = (def.detectionRadius + 20) ** 2;

      if (distSq > threshSq) {
        this.nearbyMonster.hidePrompt();
        this.nearbyMonster = null;
      }
    }
  }

  // ─── Private — Encounter ────────────────────────────────────────────────────

  /**
   * Called when the player initiates a fight with a monster.
   * Transitions to BattleScene with the monster definition and return coordinates.
   */
  private initiateEncounter(monster: MonsterDefinition): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.player.setVelocity(0, 0);

    const playerPos = { x: this.player.x, y: this.player.y };

    // Auto-save session before entering battle
    void playerSessionManager.saveSession();

    // Clean up active monster sprites before transitioning
    for (const sprite of this.monsterSprites) {
      sprite.defeat();
    }
    this.monsterSprites = [];

    this.cameras.main.fade(250, 0, 0, 0, false, (_camera: unknown, progress: number) => {
      if (progress === 1) {
        this.scene.start('BattleScene', {
          monster,
          returnSceneKey: HuntingScene.KEY,
          returnPosition: playerPos,
        });
      }
    });
  }

  // ─── Private — Map setup ────────────────────────────────────────────────────

  private createPlaceholderObstacles(): void {
    const rocks = [
      { x: 300, y: 200, w: 80, h: 60 },
      { x: 700, y: 240, w: 100, h: 70 },
      { x: 450, y: 650, w: 90, h: 70 },
      { x: 850, y: 600, w: 120, h: 80 },
    ];

    for (const rock of rocks) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x4a4d52, 1);
      gfx.fillRoundedRect(rock.x - rock.w / 2, rock.y - rock.h / 2, rock.w, rock.h, 12);
      gfx.lineStyle(2, 0x2e3034, 1);
      gfx.strokeRoundedRect(rock.x - rock.w / 2, rock.y - rock.h / 2, rock.w, rock.h, 12);

      const body = this.add.rectangle(rock.x, rock.y, rock.w, rock.h);
      this.physics.add.existing(body, true);
      this.obstacles.add(body);
    }
  }

  private createPlayer(): void {
    ProceduralAnimationBuilder.initPlayerAnimations(this);

    this.player = this.physics.add.sprite(
      this.spawnPosition.x,
      this.spawnPosition.y,
      'player-frame-down-idle',
    );

    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(24, 28);
    this.player.body.setOffset(2, 6);
    this.player.play('player-idle-down');

    this.physics.add.collider(this.player, this.obstacles);
  }

  private createExits(): void {
    for (const conn of this.mapData.connections) {
      const { x, y } = conn.exitPosition;
      const { exitWidth, exitHeight, targetMapId, entryPosition } = conn;

      const exitGfx = this.add.graphics();
      exitGfx.fillStyle(0x10b981, 0.4);
      exitGfx.fillRect(x - exitWidth / 2, y - exitHeight / 2, exitWidth, exitHeight);
      exitGfx.lineStyle(2, 0x10b981, 0.9);
      exitGfx.strokeRect(x - exitWidth / 2, y - exitHeight / 2, exitWidth, exitHeight);

      this.add.text(x + 50, y, '← To Village', {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#6ee7b7',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      }).setOrigin(0, 0.5);

      const zone = this.add.zone(x, y, exitWidth, exitHeight);
      this.physics.add.existing(zone, true);

      this.physics.add.overlap(this.player, zone, () => {
        this.handleZoneTransition(targetMapId, entryPosition);
      });
    }
  }

  private handleZoneTransition(
    targetMapId: string,
    entryPosition: { x: number; y: number },
  ): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Clean up monster tween/state before leaving
    for (const sprite of this.monsterSprites) {
      sprite.defeat();
    }
    this.monsterSprites = [];

    this.player.setVelocity(0, 0);

    // Save session on exit
    void playerSessionManager.saveSession();

    this.cameras.main.fade(300, 10, 10, 15, false, (_camera: unknown, progress: number) => {
      if (progress === 1) {
        if (targetMapId === 'beginners-village') {
          this.scene.start('VillageScene', { spawnPosition: entryPosition });
        }
      }
    });
  }

  shutdown(): void {
    this.explorationUI?.destroy();
    this.explorationUI = null;
  }
}
