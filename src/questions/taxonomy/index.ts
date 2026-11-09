/** Question taxonomy — subject/topic structure, validation, and coverage. */

export type {
  SubjectTaxonomyEntry,
  SubtopicTaxonomyEntry,
  TopicTaxonomyEntry,
  TopicMappingEntry,
  TaxonomyValidationIssue,
  TaxonomyValidationResult,
  QuestionTopicClassification,
  SubjectCoverageSummary,
  TopicCoverageSummary,
  TaxonomyCoverageReport,
} from './TaxonomyTypes';

export {
  buildTopicId,
  SUBJECT_TAXONOMY,
  TOPIC_TAXONOMY,
  QUESTION_TOPIC_MAPPINGS,
} from './TaxonomyData';

export {
  TOPIC_ID_PATTERN,
  isValidTopicId,
  validateTaxonomy,
} from './TaxonomyValidator';

export {
  getSubjectEntry,
  getSubjectDisplayName,
  getTopicById,
  getTopicsForSubject,
  resolveRawTopicsForTopic,
  classifyQuestion,
  buildTaxonomyCoverageReport,
} from './TaxonomyCoverage';
