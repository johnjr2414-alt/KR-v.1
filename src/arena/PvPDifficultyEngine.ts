import type { ArenaCompetitor, PvPDifficultyProfile } from './ArenaTypes';
import { EducationalTier } from '../core/types/education';

/**
 * Contract for calculating PvP question difficulty according to the Reverse Difficulty Principle:
 * Lower-level player = Harder questions
 * Higher-level player = Easier questions
 *
 * Isolated completely from PvE DifficultyEngine.
 */
export interface PvPDifficultyService {
  /**
   * Calculates the difficulty profile for a specific combatant against their opponent.
   */
  calculateCombatantDifficulty(
    combatant: ArenaCompetitor,
    opponent: ArenaCompetitor,
  ): PvPDifficultyProfile;

  /**
   * Calculates paired difficulty profiles for both combatants in a match.
   */
  calculateMatchDifficulty(
    competitorA: ArenaCompetitor,
    competitorB: ArenaCompetitor,
  ): [PvPDifficultyProfile, PvPDifficultyProfile];
}

/**
 * Headless reference implementation of PvPDifficultyService.
 */
export class HeadlessPvPDifficultyEngine implements PvPDifficultyService {
  calculateCombatantDifficulty(
    combatant: ArenaCompetitor,
    opponent: ArenaCompetitor,
  ): PvPDifficultyProfile {
    const deltaLevel = opponent.level - combatant.level;

    // Default baseline for even match
    let tier = EducationalTier.JuniorHigh;
    let targetDifficulty = 3;
    let timeLimitSeconds = 30;
    let handicapNote = 'Balanced matchmaking tier';

    if (deltaLevel > 0) {
      // Combatant is LOWER level than opponent -> Cognitive handicap: HARDER questions
      if (deltaLevel >= 5) {
        tier = EducationalTier.SeniorHigh;
        targetDifficulty = 5;
        timeLimitSeconds = 20;
        handicapNote = `Heavy Cognitive Challenge (Lower Level Handicap: -${deltaLevel} Lv)`;
      } else {
        tier = EducationalTier.JuniorHigh;
        targetDifficulty = 4;
        timeLimitSeconds = 25;
        handicapNote = `Moderate Cognitive Challenge (Lower Level Handicap: -${deltaLevel} Lv)`;
      }
    } else if (deltaLevel < 0) {
      // Combatant is HIGHER level than opponent -> Cognitive handicap: EASIER questions
      const advantage = Math.abs(deltaLevel);
      if (advantage >= 5) {
        tier = EducationalTier.Elementary;
        targetDifficulty = 1;
        timeLimitSeconds = 40;
        handicapNote = `Relaxed Cognitive Tier (Higher Level Handicap: +${advantage} Lv)`;
      } else {
        tier = EducationalTier.JuniorHigh;
        targetDifficulty = 2;
        timeLimitSeconds = 35;
        handicapNote = `Mild Cognitive Tier (Higher Level Handicap: +${advantage} Lv)`;
      }
    }

    return {
      combatantId: combatant.id,
      opponentId: opponent.id,
      tier,
      targetDifficulty,
      timeLimitSeconds,
      handicapNote,
    };
  }

  calculateMatchDifficulty(
    competitorA: ArenaCompetitor,
    competitorB: ArenaCompetitor,
  ): [PvPDifficultyProfile, PvPDifficultyProfile] {
    return [
      this.calculateCombatantDifficulty(competitorA, competitorB),
      this.calculateCombatantDifficulty(competitorB, competitorA),
    ];
  }
}

export const pvpDifficultyEngine = new HeadlessPvPDifficultyEngine();
