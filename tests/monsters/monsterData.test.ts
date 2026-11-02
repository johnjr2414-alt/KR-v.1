import { describe, it, expect } from 'vitest';
import { MONSTER_REGISTRY, getMonsterById, getAllMonsterIds } from '../../src/monsters/monsterData';
import { MonsterCategory } from '../../src/core/types/monster';
import { SubjectId } from '../../src/core/types/education';

// ─── Expected monster IDs ────────────────────────────────────────────────────

const EXPECTED_MONSTERS = [
  // Mathematics
  'math-slime',
  'number-goblin',
  'fraction-bat',
  // General Knowledge
  'book-mimic',
  'quiz-spirit',
  'knowledge-wisp',
  // Science
  'chemical-blob',
  'atom-bug',
  'experiment-golem',
  // Technology
  'binary-slime',
  'circuit-beetle',
  'glitch-sprite',
] as const;

describe('MONSTER_REGISTRY', () => {
  it('contains all 12 expected monsters', () => {
    for (const id of EXPECTED_MONSTERS) {
      expect(MONSTER_REGISTRY).toHaveProperty(id);
    }
  });

  it('has at least 12 entries', () => {
    expect(Object.keys(MONSTER_REGISTRY).length).toBeGreaterThanOrEqual(12);
  });

  it('every monster has a positive maxHp', () => {
    for (const monster of Object.values(MONSTER_REGISTRY)) {
      expect(monster.maxHp).toBeGreaterThan(0);
    }
  });

  it('every monster has a positive attack stat', () => {
    for (const monster of Object.values(MONSTER_REGISTRY)) {
      expect(monster.attack).toBeGreaterThan(0);
    }
  });

  it('every monster has a non-negative defense stat', () => {
    for (const monster of Object.values(MONSTER_REGISTRY)) {
      expect(monster.defense).toBeGreaterThanOrEqual(0);
    }
  });

  it('every monster has a positive baseExp reward', () => {
    for (const monster of Object.values(MONSTER_REGISTRY)) {
      expect(monster.baseExp).toBeGreaterThan(0);
    }
  });

  it('every monster has a non-negative baseGold reward', () => {
    for (const monster of Object.values(MONSTER_REGISTRY)) {
      expect(monster.baseGold).toBeGreaterThanOrEqual(0);
    }
  });

  it('every monster has a defined dropConfig with a drops array', () => {
    for (const monster of Object.values(MONSTER_REGISTRY)) {
      expect(monster.dropConfig).toBeDefined();
      expect(Array.isArray(monster.dropConfig.drops)).toBe(true);
    }
  });

  it('every monster id matches its registry key', () => {
    for (const [key, monster] of Object.entries(MONSTER_REGISTRY)) {
      expect(monster.id).toBe(key);
    }
  });

  it('every monster has a positive detectionRadius', () => {
    for (const monster of Object.values(MONSTER_REGISTRY)) {
      expect(monster.detectionRadius).toBeGreaterThan(0);
    }
  });

  it('every monster has a positive spriteColor', () => {
    for (const monster of Object.values(MONSTER_REGISTRY)) {
      expect(monster.spriteColor).toBeGreaterThan(0);
    }
  });
});

// ─── Subject coverage ────────────────────────────────────────────────────────

describe('Monster subject coverage', () => {
  const monsters = Object.values(MONSTER_REGISTRY);

  it('includes Mathematics monsters', () => {
    expect(monsters.some(m => m.subject === SubjectId.Mathematics)).toBe(true);
  });

  it('includes GeneralKnowledge monsters', () => {
    expect(monsters.some(m => m.subject === SubjectId.GeneralKnowledge)).toBe(true);
  });

  it('includes Science monsters', () => {
    expect(monsters.some(m => m.subject === SubjectId.Science)).toBe(true);
  });

  it('includes Programming/Technology monsters', () => {
    expect(monsters.some(m => m.subject === SubjectId.Programming)).toBe(true);
  });
});

// ─── Category coverage ───────────────────────────────────────────────────────

describe('Monster category coverage', () => {
  const monsters = Object.values(MONSTER_REGISTRY);

  it('includes Weak monsters', () => {
    expect(monsters.some(m => m.category === MonsterCategory.Weak)).toBe(true);
  });

  it('includes Normal monsters', () => {
    expect(monsters.some(m => m.category === MonsterCategory.Normal)).toBe(true);
  });

  it('includes Strong monsters', () => {
    expect(monsters.some(m => m.category === MonsterCategory.Strong)).toBe(true);
  });
});

// ─── Lookup helpers ──────────────────────────────────────────────────────────

describe('getMonsterById', () => {
  it('returns the correct monster for a valid ID', () => {
    const monster = getMonsterById('math-slime');
    expect(monster).toBeDefined();
    expect(monster!.id).toBe('math-slime');
    expect(monster!.subject).toBe(SubjectId.Mathematics);
  });

  it('returns undefined for an unknown ID', () => {
    expect(getMonsterById('does-not-exist')).toBeUndefined();
  });
});

describe('getAllMonsterIds', () => {
  it('returns at least 12 IDs', () => {
    expect(getAllMonsterIds().length).toBeGreaterThanOrEqual(12);
  });

  it('contains all expected IDs', () => {
    const ids = getAllMonsterIds();
    for (const expected of EXPECTED_MONSTERS) {
      expect(ids).toContain(expected);
    }
  });
});
