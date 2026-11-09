import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  InMemoryQuestionStore,
  IndexedDBQuestionStore,
  createQuestionStore,
  type QuestionStore,
} from '../../src/storage/QuestionStore';
import { QuestionManager } from '../../src/questions/management/QuestionManager';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { createUniqueId } from '../../src/core/uniqueId';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import type { Question } from '../../src/core/types/question';
import { QuestionType, QuestionStatus } from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';

function buildQuestion(id: string): Question {
  return {
    id,
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Mathematics,
    topic: 'fallback',
    difficulty: 1,
    type: QuestionType.MultipleChoice,
    question: `Fallback question ${id}?`,
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
}

class FailingInitStore extends InMemoryQuestionStore {
  async init(): Promise<void> {
    throw new Error('storage blocked');
  }
}

class FailingReadStore extends InMemoryQuestionStore {
  async getAll(): Promise<Question[]> {
    throw new Error('read blocked');
  }

  async getTombstones(): Promise<string[]> {
    throw new Error('read blocked');
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Phase 29.2 — Browser compatibility guards', () => {
  describe('question storage fallback', () => {
    it('in-memory store supports the full QuestionStore contract', async () => {
      const store = new InMemoryQuestionStore();
      await store.init();

      await store.save(buildQuestion('memory-q-1'));
      await store.saveAll([buildQuestion('memory-q-2'), buildQuestion('memory-q-3')]);
      expect((await store.getAll()).map((q) => q.id).sort()).toEqual([
        'memory-q-1',
        'memory-q-2',
        'memory-q-3',
      ]);
      expect(await store.getById('memory-q-2')).toBeDefined();

      await store.delete('memory-q-2');
      expect(await store.getById('memory-q-2')).toBeUndefined();

      await store.addTombstone('elem-math-001');
      expect(await store.getTombstones()).toEqual(['elem-math-001']);

      await store.clear();
      expect(await store.getAll()).toEqual([]);
      expect(await store.getTombstones()).toEqual([]);
    });

    it('selects the in-memory store when IndexedDB is absent', () => {
      vi.stubGlobal('indexedDB', undefined);
      expect(createQuestionStore()).toBeInstanceOf(InMemoryQuestionStore);
    });

    it('selects the IndexedDB store when the API exists', () => {
      vi.stubGlobal('indexedDB', { open: vi.fn() });
      expect(createQuestionStore()).toBeInstanceOf(IndexedDBQuestionStore);
    });

    it('warns the player when saves are session-only', async () => {
      const storage = new InMemoryStorageService();
      expect(storage.isPersistent()).toBe(false);

      const session = new PlayerSessionManager({
        storage,
        inventory: new InventoryManager(),
        mastery: new MasteryManager(),
        quests: new QuestManager(new InventoryManager()),
        currency: new CurrencyService(100),
      });

      await session.initializeSession('Session Hero');

      expect(session.getSaveRecoveryNotice()).toMatch(/session only/i);
    });

    it('loads bundled questions when store initialization fails', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const repository = new QuestionRepository();
      const manager = new QuestionManager(repository, new FailingInitStore());

      await expect(manager.initialize()).rejects.toThrow('storage blocked');

      // BootScene catches the error, so the populated bank must already be usable.
      expect(repository.count()).toBeGreaterThan(0);
      expect(manager.isInitialized()).toBe(false);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('using bundled questions only'),
        expect.any(Error),
      );
    });

    it('loads bundled questions when stored records cannot be read', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const repository = new QuestionRepository();
      const manager = new QuestionManager(repository, new FailingReadStore());

      await manager.initialize();

      expect(repository.count()).toBeGreaterThan(0);
      expect(manager.isInitialized()).toBe(true);
    });
  });

  describe('unique ID generation in non-secure contexts', () => {
    it('uses crypto.randomUUID when available', () => {
      expect(createUniqueId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('falls back to a unique timestamp/random ID when randomUUID is unavailable', () => {
      vi.stubGlobal('crypto', {});
      const first = createUniqueId();
      const second = createUniqueId();

      expect(first).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
      expect(second).not.toBe(first);
    });
  });

  it('answers a battle-style lookup without storage', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const repository = new QuestionRepository();
    const manager = new QuestionManager(repository, new FailingInitStore() as QuestionStore);
    await expect(manager.initialize()).rejects.toThrow('storage blocked');

    const question = repository.getById('elem-math-001');
    expect(question).toBeDefined();
    expect(question?.choices?.length ?? 0).toBeGreaterThan(0);
  });
});
