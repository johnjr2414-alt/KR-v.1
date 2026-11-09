import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LEADERBOARD_OPTIONS,
  LeaderboardRanking,
} from '../../../src/arena/online/LeaderboardRanking';
import type {
  LeaderboardEntry,
  LeaderboardTiePolicy,
} from '../../../src/arena/online/LeaderboardRanking';

function entry(
  characterId: string,
  score: number,
  matchesPlayed = 10,
  updatedAtMs = 0,
): LeaderboardEntry {
  return { characterId, score, matchesPlayed, updatedAtMs };
}

describe('LeaderboardRanking (Phase 30.5 Stage 0)', () => {
  it('sorts by descending score', () => {
    const board = new LeaderboardRanking();
    board.upsert(entry('a', 1200));
    board.upsert(entry('b', 1500));
    board.upsert(entry('c', 1300));

    const ranked = board.getRankedEntries();
    expect(ranked.map((item) => item.characterId)).toEqual(['b', 'c', 'a']);
    expect(ranked.map((item) => item.rank)).toEqual([1, 2, 3]);
  });

  it('shares ranks for equal scores under the shared policy', () => {
    const board = new LeaderboardRanking({ tiePolicy: 'shared' });
    board.upsert(entry('a', 1500));
    board.upsert(entry('b', 1500));
    board.upsert(entry('c', 1400));

    expect(board.getRankedEntries().map((item) => item.rank)).toEqual([1, 1, 3]);
    expect(board.getRank('a')).toBe(1);
    expect(board.getRank('b')).toBe(1);
    expect(board.getRank('c')).toBe(3);
  });

  it('breaks ties by earliest score time under the earliest policy', () => {
    const board = new LeaderboardRanking({ tiePolicy: 'earliest' });
    board.upsert(entry('a', 1500, 10, 200));
    board.upsert(entry('b', 1500, 10, 100));

    expect(board.getRankedEntries().map((item) => item.characterId)).toEqual(['b', 'a']);
    expect(board.getRankedEntries().map((item) => item.rank)).toEqual([1, 2]);
  });

  it('breaks ties by matches played, then earliest time', () => {
    const board = new LeaderboardRanking({ tiePolicy: 'matches-played' });
    board.upsert(entry('a', 1500, 20, 0));
    board.upsert(entry('b', 1500, 30, 500));
    board.upsert(entry('c', 1500, 30, 50));

    expect(board.getRankedEntries().map((item) => item.characterId)).toEqual(['c', 'b', 'a']);
    expect(board.getRankedEntries().map((item) => item.rank)).toEqual([1, 2, 3]);
  });

  it('excludes entries below the minimum match count', () => {
    const board = new LeaderboardRanking({ minMatches: 5 });
    board.upsert(entry('a', 1500, 5));
    board.upsert(entry('b', 1600, 4));

    expect(board.size).toBe(2);
    expect(board.getRankedEntries().map((item) => item.characterId)).toEqual(['a']);
    expect(board.getRank('b')).toBeUndefined();
    expect(board.get('b')?.score).toBe(1600);
  });

  it('extends a shared-tie cutoff so tied players are not dropped', () => {
    const board = new LeaderboardRanking({ maxEntries: 2, tiePolicy: 'shared' });
    board.upsert(entry('a', 1500));
    board.upsert(entry('b', 1500));
    board.upsert(entry('c', 1500));
    board.upsert(entry('d', 1400));

    const top = board.getTop();
    expect(top.map((item) => item.characterId)).toEqual(['a', 'b', 'c']);
    expect(top.map((item) => item.rank)).toEqual([1, 1, 1]);

    const strict = new LeaderboardRanking({ maxEntries: 2, tiePolicy: 'earliest' });
    strict.upsert(entry('a', 1500));
    strict.upsert(entry('b', 1500));
    strict.upsert(entry('c', 1500));
    expect(strict.getTop()).toHaveLength(2);
    expect(strict.getTop(1)).toHaveLength(1);
    expect(strict.getTop(0)).toEqual([]);
  });

  it('reports the true rank beyond the published top', () => {
    const board = new LeaderboardRanking({ maxEntries: 2 });
    board.upsert(entry('a', 1500));
    board.upsert(entry('b', 1400));
    board.upsert(entry('c', 1300));
    board.upsert(entry('d', 1200));

    expect(board.getTop()).toHaveLength(2);
    expect(board.getRank('c')).toBe(3);
    expect(board.getRank('d')).toBe(4);
  });

  it('preserves the earliest timestamp when a score is re-submitted unchanged', () => {
    const board = new LeaderboardRanking();
    board.upsert(entry('a', 1500, 10, 200));
    board.upsert(entry('a', 1500, 12, 100));

    expect(board.get('a')).toMatchObject({ matchesPlayed: 12, updatedAtMs: 100 });

    board.upsert(entry('a', 1600, 13, 50));
    expect(board.get('a')?.updatedAtMs).toBe(50);

    board.upsert(entry('a', 1600, 14, 80));
    expect(board.get('a')?.updatedAtMs).toBe(50);
  });

  it('builds seasonal snapshots from the injected clock without aliasing state', () => {
    const board = new LeaderboardRanking({ seasonId: 'season-2' }, () => 12_345);
    board.upsert(entry('a', 1500));

    const snapshot = board.snapshot();
    expect(snapshot.seasonId).toBe('season-2');
    expect(snapshot.tiePolicy).toBe('shared');
    expect(snapshot.generatedAtMs).toBe(12_345);
    expect(snapshot.entries).toHaveLength(1);

    snapshot.entries[0].score = 0;
    expect(board.get('a')?.score).toBe(1500);
    expect(board.getRankedEntries()[0].score).toBe(1500);
  });

  it('removes and clears entries', () => {
    const board = new LeaderboardRanking();
    board.upsert(entry('a', 1500));
    board.upsert(entry('b', 1400));

    expect(board.remove('a')).toBe(true);
    expect(board.remove('a')).toBe(false);
    expect(board.size).toBe(1);

    board.clear();
    expect(board.size).toBe(0);
    expect(board.getRankedEntries()).toEqual([]);
  });

  it('exposes the configured options', () => {
    const board = new LeaderboardRanking();
    expect(board.getSeasonId()).toBe(DEFAULT_LEADERBOARD_OPTIONS.seasonId);
    expect(board.getTiePolicy()).toBe(DEFAULT_LEADERBOARD_OPTIONS.tiePolicy);
    expect(board.getMinMatches()).toBe(DEFAULT_LEADERBOARD_OPTIONS.minMatches);
    expect(board.getMaxEntries()).toBe(DEFAULT_LEADERBOARD_OPTIONS.maxEntries);
  });

  it('rejects invalid entries and options', () => {
    const board = new LeaderboardRanking();

    expect(() => board.upsert(entry(' ', 1500))).toThrow(/characterId/);
    expect(() => board.upsert(entry('a', Number.NaN))).toThrow(/score/);
    expect(() => board.upsert(entry('a', 1500, -1))).toThrow(/matchesPlayed/);
    expect(() => board.upsert(entry('a', 1500, 1.5))).toThrow(/matchesPlayed/);
    expect(() => board.upsert(entry('a', 1500, 10, -1))).toThrow(/updatedAtMs/);
    expect(() => board.getTop(-1)).toThrow(/limit/);
    expect(() => board.getTop(1.5)).toThrow(/limit/);

    expect(() => new LeaderboardRanking({ minMatches: -1 })).toThrow(/minMatches/);
    expect(() => new LeaderboardRanking({ maxEntries: 0 })).toThrow(/maxEntries/);
    expect(() => new LeaderboardRanking({ seasonId: ' ' })).toThrow(/seasonId/);
    expect(
      () => new LeaderboardRanking({ tiePolicy: 'bogus' as LeaderboardTiePolicy }),
    ).toThrow(/tie policy/);
  });
});
