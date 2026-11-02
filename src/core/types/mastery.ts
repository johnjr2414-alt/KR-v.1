import type { SubjectId } from './education';

/**
 * Mastery record for a single academic subject.
 */
export interface MasteryRecord {
  /** The academic discipline tracked. */
  subject: SubjectId;
  /** Current mastery level within this subject. */
  level: number;
  /** Accumulated mastery EXP toward next mastery level. */
  currentExp: number;
  /** Lifetime total correct answers in this subject. */
  totalCorrect: number;
  /** Lifetime total questions attempted in this subject. */
  totalAttempted: number;
}

/**
 * Result of a single mastery EXP award calculation.
 */
export interface MasteryGainResult {
  /** Subject that received the gain. */
  subject: SubjectId;
  /** Raw mastery EXP awarded (0 if incorrect). */
  expGained: number;
  /** Whether a mastery level-up occurred. */
  leveledUp: boolean;
  /** New mastery level after the gain. */
  newLevel: number;
}
