import { SubjectId } from '../core/types/education';
import type { MasteryRecord } from '../core/types/mastery';

/**
 * Creates an initial mastery record for a given subject at Level 1 with 0 EXP.
 */
export function createInitialMasteryRecord(subject: SubjectId): MasteryRecord {
  return {
    subject,
    level: 1,
    currentExp: 0,
    totalCorrect: 0,
    totalAttempted: 0,
  };
}

/**
 * Creates the full initial set of mastery records covering all active SubjectId enum values.
 */
export function createInitialMasteryMap(): Record<SubjectId, MasteryRecord> {
  const subjects = Object.values(SubjectId) as SubjectId[];
  const map = {} as Record<SubjectId, MasteryRecord>;
  for (const subject of subjects) {
    map[subject] = createInitialMasteryRecord(subject);
  }
  return map;
}
