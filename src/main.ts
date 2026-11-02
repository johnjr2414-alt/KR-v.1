import Phaser from 'phaser';
import { GAME_TITLE, GAME_VERSION } from './constants';

/** Minimal Phaser boot — proves the engine initializes on the canvas. */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: {
    create() {
      const text = this.add.text(
        400,
        300,
        `${GAME_TITLE} v${GAME_VERSION}`,
        {
          fontFamily: 'Arial',
          fontSize: '28px',
          color: '#e0e0e0',
        },
      );
      text.setOrigin(0.5);
      console.log(`${GAME_TITLE} v${GAME_VERSION} — Phaser ${Phaser.VERSION} running.`);
    },
  },
};

new Phaser.Game(config);
