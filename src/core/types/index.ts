// Core shared type definitions — barrel export.
// Each type file is focused on a single domain concern.

export type { CharacterStats, PlayerState } from './player';
export type { MonsterDefinition, DropEntry, MonsterDropConfig } from './monster';
export { MonsterCategory } from './monster';
export type { Question, QuestionChoice, QuestionSource } from './question';
export {
  QuestionType,
  QuestionStatus,
  ContentReviewStatus,
  QUESTION_DIFFICULTY_MIN,
  QUESTION_DIFFICULTY_MAX,
  QUESTION_TIMER_MIN_SECONDS,
  QUESTION_TIMER_MAX_SECONDS,
  QUESTION_TIMER_RECOMMENDED_MIN_SECONDS,
  QUESTION_TIMER_RECOMMENDED_MAX_SECONDS,
  QUESTION_ID_MAX_LENGTH,
  isValidDifficulty,
} from './question';
export { EducationalTier, SubjectId } from './education';
export type { MasteryRecord, MasteryGainResult } from './mastery';
export type { CombatTurnResult, BattleResult } from './combat';
export { AnswerOutcome, BattleOutcome } from './combat';
