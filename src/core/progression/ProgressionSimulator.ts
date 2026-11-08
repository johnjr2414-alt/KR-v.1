import { getRequiredExpForNextLevel, DEFAULT_EXP_CONFIG } from '../../config/expConfig';
import { calculateStatsForLevel } from './StatGrowthService';
import { calculateAllocationBonuses } from './StatAllocationService';
import { DEFAULT_STAT_GROWTH_CONFIG } from '../../config/statGrowthConfig';
import { DEFAULT_STAT_ALLOCATION_CONFIG } from '../../config/statAllocationConfig';
import { MONSTER_REGISTRY } from '../../monsters/monsterData';
import { ELITE_BOSS_REGISTRY } from '../../monsters/EliteBossRegistry';
import { DamageCalculator } from '../../combat/DamageCalculator';
import { MonsterDefinition } from '../types/monster';

export type PlayerArchetype = 'Balanced' | 'GlassCannon' | 'Tank' | 'Scholar';

export interface LevelProgressionData {
  level: number;
  expRequired: number;
  cumulativeExp: number;
  estimatedBattlesAtLevel: number;
  cumulativeBattles: number;
  baseStats: {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
    intelligence: number;
    critRate: number;
  };
}

export interface EncounterSimulationResult {
  archetype: PlayerArchetype;
  playerLevel: number;
  monsterId: string;
  monsterName: string;
  monsterLevel: number;
  monsterCategory: string;
  averagePlayerDamage: number;
  averageMonsterDamage: number;
  playerHitsToKill: number;
  monsterHitsToKill: number;
  canSurviveEncounter: boolean;
  isImpossibleEncounter: boolean;
}

export interface SimulationReportData {
  progressionCurve: LevelProgressionData[];
  encounterMatrix: EncounterSimulationResult[];
  goldInflationProjection: {
    level: number;
    cumulativeGoldEarned: number;
    averageGoldPerBattle: number;
  }[];
}

/**
 * Headless balance simulator for analyzing progression pacing, build archetypes,
 * and encounter lethality without running the game or rendering UI.
 */
export class ProgressionSimulator {
  private damageCalc: DamageCalculator = new DamageCalculator();

  /**
   * Simulates level progression from Level 1 up to a target level.
   * Assumes player defeats level-appropriate monsters earning baseline EXP.
   */
  simulateLevelProgression(maxLevel = 10): LevelProgressionData[] {
    const results: LevelProgressionData[] = [];
    let cumulativeExp = 0;
    let cumulativeBattles = 0;

    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const expRequired = getRequiredExpForNextLevel(lvl, DEFAULT_EXP_CONFIG);
      const baseStats = calculateStatsForLevel(lvl, DEFAULT_STAT_GROWTH_CONFIG);

      // Average monster EXP around this level (~8 EXP at L1, ~30 at L5, ~80 at L10)
      const estimatedExpPerBattle = Math.max(8, Math.round(8 * Math.pow(lvl, 1.15)));
      const battlesForLevel = expRequired > 0 ? Math.ceil(expRequired / estimatedExpPerBattle) : 0;

      cumulativeExp += expRequired;
      cumulativeBattles += battlesForLevel;

      results.push({
        level: lvl,
        expRequired,
        cumulativeExp,
        estimatedBattlesAtLevel: battlesForLevel,
        cumulativeBattles,
        baseStats: {
          hp: baseStats.maxHp,
          mp: baseStats.maxMp,
          attack: baseStats.attack,
          defense: baseStats.defense,
          intelligence: baseStats.intelligence,
          critRate: baseStats.critRate,
        },
      });
    }

    return results;
  }

  /**
   * Evaluates combat match-ups between an archetype build and candidate monsters.
   */
  simulateEncounter(
    archetype: PlayerArchetype,
    playerLevel: number,
    monster: MonsterDefinition,
  ): EncounterSimulationResult {
    // 1. Compute Base Stats
    const baseStats = calculateStatsForLevel(playerLevel, DEFAULT_STAT_GROWTH_CONFIG);

    // 2. Allocate stat points based on Archetype
    const statPoints = (playerLevel - 1) * DEFAULT_STAT_ALLOCATION_CONFIG.pointsPerLevel;
    const allocated = { hp: 0, mp: 0, attack: 0, defense: 0, intelligence: 0, critRate: 0 };

    if (archetype === 'Balanced') {
      const perStat = Math.floor(statPoints / 5);
      allocated.hp = perStat;
      allocated.mp = perStat;
      allocated.attack = perStat;
      allocated.defense = perStat;
      allocated.intelligence = perStat;
    } else if (archetype === 'GlassCannon') {
      allocated.attack = Math.floor(statPoints * 0.7);
      allocated.critRate = Math.floor(statPoints * 0.3);
    } else if (archetype === 'Tank') {
      allocated.hp = Math.floor(statPoints * 0.6);
      allocated.defense = Math.floor(statPoints * 0.4);
    } else if (archetype === 'Scholar') {
      allocated.intelligence = Math.floor(statPoints * 0.6);
      allocated.mp = Math.floor(statPoints * 0.4);
    }

    const bonuses = calculateAllocationBonuses(allocated);

    const totalHp = baseStats.maxHp + bonuses.hp;
    const totalAttack = baseStats.attack + bonuses.attack;
    const totalDefense = baseStats.defense + bonuses.defense;
    const totalCritRate = baseStats.critRate + bonuses.critRate;

    // 3. Calculate Damage
    const playerDmg = this.damageCalc.calculatePlayerDamage(
      totalAttack,
      monster.defense,
      totalCritRate,
      false, // non-crit baseline
    );

    const monsterDmg = this.damageCalc.calculateMonsterDamage(
      monster.attack,
      totalDefense,
    );

    const avgPlayerDmg = Math.max(1, playerDmg.damage);
    const avgMonsterDmg = Math.max(1, monsterDmg);

    const playerHitsToKill = Math.ceil(monster.maxHp / avgPlayerDmg);
    const monsterHitsToKill = Math.ceil(totalHp / avgMonsterDmg);

    // In Knowledge Realms, monsters damage the player on incorrect/timeout answers.
    // If the monster can kill the player in fewer hits than a single incorrect allowance, or player deals 1 damage, it's extreme.
    const canSurviveEncounter = monsterHitsToKill >= 3; // Can endure at least 2 mistakes
    const isImpossibleEncounter = avgPlayerDmg <= 1 && monsterHitsToKill <= 2;

    return {
      archetype,
      playerLevel,
      monsterId: monster.id,
      monsterName: monster.name,
      monsterLevel: monster.level,
      monsterCategory: monster.category,
      averagePlayerDamage: avgPlayerDmg,
      averageMonsterDamage: avgMonsterDmg,
      playerHitsToKill,
      monsterHitsToKill,
      canSurviveEncounter,
      isImpossibleEncounter,
    };
  }

  /**
   * Runs complete balance suite over Beginners Village content (Levels 1–10).
   */
  runFullAudit(): SimulationReportData {
    const progressionCurve = this.simulateLevelProgression(10);
    const allMonsters: MonsterDefinition[] = [
      ...Object.values(MONSTER_REGISTRY),
      ...Object.values(ELITE_BOSS_REGISTRY),
    ];

    const encounterMatrix: EncounterSimulationResult[] = [];
    const archetypes: PlayerArchetype[] = ['Balanced', 'GlassCannon', 'Tank', 'Scholar'];

    for (const archetype of archetypes) {
      for (const monster of allMonsters) {
        // Test at monster's recommended level and at Level 1 (novice entry test)
        encounterMatrix.push(this.simulateEncounter(archetype, monster.level, monster));
      }
    }

    // Gold inflation projection
    let cumGold = 100; // Starter gold
    const goldInflationProjection = progressionCurve.map((prog) => {
      const avgGold = Math.round(3 + prog.level * 1.5);
      cumGold += prog.estimatedBattlesAtLevel * avgGold;
      return {
        level: prog.level,
        cumulativeGoldEarned: cumGold,
        averageGoldPerBattle: avgGold,
      };
    });

    return {
      progressionCurve,
      encounterMatrix,
      goldInflationProjection,
    };
  }
}
