import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MATCHMAKING_OPTIONS,
  MatchmakingQueue,
} from '../../../src/arena/online/MatchmakingQueue';
import type { MatchmakingTicket } from '../../../src/arena/online/MatchmakingQueue';

function ticket(overrides: Partial<MatchmakingTicket> & Pick<MatchmakingTicket, 'ticketId' | 'characterId'>): MatchmakingTicket {
  return {
    rating: 1000,
    level: 5,
    enqueuedAtMs: 0,
    ...overrides,
  };
}

describe('MatchmakingQueue (Phase 30.5 Stage 0)', () => {
  it('pairs compatible tickets and removes both from the queue', () => {
    const queue = new MatchmakingQueue({}, () => 0);
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', rating: 1000 }));
    queue.enqueue(ticket({ ticketId: 't-b', characterId: 'b', rating: 1050 }));

    const pair = queue.pollMatch();

    expect(pair).toBeDefined();
    expect(pair?.ticketA.characterId).toBe('a');
    expect(pair?.ticketB.characterId).toBe('b');
    expect(pair?.ratingGap).toBe(50);
    expect(pair?.levelGap).toBe(0);
    expect(pair?.repeatOpponent).toBe(false);
    expect(pair?.qualityScore).toBe(50);
    expect(queue.size).toBe(0);
  });

  it('does not pair tickets outside the current rating window', () => {
    const now = 0;
    const queue = new MatchmakingQueue({}, () => now);
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', rating: 1000 }));
    queue.enqueue(ticket({ ticketId: 't-b', characterId: 'b', rating: 1200 }));

    expect(queue.pollMatch()).toBeUndefined();
    expect(queue.size).toBe(2);
  });

  it('expands the rating window as the oldest ticket waits', () => {
    let now = 0;
    const queue = new MatchmakingQueue({}, () => now);
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', rating: 1000 }));
    queue.enqueue(ticket({ ticketId: 't-b', characterId: 'b', rating: 1200 }));

    now = 4_999;
    expect(queue.pollMatch()).toBeUndefined();

    now = 5_000;
    expect(queue.pollMatch()?.ratingGap).toBe(200);
  });

  it('treats level gap as a hard limit', () => {
    const queue = new MatchmakingQueue({ maxLevelGap: 10 }, () => 0);
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', level: 1 }));
    queue.enqueue(ticket({ ticketId: 't-b', characterId: 'b', level: 12 }));

    expect(queue.pollMatch()).toBeUndefined();
    expect(queue.size).toBe(2);
  });

  it('allows a level gap at the configured limit', () => {
    const queue = new MatchmakingQueue({ maxLevelGap: 10 }, () => 0);
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', level: 1 }));
    queue.enqueue(ticket({ ticketId: 't-b', characterId: 'b', level: 11 }));

    expect(queue.pollMatch()?.levelGap).toBe(10);
  });

  it('treats undefined region and subject as wildcards but rejects mismatches', () => {
    const wildcardQueue = new MatchmakingQueue({}, () => 0);
    wildcardQueue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', region: 'eu' }));
    wildcardQueue.enqueue(ticket({ ticketId: 't-b', characterId: 'b' }));
    expect(wildcardQueue.pollMatch()).toBeDefined();

    const regionQueue = new MatchmakingQueue({}, () => 0);
    regionQueue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', region: 'eu' }));
    regionQueue.enqueue(ticket({ ticketId: 't-b', characterId: 'b', region: 'na' }));
    expect(regionQueue.pollMatch()).toBeUndefined();

    const subjectQueue = new MatchmakingQueue({}, () => 0);
    subjectQueue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', subject: 'mathematics' }));
    subjectQueue.enqueue(ticket({ ticketId: 't-b', characterId: 'b', subject: 'science' }));
    expect(subjectQueue.pollMatch()).toBeUndefined();
  });

  it('avoids a recent opponent until the cooldown expires', () => {
    const options = { repeatOpponentCooldownMs: 300_000 };
    let now = 0;
    const queue = new MatchmakingQueue(options, () => now);
    queue.enqueue(
      ticket({ ticketId: 't-a', characterId: 'a', recentOpponentIds: ['b'] }),
    );
    queue.enqueue(ticket({ ticketId: 't-b', characterId: 'b' }));

    expect(queue.pollMatch()).toBeUndefined();

    now = 299_999;
    expect(queue.pollMatch()).toBeUndefined();

    now = 300_000;
    const pair = queue.pollMatch();
    expect(pair).toBeDefined();
    expect(pair?.repeatOpponent).toBe(true);
    expect(pair?.qualityScore).toBe(DEFAULT_MATCHMAKING_OPTIONS.repeatOpponentPenalty);
  });

  it('lets the oldest ticket choose and prefers the closest rating', () => {
    const queue = new MatchmakingQueue({}, () => 0);
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', enqueuedAtMs: 0 }));
    queue.enqueue(ticket({ ticketId: 't-b', characterId: 'b', enqueuedAtMs: 1_000, rating: 1_030 }));
    queue.enqueue(ticket({ ticketId: 't-c', characterId: 'c', enqueuedAtMs: 2_000, rating: 1_070 }));

    const pair = queue.pollMatch();

    expect(pair?.ticketA.characterId).toBe('a');
    expect(pair?.ticketB.characterId).toBe('b');
    expect(pair?.ratingGap).toBe(30);
    expect(queue.size).toBe(1);
    expect(queue.hasCharacter('c')).toBe(true);
  });

  it('cancels tickets by id or character', () => {
    const queue = new MatchmakingQueue({}, () => 0);
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a' }));
    queue.enqueue(ticket({ ticketId: 't-b', characterId: 'b' }));

    expect(queue.cancel('t-a')).toBe(true);
    expect(queue.cancel('t-a')).toBe(false);
    expect(queue.has('t-a')).toBe(false);
    expect(queue.cancelCharacter('b')).toBe(true);
    expect(queue.cancelCharacter('missing')).toBe(false);
    expect(queue.size).toBe(0);
  });

  it('returns oldest-first snapshots and defensive copies', () => {
    const queue = new MatchmakingQueue({}, () => 0);
    const recent = ['orig'];
    const input = ticket({
      ticketId: 't-b',
      characterId: 'b',
      enqueuedAtMs: 200,
      recentOpponentIds: recent,
    });
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a', enqueuedAtMs: 100 }));
    queue.enqueue(input);

    recent.push('x');
    const snapshot = queue.snapshot();
    expect(snapshot.map((entry) => entry.ticketId)).toEqual(['t-a', 't-b']);

    (snapshot[0].recentOpponentIds as string[]).push('mutated');
    expect(queue.getTicket('t-a')?.recentOpponentIds).not.toContain('mutated');
    expect(queue.getTicket('t-b')?.recentOpponentIds).toEqual(['orig']);
  });

  it('rejects duplicate tickets, duplicate characters, and invalid values', () => {
    const queue = new MatchmakingQueue({}, () => 0);
    queue.enqueue(ticket({ ticketId: 't-a', characterId: 'a' }));

    expect(() => queue.enqueue(ticket({ ticketId: 't-a', characterId: 'b' }))).toThrow(
      /already queued/,
    );
    expect(() => queue.enqueue(ticket({ ticketId: 't-c', characterId: 'a' }))).toThrow(
      /already queued/,
    );
    expect(() => queue.enqueue(ticket({ ticketId: '', characterId: 'c' }))).toThrow(
      /ticketId/,
    );
    expect(() => queue.enqueue(ticket({ ticketId: 't-d', characterId: 'd', level: 0 }))).toThrow(
      /level/,
    );
    expect(() =>
      queue.enqueue(ticket({ ticketId: 't-e', characterId: 'e', enqueuedAtMs: -1 })),
    ).toThrow(/enqueuedAtMs/);
    expect(() =>
      queue.enqueue(ticket({ ticketId: 't-f', characterId: 'f', region: ' ' })),
    ).toThrow(/region/);
  });

  it('rejects invalid options and non-finite clock values', () => {
    expect(
      () => new MatchmakingQueue({ maxRatingWindow: 50, baseRatingWindow: 100 }),
    ).toThrow(/maxRatingWindow/);
    expect(() => new MatchmakingQueue({ ratingWindowGrowthPerSecond: -1 })).toThrow(
      /ratingWindowGrowthPerSecond/,
    );
    expect(() => new MatchmakingQueue({ maxLevelGap: 1.5 })).toThrow(/maxLevelGap/);

    const queue = new MatchmakingQueue({}, () => Number.NaN);
    expect(() => queue.pollMatch()).toThrow(/finite/);
  });
});
