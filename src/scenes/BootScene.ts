import Phaser from 'phaser';
import { GAME_TITLE, GAME_VERSION } from '../constants';
import { StartMenu } from '../ui/start-menu';
import { roleManager, AppRole } from '../core/roles';
import { VillageScene } from './VillageScene';
import { AdminDashboardScene } from './AdminDashboardScene';
import '../ui/start-menu/start-menu.css';

/**
 * BootScene — the first scene loaded by Phaser.
 *
 * Displays a brief splash, then presents the HTML Start Menu overlay.
 * When the player selects a role, navigates to the corresponding scene.
 */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  private startMenu: StartMenu | null = null;

  constructor() {
    super({ key: BootScene.KEY });
  }

  create(): void {
    const { width, height } = this.scale;

    // Minimal background while the start menu is visible.
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, height - 30, `Phaser ${Phaser.VERSION}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#606070',
    }).setOrigin(0.5);

    console.log(`${GAME_TITLE} v${GAME_VERSION} — BootScene loaded (Phaser ${Phaser.VERSION}).`);

    // Show the DOM start menu overlay.
    this.startMenu = new StartMenu();
    this.startMenu.show((role: AppRole) => {
      roleManager.selectRole(role);
      this.navigateToRoleScreen(role);
    });
  }

  /**
   * Transition to the appropriate Phaser scene based on the selected role.
   */
  private navigateToRoleScreen(role: AppRole): void {
    if (role === AppRole.User) {
      this.scene.start(VillageScene.KEY);
    } else {
      this.scene.start(AdminDashboardScene.KEY);
    }
  }

  /** Clean up the DOM overlay if the scene is shut down. */
  shutdown(): void {
    this.startMenu?.destroy();
    this.startMenu = null;
  }
}
