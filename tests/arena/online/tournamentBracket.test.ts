import { describe, it, expect } from 'vitest';
import {
  MAX_TOURNAMENT_BRACKET_SIZE,
  TournamentBracket,
} from '../../../src/arena/online/TournamentBracket';
import type { TournamentParticipantSeed } from '../../../src/arena/online/TournamentBracket';

function participants(count: number): TournamentParticipantSeed[] {
  return Array.from({ length: count }, (_, index) => ({
    seed: index + 1,
    characterId: `p${index + 1}`,
    displayName: `Player ${index + 1}`,
  }));
}

describe('TournamentBracket (Phase 30.5 Stage 0)', () => {
  it('generates a deterministic 8-player bracket with standard seeding', () => {
    const bracket = new TournamentBracket(participants(8));
    const snapshot = bracket.getSnapshot();
    const firstRound = snapshot.rounds[0].matches;

    expect(bracket.size).toBe(8);
    expect(bracket.roundCount).toBe(3);
    expect(snapshot.status).toBe('in-progress');
    expect(bracket.getReadyMatches()).toHaveLength(4);
    expect(firstRound.map((match) => match.matchId)).toEqual([
      'r1-m1',
      'r1-m2',
      'r1-m3',
      'r1-m4',
    ]);
    expect(firstRound.map((match) => [match.participantAId, match.participantBId])).toEqual([
      ['p1', 'p8'],
      ['p4', 'p5'],
      ['p2', 'p7'],
      ['p3', 'p6'],
    ]);
    expect(firstRound.every((match) => match.status === 'ready')).toBe(true);
  });

  it('awards byes to the strongest seeds for a 5-player field', () => {
    const bracket = new TournamentBracket(participants(5));
    const snapshot = bracket.getSnapshot();
    const firstRound = snapshot.rounds[0].matches;

    expect(bracket.size).toBe(8);
    expect(firstRound.map((match) => match.status)).toEqual(['bye', 'ready', 'bye', 'bye']);
    expect(firstRound.map((match) => match.winnerId)).toEqual([
      'p1',
      undefined,
      'p2',
      'p3',
    ]);
    expect(bracket.getReadyMatches().map((match) => match.matchId)).toEqual([
      'r1-m2',
      'r2-m2',
    ]);
    expect(bracket.getChampionId()).toBeUndefined();
  });

  it('advances winners through a full 8-player bracket', () => {
    const bracket = new TournamentBracket(participants(8));

    bracket.reportWinner('r1-m1', 'p1');
    bracket.reportWinner('r1-m2', 'p4');
    bracket.reportWinner('r1-m3', 'p2');
    bracket.reportWinner('r1-m4', 'p3');

    expect(bracket.getReadyMatches().map((match) => match.matchId)).toEqual([
      'r2-m1',
      'r2-m2',
    ]);

    bracket.reportWinner('r2-m1', 'p1');
    bracket.reportWinner('r2-m2', 'p2');

    expect(bracket.getReadyMatches()).toHaveLength(1);
    bracket.reportWinner('r3-m1', 'p1');

    expect(bracket.isComplete()).toBe(true);
    expect(bracket.status).toBe('completed');
    expect(bracket.getChampionId()).toBe('p1');
    expect(bracket.getReadyMatches()).toHaveLength(0);
    expect(bracket.getSnapshot().championId).toBe('p1');
  });

  it('completes a 5-player bracket that started with byes', () => {
    const bracket = new TournamentBracket(participants(5));

    bracket.reportWinner('r1-m2', 'p4');
    bracket.reportWinner('r2-m1', 'p1');
    bracket.reportWinner('r2-m2', 'p2');
    bracket.reportWinner('r3-m1', 'p2');

    expect(bracket.getChampionId()).toBe('p2');
  });

  it('supports a 2-player final and a 3-player field', () => {
    const final = new TournamentBracket(participants(2));
    expect(final.getReadyMatches().map((match) => match.matchId)).toEqual(['r1-m1']);
    final.reportWinner('r1-m1', 'p2');
    expect(final.getChampionId()).toBe('p2');

    const trio = new TournamentBracket(participants(3));
    const firstRound = trio.getSnapshot().rounds[0].matches;
    expect(trio.size).toBe(4);
    expect(firstRound.map((match) => match.status)).toEqual(['bye', 'ready']);
    expect(firstRound[0].winnerId).toBe('p1');
  });

  it('accepts the maximum bracket size', () => {
    const bracket = new TournamentBracket(participants(MAX_TOURNAMENT_BRACKET_SIZE));

    expect(bracket.size).toBe(MAX_TOURNAMENT_BRACKET_SIZE);
    expect(bracket.roundCount).toBe(7);
    expect(bracket.getReadyMatches()).toHaveLength(MAX_TOURNAMENT_BRACKET_SIZE / 2);
  });

  it('records a forfeit and advances the opponent', () => {
    const bracket = new TournamentBracket(participants(2));

    bracket.declareForfeit('r1-m1', 'p1');

    const match = bracket.getMatch('r1-m1');
    expect(match?.status).toBe('forfeit');
    expect(match?.winnerId).toBe('p2');
    expect(match?.loserId).toBe('p1');
    expect(bracket.getChampionId()).toBe('p2');
  });

  it('rejects results for unknown, not-ready, or invalid matches', () => {
    const bracket = new TournamentBracket(participants(8));

    expect(() => bracket.reportWinner('missing', 'p1')).toThrow(/Unknown match/);
    expect(() => bracket.reportWinner('r3-m1', 'p1')).toThrow(/not ready/);
    expect(() => bracket.reportWinner('r1-m1', 'p2')).toThrow(/not a participant/);

    bracket.reportWinner('r1-m1', 'p1');
    expect(() => bracket.reportWinner('r1-m1', 'p1')).toThrow(/not ready/);

    expect(() => bracket.declareForfeit('r1-m2', 'p1')).toThrow(/not a participant/);
  });

  it('rejects invalid participant lists', () => {
    expect(() => new TournamentBracket(participants(1))).toThrow(/at least 2/);
    expect(() => new TournamentBracket(participants(MAX_TOURNAMENT_BRACKET_SIZE + 1))).toThrow(
      /at most/,
    );
    expect(() =>
      new TournamentBracket([
        { seed: 1, characterId: 'x' },
        { seed: 2, characterId: 'x' },
      ]),
    ).toThrow(/Duplicate/);
    expect(() =>
      new TournamentBracket([
        { seed: 1, characterId: 'x' },
        { seed: 3, characterId: 'y' },
      ]),
    ).toThrow(/contiguous/);
    expect(() =>
      new TournamentBracket([
        { seed: 1, characterId: ' ' },
        { seed: 2, characterId: 'y' },
      ]),
    ).toThrow(/characterId/);
  });

  it('returns snapshots that cannot mutate the bracket', () => {
    const input = participants(4);
    const bracket = new TournamentBracket(input);
    const snapshot = bracket.getSnapshot();

    input[0].characterId = 'changed';
    snapshot.rounds[0].matches[0].status = 'completed';
    snapshot.rounds[0].matches[0].winnerId = 'p1';
    snapshot.participants[0].characterId = 'changed-again';

    const fresh = bracket.getSnapshot();
    expect(fresh.participants[0].characterId).toBe('p1');
    expect(bracket.getMatch('r1-m1')?.status).toBe('ready');
    expect(bracket.getMatch('r1-m1')?.winnerId).toBeUndefined();
  });
});
