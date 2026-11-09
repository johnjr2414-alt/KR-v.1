import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { applyTextScale, loadTextScale } from './ui/preferences/UiPreferences';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import './ui/accessibility.css';

/**
 * Application entry point.
 *
 * BootScene registers the gameplay and admin scenes on demand, keeping the
 * initial start-menu bundle free of scene and overlay code.
 */
const config = createGameConfig([BootScene]);

applyTextScale(loadTextScale());

new Phaser.Game(config);

if (import.meta.env.PROD) {
  registerServiceWorker();
}
