import { describe, it, expect } from 'vitest';
import { QuestionType, QuestionStatus, type Question } from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import {
  buildTopicId,
  SUBJECT_TAXONOMY,
  TOPIC_TAXONOMY,
  QUESTION_TOPIC_MAPPINGS,
  isValidTopicId,
  validateTaxonomy,
  getSubjectDisplayName,
  getTopicsForSubject,
  resolveRawTopicsForTopic,
  classifyQuestion,
  buildTaxonomyCoverageReport,
} from '../../src/questions/taxonomy';
import type { SubjectTaxonomyEntry, TopicTaxonomyEntry } from '../../src/questions/taxonomy';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'test-q',
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Mathematics,
    topic: 'addition',
    difficulty: 1,
    type: QuestionType.MultipleChoice,
    question: 'Test?',
    choices: [
      { choiceId: 'a', text: 'A' },
      { choiceId: 'b', text: 'B' },
    ],
    correctAnswer: 'a',
    timeLimit: 10,
    baseMasteryExp: 10,
    status: QuestionStatus.Published,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Deep clone of the shipped topic list so negative tests cannot mutate it. */
function cloneTopics(): TopicTaxonomyEntry[] {
  return TOPIC_TAXONOMY.map((topic) => ({
    ...topic,
    tiers: [...topic.tiers],
    subtopics: topic.subtopics.map((subtopic) => ({ ...subtopic })),
  }));
}

const codes = (result: ReturnType<typeof validateTaxonomy>): string[] =>
  result.issues.map((issue) => issue.code);

// ─── Structural validation ───────────────────────────────────────────────────

describe('Phase 25.2 taxonomy — validation', () => {
  it('accepts the shipped taxonomy without issues', () => {
    const result = validateTaxonomy();
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('validates stable topic id shape', () => {
    expect(isValidTopicId('mathematics.addition')).toBe(true);
    expect(isValidTopicId('science.states-of-matter')).toBe(true);

    expect(isValidTopicId('mathematics')).toBe(false);
    expect(isValidTopicId('mathematics.addition.extra')).toBe(false);
    expect(isValidTopicId('Math.Addition')).toBe(false);
    expect(isValidTopicId('mathematics.addition ')).toBe(false);
    expect(isValidTopicId('')).toBe(false);
  });

  it('flags invalid, duplicate, and misnamespaced topic ids', () => {
    const topics: TopicTaxonomyEntry[] = [
      ...cloneTopics(),
      { id: 'BadID', subject: SubjectId.Mathematics, displayName: 'Bad', description: '', tiers: [], subtopics: [] },
      { id: 'mathematics.chemistry', subject: SubjectId.Science, displayName: 'Mismatch', description: '', tiers: [], subtopics: [] },
      { ...cloneTopics()[0] },
    ];

    const result = validateTaxonomy(SUBJECT_TAXONOMY, topics, QUESTION_TOPIC_MAPPINGS);

    expect(result.isValid).toBe(false);
    expect(codes(result)).toContain('invalid-topic-id');
    expect(codes(result)).toContain('topic-id-subject-mismatch');
    expect(codes(result)).toContain('duplicate-topic-id');
  });

  it('flags unknown subject references and missing subject nodes', () => {
    const topics: TopicTaxonomyEntry[] = [
      ...cloneTopics(),
      { id: 'chemistry.molecular', subject: 'chemistry' as SubjectId, displayName: 'Molecular', description: '', tiers: [], subtopics: [] },
    ];
    const unknownRef = validateTaxonomy(SUBJECT_TAXONOMY, topics, QUESTION_TOPIC_MAPPINGS);
    expect(codes(unknownRef)).toContain('unknown-topic-subject');

    // Drop a declared subject node.
    const partialSubjects: SubjectTaxonomyEntry[] = SUBJECT_TAXONOMY.filter((s) => s.id !== SubjectId.Physics);
    const missingNode = validateTaxonomy(partialSubjects, TOPIC_TAXONOMY, QUESTION_TOPIC_MAPPINGS);
    expect(codes(missingNode)).toContain('missing-subject-node');
  });

  it('flags mapping inconsistencies', () => {
    const unknownTarget = validateTaxonomy(SUBJECT_TAXONOMY, TOPIC_TAXONOMY, [
      ...QUESTION_TOPIC_MAPPINGS,
      { subject: SubjectId.Mathematics, rawTopic: 'ghost', topicId: 'mathematics.does-not-exist' },
    ]);
    expect(codes(unknownTarget)).toContain('unknown-mapping-topic');

    const subjectMismatch = validateTaxonomy(SUBJECT_TAXONOMY, TOPIC_TAXONOMY, [
      ...QUESTION_TOPIC_MAPPINGS,
      { subject: SubjectId.Science, rawTopic: 'algebra', topicId: buildTopicId(SubjectId.Mathematics, 'algebra') },
    ]);
    expect(codes(subjectMismatch)).toContain('mapping-subject-mismatch');

    const duplicate = validateTaxonomy(SUBJECT_TAXONOMY, TOPIC_TAXONOMY, [
      ...QUESTION_TOPIC_MAPPINGS,
      { ...QUESTION_TOPIC_MAPPINGS[0] },
    ]);
    expect(codes(duplicate)).toContain('duplicate-mapping');

    const emptyRaw = validateTaxonomy(SUBJECT_TAXONOMY, TOPIC_TAXONOMY, [
      ...QUESTION_TOPIC_MAPPINGS,
      { subject: SubjectId.Mathematics, rawTopic: '   ', topicId: buildTopicId(SubjectId.Mathematics, 'addition') },
    ]);
    expect(codes(emptyRaw)).toContain('empty-raw-topic');
  });
});

// ─── Data integrity ──────────────────────────────────────────────────────────

describe('Phase 25.2 taxonomy — data', () => {
  it('namespaces topic ids by subject to avoid collisions', () => {
    expect(buildTopicId(SubjectId.Science, 'physics')).toBe('science.physics');

    const physicsSubject = SUBJECT_TAXONOMY.find((entry) => entry.id === SubjectId.Physics);
    const physicsTopic = TOPIC_TAXONOMY.find((entry) => entry.id === 'science.physics');

    expect(physicsSubject).toBeDefined();
    expect(physicsTopic).toBeDefined();
    expect(physicsSubject!.id).not.toBe(physicsTopic!.id);
  });

  it('declares empty tier lists for subjects with no bundled content', () => {
    expect(SUBJECT_TAXONOMY.find((s) => s.id === SubjectId.Physics)!.tiers).toHaveLength(0);
    expect(SUBJECT_TAXONOMY.find((s) => s.id === SubjectId.Business)!.tiers).toHaveLength(0);
    expect(getTopicsForSubject(SubjectId.Physics)).toHaveLength(0);
    expect(getTopicsForSubject(SubjectId.Business)).toHaveLength(0);
  });

  it('resolves display names and topic lookups', () => {
    expect(getSubjectDisplayName(SubjectId.Mathematics)).toBe('Mathematics');
    expect(getSubjectDisplayName(SubjectId.GeneralKnowledge)).toBe('General Knowledge');
    expect(getTopicsForSubject(SubjectId.Mathematics).length).toBeGreaterThan(0);
    expect(resolveRawTopicsForTopic('mathematics.addition')).toContain('addition');
    expect(resolveRawTopicsForTopic('not.a.topic')).toHaveLength(0);
  });
});

// ─── Classification + coverage ───────────────────────────────────────────────

describe('Phase 25.2 taxonomy — classification and coverage', () => {
  it('classifies a question without rewriting it', () => {
    const question = makeQuestion({ id: 'q1', subject: SubjectId.Science, topic: 'physics' });
    const before = JSON.stringify(question);

    const classification = classifyQuestion(question);

    expect(classification.mapped).toBe(true);
    expect(classification.topic?.id).toBe('science.physics');
    expect(classification.subject?.id).toBe(SubjectId.Science);
    expect(JSON.stringify(question)).toBe(before);
  });

  it('reports an unknown raw topic as unmapped with a reason', () => {
    const classification = classifyQuestion(
      makeQuestion({ subject: SubjectId.Mathematics, topic: 'trigonometry' }),
    );

    expect(classification.mapped).toBe(false);
    expect(classification.topic).toBeUndefined();
    expect(classification.reason).not.toBe('');
  });

  it('maps the entire bundled question bank', () => {
    const { questions, skippedCount } = loadBundledQuestions();
    expect(skippedCount).toBe(0);
    expect(questions.length).toBeGreaterThan(0);

    const report = buildTaxonomyCoverageReport(questions);

    expect(report.totalQuestions).toBe(questions.length);
    expect(report.mappedCount).toBe(questions.length);
    expect(report.unmappedCount).toBe(0);
    expect(report.unmappedQuestions).toHaveLength(0);
    expect(report.subjectsWithContent).toContain(SubjectId.Mathematics);
    expect(report.subjectsWithoutContent).toContain(SubjectId.Physics);
    expect(report.subjectsWithoutContent).toContain(SubjectId.Business);
  });

  it('lists unmapped questions without altering them', () => {
    const pool = [
      makeQuestion({ id: 'known', subject: SubjectId.Mathematics, topic: 'addition' }),
      makeQuestion({ id: 'unknown', subject: SubjectId.Mathematics, topic: 'calculus' }),
    ];
    const before = JSON.stringify(pool);

    const report = buildTaxonomyCoverageReport(pool);

    expect(report.unmappedCount).toBe(1);
    expect(report.unmappedQuestions[0]).toEqual({
      id: 'unknown',
      subject: SubjectId.Mathematics,
      topic: 'calculus',
    });
    expect(JSON.stringify(pool)).toBe(before);
  });
});

// ─── Repository filtering through a taxonomy topic ───────────────────────────

describe('Phase 25.2 taxonomy — repository filtering', () => {
  it('filters the pool by the raw topics behind a taxonomy topic', () => {
    const repo = new QuestionRepository([
      makeQuestion({ id: 'add', subject: SubjectId.Mathematics, topic: 'addition' }),
      makeQuestion({ id: 'sub', subject: SubjectId.Mathematics, topic: 'subtraction' }),
    ]);

    const rawTopics = resolveRawTopicsForTopic('mathematics.addition');
    const found = repo.filter({ topics: rawTopics });

    expect(found.map((q) => q.id)).toEqual(['add']);
  });

  it('ignores an empty topics list (no filtering)', () => {
    const repo = new QuestionRepository([
      makeQuestion({ id: 'add', topic: 'addition' }),
      makeQuestion({ id: 'sub', topic: 'subtraction' }),
    ]);

    expect(repo.filter({ topics: [] })).toHaveLength(2);
  });
});
