import Phaser from 'phaser';
import { GAME_TITLE, GAME_VERSION } from '../constants';

/**
 * BootScene — the first scene loaded by Phaser.
 *
 * Displays the game title and version on a simple background.
 * This is a placeholder; future phases will add asset preloading
 * and database initialization before transitioning to the game world.
 */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  constructor() {
    super({ key: BootScene.KEY });
  }

  create(): void {
    const { width, height } = this.scale;

    // Simple gradient-like background using a rectangle.
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Game title.
    this.add.text(width / 2, height / 2 - 30, GAME_TITLE, {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#f0c060',
    }).setOrigin(0.5);

    // Version label.
    this.add.text(width / 2, height / 2 + 20, `v${GAME_VERSION}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#a0a0b0',
    }).setOrigin(0.5);

    // Engine confirmation.
    this.add.text(width / 2, height - 30, `Phaser ${Phaser.VERSION}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#606070',
    }).setOrigin(0.5);

    console.log(`${GAME_TITLE} v${GAME_VERSION} — BootScene loaded (Phaser ${Phaser.VERSION}).`);
  }
}
