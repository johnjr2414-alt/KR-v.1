/** How equal scores are ranked. */
export type LeaderboardTiePolicy = 'shared' | 'earliest' | 'matches-played';

/** One player's standing input. */
export interface LeaderboardEntry {
  characterId: string;
  displayName?: string;
  /** Primary ranking value (rating, points, etc.). Higher is better. */
  score: number;
  /** Used for eligibility and the `matches-played` tie policy. */
  matchesPlayed: number;
  /** When this score was recorded (epoch ms). */
  updatedAtMs: number;
}

/** An entry with its competition rank attached. */
export interface RankedLeaderboardEntry extends LeaderboardEntry {
  /** 1-based rank. Shared ties share a rank (1, 1, 3). */
  rank: number;
}

/** Frozen view of a leaderboard for display or seasonal archiving. */
export interface LeaderboardSnapshot {
  seasonId: string;
  tiePolicy: LeaderboardTiePolicy;
  generatedAtMs: number;
  entries: readonly RankedLeaderboardEntry[];
}

/** Tunable leaderboard behaviour. */
export interface LeaderboardOptions {
  seasonId?: string;
  tiePolicy?: LeaderboardTiePolicy;
  /** Minimum matches before an entry is ranked. */
  minMatches?: number;
  /** Maximum published entries, before cutoff-tie extension. */
  maxEntries?: number;
}

export const DEFAULT_LEADERBOARD_OPTIONS: Readonly<Required<LeaderboardOptions>> = {
  seasonId: 'current',
  tiePolicy: 'shared',
  minMatches: 10,
  maxEntries: 100,
};

/**
 * In-memory seasonal leaderboard.
 *
 * Owns ranking rules only: no storage, network, rating calculation, or clock.
 * The clock is injectable so seasonal snapshots are deterministic in tests.
 */
export class LeaderboardRanking {
  private readonly entries = new Map<string, LeaderboardEntry>();
  private readonly seasonId: string;
  private readonly tiePolicy: LeaderboardTiePolicy;
  private readonly minMatches: number;
  private readonly maxEntries: number;
  private readonly clock: () => number;

  constructor(options: LeaderboardOptions = {}, clock: () => number = Date.now) {
    const resolved = { ...DEFAULT_LEADERBOARD_OPTIONS, ...options };
    validateOptions(resolved);

    this.seasonId = resolved.seasonId;
    this.tiePolicy = resolved.tiePolicy;
    this.minMatches = resolved.minMatches;
    this.maxEntries = resolved.maxEntries;
    this.clock = clock;
  }

  getSeasonId(): string {
    return this.seasonId;
  }

  getTiePolicy(): LeaderboardTiePolicy {
    return this.tiePolicy;
  }

  getMinMatches(): number {
    return this.minMatches;
  }

  getMaxEntries(): number {
    return this.maxEntries;
  }

  get size(): number {
    return this.entries.size;
  }

  /** Adds or replaces an entry. Returns a defensive copy of what was stored. */
  upsert(entry: LeaderboardEntry): LeaderboardEntry {
    validateEntry(entry);

    const existing = this.entries.get(entry.characterId);
    const stored: LeaderboardEntry = {
      ...entry,
      updatedAtMs:
        existing && existing.score === entry.score
          ? Math.min(existing.updatedAtMs, entry.updatedAtMs)
          : entry.updatedAtMs,
    };

    this.entries.set(stored.characterId, stored);
    return { ...stored };
  }

  /** Removes an entry. Returns false when it was absent. */
  remove(characterId: string): boolean {
    return this.entries.delete(characterId);
  }

  /** Defensive copy of one entry, or undefined. */
  get(characterId: string): LeaderboardEntry | undefined {
    const entry = this.entries.get(characterId);
    return entry ? { ...entry } : undefined;
  }

  clear(): void {
    this.entries.clear();
  }

  /** All eligible entries, ranked. */
  getRankedEntries(): RankedLeaderboardEntry[] {
    return rankEntries(this.sortedEligible(), this.tiePolicy);
  }

  /**
   * Published top entries.
   *
   * With the `shared` policy, entries tied with the last included entry are also
   * returned, so a cutoff never silently drops a tied player.
   */
  getTop(limit: number = this.maxEntries): RankedLeaderboardEntry[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('limit must be a non-negative integer');
    }

    const ranked = this.getRankedEntries();
    if (limit === 0) return [];
    if (ranked.length <= limit) return ranked;

    const cutoffScore = ranked[limit - 1].score;
    const extended =
      this.tiePolicy === 'shared'
        ? ranked.filter((entry, index) => index < limit || entry.score === cutoffScore)
        : ranked.slice(0, limit);

    return extended;
  }

  /**
   * Rank of one eligible character across the whole board (not just the
   * published top). Returns undefined when absent or below `minMatches`.
   */
  getRank(characterId: string): number | undefined {
    const entry = this.entries.get(characterId);
    if (!entry || !this.isEligible(entry)) return undefined;

    const ranked = this.sortedEligible();
    if (this.tiePolicy !== 'shared') {
      return ranked.findIndex((candidate) => candidate.characterId === characterId) + 1;
    }

    let higher = 0;
    for (const candidate of ranked) {
      if (candidate.score > entry.score) higher += 1;
    }
    return higher + 1;
  }

  /** Frozen snapshot of the published board for archiving or display. */
  snapshot(): LeaderboardSnapshot {
    const generatedAtMs = this.clock();
    if (!Number.isFinite(generatedAtMs)) {
      throw new Error('Leaderboard clock must return a finite number');
    }

    return {
      seasonId: this.seasonId,
      tiePolicy: this.tiePolicy,
      generatedAtMs,
      entries: this.getTop().map((entry) => ({ ...entry })),
    };
  }

  private isEligible(entry: LeaderboardEntry): boolean {
    return entry.matchesPlayed >= this.minMatches;
  }

  private sortedEligible(): LeaderboardEntry[] {
    return [...this.entries.values()]
      .filter((entry) => this.isEligible(entry))
      .sort((a, b) => compareEntries(a, b, this.tiePolicy));
  }
}

function compareEntries(
  a: LeaderboardEntry,
  b: LeaderboardEntry,
  tiePolicy: LeaderboardTiePolicy,
): number {
  if (a.score !== b.score) return b.score - a.score;

  if (tiePolicy === 'earliest') {
    if (a.updatedAtMs !== b.updatedAtMs) return a.updatedAtMs - b.updatedAtMs;
  } else if (tiePolicy === 'matches-played') {
    if (a.matchesPlayed !== b.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
    if (a.updatedAtMs !== b.updatedAtMs) return a.updatedAtMs - b.updatedAtMs;
  }

  return a.characterId.localeCompare(b.characterId);
}

function rankEntries(
  sorted: readonly LeaderboardEntry[],
  tiePolicy: LeaderboardTiePolicy,
): RankedLeaderboardEntry[] {
  const ranked: RankedLeaderboardEntry[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index];
    const rank =
      tiePolicy === 'shared' && index > 0 && entry.score === sorted[index - 1].score
        ? ranked[index - 1].rank
        : index + 1;
    ranked.push({ ...entry, rank });
  }

  return ranked;
}

function validateEntry(entry: LeaderboardEntry): void {
  if (entry.characterId.trim().length === 0) {
    throw new Error('characterId must be a non-empty string');
  }
  if (!Number.isFinite(entry.score)) {
    throw new Error('score must be a finite number');
  }
  if (!Number.isInteger(entry.matchesPlayed) || entry.matchesPlayed < 0) {
    throw new Error('matchesPlayed must be a non-negative integer');
  }
  if (!Number.isFinite(entry.updatedAtMs) || entry.updatedAtMs < 0) {
    throw new Error('updatedAtMs must be a finite, non-negative number');
  }
}

function validateOptions(options: Required<LeaderboardOptions>): void {
  if (options.seasonId.trim().length === 0) {
    throw new Error('seasonId must be a non-empty string');
  }
  if (
    options.tiePolicy !== 'shared' &&
    options.tiePolicy !== 'earliest' &&
    options.tiePolicy !== 'matches-played'
  ) {
    throw new Error(`Unknown tie policy "${String(options.tiePolicy)}"`);
  }
  if (!Number.isInteger(options.minMatches) || options.minMatches < 0) {
    throw new Error('minMatches must be a non-negative integer');
  }
  if (!Number.isInteger(options.maxEntries) || options.maxEntries < 1) {
    throw new Error('maxEntries must be a positive integer');
  }
}
