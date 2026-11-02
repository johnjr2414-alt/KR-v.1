import { describe, it, expect, beforeEach } from 'vitest';
import { RoleManager, AppRole } from '@/core/roles';

describe('RoleManager', () => {
  let manager: RoleManager;

  beforeEach(() => {
    manager = new RoleManager();
  });

  it('should start with no role selected', () => {
    expect(manager.getRole()).toBeNull();
    expect(manager.hasRole()).toBe(false);
    expect(manager.isUser()).toBe(false);
    expect(manager.isSuperAdmin()).toBe(false);
  });

  it('should select the User role', () => {
    manager.selectRole(AppRole.User);

    expect(manager.getRole()).toBe(AppRole.User);
    expect(manager.hasRole()).toBe(true);
    expect(manager.isUser()).toBe(true);
    expect(manager.isSuperAdmin()).toBe(false);
  });

  it('should select the Super Admin role', () => {
    manager.selectRole(AppRole.SuperAdmin);

    expect(manager.getRole()).toBe(AppRole.SuperAdmin);
    expect(manager.hasRole()).toBe(true);
    expect(manager.isUser()).toBe(false);
    expect(manager.isSuperAdmin()).toBe(true);
  });

  it('should allow switching roles', () => {
    manager.selectRole(AppRole.User);
    expect(manager.isUser()).toBe(true);

    manager.selectRole(AppRole.SuperAdmin);
    expect(manager.isSuperAdmin()).toBe(true);
    expect(manager.isUser()).toBe(false);
  });

  it('should clear the selected role', () => {
    manager.selectRole(AppRole.User);
    expect(manager.hasRole()).toBe(true);

    manager.clearRole();
    expect(manager.getRole()).toBeNull();
    expect(manager.hasRole()).toBe(false);
    expect(manager.isUser()).toBe(false);
  });
});

describe('AppRole enum', () => {
  it('should have exactly two roles', () => {
    const values = Object.values(AppRole);
    expect(values).toHaveLength(2);
    expect(values).toContain('user');
    expect(values).toContain('super-admin');
  });
});
