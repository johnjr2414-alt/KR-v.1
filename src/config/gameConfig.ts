import Phaser from 'phaser';

/**
 * Centralized Phaser game configuration.
 *
 * Canvas dimensions and scaling are configurable here.
 * Scene list is populated by the entry point after all scenes are registered.
 */
export interface GameConfigOptions {
  /** Target canvas width in pixels. */
  width?: number;
  /** Target canvas height in pixels. */
  height?: number;
  /** DOM element ID to attach the canvas to. */
  parentId?: string;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const DEFAULT_PARENT = 'game-container';

/**
 * Build a Phaser GameConfig with sensible defaults and Scale Manager.
 * Scene array is injected by the caller so this module stays scene-agnostic.
 */
export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
  options: GameConfigOptions = {},
): Phaser.Types.Core.GameConfig {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  return {
    type: Phaser.AUTO,
    width,
    height,
    parent: options.parentId ?? DEFAULT_PARENT,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  };
}
