import { performance } from 'node:perf_hooks';
import type { Question } from '../src/core/types/question';
import type { QuestionStore } from '../src/storage/QuestionStore';
import { QuestionManager } from '../src/questions/management/QuestionManager';
import { QuestionRepository } from '../src/questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../src/questions/retrieval/QuestionLoader';

class MemoryQuestionStore implements QuestionStore {
  private readonly questions = new Map<string, Question>();
  private readonly tombstones = new Set<string>();

  async init(): Promise<void> {}

  async getAll(): Promise<Question[]> {
    return [...this.questions.values()];
  }

  async getById(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async save(question: Question): Promise<void> {
    this.questions.set(question.id, question);
  }

  async saveAll(questions: Question[]): Promise<void> {
    for (const question of questions) {
      this.questions.set(question.id, question);
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

async function measure<T>(label: string, iterations: number, run: () => Promise<T> | T): Promise<number> {
  await run();
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await run();
  }
  const elapsed = performance.now() - start;
  console.log(`${label}: ${(elapsed / iterations).toFixed(3)} ms/op (${iterations} ops)`);
  return elapsed;
}

async function main(): Promise<void> {
  await measure('loadBundledQuestions', 200, () => loadBundledQuestions());

  const singleRepo = new QuestionRepository();
  const singleManager = new QuestionManager(singleRepo, new MemoryQuestionStore());
  await measure('QuestionManager.initialize (first)', 1, () => singleManager.initialize());

  const repeatedRepo = new QuestionRepository();
  const repeatedManager = new QuestionManager(repeatedRepo, new MemoryQuestionStore());
  await repeatedManager.initialize();
  await measure('QuestionManager.initialize (already initialized)', 200, () =>
    repeatedManager.initialize(),
  );

  const initCount = repeatedRepo.count();
  console.log(`repository question count: ${initCount}`);
}

await main();
