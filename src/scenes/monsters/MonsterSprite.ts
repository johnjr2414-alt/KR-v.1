import Phaser from 'phaser';
import type { MonsterDefinition } from '../../core/types/monster';

/**
 * MonsterSprite — Phaser-side visual representation of a single monster.
 *
 * Responsibilities:
 *  - Renders a colour-coded placeholder rectangle with the monster's name.
 *  - Plays a gentle idle bobbing tween.
 *  - Exposes a detection overlap zone; the owning scene registers overlap
 *    with the player and calls `showPrompt()` / `hidePrompt()`.
 *  - Exposes `getDefinition()` so the scene can start a battle.
 *
 * Does NOT import or call any combat logic — encounter initiation is
 * the responsibility of HuntingScene.
 */
export class MonsterSprite extends Phaser.GameObjects.Container {
  /** The underlying physics body used for overlap detection. */
  readonly detectionZone: Phaser.GameObjects.Zone;

  private readonly definition: MonsterDefinition;
  private readonly visual: Phaser.GameObjects.Graphics;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly promptLabel: Phaser.GameObjects.Text;
  private idleTween?: Phaser.Tweens.Tween;

  /** Half-dimensions of the sprite rectangle. */
  private static readonly HALF_W = 18;
  private static readonly HALF_H = 22;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    definition: MonsterDefinition,
  ) {
    super(scene, x, y);
    this.definition = definition;

    const hh = MonsterSprite.HALF_H;

    // ── Body graphic ────────────────────────────────────────────────────────
    this.visual = scene.add.graphics();
    this.drawBody(1.0); // full opacity
    this.add(this.visual);

    // ── Name label ─────────────────────────────────────────────────────────
    this.nameLabel = scene.add.text(0, hh + 6, definition.name, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);
    this.add(this.nameLabel);

    // ── Interaction prompt (hidden by default) ──────────────────────────────
    this.promptLabel = scene.add.text(0, -(hh + 22), '[SPACE] Fight', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#fde047',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1).setVisible(false);
    this.add(this.promptLabel);

    // ── Detection overlap zone ───────────────────────────────────────────────
    // Created outside the container so the physics system can track it at
    // world coordinates.  We synchronise its position in preUpdate.
    this.detectionZone = scene.add.zone(
      x, y,
      definition.detectionRadius * 2,
      definition.detectionRadius * 2,
    );
    scene.physics.add.existing(this.detectionZone, true);

    // ── Add container to scene ───────────────────────────────────────────────
    scene.add.existing(this);

    // ── Idle bob tween ───────────────────────────────────────────────────────
    this.idleTween = scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 900 + Math.random() * 300,  // slight variation per monster
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Keep detection zone in sync with container y
        (this.detectionZone.body as Phaser.Physics.Arcade.StaticBody).reset(
          this.x,
          this.y,
        );
      },
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Returns the static monster data this sprite represents. */
  getDefinition(): MonsterDefinition {
    return this.definition;
  }

  /** Shows the "[SPACE] Fight" interaction prompt above the sprite. */
  showPrompt(): void {
    this.promptLabel.setVisible(true);
  }

  /** Hides the interaction prompt. */
  hidePrompt(): void {
    this.promptLabel.setVisible(false);
  }

  /**
   * Marks this monster as defeated: stops the tween, dims the sprite,
   * hides the name and prompt.  Call before destroying to avoid tween errors.
   */
  defeat(): void {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = undefined;
    }
    this.hidePrompt();
    this.nameLabel.setVisible(false);
    this.visual.setAlpha(0.25);
    this.detectionZone.setActive(false);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private drawBody(alpha: number): void {
    const hw = MonsterSprite.HALF_W;
    const hh = MonsterSprite.HALF_H;
    this.visual.clear();

    // Shadow
    this.visual.fillStyle(0x000000, 0.25 * alpha);
    this.visual.fillEllipse(0, hh + 2, hw * 2.5, 8);

    // Main body rectangle
    this.visual.fillStyle(this.definition.spriteColor, alpha);
    this.visual.fillRoundedRect(-hw, -hh, hw * 2, hh * 2, 5);

    // Highlight
    this.visual.fillStyle(0xffffff, 0.15 * alpha);
    this.visual.fillRoundedRect(-hw + 2, -hh + 2, hw - 2, hh * 0.6, 3);

    // Outline
    this.visual.lineStyle(2, 0x000000, 0.6 * alpha);
    this.visual.strokeRoundedRect(-hw, -hh, hw * 2, hh * 2, 5);

    // Eyes
    this.visual.fillStyle(0xffffff, alpha);
    this.visual.fillCircle(-5, -4, 4);
    this.visual.fillCircle(5, -4, 4);
    this.visual.fillStyle(0x111111, alpha);
    this.visual.fillCircle(-4, -3, 2);
    this.visual.fillCircle(6, -3, 2);

    // Level badge
    this.visual.fillStyle(0x1f2937, 0.8 * alpha);
    this.visual.fillRoundedRect(-hw, hh - 10, 20, 10, 3);
  }
}
