/**
 * Application roles available at the start menu.
 * This is NOT secure authentication — anyone with access can select either role.
 */
export enum AppRole {
  User = 'user',
  SuperAdmin = 'super-admin',
}

/**
 * Minimal role state manager.
 *
 * Tracks which role the player selected at the start menu.
 * Headless and testable — no DOM or Phaser dependency.
 */
export class RoleManager {
  private currentRole: AppRole | null = null;

  /** Set the active application role. */
  selectRole(role: AppRole): void {
    this.currentRole = role;
  }

  /** Get the active role, or null if none has been selected. */
  getRole(): AppRole | null {
    return this.currentRole;
  }

  /** Check whether a role has been selected. */
  hasRole(): boolean {
    return this.currentRole !== null;
  }

  /** Returns true if the current role is User. */
  isUser(): boolean {
    return this.currentRole === AppRole.User;
  }

  /** Returns true if the current role is Super Admin. */
  isSuperAdmin(): boolean {
    return this.currentRole === AppRole.SuperAdmin;
  }

  /** Clear the selected role (return to start menu state). */
  clearRole(): void {
    this.currentRole = null;
  }
}

/** Singleton instance shared across the application. */
export const roleManager = new RoleManager();
