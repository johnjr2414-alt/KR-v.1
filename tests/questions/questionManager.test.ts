import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionManager } from '../../src/questions/management/QuestionManager';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import type { QuestionStore } from '../../src/storage/QuestionStore';
import type { Question } from '../../src/core/types/question';
import { QuestionType, QuestionStatus } from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';

// ─── In-memory Mock Store ────────────────────────────────────────────────────

class MockQuestionStore implements QuestionStore {
  private questions: Map<string, Question> = new Map();
  private tombstones: Set<string> = new Set();

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
    for (const q of questions) {
      this.questions.set(q.id, { ...q });
    }
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

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('QuestionManager', () => {
  let store: MockQuestionStore;
  let repo: QuestionRepository;
  let manager: QuestionManager;

  beforeEach(() => {
    store = new MockQuestionStore();
    repo = new QuestionRepository();
    manager = new QuestionManager(repo, store);
  });

  // ─── Initialize ─────────────────────────────────────────────────────────────

  describe('initialize', () => {
    it('populates repository with bundled questions', async () => {
      await manager.initialize();
      expect(repo.count()).toBeGreaterThan(0);
    });

    it('merges stored questions on top of bundled questions', async () => {
      const customQuestion: Question = {
        id: 'custom-q-1',
        educationalTier: EducationalTier.Elementary,
        subject: SubjectId.Mathematics,
        topic: 'custom',
        difficulty: 1,
        type: QuestionType.MultipleChoice,
        question: 'Custom question?',
        choices: [
          { choiceId: 'a', text: 'Yes' },
          { choiceId: 'b', text: 'No' },
        ],
        correctAnswer: 'a',
        timeLimit: 15,
        baseMasteryExp: 10,
        status: QuestionStatus.Published,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      await store.save(customQuestion);
      await manager.initialize();

      expect(repo.getById('custom-q-1')).toBeDefined();
    });

    it('filters out tombstoned bundled questions', async () => {
      await store.addTombstone('elem-math-001');
      await manager.initialize();

      expect(repo.getById('elem-math-001')).toBeUndefined();
    });
  });

  // ─── Create ─────────────────────────────────────────────────────────────────

  describe('createQuestion', () => {
    it('creates a valid question with auto-generated ID', async () => {
      const result = await manager.createQuestion({
        educationalTier: EducationalTier.Elementary,
        subject: SubjectId.Mathematics,
        topic: 'fractions',
        difficulty: 2,
        type: QuestionType.MultipleChoice,
        question: 'What is 1/2 of 10?',
        choices: [
          { choiceId: 'a', text: '5' },
          { choiceId: 'b', text: '10' },
        ],
        correctAnswer: 'a',
        timeLimit: 15,
        baseMasteryExp: 10,
        status: QuestionStatus.Published,
      });

      expect(result.question).toBeDefined();
      expect(result.errors).toBeUndefined();
      expect(result.question!.id).toBeDefined();
      expect(repo.getById(result.question!.id)).toBeDefined();

      const inStore = await store.getById(result.question!.id);
      expect(inStore).toBeDefined();
    });

    it('returns validation errors for invalid input and does not persist', async () => {
      const result = await manager.createQuestion({
        educationalTier: EducationalTier.Elementary,
        // missing subject, question, choices, etc.
      });

      expect(result.question).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(repo.count()).toBe(0);
    });
  });

  // ─── Update ─────────────────────────────────────────────────────────────────

  describe('updateQuestion', () => {
    it('updates an existing question and preserves createdAt', async () => {
      await manager.initialize();
      const existing = repo.getAll()[0];
      const origCreatedAt = existing.createdAt;

      const result = await manager.updateQuestion(existing.id, {
        topic: 'updated-topic',
      });

      expect(result.question).toBeDefined();
      expect(result.question!.topic).toBe('updated-topic');
      expect(result.question!.createdAt).toBe(origCreatedAt);
      expect(repo.getById(existing.id)!.topic).toBe('updated-topic');

      const inStore = await store.getById(existing.id);
      expect(inStore!.topic).toBe('updated-topic');
    });

    it('returns error when updating a non-existent question', async () => {
      const result = await manager.updateQuestion('non-existent', { topic: 'test' });
      expect(result.question).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('not found');
    });

    it('rejects invalid updates that break validation rules', async () => {
      await manager.initialize();
      const existing = repo.getAll()[0];

      const result = await manager.updateQuestion(existing.id, {
        difficulty: 99, // invalid difficulty
      });

      expect(result.question).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.field === 'difficulty')).toBe(true);
    });
  });

  // ─── Delete ─────────────────────────────────────────────────────────────────

  describe('deleteQuestion', () => {
    it('removes bundled question from repo and adds tombstone', async () => {
      await manager.initialize();
      const targetId = 'elem-math-001';
      expect(repo.getById(targetId)).toBeDefined();

      await manager.deleteQuestion(targetId);

      expect(repo.getById(targetId)).toBeUndefined();
      const tombstones = await store.getTombstones();
      expect(tombstones).toContain(targetId);
    });

    it('removes user-created question from store and repo', async () => {
      const createRes = await manager.createQuestion({
        educationalTier: EducationalTier.Elementary,
        subject: SubjectId.Mathematics,
        topic: 'geometry',
        difficulty: 1,
        type: QuestionType.MultipleChoice,
        question: 'How many sides does a triangle have?',
        choices: [
          { choiceId: 'a', text: '3' },
          { choiceId: 'b', text: '4' },
        ],
        correctAnswer: 'a',
        timeLimit: 15,
        baseMasteryExp: 10,
        status: QuestionStatus.Published,
      });

      const id = createRes.question!.id;
      expect(repo.getById(id)).toBeDefined();

      await manager.deleteQuestion(id);

      expect(repo.getById(id)).toBeUndefined();
      expect(await store.getById(id)).toBeUndefined();
    });
  });

  // ─── Import & Export ────────────────────────────────────────────────────────

  describe('importFromJson and exportToJson', () => {
    it('exports all questions to valid JSON', async () => {
      await manager.initialize();
      const json = manager.exportToJson();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(repo.count());
    });

    it('successfully imports an array of valid questions', async () => {
      const importPayload = [
        {
          id: 'import-q-1',
          educationalTier: 'elementary',
          subject: 'science',
          topic: 'energy',
          difficulty: 1,
          type: 'multiple-choice',
          question: 'What is the main source of energy for Earth?',
          choices: [
            { choiceId: 'a', text: 'The Sun' },
            { choiceId: 'b', text: 'The Moon' },
          ],
          correctAnswer: 'a',
          timeLimit: 15,
          baseMasteryExp: 10,
          status: 'published',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      const result = await manager.importFromJson(JSON.stringify(importPayload));

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(repo.getById('import-q-1')).toBeDefined();
    });

    it('rejects import if invalid JSON string', async () => {
      const result = await manager.importFromJson('not-valid-json');
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });

    it('rejects import if payload is not an array', async () => {
      const result = await manager.importFromJson(JSON.stringify({ not: 'an-array' }));
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('must be an array');
    });

    it('rejects import on duplicate ID against existing repo', async () => {
      await manager.initialize();
      const existing = repo.getAll()[0];

      const payload = [{ ...existing, question: 'Duplicate ID test' }];
      const result = await manager.importFromJson(JSON.stringify(payload));

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.message.includes('already exists'))).toBe(true);
    });

    it('rejects import on duplicate ID within the import batch', async () => {
      const payload = [
        {
          id: 'dup-batch-1',
          educationalTier: 'elementary',
          subject: 'mathematics',
          topic: 'addition',
          difficulty: 1,
          type: 'multiple-choice',
          question: 'Q1?',
          choices: [{ choiceId: 'a', text: 'A' }, { choiceId: 'b', text: 'B' }],
          correctAnswer: 'a',
          timeLimit: 15,
          baseMasteryExp: 10,
          status: 'published',
        },
        {
          id: 'dup-batch-1',
          educationalTier: 'elementary',
          subject: 'mathematics',
          topic: 'addition',
          difficulty: 1,
          type: 'multiple-choice',
          question: 'Q2?',
          choices: [{ choiceId: 'a', text: 'A' }, { choiceId: 'b', text: 'B' }],
          correctAnswer: 'a',
          timeLimit: 15,
          baseMasteryExp: 10,
          status: 'published',
        },
      ];

      const result = await manager.importFromJson(JSON.stringify(payload));
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.message.includes('within import batch'))).toBe(true);
    });
  });
});
