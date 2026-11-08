import { describe, it, expect } from 'vitest';
import { HeadlessPvPDifficultyEngine } from '../../src/arena/PvPDifficultyEngine';
import type { ArenaCompetitor } from '../../src/arena/ArenaTypes';
import { EducationalTier } from '../../src/core/types/education';

describe('PvP Difficulty Engine (Prompt 19.3)', () => {
  const engine = new HeadlessPvPDifficultyEngine();

  const lowLevelPlayer: ArenaCompetitor = {
    id: 'player-low',
    displayName: 'Novice Student',
    level: 2,
  };

  const highLevelPlayer: ArenaCompetitor = {
    id: 'player-high',
    displayName: 'Veteran Knight',
    level: 10,
  };

  const evenPlayerA: ArenaCompetitor = {
    id: 'player-a',
    displayName: 'Adept A',
    level: 5,
  };

  const evenPlayerB: ArenaCompetitor = {
    id: 'player-b',
    displayName: 'Adept B',
    level: 5,
  };

  it('assigns balanced difficulty when players have identical levels', () => {
    const [profileA, profileB] = engine.calculateMatchDifficulty(evenPlayerA, evenPlayerB);

    expect(profileA.tier).toBe(EducationalTier.JuniorHigh);
    expect(profileA.targetDifficulty).toBe(3);
    expect(profileB.tier).toBe(EducationalTier.JuniorHigh);
    expect(profileB.targetDifficulty).toBe(3);
  });

  it('enforces the Reverse Difficulty Rule: Lower-level player receives harder questions', () => {
    // Delta = 10 - 2 = +8 level difference
    const lowProfile = engine.calculateCombatantDifficulty(lowLevelPlayer, highLevelPlayer);

    expect(lowProfile.tier).toBe(EducationalTier.SeniorHigh);
    expect(lowProfile.targetDifficulty).toBe(5);
    expect(lowProfile.timeLimitSeconds).toBeLessThan(30);
    expect(lowProfile.handicapNote).toContain('Lower Level Handicap');
  });

  it('enforces the Reverse Difficulty Rule: Higher-level player receives easier questions', () => {
    // Delta = 2 - 10 = -8 level difference
    const highProfile = engine.calculateCombatantDifficulty(highLevelPlayer, lowLevelPlayer);

    expect(highProfile.tier).toBe(EducationalTier.Elementary);
    expect(highProfile.targetDifficulty).toBe(1);
    expect(highProfile.timeLimitSeconds).toBeGreaterThan(30);
    expect(highProfile.handicapNote).toContain('Higher Level Handicap');
  });
});
