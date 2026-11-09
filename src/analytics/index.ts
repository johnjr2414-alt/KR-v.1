/** Learning analytics — headless statistics over recorded answer attempts. */

export {
  LEARNING_ANALYTICS_SNAPSHOT_VERSION,
  type AnswerAttemptEvent,
  type QuestionAggregate,
  type AccuracyAggregate,
  type LearningAnalyticsSnapshot,
  type IngestResult,
  type LearningAnalyticsOptions,
  type AccuracySummary,
  type SubjectLearningStat,
  type TopicLearningStat,
  type MissedStat,
  type MasteryProgressStat,
  type LearningStatistics,
} from './AnalyticsTypes';

export {
  LearningAnalytics,
  isValidAnswerAttemptEvent,
  sanitizeAnalyticsSnapshot,
  buildMasteryProgress,
  computeLearningStatistics,
} from './LearningAnalytics';
