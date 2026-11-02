import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { BootScene } from './scenes';

/**
 * Application entry point.
 *
 * Assembles the scene list, builds the Phaser config,
 * and boots the game engine into the DOM container.
 */
const config = createGameConfig([BootScene]);
new Phaser.Game(config);
