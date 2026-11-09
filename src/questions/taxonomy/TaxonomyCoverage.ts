import { SubjectId } from '../../core/types/education';
import type { Question } from '../../core/types/question';
import { QUESTION_TOPIC_MAPPINGS, SUBJECT_TAXONOMY, TOPIC_TAXONOMY } from './TaxonomyData';
import type {
  QuestionTopicClassification,
  SubjectTaxonomyEntry,
  SubjectCoverageSummary,
  TaxonomyCoverageReport,
  TopicCoverageSummary,
  TopicTaxonomyEntry,
} from './TaxonomyTypes';

// ─── Lookups ─────────────────────────────────────────────────────────────────

/** Returns the taxonomy node for a subject, or undefined. */
export function getSubjectEntry(subject: SubjectId): SubjectTaxonomyEntry | undefined {
  return SUBJECT_TAXONOMY.find((entry) => entry.id === subject);
}

/** Returns the human-readable subject label, falling back to the raw id. */
export function getSubjectDisplayName(subject: SubjectId): string {
  return getSubjectEntry(subject)?.displayName ?? subject;
}

/** Returns a taxonomy topic by its canonical id, or undefined. */
export function getTopicById(topicId: string): TopicTaxonomyEntry | undefined {
  return TOPIC_TAXONOMY.find((topic) => topic.id === topicId);
}

/** Returns every topic declared under a subject. */
export function getTopicsForSubject(subject: SubjectId): TopicTaxonomyEntry[] {
  return TOPIC_TAXONOMY.filter((topic) => topic.subject === subject);
}

/**
 * Returns the raw topic strings that resolve to a canonical topic id.
 * Used by the admin filter to translate a taxonomy choice into the exact
 * strings stored on question records.
 */
export function resolveRawTopicsForTopic(topicId: string): string[] {
  return QUESTION_TOPIC_MAPPINGS
    .filter((mapping) => mapping.topicId === topicId)
    .map((mapping) => mapping.rawTopic);
}

// ─── Classification ──────────────────────────────────────────────────────────

/**
 * Matches a question's `subject`, `topic`, and optional `subtopic` against
 * the taxonomy. Read-only: it never rewrites the record.
 */
export function classifyQuestion(
  question: Pick<Question, 'subject' | 'topic' | 'subtopic'>,
): QuestionTopicClassification {
  const subject = getSubjectEntry(question.subject);
  const mapping = QUESTION_TOPIC_MAPPINGS.find(
    (entry) => entry.subject === question.subject && entry.rawTopic === question.topic,
  );
  const topic = mapping ? getTopicById(mapping.topicId) : undefined;

  if (!mapping || !topic) {
    return {
      subject,
      topic: undefined,
      mapped: false,
      subtopic: undefined,
      subtopicMapped: false,
      reason: `No taxonomy topic maps subject "${question.subject}" and topic "${question.topic}".`,
    };
  }

  let subtopic = undefined;
  let subtopicMapped = true;
  if (question.subtopic !== undefined) {
    subtopic = topic.subtopics.find((entry) => entry.id === question.subtopic);
    subtopicMapped = subtopic !== undefined;
  }

  return {
    subject,
    topic,
    mapped: true,
    subtopic,
    subtopicMapped,
    reason: '',
  };
}

// ─── Coverage report ─────────────────────────────────────────────────────────

/**
 * Builds a non-mutating coverage report describing how the taxonomy lines up
 * with an actual question pool. Unmapped questions are listed, never changed.
 */
export function buildTaxonomyCoverageReport(questions: readonly Question[]): TaxonomyCoverageReport {
  const topicCounts = new Map<string, number>();
  const bySubject = new Map<SubjectId, SubjectCoverageSummary>();
  for (const subject of Object.values(SubjectId)) {
    bySubject.set(subject, { subject, total: 0, mapped: 0, unmapped: 0 });
  }

  const unmappedQuestions: TaxonomyCoverageReport['unmappedQuestions'] = [];
  let mappedCount = 0;

  for (const question of questions) {
    const summary = bySubject.get(question.subject);
    if (summary) summary.total += 1;

    const classification = classifyQuestion(question);
    if (classification.mapped && classification.topic) {
      mappedCount += 1;
      if (summary) summary.mapped += 1;
      topicCounts.set(classification.topic.id, (topicCounts.get(classification.topic.id) ?? 0) + 1);
    } else {
      if (summary) summary.unmapped += 1;
      unmappedQuestions.push({ id: question.id, subject: question.subject, topic: question.topic });
    }
  }

  const byTopic: TopicCoverageSummary[] = TOPIC_TAXONOMY.map((topic) => ({
    topicId: topic.id,
    subject: topic.subject,
    questionCount: topicCounts.get(topic.id) ?? 0,
    tiers: [...topic.tiers],
  }));

  const subjectsWithContent: SubjectId[] = [];
  const subjectsWithoutContent: SubjectId[] = [];
  for (const subject of Object.values(SubjectId)) {
    if (getTopicsForSubject(subject).length > 0) {
      subjectsWithContent.push(subject);
    } else {
      subjectsWithoutContent.push(subject);
    }
  }

  return {
    totalQuestions: questions.length,
    mappedCount,
    unmappedCount: unmappedQuestions.length,
    unmappedQuestions,
    bySubject: [...bySubject.values()],
    byTopic,
    subjectsWithContent,
    subjectsWithoutContent,
  };
}
