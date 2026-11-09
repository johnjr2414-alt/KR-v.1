import Phaser from 'phaser';
import { sharedQuestionManager, QuestionManager } from '../questions';
import type { AdminDashboard } from '../ui/admin';
import { roleManager } from '../core/roles';
import { BootScene } from './BootScene';

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
    // Defence in depth: the gate should be the only path here, but never render
    // admin tools for a session that does not hold the Super Admin role.
    if (!roleManager.isSuperAdmin()) {
      console.warn('[AdminDashboardScene] Blocked: Super Admin role is required.');
      this.scene.start(BootScene.KEY);
      return;
    }

    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d1a);

    this.manager = sharedQuestionManager;

    void this.initDashboard();
  }

  private async initDashboard(): Promise<void> {
    if (!this.manager) return;

    try {
      await this.manager.initialize();
    } catch (err) {
      console.error('[AdminDashboardScene] Error initializing QuestionManager:', err);
    }

    // Admin tooling is only needed for Super Admin sessions, so its code and
    // stylesheet are loaded on demand instead of inflating the initial bundle.
    const [{ AdminDashboard }] = await Promise.all([
      import('../ui/admin'),
      import('../ui/admin/admin-dashboard.css'),
    ]);

    if (!this.scene.isActive()) return;

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
