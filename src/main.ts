import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { BootScene, UserGameScene, AdminDashboardScene } from './scenes';

/**
 * Application entry point.
 *
 * Registers all scenes and boots the Phaser engine.
 * BootScene runs first and presents the role-selection start menu.
 */
const config = createGameConfig([
  BootScene,
  UserGameScene,
  AdminDashboardScene,
]);

new Phaser.Game(config);
