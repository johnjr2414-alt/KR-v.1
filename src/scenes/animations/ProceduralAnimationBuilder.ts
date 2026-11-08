import Phaser from 'phaser';

/**
 * ProceduralAnimationBuilder — Generates pixel-art placeholder textures and animations
 * for Player and Monsters across cardinal directions (down, up, left, right)
 * and action states (idle, walk, attack, hurt, defeat).
 *
 * This provides animated frames without assuming external asset sheets exist,
 * adhering to strict Zenonia-style retro proportions.
 */
export class ProceduralAnimationBuilder {
  private static texturesRegistered = false;

  /**
   * Initializes player textures and Phaser animations if not already created.
   */
  static initPlayerAnimations(scene: Phaser.Scene): void {
    if (this.texturesRegistered && scene.anims.exists('player-walk-down')) {
      return;
    }

    const { textures, anims } = scene;
    const w = 28;
    const h = 36;

    const directions: Array<{ dir: 'down' | 'up' | 'left' | 'right'; eyeOffset: { x: number; y: number } }> = [
      { dir: 'down', eyeOffset: { x: 0, y: 0 } },
      { dir: 'up', eyeOffset: { x: 0, y: -4 } },
      { dir: 'left', eyeOffset: { x: -4, y: 0 } },
      { dir: 'right', eyeOffset: { x: 4, y: 0 } },
    ];

    directions.forEach(({ dir, eyeOffset }) => {
      // 1. Idle frame
      const idleKey = `player-frame-${dir}-idle`;
      if (!textures.exists(idleKey)) {
        const g = scene.make.graphics({ x: 0, y: 0 });
        this.drawCharacterFrame(g, w, h, eyeOffset, 0, 0);
        g.generateTexture(idleKey, w, h);
        g.destroy();
      }

      // 2. Walk frame 1 (bob down / leg swing A)
      const walk1Key = `player-frame-${dir}-walk-1`;
      if (!textures.exists(walk1Key)) {
        const g = scene.make.graphics({ x: 0, y: 0 });
        this.drawCharacterFrame(g, w, h, eyeOffset, -2, 1);
        g.generateTexture(walk1Key, w, h);
        g.destroy();
      }

      // 3. Walk frame 2 (bob up / leg swing B)
      const walk2Key = `player-frame-${dir}-walk-2`;
      if (!textures.exists(walk2Key)) {
        const g = scene.make.graphics({ x: 0, y: 0 });
        this.drawCharacterFrame(g, w, h, eyeOffset, 2, -1);
        g.generateTexture(walk2Key, w, h);
        g.destroy();
      }

      // 4. Attack frame (forward lunge)
      const attackKey = `player-frame-${dir}-attack`;
      if (!textures.exists(attackKey)) {
        const g = scene.make.graphics({ x: 0, y: 0 });
        this.drawCharacterFrame(g, w, h, eyeOffset, 0, 0, 0xef4444);
        g.generateTexture(attackKey, w, h);
        g.destroy();
      }

      // Register Phaser Animations
      if (!anims.exists(`player-idle-${dir}`)) {
        anims.create({
          key: `player-idle-${dir}`,
          frames: [{ key: idleKey }],
          frameRate: 1,
          repeat: -1,
        });
      }

      if (!anims.exists(`player-walk-${dir}`)) {
        anims.create({
          key: `player-walk-${dir}`,
          frames: [
            { key: walk1Key },
            { key: idleKey },
            { key: walk2Key },
            { key: idleKey },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }

      if (!anims.exists(`player-attack-${dir}`)) {
        anims.create({
          key: `player-attack-${dir}`,
          frames: [{ key: attackKey }, { key: idleKey }],
          frameRate: 6,
          repeat: 0,
        });
      }
    });

    this.texturesRegistered = true;
  }

  private static drawCharacterFrame(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    eyeOffset: { x: number; y: number },
    bobX: number,
    bobY: number,
    accentColor = 0xfde047,
  ): void {
    // Body / Tunic
    g.fillStyle(0x3b82f6, 1);
    g.fillRoundedRect(2, 8 + bobY, w - 4, h - 10, 4);

    // Belt / Trim
    g.fillStyle(0x1e3a8a, 1);
    g.fillRect(2, 22 + bobY, w - 4, 3);

    // Head / Hair
    g.fillStyle(accentColor, 1);
    g.fillRoundedRect(4, 2 + bobY, w - 8, 12, 3);

    // Face / Eyes (unless facing directly up)
    if (eyeOffset.y >= 0) {
      g.fillStyle(0x1e293b, 1);
      const cx = w / 2 + eyeOffset.x;
      const cy = 9 + eyeOffset.y + bobY;
      g.fillRect(cx - 5, cy, 3, 3);
      g.fillRect(cx + 2, cy, 3, 3);
    }

    // Boots / Feet with walk offset
    g.fillStyle(0x78350f, 1);
    g.fillRect(4 + bobX, h - 4, 7, 4);
    g.fillRect(w - 11 - bobX, h - 4, 7, 4);

    // Outer outline
    g.lineStyle(1.5, 0x172554, 0.9);
    g.strokeRoundedRect(2, 8 + bobY, w - 4, h - 10, 4);
  }
}
