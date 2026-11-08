import Phaser from 'phaser';
import { GAME_TITLE, GAME_VERSION } from '../constants';
import { StartMenu } from '../ui/start-menu';
import { roleManager, AppRole } from '../core/roles';
import { playerSessionManager } from '../player';
import { sharedQuestionManager } from '../questions';
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
  private loadingText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: BootScene.KEY });
  }

  create(): void {
    const { width, height } = this.scale;

    // Minimal background while the start menu is visible.
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.loadingText = this.add.text(width / 2, height / 2, 'Loading Game Data...', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#93c5fd',
    }).setOrigin(0.5).setVisible(false);

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
      void this.handleRoleSelection(role);
    });
  }

  /**
   * Transition to the appropriate Phaser scene based on the selected role.
   * If User is selected, initializes or loads the player session before scene transition.
   */
  private async handleRoleSelection(role: AppRole): Promise<void> {
    if (role === AppRole.SuperAdmin) {
      this.scene.start(AdminDashboardScene.KEY);
      return;
    }

    // User Role Selected: Show loading indicator
    this.loadingText?.setVisible(true);

    try {
      // Parallel bootstrap of player save session and shared question repository
      await Promise.all([
        playerSessionManager.initializeSession(),
        sharedQuestionManager.initialize(),
      ]);
    } catch (err) {
      console.error('[BootScene] Error initializing game session / question repository:', err);
    } finally {
      this.loadingText?.setVisible(false);
      this.scene.start(VillageScene.KEY);
    }
  }

  /** Clean up the DOM overlay if the scene is shut down. */
  shutdown(): void {
    this.startMenu?.destroy();
    this.startMenu = null;
  }
}
