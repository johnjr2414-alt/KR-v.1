import { EducationalTier, SubjectId } from '../../core/types/education';
import type {
  SubjectTaxonomyEntry,
  TopicMappingEntry,
  TopicTaxonomyEntry,
} from './TaxonomyTypes';

/**
 * Builds a canonical topic id from a subject id and a short slug.
 *
 * Topic ids are namespaced by subject so they stay globally unique and
 * collision-free — for example the `physics` topic under `science` does not
 * collide with the `physics` subject id.
 */
export function buildTopicId(subject: SubjectId, slug: string): string {
  return `${subject}.${slug}`;
}

/**
 * Subject nodes for every declared {@link SubjectId}.
 *
 * `tiers` reflect the tiers that actually have bundled content. `physics`
 * and `business` are declared subjects that currently have no questions, so
 * they carry an empty tier list rather than an invented one.
 */
export const SUBJECT_TAXONOMY: readonly SubjectTaxonomyEntry[] = [
  {
    id: SubjectId.Mathematics,
    displayName: 'Mathematics',
    description: 'Arithmetic, algebra, and geometry.',
    tiers: [EducationalTier.Elementary, EducationalTier.JuniorHigh],
  },
  {
    id: SubjectId.GeneralKnowledge,
    displayName: 'General Knowledge',
    description: 'Geography, animals, and world trivia.',
    tiers: [EducationalTier.Elementary],
  },
  {
    id: SubjectId.Science,
    displayName: 'Science',
    description: 'Biology, chemistry, physics, and earth science.',
    tiers: [EducationalTier.Elementary, EducationalTier.JuniorHigh],
  },
  {
    id: SubjectId.Programming,
    displayName: 'Programming',
    description: 'Logic, algorithms, and number systems.',
    tiers: [EducationalTier.Elementary],
  },
  {
    id: SubjectId.Physics,
    displayName: 'Physics',
    description: 'Declared subject. No bundled questions yet.',
    tiers: [],
  },
  {
    id: SubjectId.Business,
    displayName: 'Business',
    description: 'Declared subject. No bundled questions yet.',
    tiers: [],
  },
];

/**
 * Topic nodes derived from the bundled question bank.
 *
 * Only topics that exist in the current data are listed. Tiers record where
 * the topic actually appears, not where it might appear in the future.
 */
export const TOPIC_TAXONOMY: readonly TopicTaxonomyEntry[] = [
  // Mathematics
  {
    id: buildTopicId(SubjectId.Mathematics, 'addition'),
    subject: SubjectId.Mathematics,
    displayName: 'Addition',
    description: 'Adding whole numbers.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Mathematics, 'subtraction'),
    subject: SubjectId.Mathematics,
    displayName: 'Subtraction',
    description: 'Subtracting whole numbers.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Mathematics, 'multiplication'),
    subject: SubjectId.Mathematics,
    displayName: 'Multiplication',
    description: 'Multiplying whole numbers.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Mathematics, 'division'),
    subject: SubjectId.Mathematics,
    displayName: 'Division',
    description: 'Dividing whole numbers.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Mathematics, 'fractions'),
    subject: SubjectId.Mathematics,
    displayName: 'Fractions',
    description: 'Working with fractions.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Mathematics, 'algebra'),
    subject: SubjectId.Mathematics,
    displayName: 'Algebra',
    description: 'Linear equations and simplification.',
    tiers: [EducationalTier.JuniorHigh],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Mathematics, 'geometry'),
    subject: SubjectId.Mathematics,
    displayName: 'Geometry',
    description: 'Area and plane figures.',
    tiers: [EducationalTier.JuniorHigh],
    subtopics: [],
  },

  // Science
  {
    id: buildTopicId(SubjectId.Science, 'biology'),
    subject: SubjectId.Science,
    displayName: 'Biology',
    description: 'Living things, plants, and body systems.',
    tiers: [EducationalTier.Elementary, EducationalTier.JuniorHigh],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Science, 'states-of-matter'),
    subject: SubjectId.Science,
    displayName: 'States of Matter',
    description: 'Solids, liquids, and gases.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Science, 'solar-system'),
    subject: SubjectId.Science,
    displayName: 'Solar System',
    description: 'Planets and the Sun.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Science, 'chemistry'),
    subject: SubjectId.Science,
    displayName: 'Chemistry',
    description: 'Symbols and compounds.',
    tiers: [EducationalTier.JuniorHigh],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Science, 'physics'),
    subject: SubjectId.Science,
    displayName: 'Physics',
    description: 'Matter, energy, and measurement units.',
    tiers: [EducationalTier.JuniorHigh],
    subtopics: [],
  },

  // General Knowledge
  {
    id: buildTopicId(SubjectId.GeneralKnowledge, 'geography'),
    subject: SubjectId.GeneralKnowledge,
    displayName: 'Geography',
    description: 'Oceans, continents, and landforms.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.GeneralKnowledge, 'animals'),
    subject: SubjectId.GeneralKnowledge,
    displayName: 'Animals',
    description: 'Animal facts and records.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },

  // Programming
  {
    id: buildTopicId(SubjectId.Programming, 'logic'),
    subject: SubjectId.Programming,
    displayName: 'Logic',
    description: 'Flowcharts and branching logic.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
  {
    id: buildTopicId(SubjectId.Programming, 'binary'),
    subject: SubjectId.Programming,
    displayName: 'Binary',
    description: 'Binary and other number systems.',
    tiers: [EducationalTier.Elementary],
    subtopics: [],
  },
];

/**
 * Reviewable mapping from raw `question.topic` strings to canonical topic ids.
 *
 * This is an explicit, human-editable table. Nothing rewrites stored
 * questions; the mapping is applied at read time only. Every raw topic found
 * in the bundled bank is listed here, so a coverage report over that bank
 * should show zero unmapped questions.
 */
export const QUESTION_TOPIC_MAPPINGS: readonly TopicMappingEntry[] = [
  // Mathematics — elementary
  { subject: SubjectId.Mathematics, rawTopic: 'addition', topicId: buildTopicId(SubjectId.Mathematics, 'addition') },
  { subject: SubjectId.Mathematics, rawTopic: 'subtraction', topicId: buildTopicId(SubjectId.Mathematics, 'subtraction') },
  { subject: SubjectId.Mathematics, rawTopic: 'multiplication', topicId: buildTopicId(SubjectId.Mathematics, 'multiplication') },
  { subject: SubjectId.Mathematics, rawTopic: 'division', topicId: buildTopicId(SubjectId.Mathematics, 'division') },
  { subject: SubjectId.Mathematics, rawTopic: 'fractions', topicId: buildTopicId(SubjectId.Mathematics, 'fractions') },
  // Mathematics — junior high
  { subject: SubjectId.Mathematics, rawTopic: 'algebra', topicId: buildTopicId(SubjectId.Mathematics, 'algebra') },
  { subject: SubjectId.Mathematics, rawTopic: 'geometry', topicId: buildTopicId(SubjectId.Mathematics, 'geometry') },

  // Science
  { subject: SubjectId.Science, rawTopic: 'biology', topicId: buildTopicId(SubjectId.Science, 'biology') },
  { subject: SubjectId.Science, rawTopic: 'states-of-matter', topicId: buildTopicId(SubjectId.Science, 'states-of-matter') },
  { subject: SubjectId.Science, rawTopic: 'solar-system', topicId: buildTopicId(SubjectId.Science, 'solar-system') },
  { subject: SubjectId.Science, rawTopic: 'chemistry', topicId: buildTopicId(SubjectId.Science, 'chemistry') },
  { subject: SubjectId.Science, rawTopic: 'physics', topicId: buildTopicId(SubjectId.Science, 'physics') },

  // General Knowledge
  { subject: SubjectId.GeneralKnowledge, rawTopic: 'geography', topicId: buildTopicId(SubjectId.GeneralKnowledge, 'geography') },
  { subject: SubjectId.GeneralKnowledge, rawTopic: 'animals', topicId: buildTopicId(SubjectId.GeneralKnowledge, 'animals') },

  // Programming
  { subject: SubjectId.Programming, rawTopic: 'logic', topicId: buildTopicId(SubjectId.Programming, 'logic') },
  { subject: SubjectId.Programming, rawTopic: 'binary', topicId: buildTopicId(SubjectId.Programming, 'binary') },
];
