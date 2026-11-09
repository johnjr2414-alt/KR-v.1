import { describe, it, expect } from 'vitest';
import {
  ADMIN_LOCAL_SECURITY_WARNING,
  DEFAULT_ADMIN_ACCESS_CONFIG,
  normalizePasscodeHash,
  readAdminAccessConfigFromEnv,
  resolveAdminAccessConfig,
} from '../../src/config/adminAccessConfig';
import { AdminAccessService, AppRole, RoleManager, hashSha256Hex } from '../../src/core/roles';
import { buildStartMenuMarkup } from '../../src/ui/start-menu';

describe('Phase 28.4 — Super Admin Protection', () => {
  describe('configuration', () => {
    it('1. ships without a passcode and keeps only a non-credential acknowledgement phrase', () => {
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.passcodeHash).toBeNull();
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.acknowledgementPhrase).toBe('LOCAL ADMIN');
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.maxAttempts).toBeGreaterThan(0);
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.cooldownMs).toBeGreaterThan(0);
    });

    it('2. the warning states that local protection is not server-grade security', () => {
      expect(ADMIN_LOCAL_SECURITY_WARNING).toMatch(/not server-authenticated/i);
      expect(ADMIN_LOCAL_SECURITY_WARNING).toMatch(/accidental access/i);
    });

    it('3. accept only 64-character SHA-256 hex digests, normalized to lowercase', () => {
      const upper = 'ABCDEF0123456789'.repeat(4);
      expect(upper).toHaveLength(64);
      expect(normalizePasscodeHash(upper)).toBe(upper.toLowerCase());
      expect(normalizePasscodeHash('  ' + upper + '  ')).toBe(upper.toLowerCase());
      expect(normalizePasscodeHash('')).toBeNull();
      expect(normalizePasscodeHash('password')).toBeNull();
      expect(normalizePasscodeHash('abc123')).toBeNull();
      expect(normalizePasscodeHash(null)).toBeNull();
      expect(normalizePasscodeHash(undefined)).toBeNull();
    });

    it('4. resolves the build-time hash, honours overrides, and lets null force acknowledgement', () => {
      const hash = 'a'.repeat(64);
      expect(resolveAdminAccessConfig(hash).passcodeHash).toBe(hash);
      expect(resolveAdminAccessConfig(null, { maxAttempts: 2 }).maxAttempts).toBe(2);
      expect(resolveAdminAccessConfig(hash, { passcodeHash: null }).passcodeHash).toBeNull();

      const envConfig = readAdminAccessConfigFromEnv();
      expect(envConfig.passcodeHash).toBeNull();
    });
  });

  describe('acknowledgement mode (no passcode configured)', () => {
    it('5. grants access only for the exact phrase, allowing surrounding whitespace', async () => {
      const service = new AdminAccessService({
        config: resolveAdminAccessConfig(null, { acknowledgementPhrase: 'LOCAL ADMIN' }),
      });

      expect(service.getMode()).toBe('acknowledgement');
      const decision = await service.submit('  LOCAL ADMIN  ');
      expect(decision.granted).toBe(true);
      expect(decision.mode).toBe('acknowledgement');
      expect(decision.reason).toBeUndefined();
    });

    it('6. treats the phrase as case-sensitive and counts the failure', async () => {
      const service = new AdminAccessService({
        config: resolveAdminAccessConfig(null, { maxAttempts: 3 }),
      });

      const decision = await service.submit('local admin');
      expect(decision.granted).toBe(false);
      expect(decision.reason).toBe('incorrect');
      expect(decision.remainingAttempts).toBe(2);
    });

    it('7. rejects empty input without consuming an attempt', async () => {
      const service = new AdminAccessService({
        config: resolveAdminAccessConfig(null, { maxAttempts: 2 }),
      });

      const decision = await service.submit('   ');
      expect(decision.granted).toBe(false);
      expect(decision.reason).toBe('empty');
      expect(decision.remainingAttempts).toBe(2);
      expect(service.isLocked()).toBe(false);
    });

    it('8. locks after the attempt cap, refuses input while locked, and clears after cooldown', async () => {
      let now = 1_000;
      const service = new AdminAccessService({
        config: resolveAdminAccessConfig(null, { maxAttempts: 2, cooldownMs: 5_000 }),
        now: () => now,
      });

      const first = await service.submit('wrong once');
      expect(first.remainingAttempts).toBe(1);

      const second = await service.submit('wrong twice');
      expect(second.remainingAttempts).toBe(0);
      expect(second.lockedUntil).toBe(6_000);
      expect(service.isLocked()).toBe(true);

      const whileLocked = await service.submit('LOCAL ADMIN');
      expect(whileLocked.granted).toBe(false);
      expect(whileLocked.reason).toBe('locked');

      now = 6_000;
      expect(service.isLocked()).toBe(false);
      const afterCooldown = await service.submit('LOCAL ADMIN');
      expect(afterCooldown.granted).toBe(true);
    });

    it('9. a successful entry resets accumulated failures', async () => {
      const service = new AdminAccessService({
        config: resolveAdminAccessConfig(null, { maxAttempts: 3 }),
      });

      await service.submit('nope');
      expect(service.getRemainingAttempts()).toBe(2);

      const granted = await service.submit('LOCAL ADMIN');
      expect(granted.granted).toBe(true);
      expect(service.getRemainingAttempts()).toBe(3);
      expect(service.isLocked()).toBe(false);
    });
  });

  describe('passcode mode', () => {
    const expectedHash = 'a'.repeat(64);
    const config = resolveAdminAccessConfig(null, { passcodeHash: expectedHash, maxAttempts: 2 });

    it('10. verifies the passcode through the injected hasher and trims the input', async () => {
      const seen: string[] = [];
      const service = new AdminAccessService({
        config,
        hashPasscode: async (input) => {
          seen.push(input);
          return `  ${expectedHash.toUpperCase()}  `;
        },
      });

      expect(service.getMode()).toBe('passcode');
      const decision = await service.submit('  hunter2  ');
      expect(decision.granted).toBe(true);
      expect(seen).toEqual(['hunter2']);
    });

    it('11. rejects a wrong passcode and counts the failure', async () => {
      const service = new AdminAccessService({
        config,
        hashPasscode: async () => 'b'.repeat(64),
      });

      const decision = await service.submit('wrong');
      expect(decision.granted).toBe(false);
      expect(decision.reason).toBe('incorrect');
      expect(decision.remainingAttempts).toBe(1);
    });

    it('12. reports unavailable hashing without consuming attempts or locking', async () => {
      const service = new AdminAccessService({
        config,
        hashPasscode: async () => {
          throw new Error('Web Crypto is unavailable');
        },
      });

      const decision = await service.submit('anything');
      expect(decision.granted).toBe(false);
      expect(decision.reason).toBe('unavailable');
      expect(decision.remainingAttempts).toBe(2);
      expect(service.isLocked()).toBe(false);
    });

    it('13. hashes with SHA-256 when using the default implementation', async () => {
      await expect(hashSha256Hex('abc')).resolves.toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
    });
  });

  describe('entry points and defence in depth', () => {
    it('14. the start menu offers only the user role as a primary action', () => {
      const markup = buildStartMenuMarkup();

      expect(markup).toContain(`data-role="${AppRole.User}"`);
      expect(markup).not.toContain(`data-role="${AppRole.SuperAdmin}"`);
      expect((markup.match(/class="start-menu__btn /g) ?? []).length).toBe(1);
      expect(markup).not.toMatch(/start-menu__btn[^"]*admin/);
    });

    it('15. admin access is a subtle secondary link, not a primary button', () => {
      const markup = buildStartMenuMarkup();

      expect(markup).toContain('data-action="admin-access"');
      expect(markup).toMatch(/class="start-menu__admin-link"/);
      expect(markup).not.toMatch(/class="start-menu__btn[^"]*"[^>]*data-action="admin-access"/);
    });

    it('16. a session without the Super Admin role is not treated as admin', () => {
      const roles = new RoleManager();
      expect(roles.getRole()).toBeNull();
      expect(roles.isSuperAdmin()).toBe(false);

      roles.selectRole(AppRole.User);
      expect(roles.isSuperAdmin()).toBe(false);

      roles.selectRole(AppRole.SuperAdmin);
      expect(roles.isSuperAdmin()).toBe(true);
    });
  });
});
