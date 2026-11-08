import type { SubjectId, EducationalTier } from '../core/types/education';

/**
 * Competitive arena game modes.
 */
export enum ArenaMatchMode {
  Duel = 'duel',
  RankedTournament = 'ranked-tournament',
  PracticeSparring = 'practice-sparring',
}

/**
 * State of an arena combat session.
 */
export enum ArenaMatchStatus {
  WaitingForOpponent = 'waiting-for-opponent',
  InProgress = 'in-progress',
  Resolved = 'resolved',
  Cancelled = 'cancelled',
}

/**
 * Competitor profile representation inside the Arena.
 */
export interface ArenaCompetitor {
  id: string;
  displayName: string;
  level: number;
  rating?: number;
  subjectFocus?: SubjectId;
}

/**
 * Arena match structure for tournament or duel encounters.
 */
export interface ArenaMatchDefinition {
  matchId: string;
  mode: ArenaMatchMode;
  status: ArenaMatchStatus;
  competitors: [ArenaCompetitor, ArenaCompetitor];
  activeSubject: SubjectId;
  roundLimit: number;
  timePerTurnSeconds: number;
  winnerId?: string;
  createdAt: number;
  resolvedAt?: number;
}

/**
 * Difficulty parameters determined for a combatant in a PvP match.
 */
export interface PvPDifficultyProfile {
  combatantId: string;
  opponentId: string;
  tier: EducationalTier;
  targetDifficulty: number; // 1 to 5
  timeLimitSeconds: number;
  handicapNote: string;
}
