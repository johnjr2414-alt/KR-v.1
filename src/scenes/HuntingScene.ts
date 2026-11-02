import Phaser from 'phaser';
import { BEGINNERS_HUNTING_GROUND, type MapDefinition } from '../world';
import { calculateMovementVelocity, DEFAULT_MOVE_SPEED } from '../player';
import { PhaserInputAdapter } from '../player/movement/PhaserInputAdapter';
import type { SceneTransitionData } from './VillageScene';

/**
 * HuntingScene — visual representation of Beginners Hunting Ground.
 *
 * Implements:
 * - Hunting ground map environment (darker wilderness palette)
 * - Map boundary and tree obstacle collisions
 * - Player placeholder movement
 * - Return exit gateway back to Beginners Village
 */
export class HuntingScene extends Phaser.Scene {
  static readonly KEY = 'HuntingScene';

  private mapData: MapDefinition = BEGINNERS_HUNTING_GROUND;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private inputAdapter!: PhaserInputAdapter;
  private spawnPosition: { x: number; y: number } = { x: 100, y: 400 };
  private isTransitioning = false;

  constructor() {
    super({ key: HuntingScene.KEY });
  }

  init(data?: SceneTransitionData): void {
    this.isTransitioning = false;
    if (data?.spawnPosition) {
      this.spawnPosition = { ...data.spawnPosition };
    } else {
      this.spawnPosition = { x: 100, y: 400 };
    }
  }

  create(): void {
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

    // Create some placeholder rock/tree clusters
    this.createPlaceholderObstacles();

    // Create player
    this.createPlayer();

    // Create return exit
    this.createExits();

    this.inputAdapter = new PhaserInputAdapter(this);

    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // HUD
    const hud = this.add.text(16, 16, `${this.mapData.name} (Lv. ${this.mapData.entryRequirements.recommendedMinLevel}–${this.mapData.entryRequirements.recommendedMaxLevel})`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ef4444',
      backgroundColor: '#111827dd',
      padding: { x: 8, y: 4 },
    });
    hud.setScrollFactor(0);
  }

  update(): void {
    if (this.isTransitioning || !this.player || !this.player.body) {
      return;
    }

    const inputState = this.inputAdapter.getInputState();
    const velocity = calculateMovementVelocity(inputState, DEFAULT_MOVE_SPEED);

    this.player.setVelocity(velocity.vx, velocity.vy);
  }

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
    // Re-use or generate player texture
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

  private handleZoneTransition(targetMapId: string, entryPosition: { x: number; y: number }): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.player.setVelocity(0, 0);

    this.cameras.main.fade(300, 10, 10, 15, false, (_camera: unknown, progress: number) => {
      if (progress === 1) {
        if (targetMapId === 'beginners-village') {
          this.scene.start('VillageScene', { spawnPosition: entryPosition });
        }
      }
    });
  }
}
