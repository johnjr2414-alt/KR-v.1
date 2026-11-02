import { describe, it, expect } from 'vitest';
import { DamageCalculator } from '../../src/combat/DamageCalculator';

describe('DamageCalculator', () => {
  const calc = new DamageCalculator({
    criticalMultiplier: 2.0,
    minDamage: 1,
  });

  describe('calculatePlayerDamage', () => {
    it('calculates standard damage as ATK - DEF', () => {
      // 20 ATK - 5 DEF = 15 damage (non-critical)
      const res = calc.calculatePlayerDamage(20, 5, 0, false);
      expect(res.damage).toBe(15);
      expect(res.isCritical).toBe(false);
    });

    it('calculates critical damage as (ATK * 2.0) - DEF', () => {
      // (20 * 2.0) - 5 = 35 damage
      const res = calc.calculatePlayerDamage(20, 5, 100, true);
      expect(res.damage).toBe(35);
      expect(res.isCritical).toBe(true);
    });

    it('enforces minDamage floor of 1 when defense exceeds attack', () => {
      const res = calc.calculatePlayerDamage(10, 50, 0, false);
      expect(res.damage).toBe(1);
    });
  });

  describe('calculateMonsterDamage', () => {
    it('calculates standard monster attack as monster ATK - player DEF', () => {
      // 15 ATK - 5 DEF = 10 damage
      const dmg = calc.calculateMonsterDamage(15, 5);
      expect(dmg).toBe(10);
    });

    it('enforces minDamage floor of 1 when player defense exceeds monster attack', () => {
      const dmg = calc.calculateMonsterDamage(10, 30);
      expect(dmg).toBe(1);
    });
  });
});
