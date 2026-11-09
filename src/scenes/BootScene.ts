import Phaser from 'phaser';
import { GAME_TITLE, GAME_VERSION } from '../constants';
import { StartMenu } from '../ui/start-menu';
import { AdminAccessDialog } from '../ui/admin-access';
import { SaveRecoveryNotice } from '../ui/save-recovery';
import { roleManager, AppRole, AdminAccessService } from '../core/roles';
import { readAdminAccessConfigFromEnv } from '../config/adminAccessConfig';
import { playerSessionManager } from '../player';
import { sharedQuestionManager } from '../questions';
import '../ui/start-menu/start-menu.css';

/**
 * BootScene — the first scene loaded by Phaser.
 *
 * Displays a brief splash, then presents the HTML Start Menu overlay.
 * Normal play starts immediately; Super Admin tools are reachable only through
 * the local access gate (small link or Ctrl/Cmd+Shift+A) added in Phase 28.4.
 */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  private startMenu: StartMenu | null = null;
  private adminDialog: AdminAccessDialog | null = null;
  private adminAccess: AdminAccessService | null = null;
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

    this.adminAccess = new AdminAccessService({ config: readAdminAccessConfigFromEnv() });

    // Show the DOM start menu overlay.
    this.startMenu = new StartMenu();
    this.startMenu.show({
      onUserSelected: () => this.startUserSession(),
      onAdminRequest: () => this.requestAdminAccess(),
    });
  }

  /** Starts the normal player flow (the only primary start-menu action). */
  private startUserSession(): void {
    roleManager.selectRole(AppRole.User);
    void this.initializeUserSession();
  }

  private async initializeUserSession(): Promise<void> {
    this.loadingText?.setVisible(true);

    try {
      // Bootstrap the session, question repository, and gameplay scenes in parallel.
      await Promise.all([
        playerSessionManager.initializeSession(),
        sharedQuestionManager.initialize(),
        this.registerGameplayScenes(),
      ]);
    } catch (err) {
      console.error('[BootScene] Error initializing game session / question repository:', err);
    } finally {
      this.loadingText?.setVisible(false);
      this.showSaveRecoveryNotice();
      this.scene.start('VillageScene');
    }
  }

  /** Loads and registers gameplay scenes only when the player starts a run. */
  private async registerGameplayScenes(): Promise<void> {
    const [{ VillageScene }, { HuntingScene }, { BattleScene }, { UserGameScene }] = await Promise.all([
      import('./VillageScene'),
      import('./HuntingScene'),
      import('./BattleScene'),
      import('./UserGameScene'),
    ]);

    this.registerScene(VillageScene.KEY, VillageScene);
    this.registerScene(HuntingScene.KEY, HuntingScene);
    this.registerScene(BattleScene.KEY, BattleScene);
    this.registerScene(UserGameScene.KEY, UserGameScene);
  }

  private registerScene(key: string, scene: Phaser.Types.Scenes.SceneType): void {
    if (!this.scene.manager.keys[key]) {
      this.scene.add(key, scene, false);
    }
  }

  /** Opens the local admin gate without leaving the start menu behind it. */
  private requestAdminAccess(): void {
    if (!this.adminAccess) {
      this.adminAccess = new AdminAccessService({ config: readAdminAccessConfigFromEnv() });
    }
    if (!this.adminDialog) this.adminDialog = new AdminAccessDialog();

    this.adminDialog.show(this.adminAccess, {
      onGranted: () => {
        roleManager.selectRole(AppRole.SuperAdmin);
        void this.startAdminSession();
      },
    });
  }

  /** Loads and enters the admin scene only after the local gate is passed. */
  private async startAdminSession(): Promise<void> {
    try {
      const { AdminDashboardScene } = await import('./AdminDashboardScene');
      this.registerScene(AdminDashboardScene.KEY, AdminDashboardScene);
      this.startMenu?.destroy();
      this.startMenu = null;
      this.scene.start(AdminDashboardScene.KEY);
    } catch (err) {
      console.error('[BootScene] Unable to load admin tools:', err);
    }
  }

  /** Surfaces a content-free warning when the save was repaired or unreadable. */
  private showSaveRecoveryNotice(): void {
    const message = playerSessionManager.getSaveRecoveryNotice();
    if (!message) return;
    const notice = new SaveRecoveryNotice();
    notice.show(message);
  }

  /** Clean up the DOM overlays if the scene is shut down. */
  shutdown(): void {
    this.startMenu?.destroy();
    this.startMenu = null;
    this.adminDialog?.destroy();
    this.adminDialog = null;
  }
}
