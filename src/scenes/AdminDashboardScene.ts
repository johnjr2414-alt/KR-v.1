import Phaser from 'phaser';
import { QuestionRepository } from '../questions/retrieval/QuestionRepository';
import { QuestionManager } from '../questions/management/QuestionManager';
import { questionStore } from '../storage';
import { AdminDashboard } from '../ui/admin';
import { BootScene } from './BootScene';
import '../ui/admin/admin-dashboard.css';

/**
 * AdminDashboardScene — Phaser scene hosting the Super Admin dashboard overlay.
 *
 * Initializes QuestionStore and QuestionManager, then renders the
 * DOM-layered AdminDashboard component. When the admin clicks "Exit Admin",
 * returns to the BootScene.
 */
export class AdminDashboardScene extends Phaser.Scene {
  static readonly KEY = 'AdminDashboardScene';

  private dashboard: AdminDashboard | null = null;
  private manager: QuestionManager | null = null;

  constructor() {
    super({ key: AdminDashboardScene.KEY });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d1a);

    const repository = new QuestionRepository();
    this.manager = new QuestionManager(repository, questionStore);

    void this.initDashboard();
  }

  private async initDashboard(): Promise<void> {
    if (!this.manager) return;

    try {
      await this.manager.initialize();
    } catch (err) {
      console.error('[AdminDashboardScene] Error initializing QuestionManager:', err);
    }

    this.dashboard = new AdminDashboard(this.manager, () => {
      this.handleExit();
    });

    this.dashboard.show();
  }

  private handleExit(): void {
    this.dashboard?.destroy();
    this.dashboard = null;
    this.scene.start(BootScene.KEY);
  }

  shutdown(): void {
    this.dashboard?.destroy();
    this.dashboard = null;
  }
}
