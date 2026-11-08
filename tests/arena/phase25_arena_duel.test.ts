import { describe, it, expect, beforeEach } from 'vitest';
import { HeadlessPvPDifficultyEngine } from '../../src/arena/PvPDifficultyEngine';
import { ArenaDuelSession } from '../../src/arena/ArenaDuelSession';
import { MOCK_RIVALS } from '../../src/arena/ArenaRivals';
import type { ArenaCompetitor } from '../../src/arena/ArenaTypes';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { QuestionType, QuestionStatus } from '../../src/core/types/question';
import { getNPCDefinition } from '../../src/quests/NPCRegistry';
import { NPCType } from '../../src/quests/NPCTypes';

describe('Phase 25 — Colosseum & Arena Mock Duel Systems', () => {
  let engine: HeadlessPvPDifficultyEngine;
  let repo: QuestionRepository;

  const lowPlayer: ArenaCompetitor = {
    id: 'player-low',
    displayName: 'Novice Student',
    level: 2,
  };

  const highRival = MOCK_RIVALS.find((r) => r.id === 'rival-grandmaster-ignis')!; // Level 10

  beforeEach(() => {
    engine = new HeadlessPvPDifficultyEngine();
    repo = new QuestionRepository([
      {
        id: 'q-math-sh',
        educationalTier: EducationalTier.SeniorHigh,
        subject: SubjectId.Mathematics,
        topic: 'calculus',
        difficulty: 5,
        type: QuestionType.MultipleChoice,
        question: 'Derivative of x^2?',
        choices: [{ choiceId: 'c1', text: '2x' }],
        correctAnswer: 'c1',
        timeLimit: 20,
        baseMasteryExp: 50,
        status: QuestionStatus.Published,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'q-math-elem',
        educationalTier: EducationalTier.Elementary,
        subject: SubjectId.Mathematics,
        topic: 'arithmetic',
        difficulty: 1,
        type: QuestionType.MultipleChoice,
        question: '1 + 1?',
        choices: [{ choiceId: 'c1', text: '2' }],
        correctAnswer: 'c1',
        timeLimit: 30,
        baseMasteryExp: 10,
        status: QuestionStatus.Published,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  it('1. Applies the Reverse Difficulty Rule: Lower-level player gets SeniorHigh while high-level rival gets Elementary', () => {
    const [pProfile, rProfile] = engine.calculateMatchDifficulty(lowPlayer, highRival);

    // Player level 2 vs Rival level 10 (delta = +8)
    expect(pProfile.tier).toBe(EducationalTier.SeniorHigh);
    expect(pProfile.targetDifficulty).toBe(5);
    expect(pProfile.timeLimitSeconds).toBeLessThanOrEqual(20);
    expect(pProfile.handicapNote).toContain('Lower Level Handicap');

    // Rival level 10 vs Player level 2 (delta = -8)
    expect(rProfile.tier).toBe(EducationalTier.Elementary);
    expect(rProfile.targetDifficulty).toBe(1);
    expect(rProfile.timeLimitSeconds).toBeGreaterThanOrEqual(40);
    expect(rProfile.handicapNote).toContain('Higher Level Handicap');
  });

  it('2. Samples Reverse Difficulty tailored questions for the player', () => {
    const session = new ArenaDuelSession({
      player: lowPlayer,
      rival: highRival,
      subject: SubjectId.Mathematics,
      repository: repo,
      pvpEngine: engine,
    });

    const question = session.samplePlayerQuestion();
    expect(question).toBeDefined();
    expect(question?.educationalTier).toBe(EducationalTier.SeniorHigh);
    expect(question?.difficulty).toBe(5);
  });

  it('3. Runs multi-round duel resolution and tracks competitor scores', () => {
    const session = new ArenaDuelSession({
      player: lowPlayer,
      rival: highRival,
      subject: SubjectId.Mathematics,
      repository: repo,
      pvpEngine: engine,
      maxRounds: 3,
    });

    expect(session.getCurrentRound()).toBe(1);
    expect(session.isResolved()).toBe(false);

    // Round 1: Player answers correctly
    const round1 = session.resolveRound(true);
    expect(round1.playerScore).toBe(1);
    expect(session.getCurrentRound()).toBe(2);

    // Round 2: Player misses
    const round2 = session.resolveRound(false);
    expect(round2.playerScore).toBe(1);
    expect(session.getCurrentRound()).toBe(3);

    // Round 3: Player answers correctly -> match completes
    const round3 = session.resolveRound(true);
    expect(round3.playerScore).toBe(2);
    expect(session.isResolved()).toBe(true);

    const matchDef = session.getMatchDefinition();
    expect(matchDef.resolvedAt).toBeDefined();
  });

  it('4. Verifies Colosseum Arbiter Gladius NPC registration', () => {
    const npc = getNPCDefinition('gladius-the-bold');
    expect(npc).toBeDefined();
    expect(npc?.type).toBe(NPCType.ArenaMaster);
    expect(npc?.name).toBe('Arena Master Gladius');
    expect(npc?.mapId).toBe('beginners-village');
    expect(npc?.dialogue.default.length).toBeGreaterThan(0);
  });
});
