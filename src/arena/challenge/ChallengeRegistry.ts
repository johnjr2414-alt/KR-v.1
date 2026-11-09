import { SubjectId } from '../../core/types/education';
import { ChallengeMode, type ChallengeDefinition } from './ChallengeTypes';

/**
 * Catalog of configurable Colosseum challenges.
 *
 * All opponents reference existing monster ids (Forgotten Lands beasts plus the
 * Colosseum Grand Champion boss) — no new combat rules are introduced. Every
 * value is provisional and lives in data so modes can be tuned without touching
 * the challenge engine.
 */
export const CHALLENGE_REGISTRY: Record<string, ChallengeDefinition> = {
  'challenge-trial-of-endurance': {
    id: 'challenge-trial-of-endurance',
    name: 'Trial of Endurance',
    description: 'Survive three consecutive beasts of the Forgotten Lands without falling.',
    mode: ChallengeMode.ConsecutiveMonsters,
    recommendedMinLevel: 60,
    stages: [
      { stageNumber: 1, name: 'Round I — Ash Stalker', monsterId: 'ash-stalker' },
      { stageNumber: 2, name: 'Round II — Blight Horror', monsterId: 'blight-horror' },
      { stageNumber: 3, name: 'Round III — Ruin Colossus', monsterId: 'ruin-colossus' },
    ],
    rewards: {
      expPerStage: 200,
      goldPerStage: 90,
      completionBonusExp: 500,
      completionBonusGold: 300,
      completionItems: [{ itemId: 'minor-health-potion', quantity: 3 }],
      firstClearBonus: { gold: 250, exp: 400, itemId: 'rare-crystal' },
    },
    repeatable: true,
    provisional: true,
  },

  'challenge-champion-duel': {
    id: 'challenge-champion-duel',
    name: 'Champion Duel',
    description: 'Face the reigning Grand Champion of the Colosseum in a single bout.',
    mode: ChallengeMode.BossChallenge,
    recommendedMinLevel: 60,
    stages: [
      { stageNumber: 1, name: 'Championship Bout — Grand Champion Ragnar', monsterId: 'grand-champion-ragnar' },
    ],
    rewards: {
      expPerStage: 0,
      goldPerStage: 0,
      completionBonusExp: 1500,
      completionBonusGold: 800,
      completionItems: [{ itemId: 'amulet-of-logic', quantity: 1 }],
      firstClearBonus: { gold: 500, exp: 800, itemId: 'rare-crystal' },
    },
    repeatable: true,
    provisional: true,
  },

  'challenge-scholastic-trial': {
    id: 'challenge-scholastic-trial',
    name: 'Scholastic Trial of Numbers',
    description: 'A mathematics gauntlet — the Colosseum rewards only the precise.',
    mode: ChallengeMode.SubjectChallenge,
    recommendedMinLevel: 60,
    subject: SubjectId.Mathematics,
    stages: [
      { stageNumber: 1, name: 'Set I — Crumbling Sentry', monsterId: 'crumbling-sentry' },
      { stageNumber: 2, name: 'Set II — Fractured Golem', monsterId: 'fractured-golem' },
      { stageNumber: 3, name: 'Set III — Fallen Warden', monsterId: 'fallen-warden' },
    ],
    rewards: {
      expPerStage: 220,
      goldPerStage: 95,
      completionBonusExp: 550,
      completionBonusGold: 320,
      completionItems: [{ itemId: 'minor-mana-potion', quantity: 3 }],
      firstClearBonus: { gold: 250, exp: 400, itemId: 'copper-ring' },
    },
    repeatable: true,
    provisional: true,
  },

  'challenge-quick-wits': {
    id: 'challenge-quick-wits',
    name: 'Quick Wits',
    description: 'Clear as many Colosseum rounds as you can before the sand runs out.',
    mode: ChallengeMode.TimeAttack,
    recommendedMinLevel: 60,
    timeLimitSeconds: 120,
    scorePerStage: 100,
    stages: [
      { stageNumber: 1, name: 'Bout I — Blight Horror', monsterId: 'blight-horror' },
      { stageNumber: 2, name: 'Bout II — Fractured Golem', monsterId: 'fractured-golem' },
      { stageNumber: 3, name: 'Bout III — Ruin Colossus', monsterId: 'ruin-colossus' },
      { stageNumber: 4, name: 'Bout IV — Fallen Warden', monsterId: 'fallen-warden' },
    ],
    rewards: {
      expPerStage: 180,
      goldPerStage: 80,
      completionBonusExp: 600,
      completionBonusGold: 350,
      completionItems: [{ itemId: 'minor-health-potion', quantity: 4 }],
      firstClearBonus: { gold: 300, exp: 500, itemId: 'rare-crystal' },
    },
    repeatable: true,
    provisional: true,
  },
};

/** All challenge definitions, in registration order. */
export const CHALLENGE_DEFINITIONS: readonly ChallengeDefinition[] = Object.values(CHALLENGE_REGISTRY);

/** Returns a challenge definition by id. */
export function getChallengeById(id: string): ChallengeDefinition | undefined {
  return CHALLENGE_REGISTRY[id];
}

/** Returns all challenges that use the given mode. */
export function getChallengesForMode(mode: ChallengeMode): ChallengeDefinition[] {
  return CHALLENGE_DEFINITIONS.filter((challenge) => challenge.mode === mode);
}

/** Returns all challenges focused on the given subject. */
export function getChallengesForSubject(subject: SubjectId): ChallengeDefinition[] {
  return CHALLENGE_DEFINITIONS.filter((challenge) => challenge.subject === subject);
}
