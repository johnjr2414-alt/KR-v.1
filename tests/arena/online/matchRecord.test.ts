import { describe, it, expect } from 'vitest';
import {
  MATCH_RECORD_SCHEMA_VERSION,
  isTerminalMatchStatus,
} from '../../../src/arena/online/MatchRecord';
import type { MatchRecord } from '../../../src/arena/online/MatchRecord';
import { EducationalTier, SubjectId } from '../../../src/core/types/education';

function completedRecord(): MatchRecord {
  return {
    schemaVersion: MATCH_RECORD_SCHEMA_VERSION,
    matchId: 'match-1',
    mode: 'ranked-duel',
    seasonId: 'season-1',
    rulesVersion: 'pvp-rules-1',
    contentVersion: 'question-bank-4',
    status: 'completed',
    participants: [
      {
        accountId: 'account-a',
        characterId: 'character-a',
        displayName: 'Adept A',
        level: 5,
        ratingBefore: 1000,
        ratingAfter: 1016,
        outcome: 'win',
        score: 3,
        roundsWon: 3,
        disconnected: false,
      },
      {
        accountId: 'account-b',
        characterId: 'character-b',
        displayName: 'Adept B',
        level: 5,
        ratingBefore: 1000,
        ratingAfter: 984,
        outcome: 'loss',
        score: 1,
        roundsWon: 1,
        disconnected: false,
      },
    ],
    rounds: [
      {
        roundNumber: 1,
        subject: SubjectId.Mathematics,
        questionIds: {
          'character-a': 'q-100',
          'character-b': 'q-101',
        },
        profiles: {
          'character-a': {
            tier: EducationalTier.JuniorHigh,
            targetDifficulty: 3,
            timeLimitSeconds: 30,
          },
          'character-b': {
            tier: EducationalTier.JuniorHigh,
            targetDifficulty: 3,
            timeLimitSeconds: 30,
          },
        },
        answers: {
          'character-a': { submittedAnswer: '4', isCorrect: true, timedOut: false, submittedAtMs: 900 },
          'character-b': { isCorrect: false, timedOut: true },
        },
        resolvedAtMs: 1_000,
      },
    ],
    winnerCharacterId: 'character-a',
    createdAtMs: 0,
    resolvedAtMs: 1_000,
  };
}

describe('MatchRecord (Phase 30.5 Stage 0)', () => {
  it('pins the persisted schema version', () => {
    expect(MATCH_RECORD_SCHEMA_VERSION).toBe(1);
  });

  it('supports a terminal match with two participants and per-side round data', () => {
    const record = completedRecord();

    expect(record.participants).toHaveLength(2);
    expect(record.participants[0].outcome).toBe('win');
    expect(record.participants[1].outcome).toBe('loss');
    expect(record.rounds[0].questionIds['character-a']).toBe('q-100');
    expect(record.rounds[0].questionIds['character-b']).toBe('q-101');
    expect(record.rounds[0].answers['character-b'].timedOut).toBe(true);
    expect(record.winnerCharacterId).toBe('character-a');
  });

  it('classifies every non-running status as terminal', () => {
    expect(isTerminalMatchStatus('in-progress')).toBe(false);
    expect(isTerminalMatchStatus('completed')).toBe(true);
    expect(isTerminalMatchStatus('draw')).toBe(true);
    expect(isTerminalMatchStatus('no-contest')).toBe(true);
    expect(isTerminalMatchStatus('abandoned')).toBe(true);
  });
});
