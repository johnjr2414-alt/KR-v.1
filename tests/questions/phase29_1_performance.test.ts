import { describe, expect, it } from 'vitest';
import type { Question } from '../../src/core/types/question';
import { QuestionManager } from '../../src/questions/management/QuestionManager';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import type { QuestionStore } from '../../src/storage/QuestionStore';

class CountingQuestionStore implements QuestionStore {
  initCalls = 0;
  getAllCalls = 0;
  getTombstoneCalls = 0;
  failNextInit = false;

  private readonly questions = new Map<string, Question>();
  private readonly tombstones = new Set<string>();

  async init(): Promise<void> {
    this.initCalls++;
    if (this.failNextInit) {
      this.failNextInit = false;
      throw new Error('simulated storage failure');
    }
  }

  async getAll(): Promise<Question[]> {
    this.getAllCalls++;
    return [...this.questions.values()];
  }

  async getById(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async save(question: Question): Promise<void> {
    this.questions.set(question.id, question);
  }

  async saveAll(questions: Question[]): Promise<void> {
    for (const question of questions) this.questions.set(question.id, question);
  }

  async delete(id: string): Promise<void> {
    this.questions.delete(id);
  }

  async getTombstones(): Promise<string[]> {
    this.getTombstoneCalls++;
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

describe('Phase 29.1 — question manager initialization performance', () => {
  it('coalesces concurrent initialize calls into one storage bootstrap', async () => {
    const store = new CountingQuestionStore();
    const repository = new QuestionRepository();
    const manager = new QuestionManager(repository, store);

    await Promise.all([manager.initialize(), manager.initialize(), manager.initialize()]);

    expect(store.initCalls).toBe(1);
    expect(store.getAllCalls).toBe(1);
    expect(store.getTombstoneCalls).toBe(1);
    expect(manager.isInitialized()).toBe(true);
    expect(repository.count()).toBeGreaterThan(0);
  });

  it('repeated initialize calls after success do no storage work', async () => {
    const store = new CountingQuestionStore();
    const repository = new QuestionRepository();
    const manager = new QuestionManager(repository, store);

    await manager.initialize();
    const questionCount = repository.count();

    await manager.initialize();
    await manager.initialize();

    expect(store.initCalls).toBe(1);
    expect(store.getAllCalls).toBe(1);
    expect(store.getTombstoneCalls).toBe(1);
    expect(repository.count()).toBe(questionCount);
  });

  it('clears the in-flight promise after a failure so startup can be retried', async () => {
    const store = new CountingQuestionStore();
    const repository = new QuestionRepository();
    const manager = new QuestionManager(repository, store);
    store.failNextInit = true;

    await expect(manager.initialize()).rejects.toThrow('simulated storage failure');
    expect(manager.isInitialized()).toBe(false);

    await manager.initialize();

    expect(store.initCalls).toBe(2);
    expect(manager.isInitialized()).toBe(true);
    expect(repository.count()).toBeGreaterThan(0);
  });
});
