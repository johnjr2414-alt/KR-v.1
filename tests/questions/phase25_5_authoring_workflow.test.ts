import { describe, it, expect, beforeEach } from 'vitest';
import { ContentReviewStatus, QuestionStatus, QuestionType, type Question } from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import type { QuestionStore } from '../../src/storage/QuestionStore';
import { QuestionManager } from '../../src/questions/management/QuestionManager';
import {
  buildQuestionDraft,
  validateQuestionDraft,
  groupErrorsByField,
  rootFieldName,
  type QuestionDraftInput,
} from '../../src/questions/management/QuestionDraft';
import { buildQuestionPreview } from '../../src/questions/management/QuestionPreview';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'test-q',
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Mathematics,
    topic: 'addition',
    difficulty: 1,
    type: QuestionType.MultipleChoice,
    question: 'What is 3 + 5?',
    choices: [
      { choiceId: 'a', text: '8' },
      { choiceId: 'b', text: '9' },
    ],
    correctAnswer: 'a',
    timeLimit: 15,
    baseMasteryExp: 10,
    status: QuestionStatus.Published,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function validDraftInput(overrides: Partial<QuestionDraftInput> = {}): QuestionDraftInput {
  return {
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Mathematics,
    topic: 'addition',
    difficulty: '1',
    type: QuestionType.MultipleChoice,
    question: 'What is 3 + 5?',
    timeLimit: '15',
    baseMasteryExp: '10',
    status: QuestionStatus.Published,
    choices: [
      { choiceId: 'a', text: '8' },
      { choiceId: 'b', text: '9' },
    ],
    correctChoiceId: 'a',
    ...overrides,
  };
}

class MockQuestionStore implements QuestionStore {
  private questions = new Map<string, Question>();
  private tombstones = new Set<string>();

  async init(): Promise<void> {}
  async getAll(): Promise<Question[]> {
    return [...this.questions.values()];
  }
  async getById(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  async save(question: Question): Promise<void> {
    this.questions.set(question.id, { ...question });
  }
  async saveAll(questions: Question[]): Promise<void> {
    for (const q of questions) this.questions.set(q.id, { ...q });
  }
  async delete(id: string): Promise<void> {
    this.questions.delete(id);
  }
  async getTombstones(): Promise<string[]> {
    return [...this.tombstones];
  }
  async addTombstone(id: string): Promise<void> {
    this.tombstones.add(id);
  }
  async clear(): Promise<void> {
    this.questions.clear();
    this.tombstones.clear();
  }
}

function makeManager(seed: Question[] = []): {
  manager: QuestionManager;
  repo: QuestionRepository;
  store: MockQuestionStore;
} {
  const store = new MockQuestionStore();
  const repo = new QuestionRepository(seed);
  const manager = new QuestionManager(repo, store);
  return { manager, repo, store };
}

// ─── Editor validation ───────────────────────────────────────────────────────

describe('Phase 25.5 — editor draft assembly and field-level validation', () => {
  it('assembles a valid multiple-choice draft', () => {
    const { draft, isValid, errors } = validateQuestionDraft(validDraftInput());

    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
    expect(draft.type).toBe(QuestionType.MultipleChoice);
    expect(draft.choices).toHaveLength(2);
    expect(draft.correctAnswer).toBe('a');
    expect(draft.difficulty).toBe(1);
    expect(draft.timeLimit).toBe(15);
  });

  it('groups errors by root form field so they can be shown next to controls', () => {
    const { isValid, byField } = validateQuestionDraft(
      validDraftInput({ topic: '', difficulty: '99', correctChoiceId: '' }),
    );

    expect(isValid).toBe(false);
    expect(byField.topic).toBeDefined();
    expect(byField.difficulty).toBeDefined();
    expect(byField.correctAnswer).toBeDefined();
  });

  it('maps choice-level errors back to the choices field', () => {
    const { byField } = validateQuestionDraft(
      validDraftInput({
        choices: [
          { choiceId: 'a', text: '8' },
          { choiceId: 'b', text: '8' }, // duplicate text
        ],
        correctChoiceId: 'a',
      }),
    );

    expect(byField.choices).toBeDefined();
    expect(byField.choices.some((m) => m.toLowerCase().includes('duplicate'))).toBe(true);
  });

  it('does not silently coerce blank numbers to defaults', () => {
    const { draft, isValid } = validateQuestionDraft(validDraftInput({ difficulty: '', timeLimit: '' }));
    expect(Number.isNaN(draft.difficulty as number)).toBe(true);
    expect(Number.isNaN(draft.timeLimit as number)).toBe(true);
    expect(isValid).toBe(false);
  });

  it('splits comma-separated tags and accepted answers', () => {
    const encoded = buildQuestionDraft(
      validDraftInput({ tags: 'grade-3, algebra ,, arithmetic' }),
    );
    expect(encoded.tags).toEqual(['grade-3', 'algebra', 'arithmetic']);

    const identification = buildQuestionDraft({
      educationalTier: EducationalTier.Elementary,
      subject: SubjectId.Science,
      topic: 'chemistry',
      difficulty: '2',
      type: QuestionType.Identification,
      question: 'What is the chemical formula for water?',
      timeLimit: '15',
      baseMasteryExp: '10',
      status: QuestionStatus.Published,
      correctAnswer: 'H2O',
      acceptedAnswers: 'H2O, h2o, water',
    });
    expect(identification.acceptedAnswers).toEqual(['H2O', 'h2o', 'water']);
  });

  it('keeps a draft status and marks the preview unplayable', () => {
    const { draft, isValid } = validateQuestionDraft(
      validDraftInput({ status: QuestionStatus.Draft }),
    );
    expect(isValid).toBe(true);
    expect(draft.status).toBe(QuestionStatus.Draft);
    expect(buildQuestionPreview(draft).playable).toBe(false);
  });

  it('carries an explicit review marker through the draft', () => {
    const draft = buildQuestionDraft(
      validDraftInput({ reviewStatus: ContentReviewStatus.AuthorChecked }),
    );
    expect(draft.reviewStatus).toBe(ContentReviewStatus.AuthorChecked);
  });

  it('reduces nested field paths to their root field', () => {
    expect(rootFieldName('choices[2].text')).toBe('choices');
    expect(rootFieldName('choices[0].choiceId')).toBe('choices');
    expect(rootFieldName('correctAnswer')).toBe('correctAnswer');
    expect(
      groupErrorsByField([
        { field: 'choices[1].text', message: 'x' },
        { field: 'choices[2].text', message: 'y' },
      ]),
    ).toEqual({ choices: ['x', 'y'] });
  });
});

// ─── Preview mapping ─────────────────────────────────────────────────────────

describe('Phase 25.5 — player-view preview mapping', () => {
  it('projects a published multiple-choice question as playable', () => {
    const preview = buildQuestionPreview(makeQuestion({}));

    expect(preview.playable).toBe(true);
    expect(preview.choices).toHaveLength(2);
    expect(preview.choices[0]).toMatchObject({ label: 'A', text: '8', isCorrect: true });
    expect(preview.choices[1].isCorrect).toBe(false);
    expect(preview.correctAnswerText).toBe('A: 8');
    expect(preview.issues).toHaveLength(0);
  });

  it('marks a structurally valid but unpublished question as unplayable', () => {
    const preview = buildQuestionPreview(makeQuestion({ status: QuestionStatus.Draft }));
    expect(preview.playable).toBe(false);
    expect(preview.issues).toHaveLength(0);
  });

  it('surfaces structural issues and is unplayable when invalid', () => {
    const preview = buildQuestionPreview(
      makeQuestion({ id: '', question: '', choices: [] }),
    );
    expect(preview.playable).toBe(false);
    expect(preview.issues.length).toBeGreaterThan(0);
  });

  it('projects identification questions with accepted answers', () => {
    const preview = buildQuestionPreview(
      makeQuestion({
        id: 'id-1',
        type: QuestionType.Identification,
        question: 'Capital of France?',
        choices: undefined,
        correctAnswer: 'Paris',
        acceptedAnswers: ['Paris', 'City of Paris'],
      }),
    );

    expect(preview.playable).toBe(true);
    expect(preview.correctAnswerText).toBe('Paris');
    expect(preview.acceptedAnswers).toEqual(['Paris', 'City of Paris']);
    expect(preview.choices).toHaveLength(0);
  });

  it('projects essay questions with the model answer', () => {
    const preview = buildQuestionPreview(
      makeQuestion({
        id: 'essay-1',
        type: QuestionType.Essay,
        choices: undefined,
        correctAnswer: undefined,
        expectedAnswer: 'Explain photosynthesis.',
      }),
    );

    expect(preview.playable).toBe(true);
    expect(preview.expectedAnswer).toBe('Explain photosynthesis.');
  });

  it('does not mutate the source question', () => {
    const source = makeQuestion({ id: 'nomutate-1' });
    const before = JSON.stringify(source);
    buildQuestionPreview(source);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('returns a defensive copy of accepted answers', () => {
    const source = makeQuestion({
      id: 'def-1',
      type: QuestionType.Identification,
      choices: undefined,
      correctAnswer: 'x',
      acceptedAnswers: ['x'],
    });
    const preview = buildQuestionPreview(source);
    preview.acceptedAnswers.push('injected');
    expect(source.acceptedAnswers).toEqual(['x']);
  });
});

// ─── Bulk import dry run, warnings, and rollback ─────────────────────────────

describe('Phase 25.5 — bulk import validation report', () => {
  let manager: QuestionManager;
  let repo: QuestionRepository;
  let store: MockQuestionStore;

  beforeEach(() => {
    ({ manager, repo, store } = makeManager());
  });

  const importable = (id: string, question = 'What is the answer?'): Question =>
    makeQuestion({ id, question, choices: [{ choiceId: 'a', text: 'A' }, { choiceId: 'b', text: 'B' }] });

  it('reports a clean batch as importable without writing', () => {
    const preview = manager.previewImport(JSON.stringify([importable('new-1')]));

    expect(preview.ok).toBe(true);
    expect(preview.canImport).toBe(true);
    expect(preview.validCount).toBe(1);
    expect(repo.count()).toBe(0);
  });

  it('never mutates the bank or store during a dry run', async () => {
    await manager.previewImport(JSON.stringify([importable('new-1')]));
    expect(repo.count()).toBe(0);
    expect(await store.getAll()).toHaveLength(0);
  });

  it('reports parse errors and non-array payloads', () => {
    expect(manager.previewImport('not json').ok).toBe(false);
    expect(manager.previewImport(JSON.stringify({ a: 1 })).ok).toBe(false);
    expect(manager.previewImport('not json').canImport).toBe(false);
  });

  it('flags invalid records and blocks the batch', () => {
    const bad = { id: 'bad-1', educationalTier: 'elementary' }; // missing almost everything
    const preview = manager.previewImport(JSON.stringify([importable('ok-1'), bad]));

    expect(preview.canImport).toBe(false);
    expect(preview.invalidCount).toBe(1);
    expect(preview.records[1].status).toBe('invalid');
    expect(preview.records[1].errors.length).toBeGreaterThan(0);
  });

  it('detects duplicate IDs against the existing bank and within the batch', () => {
    repo.setQuestions([importable('dup-existing')]);

    const againstBank = manager.previewImport(JSON.stringify([importable('dup-existing')]));
    expect(againstBank.duplicateIdCount).toBe(1);
    expect(againstBank.canImport).toBe(false);

    const withinBatch = manager.previewImport(
      JSON.stringify([importable('dup-batch'), importable('dup-batch')]),
    );
    expect(withinBatch.duplicateIdCount).toBe(1);
  });

  it('warns — but never blocks — on a similar prompt', () => {
    repo.setQuestions([makeQuestion({ id: 'existing', question: 'What is 3 + 5?' })]);

    const preview = manager.previewImport(
      JSON.stringify([importable('similar-1', 'what is 3+5')]),
    );

    expect(preview.canImport).toBe(true);
    expect(preview.duplicatePromptWarnings).toBe(1);
    expect(preview.records[0].warnings.length).toBe(1);
    expect(preview.records[0].errors).toHaveLength(0);
  });

  it('rolls the entire batch back when any record is rejected', async () => {
    const bad = { id: 'bad-1', educationalTier: 'elementary' };
    const result = await manager.importFromJson(
      JSON.stringify([importable('ok-1'), bad]),
    );

    expect(result.success).toBe(false);
    expect(result.importedCount).toBe(0);
    expect(repo.count()).toBe(0);
    expect(await store.getAll()).toHaveLength(0);
  });
});

// ─── Backup and restore ──────────────────────────────────────────────────────

describe('Phase 25.5 — backup and restore', () => {
  it('captures a re-importable snapshot', () => {
    const { manager, repo } = makeManager([makeQuestion({ id: 'q-1' })]);
    const backup = manager.createBackup();

    expect(backup.questionCount).toBe(1);
    expect(JSON.parse(backup.json)).toHaveLength(1);
    expect(repo.count()).toBe(1);
  });

  it('restores the bank to the snapshot after a bulk change', async () => {
    const { manager, repo, store } = makeManager([makeQuestion({ id: 'q-1' })]);
    const backup = manager.createBackup();

    await manager.createQuestion({
      ...makeQuestion({ id: 'q-2' }),
      id: 'q-2',
    } as Question);
    expect(repo.count()).toBe(2);

    const result = await manager.restoreBackup(backup.json);

    expect(result.success).toBe(true);
    expect(repo.count()).toBe(1);
    expect(repo.getById('q-1')).toBeDefined();
    expect(repo.getById('q-2')).toBeUndefined();
    expect(await store.getById('q-2')).toBeUndefined();
    expect(await store.getTombstones()).toContain('q-2');
  });

  it('rejects an invalid backup without changing anything', async () => {
    const { manager, repo } = makeManager([makeQuestion({ id: 'q-1' })]);

    const badJson = await manager.restoreBackup('not json');
    expect(badJson.success).toBe(false);
    expect(repo.count()).toBe(1);

    const badRecord = await manager.restoreBackup(JSON.stringify([{ id: 'x' }]));
    expect(badRecord.success).toBe(false);
    expect(repo.count()).toBe(1);
  });
});

// ─── Export compatibility and filtered export ────────────────────────────────

describe('Phase 25.5 — export compatibility', () => {
  it('round-trips an export back through import unchanged', async () => {
    const { manager } = makeManager([
      makeQuestion({ id: 'rt-1', question: 'Round trip A?' }),
      makeQuestion({ id: 'rt-2', question: 'Round trip B?' }),
    ]);

    const json = manager.exportToJson();
    const fresh = makeManager();
    const result = await fresh.manager.importFromJson(json);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(fresh.repo.getById('rt-1')).toBeDefined();
    expect(fresh.repo.getById('rt-2')).toBeDefined();
  });

  it('exports only the records matching the given criteria', () => {
    const { manager } = makeManager([
      makeQuestion({ id: 'pub-1', status: QuestionStatus.Published }),
      makeQuestion({ id: 'draft-1', status: QuestionStatus.Draft, question: 'Draft prompt?' }),
    ]);

    const all = JSON.parse(manager.exportToJson());
    expect(all).toHaveLength(2);

    const drafts = JSON.parse(manager.exportToJson({ status: QuestionStatus.Draft }));
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe('draft-1');
  });
});
