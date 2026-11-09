import { EducationalTier, SubjectId } from '../../core/types/education';
import { QUESTION_TOPIC_MAPPINGS, SUBJECT_TAXONOMY, TOPIC_TAXONOMY } from './TaxonomyData';
import type {
  SubjectTaxonomyEntry,
  TaxonomyValidationIssue,
  TaxonomyValidationResult,
  TopicMappingEntry,
  TopicTaxonomyEntry,
} from './TaxonomyTypes';

/**
 * A topic id is `<subjectId>.<topicSlug>`. Both halves are lowercase
 * slugs (letters, digits, and single hyphens), matching the stable id
 * convention used elsewhere in the project.
 */
export const TOPIC_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when `id` is a well-formed canonical topic id. */
export function isValidTopicId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && TOPIC_ID_PATTERN.test(id);
}

/**
 * Validates taxonomy integrity.
 *
 * The check is structural only: it enforces stable, unique ids, non-empty
 * labels, valid tier values, valid subject references, and mapping
 * consistency. It does not judge whether a topic is educationally
 * appropriate, and it does not alter any data.
 */
export function validateTaxonomy(
  subjects: readonly SubjectTaxonomyEntry[] = SUBJECT_TAXONOMY,
  topics: readonly TopicTaxonomyEntry[] = TOPIC_TAXONOMY,
  mappings: readonly TopicMappingEntry[] = QUESTION_TOPIC_MAPPINGS,
): TaxonomyValidationResult {
  const issues: TaxonomyValidationIssue[] = [];
  const validSubjects = new Set<string>(Object.values(SubjectId));
  const validTiers = new Set<string>(Object.values(EducationalTier));

  // ── Subjects ────────────────────────────────────────────────────────────
  const seenSubjects = new Set<string>();
  for (const subject of subjects) {
    if (!validSubjects.has(subject.id)) {
      issues.push({
        code: 'unknown-subject-id',
        field: `subject:${subject.id}`,
        message: `Subject id "${subject.id}" is not a known SubjectId value.`,
      });
    }
    if (seenSubjects.has(subject.id)) {
      issues.push({
        code: 'duplicate-subject-id',
        field: `subject:${subject.id}`,
        message: `Subject id "${subject.id}" is declared more than once.`,
      });
    }
    seenSubjects.add(subject.id);

    if (!subject.displayName || subject.displayName.trim() === '') {
      issues.push({
        code: 'empty-subject-display-name',
        field: `subject:${subject.id}.displayName`,
        message: 'Subject display name must be a non-empty string.',
      });
    }

    pushTierIssues(issues, `subject:${subject.id}`, subject.tiers, validTiers);
  }

  // Every declared subject should have a taxonomy node.
  for (const id of validSubjects) {
    if (!seenSubjects.has(id)) {
      issues.push({
        code: 'missing-subject-node',
        field: `subject:${id}`,
        message: `Subject "${id}" has no taxonomy entry.`,
      });
    }
  }

  // ── Topics ──────────────────────────────────────────────────────────────
  const seenTopicIds = new Set<string>();
  for (const topic of topics) {
    if (!isValidTopicId(topic.id)) {
      issues.push({
        code: 'invalid-topic-id',
        field: `topic:${topic.id}`,
        message: `Topic id "${topic.id}" must be a lowercase "<subject>.<slug>" identifier.`,
      });
    }
    if (seenTopicIds.has(topic.id)) {
      issues.push({
        code: 'duplicate-topic-id',
        field: `topic:${topic.id}`,
        message: `Topic id "${topic.id}" is declared more than once.`,
      });
    }
    seenTopicIds.add(topic.id);

    if (!validSubjects.has(topic.subject)) {
      issues.push({
        code: 'unknown-topic-subject',
        field: `topic:${topic.id}.subject`,
        message: `Topic "${topic.id}" references unknown subject "${topic.subject}".`,
      });
    } else if (!topic.id.startsWith(`${topic.subject}.`)) {
      issues.push({
        code: 'topic-id-subject-mismatch',
        field: `topic:${topic.id}`,
        message: `Topic id "${topic.id}" must start with its subject prefix "${topic.subject}.".`,
      });
    }

    if (!topic.displayName || topic.displayName.trim() === '') {
      issues.push({
        code: 'empty-topic-display-name',
        field: `topic:${topic.id}.displayName`,
        message: 'Topic display name must be a non-empty string.',
      });
    }

    pushTierIssues(issues, `topic:${topic.id}`, topic.tiers, validTiers);

    const seenSubtopics = new Set<string>();
    for (const subtopic of topic.subtopics) {
      if (!subtopic.id || subtopic.id.trim() === '') {
        issues.push({
          code: 'empty-subtopic-id',
          field: `topic:${topic.id}.subtopic`,
          message: 'Subtopic id must be a non-empty string.',
        });
      }
      if (seenSubtopics.has(subtopic.id)) {
        issues.push({
          code: 'duplicate-subtopic-id',
          field: `topic:${topic.id}.subtopic:${subtopic.id}`,
          message: `Subtopic id "${subtopic.id}" is declared more than once under topic "${topic.id}".`,
        });
      }
      seenSubtopics.add(subtopic.id);

      if (!subtopic.displayName || subtopic.displayName.trim() === '') {
        issues.push({
          code: 'empty-subtopic-display-name',
          field: `topic:${topic.id}.subtopic:${subtopic.id}.displayName`,
          message: 'Subtopic display name must be a non-empty string.',
        });
      }
    }
  }

  // ── Mappings ────────────────────────────────────────────────────────────
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const seenRawKeys = new Set<string>();
  for (const mapping of mappings) {
    const key = `${mapping.subject}\u0000${mapping.rawTopic}`;
    if (!mapping.rawTopic || mapping.rawTopic.trim() === '') {
      issues.push({
        code: 'empty-raw-topic',
        field: `mapping:${mapping.subject}`,
        message: 'Mapping raw topic must be a non-empty string.',
      });
    }
    if (!validSubjects.has(mapping.subject)) {
      issues.push({
        code: 'unknown-mapping-subject',
        field: `mapping:${mapping.subject}`,
        message: `Mapping references unknown subject "${mapping.subject}".`,
      });
    }
    if (seenRawKeys.has(key)) {
      issues.push({
        code: 'duplicate-mapping',
        field: `mapping:${mapping.subject}:${mapping.rawTopic}`,
        message: `Raw topic "${mapping.rawTopic}" is mapped more than once under subject "${mapping.subject}".`,
      });
    }
    seenRawKeys.add(key);

    const target = topicById.get(mapping.topicId);
    if (!target) {
      issues.push({
        code: 'unknown-mapping-topic',
        field: `mapping:${mapping.subject}:${mapping.rawTopic}`,
        message: `Mapping target topic "${mapping.topicId}" is not defined.`,
      });
    } else if (target.subject !== mapping.subject) {
      issues.push({
        code: 'mapping-subject-mismatch',
        field: `mapping:${mapping.subject}:${mapping.rawTopic}`,
        message: `Mapping subject "${mapping.subject}" does not match target topic subject "${target.subject}".`,
      });
    }
  }

  return { isValid: issues.length === 0, issues };
}

function pushTierIssues(
  issues: TaxonomyValidationIssue[],
  field: string,
  tiers: readonly EducationalTier[],
  validTiers: Set<string>,
): void {
  const seen = new Set<string>();
  for (const tier of tiers) {
    if (!validTiers.has(tier)) {
      issues.push({
        code: 'invalid-tier',
        field: `${field}.tiers`,
        message: `Tier "${tier}" is not a known EducationalTier value.`,
      });
    }
    if (seen.has(tier)) {
      issues.push({
        code: 'duplicate-tier',
        field: `${field}.tiers`,
        message: `Tier "${tier}" is listed more than once.`,
      });
    }
    seen.add(tier);
  }
}
