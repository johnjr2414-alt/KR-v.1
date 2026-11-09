import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChallengeArenaSession,
  ChallengeMode,
  ChallengeProgressTracker,
  ChallengeStatus,
  CHALLENGE_DEFINITIONS,
  CHALLENGE_REGISTRY,
  getChallengeById,
  getChallengesForMode,
  getChallengesForSubject,
  resolveChallengeOpponent,
  type ChallengeClock,
} from '../../src/arena/challenge';
import { getEliteOrBossEncounter } from '../../src/monsters/EliteBossRegistry';
import { SubjectId } from '../../src/core/types/education';
import { MapIds, COLOSSEUM_MAPS, MAP_REGISTRY } from '../../src/world/maps';
import { ZoneType } from '../../src/world/MapDefinition';
import { validateMapGraph } from '../../src/world/mapGraph';
import { REGION_REGISTRY, WORLD_REGIONS } from '../../src/world/regions';
import { RegionIds } from '../../src/world/RegionDefinition';
import { validateRegionGraph } from '../../src/world/regionAccess';
import { getNPCDefinition } from '../../src/quests/NPCRegistry';
import { NPCType } from '../../src/quests/NPCTypes';

/** Deterministic clock for time-attack tests. */
class FakeClock implements ChallengeClock {
  private t = 0;
  now(): number {
    return this.t;
  }
  advanceMs(ms: number): void {
    this.t += ms;
  }
}

describe('Phase 26.7 — Colosseum Challenge Arena', () => {
  // ─── Configuration ──────────────────────────────────────────────────────────

  describe('challenge configuration', () => {
    it('registers a non-empty, uniquely-identified catalog', () => {
      expect(CHALLENGE_DEFINITIONS.length).toBeGreaterThan(0);
      const ids = CHALLENGE_DEFINITIONS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(CHALLENGE_REGISTRY[id]).toBeDefined();
        expect(getChallengeById(id)?.id).toBe(id);
      }
    });

    it('provides at least one challenge for every configurable mode', () => {
      for (const mode of Object.values(ChallengeMode)) {
        expect(getChallengesForMode(mode).length).toBeGreaterThanOrEqual(1);
      }
    });

    it('marks every challenge as provisional (draft values pending approval)', () => {
      expect(CHALLENGE_DEFINITIONS.every((c) => c.provisional)).toBe(true);
    });

    it('resolves every stage opponent against the monster / elite-boss registries', () => {
      for (const challenge of CHALLENGE_DEFINITIONS) {
        expect(challenge.stages.length).toBeGreaterThan(0);
        for (const stage of challenge.stages) {
          expect(resolveChallengeOpponent(stage.monsterId)).toBeDefined();
        }
      }
    });

    it('orders stages by ascending stage number starting at 1', () => {
      for (const challenge of CHALLENGE_DEFINITIONS) {
        challenge.stages.forEach((stage, index) => {
          expect(stage.stageNumber).toBe(index + 1);
        });
      }
    });

    it('keeps subject challenges single-subject', () => {
      const subjectChallenges = getChallengesForMode(ChallengeMode.SubjectChallenge);
      expect(subjectChallenges.length).toBeGreaterThanOrEqual(1);
      for (const challenge of subjectChallenges) {
        expect(challenge.subject).toBeDefined();
        for (const stage of challenge.stages) {
          const opponent = resolveChallengeOpponent(stage.monsterId)!;
          expect(opponent.subject).toBe(challenge.subject);
        }
      }
    });

    it('configures time-attack challenges with a limit and a score value', () => {
      const timed = getChallengesForMode(ChallengeMode.TimeAttack);
      expect(timed.length).toBeGreaterThanOrEqual(1);
      for (const challenge of timed) {
        expect(challenge.timeLimitSeconds).toBeGreaterThan(0);
        expect(challenge.scorePerStage).toBeGreaterThan(0);
      }
    });

    it('points the boss challenge at a registered boss encounter', () => {
      const bossChallenges = getChallengesForMode(ChallengeMode.BossChallenge);
      expect(bossChallenges.length).toBeGreaterThanOrEqual(1);
      for (const challenge of bossChallenges) {
        const bossId = challenge.stages[0].monsterId;
        const boss = getEliteOrBossEncounter(bossId);
        expect(boss).toBeDefined();
        expect(boss?.isBoss).toBe(true);
      }
    });

    it('filters subject challenges by subject', () => {
      const mathChallenges = getChallengesForSubject(SubjectId.Mathematics);
      expect(mathChallenges.length).toBeGreaterThanOrEqual(1);
      expect(mathChallenges.every((c) => c.subject === SubjectId.Mathematics)).toBe(true);
    });

    it('returns undefined for an unknown opponent id', () => {
      expect(resolveChallengeOpponent('does-not-exist')).toBeUndefined();
    });
  });

  // ─── Progression ─────────────────────────────────────────────────────────────

  describe('challenge progression', () => {
    let challenge: (typeof CHALLENGE_DEFINITIONS)[number];

    beforeEach(() => {
      challenge = getChallengeById('challenge-trial-of-endurance')!;
    });

    it('starts not-started and only begins once', () => {
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      expect(session.getStatus()).toBe(ChallengeStatus.NotStarted);
      expect(session.getStageIndex()).toBe(0);
      expect(session.isOver()).toBe(false);

      session.start();
      expect(session.getStatus()).toBe(ChallengeStatus.InProgress);
      expect(session.getCurrentStage()?.stageNumber).toBe(1);

      // A second start() is a no-op.
      session.start();
      expect(session.getStageIndex()).toBe(0);
    });

    it('advances through every stage and completes on the final clear', () => {
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();

      const stageCount = session.getStageCount();
      for (let i = 0; i < stageCount; i++) {
        expect(session.getClearedStages()).toBe(i);
        session.completeCurrentStage();
      }

      expect(session.isComplete()).toBe(true);
      expect(session.getClearedStages()).toBe(stageCount);
      expect(session.getStatus()).toBe(ChallengeStatus.Completed);
    });

    it('does not advance past a completed run', () => {
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      for (let i = 0; i < session.getStageCount(); i++) session.completeCurrentStage();
      const cleared = session.getClearedStages();

      session.completeCurrentStage();
      expect(session.getClearedStages()).toBe(cleared);
      expect(session.isComplete()).toBe(true);
    });

    it('reports a serializable progress view', () => {
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      session.completeCurrentStage();

      const progress = session.getProgress();
      expect(progress.challengeId).toBe(challenge.id);
      expect(progress.status).toBe(ChallengeStatus.InProgress);
      expect(progress.stageIndex).toBe(1);
      expect(progress.stageCount).toBe(challenge.stages.length);
      expect(progress.clearedStages).toBe(1);
    });

    it('exposes the current opponent monster definition', () => {
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      const opponent = session.getCurrentOpponent();
      expect(opponent).toBeDefined();
      expect(opponent?.id).toBe(challenge.stages[0].monsterId);
    });
  });

  // ─── Defeat ──────────────────────────────────────────────────────────────────

  describe('defeat handling', () => {
    it('ends the run in defeat when the player falls, granting no completion reward', () => {
      const challenge = getChallengeById('challenge-trial-of-endurance')!;
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      session.completeCurrentStage(); // clear round 1
      session.failCurrentStage(); // fall in round 2

      expect(session.isDefeated()).toBe(true);
      expect(session.isComplete()).toBe(false);
      expect(session.getRewards()).toBeNull();
      expect(session.claimRewards()).toBeNull();
    });

    it('ignores a defeat after the run has already ended', () => {
      const challenge = getChallengeById('challenge-trial-of-endurance')!;
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      for (let i = 0; i < session.getStageCount(); i++) session.completeCurrentStage();
      session.failCurrentStage();
      expect(session.isComplete()).toBe(true);
      expect(session.isDefeated()).toBe(false);
    });

    it('can be re-entered after a defeat when repeatable', () => {
      const challenge = getChallengeById('challenge-trial-of-endurance')!;
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      session.failCurrentStage();
      expect(session.canReenter()).toBe(true);
    });
  });

  // ─── Rewards & idempotency ────────────────────────────────────────────────────

  describe('rewards and idempotency', () => {
    it('computes per-stage + completion + first-clear rewards on the first clear', () => {
      const challenge = getChallengeById('challenge-trial-of-endurance')!;
      const config = challenge.rewards;
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      for (let i = 0; i < session.getStageCount(); i++) session.completeCurrentStage();

      const rewards = session.getRewards();
      expect(rewards).not.toBeNull();
      expect(rewards?.firstClearBonusApplied).toBe(true);
      expect(rewards?.clearedStages).toBe(challenge.stages.length);
      expect(rewards?.combatExp).toBe(
        config.expPerStage * challenge.stages.length +
          config.completionBonusExp +
          (config.firstClearBonus?.exp ?? 0),
      );
      expect(rewards?.gold).toBe(
        config.goldPerStage * challenge.stages.length +
          config.completionBonusGold +
          (config.firstClearBonus?.gold ?? 0),
      );
      expect(rewards?.items.length).toBe((config.completionItems?.length ?? 0) + 1);
    });

    it('returns the same computed reward object on repeated reads', () => {
      const challenge = getChallengeById('challenge-trial-of-endurance')!;
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      for (let i = 0; i < session.getStageCount(); i++) session.completeCurrentStage();
      expect(session.getRewards()).toBe(session.getRewards());
    });

    it('claims rewards exactly once', () => {
      const challenge = getChallengeById('challenge-trial-of-endurance')!;
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60 });
      session.start();
      for (let i = 0; i < session.getStageCount(); i++) session.completeCurrentStage();

      const first = session.claimRewards();
      expect(first).not.toBeNull();
      expect(session.claimRewards()).toBeNull();
      expect(session.claimRewards()).toBeNull();
    });

    it('grants the first-clear bonus at most once across repeated entries', () => {
      const challenge = getChallengeById('challenge-trial-of-endurance')!;
      const tracker = new ChallengeProgressTracker();

      const runOne = new ChallengeArenaSession({ challenge, playerLevel: 60, progressTracker: tracker });
      runOne.start();
      for (let i = 0; i < runOne.getStageCount(); i++) runOne.completeCurrentStage();
      const first = runOne.getRewards()!;
      expect(first.firstClearBonusApplied).toBe(true);

      const runTwo = new ChallengeArenaSession({ challenge, playerLevel: 60, progressTracker: tracker });
      runTwo.start();
      for (let i = 0; i < runTwo.getStageCount(); i++) runTwo.completeCurrentStage();
      const second = runTwo.getRewards()!;
      expect(second.firstClearBonusApplied).toBe(false);

      const bonus = challenge.rewards.firstClearBonus!;
      expect(first.combatExp - second.combatExp).toBe(bonus.exp);
      expect(first.gold - second.gold).toBe(bonus.gold);
    });

    it('reports cleared state through the progress tracker', () => {
      const tracker = new ChallengeProgressTracker();
      expect(tracker.isCleared('challenge-champion-duel')).toBe(false);
      expect(tracker.markCleared('challenge-champion-duel')).toBe(true);
      expect(tracker.markCleared('challenge-champion-duel')).toBe(false);
      expect(tracker.isCleared('challenge-champion-duel')).toBe(true);
      expect(tracker.getClearedCount()).toBe(1);
    });

    it('round-trips the tracker snapshot', () => {
      const tracker = new ChallengeProgressTracker();
      tracker.markCleared('a');
      tracker.markCleared('b');
      const snapshot = tracker.snapshot();

      const restored = new ChallengeProgressTracker();
      restored.loadSnapshot(snapshot);
      expect(restored.getClearedIds().sort()).toEqual(['a', 'b']);
    });
  });

  // ─── Time-attack ──────────────────────────────────────────────────────────────

  describe('time-attack mode', () => {
    it('completes within the time limit and reports score', () => {
      const challenge = getChallengeById('challenge-quick-wits')!;
      const clock = new FakeClock();
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60, clock });
      session.start();

      for (let i = 0; i < session.getStageCount(); i++) {
        clock.advanceMs(10_000); // 10s per round, 40s total < 120s limit
        session.completeCurrentStage();
      }

      expect(session.isComplete()).toBe(true);
      expect(session.getElapsedSeconds()).toBe(40);
      expect(session.getScore()).toBe(challenge.stages.length * (challenge.scorePerStage ?? 0));
    });

    it('ends in defeat when a stage is cleared after time expires', () => {
      const challenge = getChallengeById('challenge-quick-wits')!;
      const clock = new FakeClock();
      const session = new ChallengeArenaSession({ challenge, playerLevel: 60, clock });
      session.start();

      session.completeCurrentStage(); // clear round 1 instantly
      clock.advanceMs(121_000); // exceed the 120s limit
      session.completeCurrentStage(); // attempt round 2 -> time out

      expect(session.isDefeated()).toBe(true);
      expect(session.isComplete()).toBe(false);
      expect(session.getRewards()).toBeNull();
    });
  });

  // ─── Region / map / NPC wiring ─────────────────────────────────────────────────

  describe('Colosseum region wiring', () => {
    it('links the Colosseum arena map to the Colosseum region', () => {
      const region = REGION_REGISTRY[RegionIds.Colosseum];
      expect(region.mapIds).toEqual(COLOSSEUM_MAPS.map((m) => m.id));
      expect(region.mapIds).toContain(MapIds.ColosseumGrounds);
    });

    it('defines the Colosseum arena map with valid bounds', () => {
      const map = MAP_REGISTRY[MapIds.ColosseumGrounds];
      expect(map).toBeDefined();
      expect(map.zoneType).toBe(ZoneType.Arena);
      expect(map.bounds.width).toBeGreaterThan(0);
      expect(map.bounds.height).toBeGreaterThan(0);
      expect(map.entryRequirements.recommendedMinLevel).toBe(60);
    });

    it('passes map-graph validation for the Colosseum maps', () => {
      const result = validateMapGraph(COLOSSEUM_MAPS, { requireBidirectional: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('keeps the whole world region graph valid', () => {
      const result = validateRegionGraph(WORLD_REGIONS);
      expect(result.valid).toBe(true);
    });

    it('registers an Arena Master NPC on the Colosseum grounds', () => {
      const npc = getNPCDefinition('grand-arbiter-theron');
      expect(npc).toBeDefined();
      expect(npc?.type).toBe(NPCType.ArenaMaster);
      expect(npc?.mapId).toBe(MapIds.ColosseumGrounds);
      expect(npc?.dialogue.default.length).toBeGreaterThan(0);
    });
  });
});
