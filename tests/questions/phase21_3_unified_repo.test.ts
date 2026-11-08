import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionManager } from '../../src/questions/management/QuestionManager';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import type { QuestionStore } from '../../src/storage/QuestionStore';
import type { Question } from '../../src/core/types/question';
import { QuestionType, QuestionStatus } from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { DifficultyEngine } from '../../src/questions/retrieval/DifficultyEngine';
import { MonsterCategory, type MonsterDefinition } from '../../src/core/types/monster';
import { BattleSession } from '../../src/combat/BattleSession';
import { createPlayerData } from '../../src/player/PlayerData';

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

describe('Phase 21.3 — Unified Question Repository for Combat and Admin', () => {
  let repo: QuestionRepository;
  let store: MockQuestionStore;
  let manager: QuestionManager;
  let diffEngine: DifficultyEngine;

  const mockMonster: MonsterDefinition = {
    id: 'test-slime',
    name: 'Test Slime',
    level: 1,
    maxHp: 20,
    attack: 5,
    defense: 1,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Weak,
    baseExp: 10,
    baseGold: 5,
    dropConfig: { drops: [], bonusGoldMin: 0, bonusGoldMax: 0 },
    spriteColor: 0x22c55e,
    detectionRadius: 60,
  };

  beforeEach(() => {
    repo = new QuestionRepository();
    store = new MockQuestionStore();
    manager = new QuestionManager(repo, store);
    diffEngine = new DifficultyEngine();
  });

  it('1. Bundled questions appear when not deleted or overridden', async () => {
    await manager.initialize();
    const questions = repo.getAll();
    expect(questions.length).toBeGreaterThan(0);
    // Find bundled math question
    const bundledMath = questions.find((q) => q.subject === SubjectId.Mathematics);
    expect(bundledMath).toBeDefined();
  });

  it('2. Admin-created questions appear in the effective repository and combat selection', async () => {
    // Start with empty bundled pool by initializing fresh
    await manager.initialize();

    const createdResult = await manager.createQuestion({
      id: 'custom-math-add-1',
      subject: SubjectId.Mathematics,
      educationalTier: EducationalTier.Elementary,
      topic: 'basic-addition',
      difficulty: 3,
      type: QuestionType.MultipleChoice,
      question: 'What is 100 + 200?',
      choices: [
        { choiceId: 'c1', text: '300' },
        { choiceId: 'c2', text: '400' },
      ],
      correctAnswer: 'c1',
      timeLimit: 25,
      baseMasteryExp: 15,
      status: QuestionStatus.Published,
    });

    expect(createdResult.question).toBeDefined();

    // Verify it is in repo
    const inRepo = repo.getById('custom-math-add-1');
    expect(inRepo).toBeDefined();
    expect(inRepo?.question).toBe('What is 100 + 200?');

    // Create a dedicated repo containing this question to verify BattleSession picks it
    const combatRepo = new QuestionRepository([inRepo!]);
    const player = createPlayerData('p-1', 'Hero', { level: 1 });
    const battle = new BattleSession({
      player,
      monster: mockMonster,
      repository: combatRepo,
      difficultyEngine: diffEngine,
      fixedQuestionCount: 1,
    });

    const battleQuestions = battle.getState().questions;
    expect(battleQuestions.some((q) => q.id === 'custom-math-add-1')).toBe(true);
  });

  it('3. Edited bundled question uses the edited version in combat repository', async () => {
    await manager.initialize();
    const firstBundled = repo.getAll()[0];
    expect(firstBundled).toBeDefined();

    const updatedStem = 'MODIFIED STEM FOR COMBAT TESTING';
    await manager.updateQuestion(firstBundled.id, {
      question: updatedStem,
    });

    // Check repository reflects updated stem
    const updatedInRepo = repo.getById(firstBundled.id);
    expect(updatedInRepo?.question).toBe(updatedStem);

    // Re-initialize manager (simulating app reload)
    const freshRepo = new QuestionRepository();
    const freshManager = new QuestionManager(freshRepo, store);
    await freshManager.initialize();

    const reloaded = freshRepo.getById(firstBundled.id);
    expect(reloaded?.question).toBe(updatedStem);
  });

  it('4. Tombstoned bundled questions are excluded from combat repository', async () => {
    await manager.initialize();
    const bundledList = [...repo.getAll()];
    const target = bundledList[0];

    // Admin soft-deletes bundled question
    await manager.deleteQuestion(target.id);
    expect(repo.getById(target.id)).toBeUndefined();

    // Verify tombstone is recorded
    const tombstones = await store.getTombstones();
    expect(tombstones).toContain(target.id);

    // On fresh initialization, tombstoned question must NOT be loaded
    const freshRepo = new QuestionRepository();
    const freshManager = new QuestionManager(freshRepo, store);
    await freshManager.initialize();

    expect(freshRepo.getById(target.id)).toBeUndefined();
  });

  it('5. Hard-deleted user-created question is excluded', async () => {
    await manager.initialize();
    await manager.createQuestion({
      id: 'custom-temp-1',
      subject: SubjectId.Mathematics,
      educationalTier: EducationalTier.Elementary,
      topic: 'test',
      difficulty: 1,
      type: QuestionType.MultipleChoice,
      question: 'Temp question?',
      choices: [
        { choiceId: 'c1', text: 'Yes' },
        { choiceId: 'c2', text: 'No' },
      ],
      correctAnswer: 'c1',
      timeLimit: 20,
      baseMasteryExp: 10,
      status: QuestionStatus.Published,
    });

    expect(repo.getById('custom-temp-1')).toBeDefined();

    await manager.deleteQuestion('custom-temp-1');
    expect(repo.getById('custom-temp-1')).toBeUndefined();
    expect(await store.getById('custom-temp-1')).toBeUndefined();
  });

  it('6. Invalid stored question is safely rejected during merge', async () => {
    // Inject corrupt question into store (missing required fields)
    const badQuestion = {
      id: 'corrupt-q-1',
      question: 'Missing everything',
    } as any;
    await store.save(badQuestion);

    await manager.initialize();
    expect(repo.getById('corrupt-q-1')).toBeUndefined();
  });

  it('7. Fallback resolution never returns tombstoned questions', async () => {
    await manager.initialize();
    const mathQuestions = repo.filter({ subject: SubjectId.Mathematics });
    expect(mathQuestions.length).toBeGreaterThan(0);

    // Delete one of the math questions
    const deletedId = mathQuestions[0].id;
    await manager.deleteQuestion(deletedId);

    const profile = diffEngine.createQuestionProfile(SubjectId.Mathematics, 1, 1);
    const resolved = diffEngine.resolveQuestionsWithFallback(repo, profile, 10);

    expect(resolved.questions.some((q) => q.id === deletedId)).toBe(false);
  });
});
