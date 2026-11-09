import { QuestCategory, QuestType, type QuestDefinition } from './QuestTypes';

export const QUEST_REGISTRY: Record<string, QuestDefinition> = {
  'quest-slime-hunter': {
    id: 'quest-slime-hunter',
    name: 'Slime Infestation',
    description: 'Elder Aldous has asked you to defeat 2 Forest Slimes to secure the outskirts.',
    giverNpcId: 'elder-aldous',
    requirements: {
      minLevel: 1,
    },
    objectives: [
      {
        id: 'kill-forest-slimes',
        description: 'Defeat Forest Slimes',
        type: QuestType.KillMonster,
        targetId: 'forest-slime',
        requiredCount: 2,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 35,
      gold: 25,
      items: [
        { itemId: 'minor-health-potion', quantity: 2 },
      ],
    },
  },
  'quest-slime-sample': {
    id: 'quest-slime-sample',
    name: 'Research Materials',
    description: 'Scholar Lyra needs 1 Slime Gel sample to conduct research.',
    giverNpcId: 'scholar-lyra',
    requirements: {
      minLevel: 1,
    },
    objectives: [
      {
        id: 'collect-slime-gel',
        description: 'Collect Slime Gel',
        type: QuestType.CollectItem,
        targetId: 'slime-gel',
        requiredCount: 1,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 20,
      gold: 15,
      items: [
        { itemId: 'minor-mana-potion', quantity: 2 },
      ],
      masteryExp: {
        subjectId: 'mathematics',
        amount: 25,
      },
    },
  },

  // ── Ironhold Kingdom (Phase 26.3) — placeholder hook, provisional ──
  'quest-forge-order': {
    id: 'quest-forge-order',
    name: "Forgemaster's Order",
    description: 'Forgemaster Durn has asked you to cull 3 Magma Hounds near the Forge District.',
    giverNpcId: 'forgemaster-durn',
    requirements: {
      minLevel: 20,
    },
    objectives: [
      {
        id: 'kill-magma-hounds',
        description: 'Defeat Magma Hounds',
        type: QuestType.KillMonster,
        targetId: 'magma-hound',
        requiredCount: 3,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 220,
      gold: 140,
      items: [
        { itemId: 'minor-health-potion', quantity: 3 },
      ],
      masteryExp: {
        subjectId: 'science',
        amount: 60,
      },
    },
  },

  // ── Golden Capital (Phase 26.4) — placeholder hook, provisional ──
  'quest-capital-levy': {
    id: 'quest-capital-levy',
    name: "The Capital Levy",
    description: 'Chancellor Edmund has asked you to destroy 4 rogue Ledger Golems disrupting capital trade.',
    giverNpcId: 'chancellor-edmund',
    requirements: {
      minLevel: 30,
    },
    objectives: [
      {
        id: 'kill-ledger-golems',
        description: 'Defeat Ledger Golems',
        type: QuestType.KillMonster,
        targetId: 'ledger-golem',
        requiredCount: 4,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 520,
      gold: 320,
      items: [
        { itemId: 'minor-health-potion', quantity: 4 },
      ],
      masteryExp: {
        subjectId: 'mathematics',
        amount: 90,
      },
    },
  },

  // ── Arcane Technological City (Phase 26.5) — placeholder hook, provisional ──
  'quest-arcane-calibration': {
    id: 'quest-arcane-calibration',
    name: 'Arcane Calibration',
    description: 'Engineer Vesper needs 5 rogue Mana Automatons overloaded to stabilize the Mana Foundry grid.',
    giverNpcId: 'engineer-vesper',
    requirements: {
      minLevel: 40,
    },
    objectives: [
      {
        id: 'kill-mana-automatons',
        description: 'Overload Mana Automatons',
        type: QuestType.KillMonster,
        targetId: 'mana-automaton',
        requiredCount: 5,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 700,
      gold: 420,
      items: [
        { itemId: 'minor-mana-potion', quantity: 4 },
      ],
      masteryExp: {
        subjectId: 'science',
        amount: 110,
      },
    },
  },

  // ── Forgotten Lands (Phase 26.6) — placeholder hook, provisional ──
  'quest-forgotten-vigil': {
    id: 'quest-forgotten-vigil',
    name: 'The Forgotten Vigil',
    description: 'Warden Thalia has asked you to put down 5 Blight Horrors festering in the Ashen Wastes.',
    giverNpcId: 'warden-thalia',
    requirements: {
      minLevel: 50,
    },
    objectives: [
      {
        id: 'kill-blight-horrors',
        description: 'Destroy Blight Horrors',
        type: QuestType.KillMonster,
        targetId: 'blight-horror',
        requiredCount: 5,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 1000,
      gold: 620,
      items: [
        { itemId: 'minor-health-potion', quantity: 5 },
      ],
      masteryExp: {
        subjectId: 'science',
        amount: 150,
      },
    },
  },

  // ── Phase 26.8 sample — main story chain "The Archivist's Path" (provisional) ──
  // Small, clearly labelled example of a prerequisite-linked story chain. It
  // reuses existing monsters/items and is not a full narrative.
  'quest-archivist-1-first-page': {
    id: 'quest-archivist-1-first-page',
    name: 'Chapter I — The First Page',
    description: 'Chronicler Selene asks you to prove your resolve by clearing 2 Math Slimes.',
    giverNpcId: 'chronicler-selene',
    requirements: { minLevel: 1 },
    objectives: [
      {
        id: 'kill-math-slimes',
        description: 'Defeat Math Slimes',
        type: QuestType.KillMonster,
        targetId: 'math-slime',
        requiredCount: 2,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 40,
      gold: 30,
      items: [{ itemId: 'minor-health-potion', quantity: 2 }],
    },
    category: QuestCategory.MainStory,
    chainId: 'chain-archivists-path',
    orderInChain: 1,
  },
  'quest-archivist-2-lost-formula': {
    id: 'quest-archivist-2-lost-formula',
    name: 'Chapter II — The Lost Formula',
    description: 'Recover 1 Slime Gel so Selene can reconstruct a damaged page.',
    giverNpcId: 'chronicler-selene',
    requirements: {
      minLevel: 3,
      prerequisiteQuestIds: ['quest-archivist-1-first-page'],
    },
    objectives: [
      {
        id: 'collect-slime-gel',
        description: 'Collect Slime Gel',
        type: QuestType.CollectItem,
        targetId: 'slime-gel',
        requiredCount: 1,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 80,
      gold: 55,
      masteryExp: { subjectId: 'mathematics', amount: 30 },
    },
    category: QuestCategory.MainStory,
    chainId: 'chain-archivists-path',
    orderInChain: 2,
  },
  'quest-archivist-3-final-proof': {
    id: 'quest-archivist-3-final-proof',
    name: 'Chapter III — The Final Proof',
    description: 'Drive off 4 Number Goblins troubling the archives to complete the record.',
    giverNpcId: 'chronicler-selene',
    requirements: {
      minLevel: 5,
      prerequisiteQuestIds: ['quest-archivist-2-lost-formula'],
    },
    objectives: [
      {
        id: 'kill-number-goblins',
        description: 'Defeat Number Goblins',
        type: QuestType.KillMonster,
        targetId: 'number-goblin',
        requiredCount: 4,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 150,
      gold: 120,
      items: [{ itemId: 'copper-ring', quantity: 1 }],
      masteryExp: { subjectId: 'mathematics', amount: 60 },
    },
    category: QuestCategory.MainStory,
    chainId: 'chain-archivists-path',
    orderInChain: 3,
  },

  // ── Phase 26.8 sample — optional side quest (provisional) ──
  'quest-side-lost-chalk': {
    id: 'quest-side-lost-chalk',
    name: 'The Lost Chalk',
    description: 'Scholar Lyra needs 3 Fraction Bats dispersed before they ruin her lecture notes.',
    giverNpcId: 'scholar-lyra',
    requirements: { minLevel: 1 },
    objectives: [
      {
        id: 'kill-fraction-bats',
        description: 'Defeat Fraction Bats',
        type: QuestType.KillMonster,
        targetId: 'fraction-bat',
        requiredCount: 3,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 60,
      gold: 45,
      items: [{ itemId: 'minor-mana-potion', quantity: 2 }],
    },
    category: QuestCategory.Side,
  },

  // ── Phase 27.6 sample — career progression quest (provisional) ──
  // A career-category quest offered by the Career Center. It runs on the same
  // quest engine as every other quest but keeps a distinct category from
  // general quests and from professional assignments.
  'quest-career-orientation': {
    id: 'quest-career-orientation',
    name: 'Career Orientation',
    description:
      'Career Advisor Marisol asks you to clear 2 Forest Slimes from the road so you can travel safely between the realm\u2019s workplaces.',
    giverNpcId: 'career-advisor-marisol',
    requirements: { minLevel: 1 },
    objectives: [
      {
        id: 'clear-road-to-workplaces',
        description: 'Defeat Forest Slimes',
        type: QuestType.KillMonster,
        targetId: 'forest-slime',
        requiredCount: 2,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 30,
      gold: 20,
      items: [{ itemId: 'minor-mana-potion', quantity: 2 }],
    },
    category: QuestCategory.Career,
  },
};

export function getQuestDefinition(id: string): QuestDefinition | undefined {
  return QUEST_REGISTRY[id];
}

/**
 * Returns every quest offered by an NPC, ordered by chain position and then
 * registration order. Used to derive NPC dialogue/quest status so no NPC is
 * limited to a hardcoded list of quest ids.
 */
export function getQuestsForNpc(npcId: string): QuestDefinition[] {
  return Object.values(QUEST_REGISTRY)
    .filter((quest) => quest.giverNpcId === npcId)
    .sort(
      (a, b) =>
        (a.orderInChain ?? Number.MAX_SAFE_INTEGER) -
        (b.orderInChain ?? Number.MAX_SAFE_INTEGER),
    );
}

/** Returns the quests of one story chain, ordered by `orderInChain`. */
export function getQuestChain(chainId: string): QuestDefinition[] {
  return Object.values(QUEST_REGISTRY)
    .filter((quest) => quest.chainId === chainId)
    .sort((a, b) => (a.orderInChain ?? 0) - (b.orderInChain ?? 0));
}

/**
 * Returns every quest of a given {@link QuestCategory}. Quests without an
 * explicit category are treated as {@link QuestCategory.Side}, matching the
 * default applied by the quest engine. Keeps career progression quests distinct
 * from general quests.
 */
export function getQuestsByCategory(category: QuestCategory): QuestDefinition[] {
  return Object.values(QUEST_REGISTRY).filter(
    (quest) => (quest.category ?? QuestCategory.Side) === category,
  );
}

/** Returns the ids of every quest chain present in the registry. */
export function getChainIds(): string[] {
  const ids = new Set<string>();
  for (const quest of Object.values(QUEST_REGISTRY)) {
    if (quest.chainId) ids.add(quest.chainId);
  }
  return [...ids];
}
