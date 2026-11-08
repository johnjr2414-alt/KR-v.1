import { describe, it, expect } from 'vitest';
import { ProgressionSimulator } from '../../src/core/progression/ProgressionSimulator';
import { MONSTER_REGISTRY } from '../../src/monsters/monsterData';
import { ELITE_BOSS_REGISTRY } from '../../src/monsters/EliteBossRegistry';

describe('Phase 24.5 — Build Balance and Progression Simulation', () => {
  const simulator = new ProgressionSimulator();

  describe('Character EXP & Level Progression Curve', () => {
    it('produces monotonically increasing EXP requirements without negative or zero steps', () => {
      const curve = simulator.simulateLevelProgression(10);
      expect(curve).toHaveLength(10);

      for (let i = 0; i < curve.length - 1; i++) {
        expect(curve[i].expRequired).toBeGreaterThan(0);
        expect(curve[i + 1].expRequired).toBeGreaterThan(curve[i].expRequired);
      }
    });

    it('estimates reasonable battle counts per level advancement in Beginners Village', () => {
      const curve = simulator.simulateLevelProgression(5);

      // Level 1 -> 2 should require ~10-25 battles
      expect(curve[0].estimatedBattlesAtLevel).toBeGreaterThanOrEqual(5);
      expect(curve[0].estimatedBattlesAtLevel).toBeLessThanOrEqual(30);

      // Level 5 cumulative battles should be under 200 battles
      expect(curve[4].cumulativeBattles).toBeLessThan(200);
    });
  });

  describe('Archetype Combat Simulation & Survival Evaluation', () => {
    it('confirms that players at recommended level can survive and defeat normal monsters', () => {
      const slime = MONSTER_REGISTRY['math-slime'];
      const bat = MONSTER_REGISTRY['fraction-bat'];

      const slimeMatch = simulator.simulateEncounter('Balanced', 1, slime);
      expect(slimeMatch.isImpossibleEncounter).toBe(false);
      expect(slimeMatch.playerHitsToKill).toBeLessThanOrEqual(4);
      expect(slimeMatch.canSurviveEncounter).toBe(true);

      const batMatch = simulator.simulateEncounter('Tank', 5, bat);
      expect(batMatch.isImpossibleEncounter).toBe(false);
      expect(batMatch.canSurviveEncounter).toBe(true);
    });

    it('demonstrates that GlassCannon build kills faster but has lower error tolerance', () => {
      const bat = MONSTER_REGISTRY['fraction-bat'];

      const glassCannon = simulator.simulateEncounter('GlassCannon', 5, bat);
      const tank = simulator.simulateEncounter('Tank', 5, bat);

      // Glass cannon requires fewer hits to kill
      expect(glassCannon.playerHitsToKill).toBeLessThanOrEqual(tank.playerHitsToKill);

      // Tank can endure more hits before dying
      expect(tank.monsterHitsToKill).toBeGreaterThan(glassCannon.monsterHitsToKill);
    });

    it('correctly flags World Boss encounters as dangerous for underleveled novices', () => {
      const boss = ELITE_BOSS_REGISTRY['archivist-malakor']; // Level 10 Boss

      // A level 1 novice encountering the level 10 world boss
      const noviceVsBoss = simulator.simulateEncounter('Balanced', 1, boss);
      // Malakor deals 35 attack against ~5 defense -> ~30 dmg per hit -> 100 HP dies in ~3 hits
      expect(noviceVsBoss.playerHitsToKill).toBeGreaterThan(40);
    });
  });

  describe('Full Balance Audit & Inflation Simulation', () => {
    it('executes full audit across all 15 monsters and 4 archetypes without throwing', () => {
      const audit = simulator.runFullAudit();

      expect(audit.progressionCurve).toHaveLength(10);
      expect(audit.encounterMatrix.length).toBeGreaterThan(40);
      expect(audit.goldInflationProjection).toHaveLength(10);

      // Verify gold progression is positive and scales predictably
      const lastLevelGold = audit.goldInflationProjection[9].cumulativeGoldEarned;
      expect(lastLevelGold).toBeGreaterThan(500);
      expect(lastLevelGold).toBeLessThan(10000); // No runaway hyperinflation
    });
  });
});
