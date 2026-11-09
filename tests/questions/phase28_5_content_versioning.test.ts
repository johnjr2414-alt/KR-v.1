import { describe, it, expect } from 'vitest';
import {
  QuestionStatus,
  QuestionType,
  type Question,
} from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import type { QuestionStore } from '../../src/storage/QuestionStore';
import { QuestionManager } from '../../src/questions/management/QuestionManager';
import {
  QUESTION_BANK_FORMAT,
  QUESTION_BANK_FORMAT_VERSION,
  createQuestionBankExport,
  parseQuestionBankImport,
  serializeQuestionBankExport,
} from '../../src/questions/management/QuestionBankTransfer';
import {
  CONTENT_PACK_FORMAT,
  CONTENT_PACK_FORMAT_VERSION,
  createContentPack,
  parseContentPack,
  serializeContentPack,
} from '../../src/questions/management/ContentPackTransfer';
import {
  SAVE_EXPORT_FORMAT,
  SAVE_EXPORT_FORMAT_VERSION,
  exportSaveToString,
  parseSaveImport,
} from '../../src/storage/SaveTransfer';
import { SAVE_DATA_SCHEMA_VERSION, type SaveData } from '../../src/storage/StorageTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<Question> = {}): Question {
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

class MockQuestionStore implements QuestionStore {
  private questions = new Map<string, Question>();
  private tombstones = new Set<string>();
  failNextSaveAll = false;

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
    if (this.failNextSaveAll) {
      this.failNextSaveAll = false;
      throw new Error('Simulated store failure');
    }
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

function envelopeJson(questions: Question[], options: { tombstones?: string[]; overrides?: string[] } = {}): string {
  return serializeQuestionBankExport(
    createQuestionBankExport(questions, {
      now: '2026-11-09T00:00:00.000Z',
      appVersion: '0.1.0',
      tombstones: options.tombstones,
      overrides: options.overrides,
    }),
  );
}

function rawSave(version: number, name = 'Hero'): Record<string, unknown> {
  return {
    version,
    updatedAt: 1_700_000_000_000,
    player: {
      id: 'p1',
      name,
      level: 7,
      currentExp: 120,
      maxHp: 100,
      currentHp: 80,
      maxMp: 30,
      currentMp: 10,
      attack: 12,
      defense: 8,
      intelligence: 5,
      critRate: 0.1,
      movementSpeed: 120,
    },
    mastery: {},
    inventory: { capacity: 24, slots: [], equipped: {} },
    quests: [],
    currency: { gold: 4_242 },
    settings: {},
  };
}

// ─── Question bank format ────────────────────────────────────────────────────

describe('Phase 28.5 — question bank format and compatibility', () => {
  it('1. exports an explicit format, version, generator, and metadata', () => {
    const envelope = createQuestionBankExport([makeQuestion({ id: 'q-1' })], {
      now: '2026-11-09T00:00:00.000Z',
      appName: 'KR',
      appVersion: '0.1.0',
      tombstones: ['gone-1'],
      overrides: ['q-1'],
    });

    expect(envelope.format).toBe(QUESTION_BANK_FORMAT);
    expect(envelope.formatVersion).toBe(QUESTION_BANK_FORMAT_VERSION);
    expect(envelope.exportedAt).toBe('2026-11-09T00:00:00.000Z');
    expect(envelope.generator).toEqual({ name: 'KR', version: '0.1.0' });
    expect(envelope.tombstones).toEqual(['gone-1']);
    expect(envelope.overrides).toEqual(['q-1']);
    expect(envelope.questions).toHaveLength(1);
  });

  it('2. round-trips a valid versioned file', () => {
    const parsed = parseQuestionBankImport(envelopeJson([makeQuestion({ id: 'round-1' })]));

    expect(parsed.ok).toBe(true);
    expect(parsed.compatibility).toBe('current');
    expect(parsed.legacy).toBe(false);
    expect(parsed.formatVersion).toBe(QUESTION_BANK_FORMAT_VERSION);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].status).toBe('valid');
    expect(parsed.records[0].question?.id).toBe('round-1');
  });

  it('3. accepts a legacy bare array as version 0', () => {
    const parsed = parseQuestionBankImport(JSON.stringify([makeQuestion({ id: 'legacy-1' })]));

    expect(parsed.ok).toBe(true);
    expect(parsed.compatibility).toBe('legacy');
    expect(parsed.legacy).toBe(true);
    expect(parsed.formatVersion).toBe(0);
    expect(parsed.records[0].question?.id).toBe('legacy-1');
  });

  it('4. rejects unknown formats, unsupported future versions, and missing arrays safely', () => {
    const unknown = parseQuestionBankImport(
      JSON.stringify({ format: 'other-game', formatVersion: 1, questions: [] }),
    );
    expect(unknown.ok).toBe(false);
    expect(unknown.compatibility).toBe('unknown');

    const future = parseQuestionBankImport(
      JSON.stringify({
        format: QUESTION_BANK_FORMAT,
        formatVersion: QUESTION_BANK_FORMAT_VERSION + 1,
        questions: [],
      }),
    );
    expect(future.ok).toBe(false);
    expect(future.compatibility).toBe('future');
    expect(future.message).toContain('Unsupported question bank format version');

    const missing = parseQuestionBankImport(
      JSON.stringify({ format: QUESTION_BANK_FORMAT, formatVersion: 1 }),
    );
    expect(missing.ok).toBe(false);
    expect(missing.message).toContain('questions array');
  });

  it('5. reports invalid records and duplicate IDs within the batch without writing', () => {
    const parsed = parseQuestionBankImport(
      envelopeJson([
        makeQuestion({ id: 'dup-1' }),
        makeQuestion({ id: 'dup-1', question: 'Second copy?' }),
        makeQuestion({ id: 'bad id with spaces' }),
      ]),
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.records[0].status).toBe('valid');
    expect(parsed.records[1].status).toBe('duplicate-id');
    expect(parsed.records[2].status).toBe('invalid');
  });

  it('6. rejects contradictory tombstone/override metadata', () => {
    const contradictory = parseQuestionBankImport(
      envelopeJson([makeQuestion({ id: 'q-1' })], { tombstones: ['q-1'] }),
    );
    expect(contradictory.ok).toBe(false);
    expect(contradictory.message).toContain('also appears as a question');

    const orphanOverride = parseQuestionBankImport(
      envelopeJson([makeQuestion({ id: 'q-1' })], { overrides: ['missing-id'] }),
    );
    expect(orphanOverride.ok).toBe(false);
    expect(orphanOverride.message).toContain('not present in the questions array');
  });

  it('7. does not execute imported strings', () => {
    const marker = 'globalThis.__phase285Executed = true;';
    const parsed = parseQuestionBankImport(
      envelopeJson([makeQuestion({ id: 'safe-1', question: marker })]),
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.records[0].question?.question).toBe(marker);
    expect((globalThis as Record<string, unknown>).__phase285Executed).toBeUndefined();
  });
});

// ─── Manager import/export ───────────────────────────────────────────────────

describe('Phase 28.5 — manager import, preview, and rollback', () => {
  it('8. imports a valid versioned batch', async () => {
    const { manager, repo } = makeManager();

    const preview = manager.previewBankImport(envelopeJson([makeQuestion({ id: 'new-1' })]));
    expect(preview.ok).toBe(true);
    expect(preview.canImport).toBe(true);
    expect(preview.formatVersion).toBe(QUESTION_BANK_FORMAT_VERSION);

    const result = await manager.importBankFromJson(envelopeJson([makeQuestion({ id: 'new-1' })]));
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(repo.getById('new-1')).toBeDefined();
  });

  it('9. imports a legacy bare array and reports its compatibility', async () => {
    const { manager, repo } = makeManager();

    const json = JSON.stringify([makeQuestion({ id: 'legacy-2' })]);
    const preview = manager.previewBankImport(json);
    expect(preview.legacy).toBe(true);
    expect(preview.compatibility).toBe('legacy');

    const result = await manager.importBankFromJson(json);
    expect(result.success).toBe(true);
    expect(repo.getById('legacy-2')).toBeDefined();
  });

  it('10. rejects a future format without touching the bank', async () => {
    const { manager, repo, store } = makeManager([makeQuestion({ id: 'keep-1' })]);

    const json = JSON.stringify({
      format: QUESTION_BANK_FORMAT,
      formatVersion: QUESTION_BANK_FORMAT_VERSION + 1,
      exportedAt: '2026-11-09T00:00:00.000Z',
      generator: { name: 'KR', version: '0.1.0' },
      tombstones: [],
      overrides: [],
      questions: [makeQuestion({ id: 'future-1' })],
    });

    const preview = manager.previewBankImport(json);
    expect(preview.ok).toBe(false);
    expect(preview.compatibility).toBe('future');

    const result = await manager.importBankFromJson(json);
    expect(result.success).toBe(false);
    expect(repo.count()).toBe(1);
    expect(await store.getAll()).toHaveLength(0);
  });

  it('11. rejects duplicate IDs against a non-bundled stored question', async () => {
    const { manager, repo } = makeManager([makeQuestion({ id: 'existing-1' })]);

    const json = envelopeJson([makeQuestion({ id: 'existing-1', question: 'Replacement?' })]);
    const preview = manager.previewBankImport(json);
    expect(preview.duplicateIdCount).toBe(1);
    expect(preview.canImport).toBe(false);

    const result = await manager.importBankFromJson(json);
    expect(result.success).toBe(false);
    expect(repo.getById('existing-1')?.question).toBe('What is 3 + 5?');
  });

  it('12. accepts bundled-ID collisions as overrides and reports them', async () => {
    const { manager, repo } = makeManager();
    await manager.initialize();

    const bundled = repo.getAll()[0];
    expect(bundled).toBeDefined();
    const override = { ...bundled, question: 'Overridden prompt for the bundled question?' };

    const json = envelopeJson([override], { overrides: [override.id] });
    const preview = manager.previewBankImport(json);
    expect(preview.canImport).toBe(true);
    expect(preview.overrideCount).toBe(1);

    const result = await manager.importBankFromJson(json);
    expect(result.success).toBe(true);
    expect(result.overrideCount).toBe(1);
    expect(repo.getById(bundled.id)?.question).toBe(override.question);
  });

  it('13. rejects an invalid batch without partial writes', async () => {
    const { manager, repo, store } = makeManager();

    const json = envelopeJson([
      makeQuestion({ id: 'partial-ok' }),
      makeQuestion({ id: 'partial-bad', choices: [] }),
    ]);

    const preview = manager.previewBankImport(json);
    expect(preview.invalidCount).toBe(1);
    expect(preview.canImport).toBe(false);

    const result = await manager.importBankFromJson(json);
    expect(result.success).toBe(false);
    expect(repo.getById('partial-ok')).toBeUndefined();
    expect(await store.getAll()).toHaveLength(0);
  });

  it('14. leaves the repository unchanged when the store write fails', async () => {
    const { manager, repo, store } = makeManager();
    store.failNextSaveAll = true;

    const result = await manager.importBankFromJson(envelopeJson([makeQuestion({ id: 'store-fail-1' })]));
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('Simulated store failure');
    expect(repo.getById('store-fail-1')).toBeUndefined();
  });

  it('15. exports the full bank with tombstones and omits them for filtered exports', async () => {
    const { manager, repo, store } = makeManager([
      makeQuestion({ id: 'pub-1' }),
      makeQuestion({ id: 'draft-1', status: QuestionStatus.Draft, question: 'Draft prompt?' }),
    ]);
    await store.addTombstone('removed-bundled-1');

    const full = parseQuestionBankImport(await manager.exportBankToJson());
    expect(full.ok).toBe(true);
    expect(full.compatibility).toBe('current');
    expect(full.tombstones).toEqual(['removed-bundled-1']);
    expect(full.records).toHaveLength(repo.count());

    const filtered = parseQuestionBankImport(
      await manager.exportBankToJson({ status: QuestionStatus.Draft }),
    );
    expect(filtered.ok).toBe(true);
    expect(filtered.records).toHaveLength(1);
    expect(filtered.records[0].questionId).toBe('draft-1');
    expect(filtered.tombstones).toEqual([]);
  });

  it('16. applies tombstones from an imported file and keeps existing ones', async () => {
    const { manager, repo, store } = makeManager([makeQuestion({ id: 'keep-1' })]);
    await store.addTombstone('older-tombstone');

    const json = envelopeJson([makeQuestion({ id: 'new-2' })], { tombstones: ['removed-bundled-2'] });
    const result = await manager.importBankFromJson(json);

    expect(result.success).toBe(true);
    expect(result.tombstoneCount).toBe(1);
    expect(repo.getById('new-2')).toBeDefined();
    expect(await store.getTombstones()).toEqual(
      expect.arrayContaining(['older-tombstone', 'removed-bundled-2']),
    );
    expect(repo.getById('removed-bundled-2')).toBeUndefined();
  });

  it('17. restores a versioned envelope backup and preserves its tombstones', async () => {
    const { manager, repo, store } = makeManager([makeQuestion({ id: 'old-1' })]);
    const backup = envelopeJson([makeQuestion({ id: 'restored-1' })], {
      tombstones: ['removed-bundled-3'],
    });

    const result = await manager.restoreBackup(backup);
    expect(result.success).toBe(true);
    expect(repo.getById('restored-1')).toBeDefined();
    expect(repo.getById('old-1')).toBeUndefined();
    expect(await store.getTombstones()).toContain('removed-bundled-3');
  });
});

// ─── Content packs ───────────────────────────────────────────────────────────

describe('Phase 28.5 — optional content packs', () => {
  it('18. creates and parses a compatible content pack', () => {
    const pack = createContentPack([makeQuestion({ id: 'pack-q-1' })], {
      id: 'pack-core',
      name: 'Core Pack',
      packVersion: '1.0.0',
      now: '2026-11-09T00:00:00.000Z',
      appVersion: '0.1.0',
      tombstones: ['removed-bundled-4'],
    });

    expect(pack.format).toBe(CONTENT_PACK_FORMAT);
    expect(pack.formatVersion).toBe(CONTENT_PACK_FORMAT_VERSION);
    expect(pack.bank.format).toBe(QUESTION_BANK_FORMAT);

    const parsed = parseContentPack(serializeContentPack(pack));
    expect(parsed.ok).toBe(true);
    expect(parsed.compatibility).toBe('current');
    expect(parsed.pack).toEqual({ id: 'pack-core', name: 'Core Pack', packVersion: '1.0.0' });
    expect(parsed.bank?.records[0].question?.id).toBe('pack-q-1');
    expect(parsed.bank?.tombstones).toEqual(['removed-bundled-4']);
  });

  it('19. rejects unknown formats and future pack versions', () => {
    const unknown = parseContentPack(JSON.stringify({ format: 'other-pack', formatVersion: 1 }));
    expect(unknown.ok).toBe(false);
    expect(unknown.compatibility).toBe('unknown');

    const future = parseContentPack(
      JSON.stringify({
        format: CONTENT_PACK_FORMAT,
        formatVersion: CONTENT_PACK_FORMAT_VERSION + 1,
        id: 'pack',
        name: 'Pack',
        packVersion: '1.0.0',
        bank: {},
      }),
    );
    expect(future.ok).toBe(false);
    expect(future.compatibility).toBe('future');
  });

  it('20. rejects a pack whose embedded bank format is unsupported', () => {
    const pack = createContentPack([makeQuestion({ id: 'pack-q-2' })], {
      id: 'pack-future',
      name: 'Future Pack',
      packVersion: '2.0.0',
    });
    pack.bank.formatVersion = QUESTION_BANK_FORMAT_VERSION + 1;

    const parsed = parseContentPack(serializeContentPack(pack));
    expect(parsed.ok).toBe(false);
    expect(parsed.message).toContain('Unsupported question bank format version');
  });
});

// ─── Save export compatibility ───────────────────────────────────────────────

describe('Phase 28.5 — save export compatibility', () => {
  it('21. stamps save exports with container and schema versions', () => {
    const parsed = JSON.parse(
      exportSaveToString(rawSave(SAVE_DATA_SCHEMA_VERSION) as unknown as SaveData, {
        now: 123,
        appVersion: '0.1.0',
      }),
    );

    expect(parsed.format).toBe(SAVE_EXPORT_FORMAT);
    expect(parsed.formatVersion).toBe(SAVE_EXPORT_FORMAT_VERSION);
    expect(parsed.schemaVersion).toBe(SAVE_DATA_SCHEMA_VERSION);
  });

  it('22. migrates an older save export forward and rejects a future container', () => {
    const older = parseSaveImport(
      exportSaveToString(rawSave(1, 'Legacy Save') as unknown as SaveData),
    );
    expect(older.success).toBe(true);
    expect(older.migrated).toBe(true);
    expect(older.data?.version).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(older.data?.player.name).toBe('Legacy Save');

    const future = parseSaveImport(
      JSON.stringify({
        format: SAVE_EXPORT_FORMAT,
        formatVersion: SAVE_EXPORT_FORMAT_VERSION + 1,
        data: rawSave(SAVE_DATA_SCHEMA_VERSION),
      }),
    );
    expect(future.success).toBe(false);
    expect(future.errors[0]).toContain('Unsupported export format version');
  });
});
