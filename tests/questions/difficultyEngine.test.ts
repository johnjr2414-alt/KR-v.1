import { describe, it, expect } from 'vitest';
import { DifficultyEngine } from '../../src/questions/retrieval/DifficultyEngine';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';

describe('DifficultyEngine', () => {
  const engine = new DifficultyEngine();

  // ─── Prompt 11.1 & 11.2: Baseline Tier Selection ──────────────────────────

  describe('getMonsterBaselineTier', () => {
    it('maps level 1 - 10 to Elementary', () => {
      expect(engine.getMonsterBaselineTier(1)).toBe(EducationalTier.Elementary);
      expect(engine.getMonsterBaselineTier(5)).toBe(EducationalTier.Elementary);
      expect(engine.getMonsterBaselineTier(10)).toBe(EducationalTier.Elementary);
    });

    it('maps level 11 - 50 to Junior High', () => {
      expect(engine.getMonsterBaselineTier(11)).toBe(EducationalTier.JuniorHigh);
      expect(engine.getMonsterBaselineTier(30)).toBe(EducationalTier.JuniorHigh);
      expect(engine.getMonsterBaselineTier(50)).toBe(EducationalTier.JuniorHigh);
    });

    it('maps level 51 - 100 to Senior High', () => {
      expect(engine.getMonsterBaselineTier(51)).toBe(EducationalTier.SeniorHigh);
      expect(engine.getMonsterBaselineTier(100)).toBe(EducationalTier.SeniorHigh);
    });

    it('maps level 101 - 150 to College', () => {
      expect(engine.getMonsterBaselineTier(101)).toBe(EducationalTier.College);
      expect(engine.getMonsterBaselineTier(150)).toBe(EducationalTier.College);
    });

    it('maps level 151 - 200 to Masters', () => {
      expect(engine.getMonsterBaselineTier(151)).toBe(EducationalTier.Masters);
      expect(engine.getMonsterBaselineTier(200)).toBe(EducationalTier.Masters);
    });

    it('maps level 201 - 250 to PhD', () => {
      expect(engine.getMonsterBaselineTier(201)).toBe(EducationalTier.PhD);
      expect(engine.getMonsterBaselineTier(250)).toBe(EducationalTier.PhD);
    });

    it('maps level 251+ to Specialization', () => {
      expect(engine.getMonsterBaselineTier(251)).toBe(EducationalTier.Specialization);
      expect(engine.getMonsterBaselineTier(500)).toBe(EducationalTier.Specialization);
    });
  });

  // ─── Prompt 11.3: Level Difference Calculation ────────────────────────────

  describe('calculateLevelDifference', () => {
    it('returns positive delta when monster is higher level', () => {
      const res = engine.calculateLevelDifference(5, 12);
      expect(res.deltaL).toBe(7);
      expect(res.isMonsterHigher).toBe(true);
      expect(res.isSameLevel).toBe(false);
      expect(res.isMonsterLower).toBe(false);
    });

    it('returns zero delta when levels are identical', () => {
      const res = engine.calculateLevelDifference(10, 10);
      expect(res.deltaL).toBe(0);
      expect(res.isMonsterHigher).toBe(false);
      expect(res.isSameLevel).toBe(true);
      expect(res.isMonsterLower).toBe(false);
    });

    it('returns negative delta when monster is lower level', () => {
      const res = engine.calculateLevelDifference(25, 5);
      expect(res.deltaL).toBe(-20);
      expect(res.isMonsterHigher).toBe(false);
      expect(res.isSameLevel).toBe(false);
      expect(res.isMonsterLower).toBe(true);
    });
  });

  // ─── Prompt 11.4 & 11.7: Higher Level Challenge Scenarios ──────────────────

  describe('createQuestionProfile — Higher Level Monsters', () => {
    it('handles slight difference (ΔL = 1..2) with harder within-tier questions and 10% timer cut', () => {
      const profile = engine.createQuestionProfile(SubjectId.Mathematics, 5, 7);
      expect(profile.baselineTier).toBe(EducationalTier.Elementary);
      expect(profile.targetTier).toBe(EducationalTier.Elementary); // stays in tier
      expect(profile.targetDifficulty).toBe(4);
      expect(profile.timerMultiplier).toBeCloseTo(0.9);
      expect(profile.rewardMultiplier).toBe(1.0);
    });

    it('handles moderate difference (ΔL = 3..4) with expert within-tier questions and 20% timer cut', () => {
      const profile = engine.createQuestionProfile(SubjectId.Mathematics, 5, 9);
      expect(profile.baselineTier).toBe(EducationalTier.Elementary);
      expect(profile.targetTier).toBe(EducationalTier.Elementary);
      expect(profile.targetDifficulty).toBe(5);
      expect(profile.timerMultiplier).toBeCloseTo(0.8);
      expect(profile.rewardMultiplier).toBe(1.0);
    });

    it('handles major difference (ΔL = 5..9) with +1 tier introductory questions', () => {
      // Player level 5 fighting monster level 10 (ΔL = 5)
      const profile = engine.createQuestionProfile(SubjectId.Mathematics, 5, 10);
      expect(profile.baselineTier).toBe(EducationalTier.Elementary);
      expect(profile.targetTier).toBe(EducationalTier.JuniorHigh); // +1 tier jump!
      expect(profile.targetDifficulty).toBe(1);
      expect(profile.timerMultiplier).toBeCloseTo(0.8);
    });

    it('handles tier jump (ΔL = 10..19) with +1 tier and 30% timer cut', () => {
      const profile = engine.createQuestionProfile(SubjectId.Mathematics, 5, 15);
      // Monster level 15 has Junior High baseline. ΔL = 10 -> +1 tier jump to Senior High
      expect(profile.baselineTier).toBe(EducationalTier.JuniorHigh);
      expect(profile.targetTier).toBe(EducationalTier.SeniorHigh);
      expect(profile.timerMultiplier).toBeCloseTo(0.7);
    });

    it('handles extreme difference (ΔL >= 20) with +2 tier jump and 40% timer cut', () => {
      const profile = engine.createQuestionProfile(SubjectId.Science, 5, 30);
      // Monster level 30 has Junior High baseline. ΔL = 25 -> +2 tier jump to College
      expect(profile.baselineTier).toBe(EducationalTier.JuniorHigh);
      expect(profile.targetTier).toBe(EducationalTier.College);
      expect(profile.timerMultiplier).toBeCloseTo(0.6);
    });
  });

  // ─── Prompt 11.5: Lower Level Monster Scenarios ───────────────────────────

  describe('createQuestionProfile — Lower Level Monsters', () => {
    it('sets introductory difficulty for weaker monster without penalty if difference < 10', () => {
      const profile = engine.createQuestionProfile(SubjectId.Mathematics, 10, 5);
      expect(profile.baselineTier).toBe(EducationalTier.Elementary);
      expect(profile.targetTier).toBe(EducationalTier.Elementary);
      expect(profile.targetDifficulty).toBe(1);
      expect(profile.rewardMultiplier).toBe(1.0);
    });

    it('applies diminishing reward multiplier when player is 10+ levels above monster', () => {
      // Player 25 fighting Monster 5 -> diff = 20 levels. Threshold = 10. (20-10) * 0.08 = 0.8 penalty. 1.0 - 0.8 = 0.2
      const profile = engine.createQuestionProfile(SubjectId.Mathematics, 25, 5);
      expect(profile.baselineTier).toBe(EducationalTier.Elementary);
      expect(profile.targetTier).toBe(EducationalTier.Elementary);
      expect(profile.targetDifficulty).toBe(1);
      expect(profile.rewardMultiplier).toBeCloseTo(0.2);
    });

    it('caps reward multiplier penalty at minimum floor (0.1)', () => {
      const profile = engine.createQuestionProfile(SubjectId.Mathematics, 100, 5);
      expect(profile.rewardMultiplier).toBe(0.1);
    });
  });

  // ─── Prompt 11.7: Boundary & Fallback Scenarios ────────────────────────────

  describe('resolveQuestionsWithFallback', () => {
    const loaded = loadBundledQuestions();
    const repo = new QuestionRepository(loaded.questions);

    it('resolves exact match when questions exist in bundled data', () => {
      // Elementary Math Lv 5 vs Lv 5 -> Elementary targetTier, diff 3
      const profile = engine.createQuestionProfile(SubjectId.Mathematics, 5, 5);
      const res = engine.resolveQuestionsWithFallback(repo, profile, 2);

      expect(res.questions.length).toBeGreaterThanOrEqual(1);
      expect(res.questions[0].subject).toBe(SubjectId.Mathematics);
    });

    it('falls back gracefully and records audit event when tier content is missing', () => {
      // College tier has no bundled questions in initial package
      const profile = engine.createQuestionProfile(SubjectId.Science, 5, 30);
      expect(profile.targetTier).toBe(EducationalTier.College);

      const res = engine.resolveQuestionsWithFallback(repo, profile, 2);

      expect(res.questions.length).toBeGreaterThan(0);
      expect(res.fallbackEvents.length).toBeGreaterThan(0);
      expect(res.fallbackEvents[0].requestedTier).toBe(EducationalTier.College);
      expect(res.fallbackEvents[0].reason).toContain('Insufficient questions');
    });
  });
});
