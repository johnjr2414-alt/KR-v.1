/**
 * Professional assignment ↔ question-system integration (Phase 27.4).
 *
 * `AssignmentQuestionResolver` bridges professional assignments to the
 * **existing** question pipeline. It does not introduce a new question engine:
 * it builds filter criteria for the existing {@link QuestionRepository},
 * respects the shared educational-tier configuration, prioritises profession
 * relevance through optional question tags, and reports coverage/fallback
 * events instead of silently serving unrelated questions.
 *
 * Question *selection* is deliberately kept separate from answer *evaluation*:
 * the resolver returns `Question[]` only. Answer evaluation and mastery rewards
 * continue to flow through the existing {@link import('../questions/evaluation/AnswerEvaluator').AnswerEvaluator}
 * and mastery pathways.
 *
 * Everything here is headless (no Phaser/DOM imports).
 */

import { EducationalTier, type SubjectId } from '../core/types/education';
import type { Question } from '../core/types/question';
import {
  DEFAULT_EDUCATIONAL_TIER_CONFIG,
  type EducationalTierRange,
} from '../config/difficultyConfig';
import type {
  QuestionFilterCriteria,
  QuestionRepository,
} from '../questions/retrieval/QuestionRepository';
import { ASSIGNMENT_DEFINITIONS } from './AssignmentRegistry';
import { PROFESSION_DEFINITIONS } from './ProfessionRegistry';
import { AssignmentObjectiveType, type AssignmentDefinition } from './AssignmentTypes';
import type { ProfessionDefinition } from './ProfessionTypes';

/** Difficulty clamp bounds, mirroring the shared question difficulty range. */
const DIFFICULTY_MIN = 1;
const DIFFICULTY_MAX = 5;

/**
 * Sums the required question counts of a stage's `AnswerQuestions` objectives.
 * Lets the assignment system know how many questions to request for a stage
 * before calling {@link AssignmentQuestionResolver.resolve}.
 */
export function getStageQuestionRequirement(def: AssignmentDefinition, stageIndex: number): number {
  const stage = def.stages[stageIndex];
  if (!stage) return 0;
  return stage.objectives
    .filter((objective) => objective.type === AssignmentObjectiveType.AnswerQuestions)
    .reduce((sum, objective) => sum + objective.required, 0);
}

/**
 * A relaxation applied while resolving questions for an assignment (e.g. the
 * exact difficulty was unavailable). Mirrors {@link import('../questions/retrieval/DifficultyEngine').DifficultyFallbackEvent}
 * but is scoped to an assignment.
 */
export interface AssignmentFallbackEvent {
  assignmentId: string;
  requestedTier: EducationalTier;
  requestedDifficulty: number;
  resolvedTier: EducationalTier;
  resolvedDifficulty: number;
  reason: string;
}

/** Coverage summary describing how well the question bank serves an assignment. */
export interface AssignmentQuestionCoverage {
  /** Profession-tagged candidates found in the assignment's subjects/topics. */
  professionTaggedMatches: number;
  /** Subject/topic candidates found at the assignment's effective tier. */
  subjectTopicMatches: number;
  /** Whether any profession-tagged question exists for this assignment. */
  hasProfessionCoverage: boolean;
  /** Whether the request was fully satisfied (served `count` questions). */
  satisfied: boolean;
}

/** A request to resolve questions for an assignment. */
export interface AssignmentQuestionRequest {
  /** Assignment to serve questions for. */
  assignmentId: string;
  /** Number of questions requested. */
  count: number;
  /** Player's character level, used for educational-tier compatibility. */
  playerLevel: number;
  /** Optional specialty id to further prioritise matching questions. */
  specialtyId?: string;
  /** Question ids to exclude (e.g. recently seen). */
  excludeIds?: Set<string>;
}

/** Result of resolving questions for an assignment. */
export interface AssignmentQuestionResult {
  assignmentId: string;
  professionId?: string;
  requestedCount: number;
  /** The served questions, ready to hand to the existing answer pipeline. */
  questions: Question[];
  /** Educational tier the served questions were drawn from. */
  effectiveTier: EducationalTier;
  /** Within-tier difficulty of the served questions. */
  effectiveDifficulty: number;
  /** True when at least one served question carried a profession/specialty tag. */
  professionPrioritized: boolean;
  /** Relaxations applied while resolving. */
  fallbackEvents: AssignmentFallbackEvent[];
  coverage: AssignmentQuestionCoverage;
  /** True when the assignment is unknown or fewer than `count` questions were served. */
  missingCoverage: boolean;
  /** Player-facing summary message. */
  message: string;
}

/** Configurable fallback behaviour when profession-specific questions are unavailable. */
export interface AssignmentFallbackStrategy {
  /** Relax difficulty within the tier before widening the topic. Default `true`. */
  relaxDifficulty: boolean;
  /** Widen beyond the assignment's topics to its whole subject set. Default `true`. */
  relaxTopics: boolean;
  /** Emergency: use any question in the subjects regardless of tier. Default `false`. */
  allowSubjectEmergency: boolean;
  /** How many tiers above the player's current tier may be served. Default `0`. */
  maxTierOverPlayer: number;
}

export const DEFAULT_ASSIGNMENT_FALLBACK_STRATEGY: AssignmentFallbackStrategy = {
  relaxDifficulty: true,
  relaxTopics: true,
  allowSubjectEmergency: false,
  maxTierOverPlayer: 0,
};

export interface AssignmentQuestionResolverOptions {
  /** Assignment catalogue. Defaults to the bundled {@link ASSIGNMENT_DEFINITIONS}. */
  assignments?: readonly AssignmentDefinition[];
  /** Profession catalogue. Defaults to the bundled {@link PROFESSION_DEFINITIONS}. */
  professions?: readonly ProfessionDefinition[];
  /** Educational tier configuration. Defaults to the shared tier config. */
  tierConfig?: EducationalTierRange[];
  /** Partial overrides for the fallback strategy. */
  fallback?: Partial<AssignmentFallbackStrategy>;
}

function clampDifficulty(value: number): number {
  const v = Math.floor(value);
  if (Number.isNaN(v)) return DIFFICULTY_MIN;
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, v));
}

/**
 * Resolves questions from an existing {@link QuestionRepository} for a
 * professional assignment, prioritising profession relevance and respecting
 * the shared educational-tier and difficulty systems.
 */
export class AssignmentQuestionResolver {
  private readonly repository: QuestionRepository;
  private readonly assignments: Map<string, AssignmentDefinition>;
  private readonly professions: Map<string, ProfessionDefinition>;
  private readonly tierConfig: EducationalTierRange[];
  private readonly fallback: AssignmentFallbackStrategy;

  constructor(
    repository: QuestionRepository,
    options: AssignmentQuestionResolverOptions = {},
  ) {
    this.repository = repository;

    const definitions = options.assignments ?? ASSIGNMENT_DEFINITIONS;
    this.assignments = new Map(definitions.map((assignment) => [assignment.id, assignment]));

    const professions = options.professions ?? PROFESSION_DEFINITIONS;
    this.professions = new Map(professions.map((profession) => [profession.id, profession]));

    this.tierConfig = options.tierConfig ?? DEFAULT_EDUCATIONAL_TIER_CONFIG;
    this.fallback = { ...DEFAULT_ASSIGNMENT_FALLBACK_STRATEGY, ...options.fallback };
  }

  /** Resolves a set of questions for the requested assignment. */
  resolve(request: AssignmentQuestionRequest): AssignmentQuestionResult {
    const requestedCount = Math.max(0, Math.floor(request.count));
    const def = this.assignments.get(request.assignmentId);

    if (!def) {
      return {
        assignmentId: request.assignmentId,
        requestedCount,
        questions: [],
        effectiveTier: EducationalTier.Elementary,
        effectiveDifficulty: DIFFICULTY_MIN,
        professionPrioritized: false,
        fallbackEvents: [],
        coverage: {
          professionTaggedMatches: 0,
          subjectTopicMatches: 0,
          hasProfessionCoverage: false,
          satisfied: false,
        },
        missingCoverage: true,
        message: `Unknown assignment '${request.assignmentId}'.`,
      };
    }

    const profession = this.professions.get(def.professionId);
    const requestedTier = def.educationalTier;
    const effectiveTier = this.effectiveTierFor(requestedTier, request.playerLevel);
    const difficulty = clampDifficulty(def.difficulty);
    const subjects = this.subjectsFor(def, profession);
    const topics = def.requiredQuestionTopics ?? [];
    const professionTags = profession?.questionTags ?? [];
    const specialtyTags = request.specialtyId ? [request.specialtyId] : [];
    const exclude = request.excludeIds ?? new Set<string>();

    const coverageBase = this.computeCoverage(subjects, topics, effectiveTier, professionTags, specialtyTags);

    const selected: Question[] = [];
    const selectedIds = new Set<string>();
    const fallbackEvents: AssignmentFallbackEvent[] = [];
    let professionPrioritized = false;
    const requestedCountReached = () => selected.length >= requestedCount;

    const absorb = (pool: Question[]): void => {
      for (const question of pool) {
        if (requestedCountReached()) return;
        if (exclude.has(question.id) || selectedIds.has(question.id)) continue;
        selected.push(question);
        selectedIds.add(question.id);
        if (this.isPrioritizedQuestion(question, professionTags, specialtyTags)) {
          professionPrioritized = true;
        }
      }
    };

    const recordEvent = (resolvedTier: EducationalTier, resolvedDifficulty: number, reason: string): void => {
      fallbackEvents.push({
        assignmentId: def.id,
        requestedTier,
        requestedDifficulty: difficulty,
        resolvedTier,
        resolvedDifficulty,
        reason,
      });
    };

    // ── Level 1: exact tier + difficulty + topic, profession-tagged first ──
    absorb(
      this.pool(subjects, {
        topics,
        educationalTier: effectiveTier,
        difficulty,
        professionTags: professionTags.length > 0 ? professionTags : undefined,
        specialtyTags: specialtyTags.length > 0 ? specialtyTags : undefined,
      }),
    );

    // ── Level 2: exact tier + difficulty + topic, any question ──
    if (!requestedCountReached()) {
      absorb(this.pool(subjects, { topics, educationalTier: effectiveTier, difficulty }));
    }

    // ── Level 3: relax difficulty within the tier ──
    if (!requestedCountReached() && this.fallback.relaxDifficulty) {
      const pool = this.pool(subjects, { topics, educationalTier: effectiveTier });
      if (pool.length > 0) {
        recordEvent(
          effectiveTier,
          pool[0].difficulty,
          'Insufficient questions at the exact difficulty; relaxed within the tier',
        );
        absorb(pool);
      }
    }

    // ── Level 4: widen beyond the required topics to the whole subject set ──
    if (!requestedCountReached() && this.fallback.relaxTopics && topics.length > 0) {
      const pool = this.pool(subjects, { educationalTier: effectiveTier });
      if (pool.length > 0) {
        recordEvent(
          effectiveTier,
          pool[0].difficulty,
          'Insufficient topics; widened to the assignment subjects',
        );
        absorb(pool);
      }
    }

    // ── Level 5: emergency — any question in the subjects regardless of tier ──
    if (!requestedCountReached() && this.fallback.allowSubjectEmergency) {
      const pool = this.pool(subjects, {});
      if (pool.length > 0) {
        recordEvent(
          pool[0].educationalTier,
          pool[0].difficulty,
          'Emergency fallback: used any available question in the assignment subjects',
        );
        absorb(pool);
      }
    }

    const satisfied = requestedCountReached();
    const effectiveTierUsed = selected.length > 0 ? selected[0].educationalTier : effectiveTier;
    const effectiveDifficultyUsed = selected.length > 0 ? selected[0].difficulty : difficulty;

    return {
      assignmentId: def.id,
      professionId: def.professionId,
      requestedCount,
      questions: selected,
      effectiveTier: effectiveTierUsed,
      effectiveDifficulty: effectiveDifficultyUsed,
      professionPrioritized,
      fallbackEvents,
      coverage: { ...coverageBase, satisfied },
      missingCoverage: !satisfied,
      message: this.buildMessage(def, selected.length, requestedCount, coverageBase),
    };
  }

  /**
   * Reports question coverage for an assignment without selecting questions.
   * Useful for surfacing content gaps (e.g. "no profession questions yet").
   */
  assessCoverage(assignmentId: string, specialtyId?: string): AssignmentQuestionCoverage {
    const def = this.assignments.get(assignmentId);
    if (!def) {
      return {
        professionTaggedMatches: 0,
        subjectTopicMatches: 0,
        hasProfessionCoverage: false,
        satisfied: false,
      };
    }

    const profession = this.professions.get(def.professionId);
    const subjects = this.subjectsFor(def, profession);
    const topics = def.requiredQuestionTopics ?? [];
    const professionTags = profession?.questionTags ?? [];
    const specialtyTags = specialtyId ? [specialtyId] : [];

    return this.computeCoverage(subjects, topics, def.educationalTier, professionTags, specialtyTags);
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private computeCoverage(
    subjects: readonly SubjectId[],
    topics: readonly string[],
    tier: EducationalTier,
    professionTags: readonly string[],
    specialtyTags: readonly string[],
  ): AssignmentQuestionCoverage {
    const topicCriteria = topics.length > 0 ? { topics: [...topics] } : {};

    const subjectTopicMatches = this.pool(subjects, {
      ...topicCriteria,
      educationalTier: tier,
    }).length;

    const professionTaggedMatches = this.pool(subjects, {
      ...topicCriteria,
      ...(professionTags.length > 0 || specialtyTags.length > 0
        ? {
            professionTags: professionTags.length > 0 ? [...professionTags] : undefined,
            specialtyTags: specialtyTags.length > 0 ? [...specialtyTags] : undefined,
          }
        : {}),
    }).length;

    return {
      professionTaggedMatches,
      subjectTopicMatches,
      hasProfessionCoverage: professionTaggedMatches > 0,
      satisfied: false,
    };
  }

  private buildMessage(
    def: AssignmentDefinition,
    served: number,
    requested: number,
    coverage: AssignmentQuestionCoverage,
  ): string {
    if (served === 0) {
      return `No suitable questions found for '${def.title}'.`;
    }
    const base =
      served < requested
        ? `Served ${served} of ${requested} questions for '${def.title}'.`
        : `Served ${requested} questions for '${def.title}'.`;
    return coverage.hasProfessionCoverage
      ? base
      : `${base} No profession-tagged questions cover this assignment yet.`;
  }

  private effectiveTierFor(requested: EducationalTier, playerLevel: number): EducationalTier {
    const playerTier = this.tierForLevel(playerLevel);
    const requestedIndex = this.tierIndex(requested);
    const playerIndex = this.tierIndex(playerTier);
    const ceiling = Math.min(
      this.tierConfig.length - 1,
      playerIndex + Math.max(0, Math.floor(this.fallback.maxTierOverPlayer)),
    );
    const effectiveIndex = Math.min(requestedIndex, ceiling);
    return this.tierConfig[effectiveIndex]?.tier ?? requested;
  }

  private tierForLevel(level: number): EducationalTier {
    const lvl = Math.max(1, Math.floor(level));
    for (const range of this.tierConfig) {
      if (lvl >= range.minLevel && lvl <= range.maxLevel) return range.tier;
    }
    return this.tierConfig[this.tierConfig.length - 1].tier;
  }

  private tierIndex(tier: EducationalTier): number {
    const found = this.tierConfig.find((range) => range.tier === tier);
    return found ? found.tierIndex : 0;
  }

  private subjectsFor(def: AssignmentDefinition, profession?: ProfessionDefinition): SubjectId[] {
    if (def.requiredSubjects.length > 0) return [...def.requiredSubjects];
    return profession ? [...profession.subjectTags] : [];
  }

  private pool(
    subjects: readonly SubjectId[],
    extras: Omit<QuestionFilterCriteria, 'subject'>,
  ): Question[] {
    const out: Question[] = [];
    for (const subject of subjects) {
      out.push(...this.repository.filter({ subject, ...extras }));
    }
    return this.uniqueById(out);
  }

  private uniqueById(questions: readonly Question[]): Question[] {
    const seen = new Set<string>();
    const out: Question[] = [];
    for (const question of questions) {
      if (seen.has(question.id)) continue;
      seen.add(question.id);
      out.push(question);
    }
    return out;
  }

  private isPrioritizedQuestion(
    question: Question,
    professionTags: readonly string[],
    specialtyTags: readonly string[],
  ): boolean {
    const questionProfessionTags = question.professionTags ?? [];
    const questionSpecialtyTags = question.specialtyTags ?? [];
    const matchesProfession =
      professionTags.length > 0 && professionTags.some((tag) => questionProfessionTags.includes(tag));
    const matchesSpecialty =
      specialtyTags.length > 0 && specialtyTags.some((tag) => questionSpecialtyTags.includes(tag));
    return matchesProfession || matchesSpecialty;
  }
}
