import Phaser from 'phaser';
import type { MovementInputState } from './PlayerMovementController';

/**
 * Reads keyboard inputs (WASD and Arrow keys) and outputs a normalized MovementInputState.
 */
export class PhaserInputAdapter {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private inputEnabled = true;

  constructor(scene: Phaser.Scene) {
    if (scene.input && scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  isInputEnabled(): boolean {
    return this.inputEnabled;
  }

  getInputState(): MovementInputState {
    if (!this.inputEnabled) {
      return { up: false, down: false, left: false, right: false };
    }

    const up = Boolean(this.cursors?.up.isDown || this.wasdKeys?.W.isDown);
    const down = Boolean(this.cursors?.down.isDown || this.wasdKeys?.S.isDown);
    const left = Boolean(this.cursors?.left.isDown || this.wasdKeys?.A.isDown);
    const right = Boolean(this.cursors?.right.isDown || this.wasdKeys?.D.isDown);

    return { up, down, left, right };
  }
}
