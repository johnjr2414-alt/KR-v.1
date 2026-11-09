/** Maximum supported tournament field size (after byes). */
export const MAX_TOURNAMENT_BRACKET_SIZE = 128;

/** Lifecycle of the whole bracket. */
export type TournamentBracketStatus = 'in-progress' | 'completed';

/** Lifecycle of a single bracket slot. */
export type BracketMatchStatus = 'pending' | 'ready' | 'completed' | 'forfeit' | 'bye';

/** One seeded participant, ordered by `seed` (1 is the strongest seed). */
export interface TournamentParticipantSeed {
  seed: number;
  characterId: string;
  displayName?: string;
}

/** One match (or bye slot) inside a bracket round. */
export interface BracketMatch {
  matchId: string;
  roundNumber: number;
  slotIndex: number;
  participantAId?: string;
  participantBId?: string;
  winnerId?: string;
  loserId?: string;
  status: BracketMatchStatus;
}

/** One round of the bracket. */
export interface BracketRound {
  roundNumber: number;
  matches: readonly BracketMatch[];
}

/** Serializable bracket state for display, persistence, or audit. */
export interface TournamentBracketSnapshot {
  bracketSize: number;
  participantCount: number;
  roundCount: number;
  status: TournamentBracketStatus;
  participants: readonly TournamentParticipantSeed[];
  rounds: readonly BracketRound[];
  championId?: string;
}

/**
 * Deterministic single-elimination bracket for 2–128 participants.
 *
 * Seeds are ordered 1..P, bracket size is the next power of two, and standard
 * seeding places byes against the strongest seeds. The bracket is a pure state
 * machine: it owns no clock, storage, rating formula, or network transport.
 * Match results are reported by the caller and only winners advance.
 */
export class TournamentBracket {
  private readonly participants: TournamentParticipantSeed[];
  private readonly bracketSize: number;
  private readonly rounds: BracketRound[];

  constructor(participants: readonly TournamentParticipantSeed[]) {
    validateParticipants(participants);

    this.participants = [...participants]
      .sort((a, b) => a.seed - b.seed)
      .map((participant) => ({ ...participant }));
    this.bracketSize = nextPowerOfTwo(this.participants.length);
    this.rounds = buildRounds(this.bracketSize, this.participants);
    this.resolveByes();
  }

  /** Current whole-bracket status. */
  get status(): TournamentBracketStatus {
    return this.getChampionId() ? 'completed' : 'in-progress';
  }

  get size(): number {
    return this.bracketSize;
  }

  get roundCount(): number {
    return this.rounds.length;
  }

  /** Returns a defensive copy of one match, or undefined. */
  getMatch(matchId: string): BracketMatch | undefined {
    const match = this.findMatch(matchId);
    return match ? cloneMatch(match) : undefined;
  }

  /** Matches that are ready to be played, ordered by round then slot. */
  getReadyMatches(): BracketMatch[] {
    return this.rounds
      .flatMap((round) => round.matches)
      .filter((match) => match.status === 'ready')
      .map(cloneMatch);
  }

  /** Winner of the final match, or undefined while the bracket is running. */
  getChampionId(): string | undefined {
    const finalMatch = this.rounds[this.rounds.length - 1]?.matches[0];
    if (!finalMatch) return undefined;
    return isResolved(finalMatch) ? finalMatch.winnerId : undefined;
  }

  /** True once a champion exists. */
  isComplete(): boolean {
    return this.getChampionId() !== undefined;
  }

  /**
   * Reports the winner of a ready match.
   *
   * @throws when the match is unknown, not ready, or the winner did not take part.
   */
  reportWinner(matchId: string, winnerId: string): void {
    const match = this.requireMatch(matchId);
    if (match.status !== 'ready') {
      throw new Error(`Match "${matchId}" is not ready for a result (status: ${match.status})`);
    }
    if (winnerId !== match.participantAId && winnerId !== match.participantBId) {
      throw new Error(`Character "${winnerId}" is not a participant of match "${matchId}"`);
    }

    this.resolveMatch(match, winnerId, 'completed');
  }

  /**
   * Records a forfeit/no-show and advances the opponent.
   *
   * @throws when the match is unknown, not ready, or the forfeiting character
   * did not take part.
   */
  declareForfeit(matchId: string, forfeitingCharacterId: string): void {
    const match = this.requireMatch(matchId);
    if (match.status !== 'ready') {
      throw new Error(`Match "${matchId}" cannot be forfeited (status: ${match.status})`);
    }
    if (
      forfeitingCharacterId !== match.participantAId &&
      forfeitingCharacterId !== match.participantBId
    ) {
      throw new Error(
        `Character "${forfeitingCharacterId}" is not a participant of match "${matchId}"`,
      );
    }

    const winnerId =
      forfeitingCharacterId === match.participantAId
        ? match.participantBId
        : match.participantAId;
    if (!winnerId) {
      throw new Error(`Match "${matchId}" has no opponent to advance`);
    }

    this.resolveMatch(match, winnerId, 'forfeit');
  }

  /** Defensive snapshot of the full bracket. */
  getSnapshot(): TournamentBracketSnapshot {
    return {
      bracketSize: this.bracketSize,
      participantCount: this.participants.length,
      roundCount: this.rounds.length,
      status: this.status,
      participants: this.participants.map((participant) => ({ ...participant })),
      rounds: this.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        matches: round.matches.map(cloneMatch),
      })),
      ...(this.getChampionId() ? { championId: this.getChampionId() } : {}),
    };
  }

  private resolveMatch(
    match: BracketMatch,
    winnerId: string,
    status: 'completed' | 'forfeit',
  ): void {
    match.winnerId = winnerId;
    match.loserId =
      winnerId === match.participantAId ? match.participantBId : match.participantAId;
    match.status = status;
    this.propagateWinners();
  }

  /** Fills later-round slots from completed feeders and settles round-0 byes. */
  private resolveByes(): void {
    for (const match of this.rounds[0]?.matches ?? []) {
      const participants = [match.participantAId, match.participantBId].filter(
        (id): id is string => id !== undefined,
      );
      if (participants.length === 1) {
        match.winnerId = participants[0];
        match.status = 'bye';
      }
    }
    this.propagateWinners();
  }

  private propagateWinners(): void {
    for (let roundIndex = 1; roundIndex < this.rounds.length; roundIndex += 1) {
      const round = this.rounds[roundIndex];
      const previous = this.rounds[roundIndex - 1];

      for (const match of round.matches) {
        if (isResolved(match)) continue;

        const feederA = previous.matches[match.slotIndex * 2];
        const feederB = previous.matches[match.slotIndex * 2 + 1];
        const participantAId = feederA?.winnerId;
        const participantBId = feederB?.winnerId;

        match.participantAId = participantAId;
        match.participantBId = participantBId;

        if (participantAId !== undefined && participantBId !== undefined) {
          match.status = 'ready';
        } else {
          match.status = 'pending';
        }
      }
    }
  }

  private findMatch(matchId: string): BracketMatch | undefined {
    for (const round of this.rounds) {
      const match = round.matches.find((candidate) => candidate.matchId === matchId);
      if (match) return match;
    }
    return undefined;
  }

  private requireMatch(matchId: string): BracketMatch {
    const match = this.findMatch(matchId);
    if (!match) {
      throw new Error(`Unknown match "${matchId}"`);
    }
    return match;
  }
}

function validateParticipants(participants: readonly TournamentParticipantSeed[]): void {
  if (participants.length < 2) {
    throw new Error('A tournament needs at least 2 participants');
  }
  if (participants.length > MAX_TOURNAMENT_BRACKET_SIZE) {
    throw new Error(`A tournament supports at most ${MAX_TOURNAMENT_BRACKET_SIZE} participants`);
  }

  const seeds = participants.map((participant) => participant.seed).sort((a, b) => a - b);
  for (let index = 0; index < seeds.length; index += 1) {
    if (seeds[index] !== index + 1) {
      throw new Error('Participant seeds must be contiguous and start at 1');
    }
  }

  const characterIds = new Set<string>();
  for (const participant of participants) {
    if (participant.characterId.trim().length === 0) {
      throw new Error('characterId must be a non-empty string');
    }
    if (characterIds.has(participant.characterId)) {
      throw new Error(`Duplicate characterId "${participant.characterId}"`);
    }
    characterIds.add(participant.characterId);
  }
}

function nextPowerOfTwo(value: number): number {
  let size = 2;
  while (size < value) size *= 2;
  return size;
}

/**
 * Standard bracket seed order: adjacent pairs are first-round matches.
 * For 8 slots this is `[1, 8, 4, 5, 2, 7, 3, 6]`.
 */
function buildSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const next: number[] = [];
    const sum = order.length * 2 + 1;
    for (const seed of order) {
      next.push(seed, sum - seed);
    }
    order = next;
  }
  return order;
}

function buildRounds(
  bracketSize: number,
  participants: readonly TournamentParticipantSeed[],
): BracketRound[] {
  const participantBySeed = new Map(participants.map((participant) => [participant.seed, participant]));
  const seedOrder = buildSeedOrder(bracketSize);
  const roundCount = Math.log2(bracketSize);
  const rounds: BracketRound[] = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const matchCount = bracketSize / 2 ** (roundIndex + 1);
    const matches: BracketMatch[] = [];

    for (let slotIndex = 0; slotIndex < matchCount; slotIndex += 1) {
      const match: BracketMatch = {
        matchId: `r${roundIndex + 1}-m${slotIndex + 1}`,
        roundNumber: roundIndex + 1,
        slotIndex,
        status: 'pending',
      };

      if (roundIndex === 0) {
        const seedA = seedOrder[slotIndex * 2];
        const seedB = seedOrder[slotIndex * 2 + 1];
        const participantA = participantBySeed.get(seedA);
        const participantB = participantBySeed.get(seedB);
        match.participantAId = participantA?.characterId;
        match.participantBId = participantB?.characterId;
        if (participantA && participantB) {
          match.status = 'ready';
        }
      }

      matches.push(match);
    }

    rounds.push({ roundNumber: roundIndex + 1, matches });
  }

  return rounds;
}

function isResolved(match: BracketMatch): boolean {
  return (
    match.status === 'completed' || match.status === 'forfeit' || match.status === 'bye'
  );
}

function cloneMatch(match: BracketMatch): BracketMatch {
  return { ...match };
}
