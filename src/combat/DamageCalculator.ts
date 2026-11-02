import {
  DEFAULT_DAMAGE_CONFIG,
  type DamageCalculationConfig,
} from '../config/combatConfig';

export interface PlayerDamageResult {
  damage: number;
  isCritical: boolean;
}

/**
 * Headless damage calculation service.
 * Follows the approved Knowledge Realms damage formulas.
 */
export class DamageCalculator {
  constructor(private readonly config: DamageCalculationConfig = DEFAULT_DAMAGE_CONFIG) {}

  /**
   * Calculates damage dealt by player to monster on a correct answer:
   * Dmg_player = max(minDamage, (ATK_player * M_crit) - DEF_monster)
   *
   * @param playerAttack - Player attack power
   * @param monsterDefense - Monster defense
   * @param critChancePercent - Player critical strike chance (0 to 100)
   * @param forceCrit - Optional override for deterministic testing
   */
  calculatePlayerDamage(
    playerAttack: number,
    monsterDefense: number,
    critChancePercent = 0,
    forceCrit?: boolean,
  ): PlayerDamageResult {
    const isCritical =
      forceCrit !== undefined
        ? forceCrit
        : Math.random() * 100 < Math.max(0, critChancePercent);

    const mult = isCritical ? this.config.criticalMultiplier : 1.0;
    const rawDamage = playerAttack * mult - monsterDefense;
    const damage = Math.max(this.config.minDamage, Math.floor(rawDamage));

    return { damage, isCritical };
  }

  /**
   * Calculates damage dealt by monster to player on incorrect answer or timeout:
   * Dmg_monster = max(minDamage, ATK_monster - DEF_player)
   *
   * @param monsterAttack - Monster attack stat
   * @param playerDefense - Player defense stat
   */
  calculateMonsterDamage(monsterAttack: number, playerDefense: number): number {
    const rawDamage = monsterAttack - playerDefense;
    return Math.max(this.config.minDamage, Math.floor(rawDamage));
  }
}

export const damageCalculator = new DamageCalculator();
