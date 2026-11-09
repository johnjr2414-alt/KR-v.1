import type { ArenaCompetitor, PvPDifficultyProfile, ArenaMatchDefinition, ArenaMatchMode } from './ArenaTypes';
import { ArenaMatchStatus, ArenaMatchMode as MatchModeEnum } from './ArenaTypes';
import { pvpDifficultyEngine, type PvPDifficultyService } from './PvPDifficultyEngine';
import type { Question } from '../core/types/question';
import type { QuestionRepository } from '../questions/retrieval/QuestionRepository';
import { sharedQuestionRepository } from '../questions';
import { SubjectId } from '../core/types/education';
import { createUniqueId } from '../core/uniqueId';

export interface ArenaSessionOptions {
  player: ArenaCompetitor;
  rival: ArenaCompetitor;
  subject?: SubjectId;
  repository?: QuestionRepository;
  pvpEngine?: PvPDifficultyService;
  mode?: ArenaMatchMode;
  maxRounds?: number;
}

export interface ArenaRoundOutcome {
  round: number;
  playerAnsweredCorrect: boolean;
  rivalAnsweredCorrect: boolean;
  playerScore: number;
  rivalScore: number;
}

/**
 * Headless Arena Duel Session.
 * Simulates turn-based educational sparring against an AI rival competitor.
 * Applies the Reverse Difficulty Rule to determine question difficulty:
 * - Lower-level combatant receives harder questions
 * - Higher-level combatant receives easier questions
 */
export class ArenaDuelSession {
  private matchDef: ArenaMatchDefinition;
  private readonly playerProfile: PvPDifficultyProfile;
  private readonly rivalProfile: PvPDifficultyProfile;
  private readonly repository: QuestionRepository;
  private readonly subject: SubjectId;

  private currentRound = 1;
  private readonly maxRounds: number;
  private playerScore = 0;
  private rivalScore = 0;
  private status: ArenaMatchStatus = ArenaMatchStatus.InProgress;

  constructor(options: ArenaSessionOptions) {
    const engine = options.pvpEngine || pvpDifficultyEngine;
    this.repository = options.repository || sharedQuestionRepository;
    this.subject = options.subject || options.rival.subjectFocus || SubjectId.Mathematics;
    this.maxRounds = options.maxRounds || 3;

    const [pProfile, rProfile] = engine.calculateMatchDifficulty(options.player, options.rival);
    this.playerProfile = pProfile;
    this.rivalProfile = rProfile;

    this.matchDef = {
      matchId: createUniqueId(),
      mode: options.mode || MatchModeEnum.PracticeSparring,
      status: ArenaMatchStatus.InProgress,
      competitors: [options.player, options.rival],
      activeSubject: this.subject,
      roundLimit: this.maxRounds,
      timePerTurnSeconds: pProfile.timeLimitSeconds,
      createdAt: Date.now(),
    };
  }

  getMatchDefinition(): Readonly<ArenaMatchDefinition> {
    return { ...this.matchDef, status: this.status };
  }

  getPlayerProfile(): Readonly<PvPDifficultyProfile> {
    return { ...this.playerProfile };
  }

  getRivalProfile(): Readonly<PvPDifficultyProfile> {
    return { ...this.rivalProfile };
  }

  getScores(): { player: number; rival: number } {
    return { player: this.playerScore, rival: this.rivalScore };
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getMaxRounds(): number {
    return this.maxRounds;
  }

  isResolved(): boolean {
    return this.status === ArenaMatchStatus.Resolved;
  }

  getWinnerId(): string | undefined {
    return this.matchDef.winnerId;
  }

  /**
   * Samples a question tailored to the player's Reverse Difficulty profile.
   */
  samplePlayerQuestion(): Question | undefined {
    const pool = this.repository.filter({
      subject: this.subject,
      educationalTier: this.playerProfile.tier,
    });

    if (pool.length > 0) {
      // Pick random question from tier pool
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Fallback: any question in subject
    const fallbackPool = this.repository.filter({ subject: this.subject });
    return fallbackPool.length > 0 ? fallbackPool[0] : undefined;
  }

  /**
   * Resolves a round after player submits an answer.
   * Simulates rival accuracy based on rival's Reverse Difficulty profile (easier = higher rival accuracy).
   */
  resolveRound(playerCorrect: boolean): ArenaRoundOutcome {
    if (this.isResolved()) {
      return {
        round: this.currentRound,
        playerAnsweredCorrect: playerCorrect,
        rivalAnsweredCorrect: false,
        playerScore: this.playerScore,
        rivalScore: this.rivalScore,
      };
    }

    if (playerCorrect) {
      this.playerScore += 1;
    }

    // Rival AI accuracy is based on the question tier they got:
    // Elementary (target 1) -> 85% accuracy
    // JuniorHigh (target 2-3) -> 70% accuracy
    // SeniorHigh (target 4-5) -> 50% accuracy
    const rivalSuccessThreshold = this.rivalProfile.targetDifficulty <= 2 ? 0.8 : 0.6;
    const rivalCorrect = Math.random() < rivalSuccessThreshold;

    if (rivalCorrect) {
      this.rivalScore += 1;
    }

    const outcome: ArenaRoundOutcome = {
      round: this.currentRound,
      playerAnsweredCorrect: playerCorrect,
      rivalAnsweredCorrect: rivalCorrect,
      playerScore: this.playerScore,
      rivalScore: this.rivalScore,
    };

    if (this.currentRound >= this.maxRounds) {
      this.status = ArenaMatchStatus.Resolved;
      this.matchDef.resolvedAt = Date.now();
      if (this.playerScore > this.rivalScore) {
        this.matchDef.winnerId = this.matchDef.competitors[0].id;
      } else if (this.rivalScore > this.playerScore) {
        this.matchDef.winnerId = this.matchDef.competitors[1].id;
      } else {
        // Tie
        this.matchDef.winnerId = undefined;
      }
    } else {
      this.currentRound += 1;
    }

    return outcome;
  }
}
