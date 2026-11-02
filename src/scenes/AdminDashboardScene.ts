import Phaser from 'phaser';

/**
 * AdminDashboardScene — placeholder landing screen for Super Admin role.
 *
 * Future phases will overlay the full HTML question-management dashboard.
 */
export class AdminDashboardScene extends Phaser.Scene {
  static readonly KEY = 'AdminDashboardScene';

  constructor() {
    super({ key: AdminDashboardScene.KEY });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f2e);

    this.add.text(width / 2, height / 2 - 20, '🛡️ Super Admin', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#c080ff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'Admin Dashboard — coming soon', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#706090',
    }).setOrigin(0.5);

    console.log('AdminDashboardScene loaded.');
  }
}
