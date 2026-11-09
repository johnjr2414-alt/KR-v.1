import { describe, it, expect } from 'vitest';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';
import { DifficultyEngine } from '../../src/questions/retrieval/DifficultyEngine';
import { QuestionValidator } from '../../src/questions/management/QuestionValidator';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionStatus, QuestionType, type Question } from '../../src/core/types/question';
import {
  AssignmentQuestionResolver,
  getStageQuestionRequirement,
} from '../../src/professions/AssignmentQuestionResolver';
import { PROFESSION_QUESTION_SAMPLES } from '../../src/professions/ProfessionQuestionSamples';
import { ASSIGNMENT_DEFINITIONS } from '../../src/professions/AssignmentRegistry';
import {
  AssignmentObjectiveType,
  type AssignmentDefinition,
} from '../../src/professions/AssignmentTypes';

const samplesRepo = () => new QuestionRepository([...PROFESSION_QUESTION_SAMPLES]);
const bundledRepo = () => new QuestionRepository(loadBundledQuestions().questions);

/** Deep-clones a starter assignment for mutation in tests. */
function customAssignment(overrides: Partial<AssignmentDefinition>): AssignmentDefinition {
  return { ...structuredClone(ASSIGNMENT_DEFINITIONS[0]), ...overrides };
}

function legacyQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'legacy-001',
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Science,
    topic: 'biology',
    difficulty: 1,
    type: QuestionType.MultipleChoice,
    question: 'Legacy question?',
    choices: [
      { choiceId: 'a', text: 'A' },
      { choiceId: 'b', text: 'B' },
    ],
    correctAnswer: 'a',
    timeLimit: 20,
    baseMasteryExp: 10,
    status: QuestionStatus.Published,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── Metadata & repository backward compatibility ────────────────────────────

describe('Phase 27.4 — question metadata backward compatibility', () => {
  it('accepts legacy questions with no profession or specialty tags', () => {
    const result = QuestionValidator.validate(legacyQuestion());
    expect(result.isValid).toBe(true);
  });

  it('accepts questions carrying the new optional tags', () => {
    const result = QuestionValidator.validate(
      legacyQuestion({ professionTags: ['medicine'], specialtyTags: ['cardiology'] }),
    );
    expect(result.isValid).toBe(true);
  });

  it('rejects malformed profession/specialty tags', () => {
    const badProfession = QuestionValidator.validate(
      legacyQuestion({ professionTags: 'medicine' as unknown as string[] }),
    );
    expect(badProfession.isValid).toBe(false);
    expect(badProfession.errors.some((e) => e.field === 'professionTags')).toBe(true);

    const badSpecialty = QuestionValidator.validate(legacyQuestion({ specialtyTags: [''] }));
    expect(badSpecialty.isValid).toBe(false);
    expect(badSpecialty.errors.some((e) => e.field === 'specialtyTags')).toBe(true);
  });

  it('keeps legacy filtering unchanged and only applies the tag filter when asked', () => {
    const repo = new QuestionRepository([
      legacyQuestion({ id: 'legacy-a' }),
      legacyQuestion({ id: 'legacy-b', professionTags: ['medicine'] }),
    ]);

    // Legacy callers pass no tag filter → both questions returned.
    expect(repo.filter({ subject: SubjectId.Science })).toHaveLength(2);
    // The new filter matches only tagged questions (OR logic).
    expect(repo.filter({ subject: SubjectId.Science, professionTags: ['medicine'] }).map((q) => q.id)).toEqual(['legacy-b']);
    expect(repo.filter({ subject: SubjectId.Science, specialtyTags: ['cardiology'] })).toHaveLength(0);
  });

  it('ships a valid, clearly-labelled sample set for the three seed professions', () => {
    for (const sample of PROFESSION_QUESTION_SAMPLES) {
      expect(QuestionValidator.validate(sample).isValid, sample.id).toBe(true);
      expect(sample.status).toBe(QuestionStatus.Published);
    }
    const professionsCovered = new Set(
      PROFESSION_QUESTION_SAMPLES.flatMap((q) => q.professionTags ?? []),
    );
    expect(professionsCovered.has('medicine')).toBe(true);
    expect(professionsCovered.has('circuits')).toBe(true);
    expect(professionsCovered.has('design')).toBe(true);
  });
});

// ─── Profession-specific selection ───────────────────────────────────────────

describe('Phase 27.4 — profession-specific selection', () => {
  it('prioritises profession-tagged questions over untagged ones', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    const result = resolver.resolve({ assignmentId: 'doctor-patient-intake', count: 2, playerLevel: 5 });

    expect(result.questions).toHaveLength(2);
    expect(result.professionPrioritized).toBe(true);
    expect(result.questions.every((q) => (q.professionTags ?? []).length > 0)).toBe(true);
  });

  it('fills with untagged matches only when tagged ones run out', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    const result = resolver.resolve({ assignmentId: 'doctor-patient-intake', count: 3, playerLevel: 5 });

    expect(result.questions).toHaveLength(3);
    const taggedCount = result.questions.filter((q) => (q.professionTags ?? []).length > 0).length;
    expect(taggedCount).toBe(2);
    expect(result.coverage.hasProfessionCoverage).toBe(true);
  });

  it('honours a specialty hint when prioritising', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    const result = resolver.resolve({
      assignmentId: 'doctor-patient-intake',
      count: 1,
      playerLevel: 5,
      specialtyId: 'cardiology',
    });
    // sample-doctor-anatomy-01 carries the cardiology specialty tag.
    expect(result.questions[0]?.id).toBe('sample-doctor-anatomy-01');
    expect(result.professionPrioritized).toBe(true);
  });
});

// ─── Subject & topic matching ────────────────────────────────────────────────

describe('Phase 27.4 — subject and topic matching', () => {
  it('returns only questions in the assignment subjects/topics', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    const result = resolver.resolve({ assignmentId: 'engineer-circuit-basics', count: 2, playerLevel: 5 });

    expect(result.questions).toHaveLength(2);
    for (const q of result.questions) {
      expect(q.subject).toBe(SubjectId.Physics);
      expect(['circuits', 'electronics']).toContain(q.topic);
    }
  });
});

// ─── Educational tier compatibility ──────────────────────────────────────────

describe('Phase 27.4 — educational tier compatibility', () => {
  it('never serves advanced-tier questions to a beginner player', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    // doctor-diagnose-ward is aimed at Junior High; the player is only level 5 (Elementary).
    const result = resolver.resolve({ assignmentId: 'doctor-diagnose-ward', count: 1, playerLevel: 5 });

    expect(result.effectiveTier).toBe(EducationalTier.Elementary);
    expect(result.questions.every((q) => q.educationalTier !== EducationalTier.JuniorHigh)).toBe(true);
  });

  it('serves the assignment tier once the player reaches it', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    const result = resolver.resolve({ assignmentId: 'doctor-diagnose-ward', count: 1, playerLevel: 20 });

    expect(result.effectiveTier).toBe(EducationalTier.JuniorHigh);
    expect(result.questions[0]?.id).toBe('sample-doctor-diagnosis-jh-01');
  });

  it('allows a configurable tier ceiling above the player', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo(), { fallback: { maxTierOverPlayer: 2 } });
    const result = resolver.resolve({ assignmentId: 'doctor-diagnose-ward', count: 1, playerLevel: 5 });
    expect(result.effectiveTier).toBe(EducationalTier.JuniorHigh);
  });
});

// ─── Difficulty handling ─────────────────────────────────────────────────────

describe('Phase 27.4 — difficulty handling', () => {
  it('serves the exact difficulty when available without fallback', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    const result = resolver.resolve({ assignmentId: 'doctor-patient-intake', count: 1, playerLevel: 5 });

    expect(result.effectiveDifficulty).toBe(1);
    expect(result.fallbackEvents).toHaveLength(0);
  });

  it('relaxes difficulty within the tier when the exact difficulty is empty', () => {
    const hardDesign = customAssignment({
      id: 'custom-hard-design',
      professionId: 'architect',
      educationalTier: EducationalTier.Elementary,
      difficulty: 5,
      requiredSubjects: [SubjectId.Mathematics],
      requiredQuestionTopics: ['design'],
    });
    const resolver = new AssignmentQuestionResolver(samplesRepo(), { assignments: [hardDesign] });
    const result = resolver.resolve({ assignmentId: 'custom-hard-design', count: 1, playerLevel: 5 });

    expect(result.questions).toHaveLength(1);
    expect(result.effectiveDifficulty).not.toBe(5);
    expect(result.fallbackEvents.some((e) => e.reason.includes('relaxed within the tier'))).toBe(true);
  });
});

// ─── Fallback behaviour ──────────────────────────────────────────────────────

describe('Phase 27.4 — fallback behaviour', () => {
  it('widens beyond the required topics to the assignment subjects', () => {
    const noTopic = customAssignment({
      id: 'custom-no-topic',
      professionId: 'architect',
      educationalTier: EducationalTier.Elementary,
      difficulty: 1,
      requiredSubjects: [SubjectId.Mathematics],
      requiredQuestionTopics: ['nonexistent-topic'],
    });
    const resolver = new AssignmentQuestionResolver(samplesRepo(), { assignments: [noTopic] });
    const result = resolver.resolve({ assignmentId: 'custom-no-topic', count: 1, playerLevel: 5 });

    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.fallbackEvents.some((e) => e.reason.includes('widened to the assignment subjects'))).toBe(true);
  });

  it('does not silently return out-of-scope questions when emergency fallback is disabled', () => {
    const seniorMath = customAssignment({
      id: 'custom-senior-math',
      professionId: 'architect',
      educationalTier: EducationalTier.SeniorHigh,
      difficulty: 5,
      requiredSubjects: [SubjectId.Mathematics],
      requiredQuestionTopics: ['design'],
    });
    const resolver = new AssignmentQuestionResolver(samplesRepo(), { assignments: [seniorMath] });
    const result = resolver.resolve({ assignmentId: 'custom-senior-math', count: 2, playerLevel: 60 });

    expect(result.questions).toHaveLength(0);
    expect(result.missingCoverage).toBe(true);
    expect(result.effectiveTier).toBe(EducationalTier.SeniorHigh);
  });

  it('uses the subject-wide emergency fallback only when explicitly enabled', () => {
    const seniorMath = customAssignment({
      id: 'custom-senior-math',
      professionId: 'architect',
      educationalTier: EducationalTier.SeniorHigh,
      difficulty: 5,
      requiredSubjects: [SubjectId.Mathematics],
      requiredQuestionTopics: ['design'],
    });
    const resolver = new AssignmentQuestionResolver(samplesRepo(), {
      assignments: [seniorMath],
      fallback: { allowSubjectEmergency: true },
    });
    const result = resolver.resolve({ assignmentId: 'custom-senior-math', count: 2, playerLevel: 60 });

    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.fallbackEvents.some((e) => e.reason.includes('Emergency fallback'))).toBe(true);
  });
});

// ─── Missing-coverage reporting ──────────────────────────────────────────────

describe('Phase 27.4 — missing-coverage reporting', () => {
  it('reports an unknown assignment as missing coverage', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    const result = resolver.resolve({ assignmentId: 'nope', count: 1, playerLevel: 5 });

    expect(result.missingCoverage).toBe(true);
    expect(result.questions).toHaveLength(0);
    expect(result.message).toContain('Unknown assignment');
  });

  it('reports a shortfall when fewer than requested questions are available', () => {
    const lone = customAssignment({
      id: 'custom-lone',
      professionId: 'architect',
      educationalTier: EducationalTier.Elementary,
      difficulty: 1,
      requiredSubjects: [SubjectId.Mathematics],
      requiredQuestionTopics: ['design'],
    });
    const resolver = new AssignmentQuestionResolver(new QuestionRepository([PROFESSION_QUESTION_SAMPLES[7]]), {
      assignments: [lone],
    });
    // Only sample-architect-design-01 is present; ask for 5.
    const result = resolver.resolve({ assignmentId: 'custom-lone', count: 5, playerLevel: 5 });

    expect(result.questions.length).toBeLessThan(5);
    expect(result.missingCoverage).toBe(true);
    expect(result.coverage.satisfied).toBe(false);
  });

  it('assessCoverage reports when no profession-tagged content exists', () => {
    const resolver = new AssignmentQuestionResolver(bundledRepo());
    const coverage = resolver.assessCoverage('doctor-patient-intake');

    expect(coverage.hasProfessionCoverage).toBe(false);
    expect(coverage.professionTaggedMatches).toBe(0);
  });

  it('notes the profession-coverage gap in the message', () => {
    const resolver = new AssignmentQuestionResolver(bundledRepo());
    const result = resolver.resolve({ assignmentId: 'doctor-patient-intake', count: 1, playerLevel: 5 });

    expect(result.coverage.hasProfessionCoverage).toBe(false);
    expect(result.message).toContain('No profession-tagged questions');
  });
});

// ─── Backward compatibility with the existing bank ───────────────────────────

describe('Phase 27.4 — backward compatibility with existing questions', () => {
  it('resolves questions from the bundled bank (which has no profession tags)', () => {
    const resolver = new AssignmentQuestionResolver(bundledRepo());
    const result = resolver.resolve({ assignmentId: 'doctor-patient-intake', count: 2, playerLevel: 5 });

    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions.every((q) => q.status === QuestionStatus.Published)).toBe(true);
  });

  it('leaves the bundled bank free of profession tags', () => {
    const loaded = loadBundledQuestions();
    expect(loaded.questions.some((q) => (q.professionTags ?? []).length > 0)).toBe(false);
  });
});

// ─── PvE retrieval regression ────────────────────────────────────────────────

describe('Phase 27.4 — PvE retrieval regression', () => {
  it('keeps the existing difficulty-engine retrieval working', () => {
    const repo = bundledRepo();
    const engine = new DifficultyEngine();
    const profile = engine.createQuestionProfile(SubjectId.Mathematics, 1, 1);
    const { questions } = engine.resolveQuestionsWithFallback(repo, profile, 3);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('keeps existing repository filters behaving as before', () => {
    const repo = bundledRepo();
    const math = repo.filter({ subject: SubjectId.Mathematics });
    expect(math.length).toBeGreaterThan(0);
    expect(math.every((q) => q.subject === SubjectId.Mathematics)).toBe(true);
    expect(repo.filter({ subject: SubjectId.Business })).toHaveLength(0);
  });
});

// ─── Stage question requirement bridge ───────────────────────────────────────

describe('Phase 27.4 — stage question requirement', () => {
  it('sums the AnswerQuestions objectives of a stage', () => {
    expect(getStageQuestionRequirement(ASSIGNMENT_DEFINITIONS[0], 0)).toBe(3); // doctor-patient-intake
    expect(getStageQuestionRequirement(ASSIGNMENT_DEFINITIONS[1], 0)).toBe(2); // doctor-diagnose-ward stage 1
    expect(getStageQuestionRequirement(ASSIGNMENT_DEFINITIONS[1], 1)).toBe(0); // ReportOutcome only
    expect(getStageQuestionRequirement(ASSIGNMENT_DEFINITIONS[5], 1)).toBe(0); // CompleteSteps only
    expect(getStageQuestionRequirement(ASSIGNMENT_DEFINITIONS[0], 99)).toBe(0);
  });

  it('feeds a well-formed resolve request', () => {
    const resolver = new AssignmentQuestionResolver(samplesRepo());
    const def = ASSIGNMENT_DEFINITIONS[0];
    const count = getStageQuestionRequirement(def, 0);
    const result = resolver.resolve({ assignmentId: def.id, count, playerLevel: 5 });
    expect(result.requestedCount).toBe(count);
    expect(result.questions).toHaveLength(count);
  });

  it('exposes the objective type used for the bridge', () => {
    expect(ASSIGNMENT_DEFINITIONS[0].stages[0].objectives[0].type).toBe(AssignmentObjectiveType.AnswerQuestions);
  });
});
