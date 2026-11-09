/** One waiting player in the matchmaking queue. */
export interface MatchmakingTicket {
  ticketId: string;
  characterId: string;
  rating: number;
  level: number;
  enqueuedAtMs: number;
  /** Undefined acts as a wildcard (global pool). */
  region?: string;
  /** Undefined acts as a wildcard (any subject). */
  subject?: string;
  /** Opponents faced recently; used to discourage immediate rematches. */
  recentOpponentIds?: readonly string[];
}

/** Tunable queue behaviour. All values are initial planning defaults. */
export interface MatchmakingOptions {
  baseRatingWindow: number;
  ratingWindowGrowthPerSecond: number;
  maxRatingWindow: number;
  maxLevelGap: number;
  levelGapWeight: number;
  repeatOpponentCooldownMs: number;
  repeatOpponentPenalty: number;
}

export const DEFAULT_MATCHMAKING_OPTIONS: Readonly<MatchmakingOptions> = {
  baseRatingWindow: 100,
  ratingWindowGrowthPerSecond: 20,
  maxRatingWindow: 600,
  maxLevelGap: 10,
  levelGapWeight: 10,
  repeatOpponentCooldownMs: 5 * 60 * 1000,
  repeatOpponentPenalty: 200,
};

/** A proposed pairing returned by the queue. */
export interface MatchmakingPair {
  ticketA: MatchmakingTicket;
  ticketB: MatchmakingTicket;
  ratingGap: number;
  levelGap: number;
  waitedMs: number;
  repeatOpponent: boolean;
  /** Lower is better. */
  qualityScore: number;
}

interface InternalMatchmakingPair {
  ticketA: MatchmakingTicket;
  ticketB: MatchmakingTicket;
  ratingGap: number;
  levelGap: number;
  waitedMs: number;
  repeatOpponent: boolean;
  qualityScore: number;
}

/**
 * Headless matchmaking queue.
 *
 * Pairs waiting tickets by rating (expanding with wait time), level gap, region,
 * subject, and repeat-opponent history. It owns no rating formula, clock,
 * storage, or network transport; callers inject the clock and provide ratings.
 */
export class MatchmakingQueue {
  private readonly tickets = new Map<string, MatchmakingTicket>();
  private readonly characterTickets = new Map<string, string>();
  private readonly options: MatchmakingOptions;
  private readonly clock: () => number;

  constructor(options: Partial<MatchmakingOptions> = {}, clock: () => number = Date.now) {
    this.options = { ...DEFAULT_MATCHMAKING_OPTIONS, ...options };
    validateOptions(this.options);
    this.clock = clock;
  }

  /** Adds a ticket. Rejects duplicate ticket ids or characters already queued. */
  enqueue(ticket: MatchmakingTicket): void {
    validateTicket(ticket);

    if (this.tickets.has(ticket.ticketId)) {
      throw new Error(`Ticket "${ticket.ticketId}" is already queued`);
    }
    if (this.characterTickets.has(ticket.characterId)) {
      throw new Error(`Character "${ticket.characterId}" is already queued`);
    }

    const stored: MatchmakingTicket = {
      ...ticket,
      recentOpponentIds: [...(ticket.recentOpponentIds ?? [])],
    };
    this.tickets.set(stored.ticketId, stored);
    this.characterTickets.set(stored.characterId, stored.ticketId);
  }

  /** Removes a ticket by id. Returns false when it was not queued. */
  cancel(ticketId: string): boolean {
    return this.removeTicket(ticketId);
  }

  /** Removes the ticket belonging to a character. */
  cancelCharacter(characterId: string): boolean {
    const ticketId = this.characterTickets.get(characterId);
    return ticketId ? this.removeTicket(ticketId) : false;
  }

  has(ticketId: string): boolean {
    return this.tickets.has(ticketId);
  }

  hasCharacter(characterId: string): boolean {
    return this.characterTickets.has(characterId);
  }

  get size(): number {
    return this.tickets.size;
  }

  /** Returns a defensive copy of a queued ticket. */
  getTicket(ticketId: string): MatchmakingTicket | undefined {
    const ticket = this.tickets.get(ticketId);
    return ticket ? cloneTicket(ticket) : undefined;
  }

  /** All waiting tickets, oldest first. */
  snapshot(): MatchmakingTicket[] {
    return [...this.tickets.values()].sort(compareTickets).map(cloneTicket);
  }

  /**
   * Finds and removes the best available pair, or returns undefined.
   *
   * The oldest waiting ticket chooses first. Rating windows expand with the
   * longer of the two waits; hard constraints are region, subject, and level gap.
   */
  pollMatch(): MatchmakingPair | undefined {
    const now = this.clock();
    if (!Number.isFinite(now)) {
      throw new Error('Matchmaking clock must return a finite number');
    }

    const ordered = [...this.tickets.values()].sort(compareTickets);
    for (const ticketA of ordered) {
      const best = this.findBestOpponent(ticketA, ordered, now);
      if (!best) continue;

      this.removeTicket(best.ticketA.ticketId);
      this.removeTicket(best.ticketB.ticketId);

      return {
        ticketA: cloneTicket(best.ticketA),
        ticketB: cloneTicket(best.ticketB),
        ratingGap: best.ratingGap,
        levelGap: best.levelGap,
        waitedMs: best.waitedMs,
        repeatOpponent: best.repeatOpponent,
        qualityScore: best.qualityScore,
      };
    }

    return undefined;
  }

  private findBestOpponent(
    ticketA: MatchmakingTicket,
    allTickets: readonly MatchmakingTicket[],
    now: number,
  ): InternalMatchmakingPair | undefined {
    let best: InternalMatchmakingPair | undefined;

    for (const ticketB of allTickets) {
      if (ticketA.ticketId === ticketB.ticketId) continue;
      if (ticketA.characterId === ticketB.characterId) continue;
      if (!areCompatible(ticketA.region, ticketB.region)) continue;
      if (!areCompatible(ticketA.subject, ticketB.subject)) continue;

      const levelGap = Math.abs(ticketA.level - ticketB.level);
      if (levelGap > this.options.maxLevelGap) continue;

      const oldestEnqueue = Math.min(ticketA.enqueuedAtMs, ticketB.enqueuedAtMs);
      const waitedMs = Math.max(0, now - oldestEnqueue);
      const ratingGap = Math.abs(ticketA.rating - ticketB.rating);
      if (ratingGap > this.ratingWindow(waitedMs)) continue;

      const repeatOpponent = isRepeatOpponent(ticketA, ticketB);
      if (repeatOpponent && waitedMs < this.options.repeatOpponentCooldownMs) continue;

      const qualityScore =
        ratingGap +
        levelGap * this.options.levelGapWeight +
        (repeatOpponent ? this.options.repeatOpponentPenalty : 0);

      const candidate: InternalMatchmakingPair = {
        ticketA,
        ticketB,
        ratingGap,
        levelGap,
        waitedMs,
        repeatOpponent,
        qualityScore,
      };

      if (!best || isBetterCandidate(candidate, best)) {
        best = candidate;
      }
    }

    return best;
  }

  private ratingWindow(waitedMs: number): number {
    const expanded =
      this.options.baseRatingWindow +
      (waitedMs / 1000) * this.options.ratingWindowGrowthPerSecond;
    return Math.min(this.options.maxRatingWindow, expanded);
  }

  private removeTicket(ticketId: string): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    this.tickets.delete(ticketId);
    if (this.characterTickets.get(ticket.characterId) === ticketId) {
      this.characterTickets.delete(ticket.characterId);
    }
    return true;
  }
}

function cloneTicket(ticket: MatchmakingTicket): MatchmakingTicket {
  return {
    ...ticket,
    recentOpponentIds: [...(ticket.recentOpponentIds ?? [])],
  };
}

function compareTickets(a: MatchmakingTicket, b: MatchmakingTicket): number {
  if (a.enqueuedAtMs !== b.enqueuedAtMs) return a.enqueuedAtMs - b.enqueuedAtMs;
  return a.ticketId.localeCompare(b.ticketId);
}

function areCompatible(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) return true;
  return a === b;
}

function isRepeatOpponent(a: MatchmakingTicket, b: MatchmakingTicket): boolean {
  return (
    (a.recentOpponentIds?.includes(b.characterId) ?? false) ||
    (b.recentOpponentIds?.includes(a.characterId) ?? false)
  );
}

function isBetterCandidate(
  candidate: InternalMatchmakingPair,
  current: InternalMatchmakingPair,
): boolean {
  if (candidate.qualityScore !== current.qualityScore) {
    return candidate.qualityScore < current.qualityScore;
  }
  if (candidate.ticketB.enqueuedAtMs !== current.ticketB.enqueuedAtMs) {
    return candidate.ticketB.enqueuedAtMs < current.ticketB.enqueuedAtMs;
  }
  if (candidate.ticketB.characterId !== current.ticketB.characterId) {
    return candidate.ticketB.characterId.localeCompare(current.ticketB.characterId) < 0;
  }
  return candidate.ticketB.ticketId.localeCompare(current.ticketB.ticketId) < 0;
}

function validateTicket(ticket: MatchmakingTicket): void {
  assertNonEmpty(ticket.ticketId, 'ticketId');
  assertNonEmpty(ticket.characterId, 'characterId');
  assertFinite(ticket.rating, 'rating');
  assertFinite(ticket.enqueuedAtMs, 'enqueuedAtMs');

  if (ticket.enqueuedAtMs < 0) {
    throw new Error('enqueuedAtMs must be zero or greater');
  }
  if (!Number.isInteger(ticket.level) || ticket.level < 1) {
    throw new Error('level must be an integer of at least 1');
  }
  if (ticket.region !== undefined) {
    assertNonEmpty(ticket.region, 'region');
  }
  if (ticket.subject !== undefined) {
    assertNonEmpty(ticket.subject, 'subject');
  }
  for (const opponentId of ticket.recentOpponentIds ?? []) {
    assertNonEmpty(opponentId, 'recentOpponentIds entry');
  }
}

function validateOptions(options: MatchmakingOptions): void {
  assertNonNegative(options.baseRatingWindow, 'baseRatingWindow');
  assertNonNegative(options.ratingWindowGrowthPerSecond, 'ratingWindowGrowthPerSecond');
  assertNonNegative(options.maxRatingWindow, 'maxRatingWindow');
  assertNonNegative(options.levelGapWeight, 'levelGapWeight');
  assertNonNegative(options.repeatOpponentCooldownMs, 'repeatOpponentCooldownMs');
  assertNonNegative(options.repeatOpponentPenalty, 'repeatOpponentPenalty');

  if (options.maxRatingWindow < options.baseRatingWindow) {
    throw new Error('maxRatingWindow must be at least baseRatingWindow');
  }
  if (!Number.isInteger(options.maxLevelGap) || options.maxLevelGap < 0) {
    throw new Error('maxLevelGap must be a non-negative integer');
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function assertFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
}

function assertNonNegative(value: number, field: string): void {
  assertFinite(value, field);
  if (value < 0) {
    throw new Error(`${field} must be zero or greater`);
  }
}
