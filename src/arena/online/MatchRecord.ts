import type { EducationalTier, SubjectId } from '../../core/types/education';

/** Version of the persisted match-record shape. */
export const MATCH_RECORD_SCHEMA_VERSION = 1;

/** Competitive modes that can produce a match record. */
export type MatchMode = 'ranked-duel' | 'unranked-duel' | 'tournament' | 'practice';

/** Lifecycle of a stored match record. */
export type MatchRecordStatus = 'in-progress' | 'completed' | 'draw' | 'no-contest' | 'abandoned';

/** Per-participant result inside a stored match. */
export type MatchParticipantOutcome = 'win' | 'loss' | 'draw' | 'no-contest' | 'forfeit';

/** Participant snapshot taken when the match starts. */
export interface MatchParticipantRecord {
  accountId: string;
  characterId: string;
  displayName: string;
  level: number;
  ratingBefore: number;
  ratingAfter?: number;
  outcome: MatchParticipantOutcome;
  score: number;
  roundsWon: number;
  disconnected: boolean;
}

/** Difficulty profile assigned to one participant for a round. */
export interface MatchRoundProfile {
  tier: EducationalTier;
  targetDifficulty: number;
  timeLimitSeconds: number;
}

/** One participant's submitted answer (or timeout) for a round. */
export interface MatchRoundAnswer {
  submittedAnswer?: string;
  isCorrect: boolean;
  timedOut: boolean;
  submittedAtMs?: number;
}

/** One round of a stored match, keyed by character id. */
export interface MatchRoundRecord {
  roundNumber: number;
  subject: SubjectId;
  questionIds: Readonly<Record<string, string>>;
  profiles: Readonly<Record<string, MatchRoundProfile>>;
  answers: Readonly<Record<string, MatchRoundAnswer>>;
  resolvedAtMs?: number;
}

/**
 * Immutable, server-authored record of one match.
 *
 * This is the single evidence source for match history, rating changes,
 * leaderboards, tournaments, guild standing, and moderation review. Clients may
 * display it but never author it.
 */
export interface MatchRecord {
  schemaVersion: typeof MATCH_RECORD_SCHEMA_VERSION;
  matchId: string;
  mode: MatchMode;
  seasonId?: string;
  rulesVersion: string;
  contentVersion: string;
  status: MatchRecordStatus;
  participants: readonly [MatchParticipantRecord, MatchParticipantRecord];
  rounds: readonly MatchRoundRecord[];
  winnerCharacterId?: string;
  createdAtMs: number;
  resolvedAtMs?: number;
}

/** True once the match can no longer change. */
export function isTerminalMatchStatus(status: MatchRecordStatus): boolean {
  return status !== 'in-progress';
}
