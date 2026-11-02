import Phaser from 'phaser';

/**
 * UserGameScene — placeholder landing screen for User role.
 *
 * Future phases will replace this with the Beginners Village tilemap.
 */
export class UserGameScene extends Phaser.Scene {
  static readonly KEY = 'UserGameScene';

  constructor() {
    super({ key: UserGameScene.KEY });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0f1a2e);

    this.add.text(width / 2, height / 2 - 20, '⚔️ Adventure Awaits', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#70b8ff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'User Mode — World coming soon', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#607090',
    }).setOrigin(0.5);

    console.log('UserGameScene loaded.');
  }
}
