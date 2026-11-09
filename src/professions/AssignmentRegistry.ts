import { EducationalTier, SubjectId } from '../core/types/education';
import {
  AssignmentObjectiveType,
  AssignmentTaskType,
  type AssignmentDefinition,
} from './AssignmentTypes';

/**
 * Sample professional assignment catalogue (Phase 27.3).
 *
 * This is clearly-labelled **sample content**: at least two assignments for each
 * of the three fully-defined seed professions (Doctor, Electrical Engineer,
 * Architect). It exists to exercise the framework and is not a balanced,
 * complete content set — every value is provisional.
 *
 * The catalogue demonstrates that assignments are pure configuration:
 * - different task types (knowledge assessment, case analysis, problem solving,
 *   practical simulation, project completion);
 * - multi-stage assignments with heterogeneous objectives;
 * - non-question objectives (`CompleteSteps`) alongside question-backed ones
 *   (`AnswerQuestions`), proving the engine is not question-only;
 * - rank/level gates, prerequisites, and configurable reward bundles.
 */
export const ASSIGNMENT_DEFINITIONS: readonly AssignmentDefinition[] = [
  // ────────────────────────────── Doctor ──────────────────────────────
  {
    id: 'doctor-patient-intake',
    title: 'Patient Intake Interview',
    description:
      'Take a new patient\u2019s history and record their presenting symptoms before the consultation.',
    professionId: 'doctor',
    taskType: AssignmentTaskType.KnowledgeAssessment,
    difficulty: 1,
    requiredQuestionTopics: ['medicine', 'anatomy'],
    requiredSubjects: [SubjectId.Science],
    educationalTier: EducationalTier.Elementary,
    stages: [
      {
        id: 'intake',
        name: 'History & Symptoms',
        description: 'Gather the patient\u2019s history and note the key symptoms.',
        objectives: [
          {
            id: 'history-questions',
            description: 'Answer the intake questions correctly',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 3,
            targetId: 'medicine',
          },
        ],
      },
    ],
    requirements: { minRankId: 'medical-trainee' },
    rewards: {
      professionExp: 40,
      gold: 30,
      reputation: 2,
      subjectMasteryExp: [{ subject: SubjectId.Science, amount: 20 }],
    },
    repeatable: false,
    provisional: true,
  },
  {
    id: 'doctor-diagnose-ward',
    title: 'Ward Diagnosis',
    description:
      'Review a patient\u2019s symptoms and interpret their laboratory results to reach a diagnosis.',
    professionId: 'doctor',
    taskType: AssignmentTaskType.CaseAnalysis,
    difficulty: 3,
    requiredQuestionTopics: ['diagnosis', 'medicine'],
    requiredSubjects: [SubjectId.Science, SubjectId.GeneralKnowledge],
    educationalTier: EducationalTier.JuniorHigh,
    stages: [
      {
        id: 'review-symptoms',
        name: 'Review Symptoms',
        objectives: [
          {
            id: 'symptom-questions',
            description: 'Assess the reported symptoms',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 2,
            targetId: 'diagnosis',
          },
        ],
      },
      {
        id: 'interpret-results',
        name: 'Interpret Laboratory Results',
        objectives: [
          {
            id: 'lab-report',
            description: 'Read and interpret the laboratory report',
            type: AssignmentObjectiveType.ReportOutcome,
            required: 1,
            targetId: 'lab-report',
          },
        ],
      },
    ],
    requirements: {
      minRankId: 'junior-doctor',
      prerequisiteAssignmentIds: ['doctor-patient-intake'],
    },
    rewards: {
      professionExp: 80,
      characterExp: 60,
      gold: 50,
      reputation: 4,
      subjectMasteryExp: [{ subject: SubjectId.Science, amount: 30 }],
    },
    repeatable: false,
    provisional: true,
  },

  // ─────────────────────── Electrical Engineer ───────────────────────
  {
    id: 'engineer-circuit-basics',
    title: 'Circuit Troubleshooting Basics',
    description: 'Trace a simple circuit and identify where the fault lies.',
    professionId: 'electrical-engineer',
    taskType: AssignmentTaskType.ProblemSolving,
    difficulty: 1,
    requiredQuestionTopics: ['circuits', 'electronics'],
    requiredSubjects: [SubjectId.Physics],
    educationalTier: EducationalTier.Elementary,
    stages: [
      {
        id: 'trace-circuit',
        name: 'Trace the Circuit',
        objectives: [
          {
            id: 'circuit-questions',
            description: 'Answer the circuit questions correctly',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 3,
            targetId: 'circuits',
          },
        ],
      },
    ],
    requirements: { minRankId: 'engineering-intern' },
    rewards: {
      professionExp: 40,
      gold: 30,
      reputation: 2,
      subjectMasteryExp: [{ subject: SubjectId.Physics, amount: 20 }],
    },
    repeatable: false,
    provisional: true,
  },
  {
    id: 'engineer-fault-finding',
    title: 'Fault-Finding Simulation',
    description:
      'Diagnose a malfunctioning panel: locate the faulty components, then compute the correct values.',
    professionId: 'electrical-engineer',
    taskType: AssignmentTaskType.PracticalSimulation,
    difficulty: 3,
    requiredQuestionTopics: ['circuits', 'power-systems', 'electronics'],
    requiredSubjects: [SubjectId.Physics, SubjectId.Mathematics],
    educationalTier: EducationalTier.JuniorHigh,
    stages: [
      {
        id: 'identify-components',
        name: 'Identify Faulty Components',
        objectives: [
          {
            id: 'component-questions',
            description: 'Identify which components have failed',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 2,
            targetId: 'electronics',
          },
        ],
      },
      {
        id: 'calculate-values',
        name: 'Calculate Electrical Values',
        description: 'Work out the expected voltage, current, and resistance.',
        objectives: [
          {
            id: 'value-questions',
            description: 'Calculate the correct electrical values',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 3,
            targetId: 'power-systems',
          },
        ],
      },
    ],
    requirements: {
      minRankId: 'junior-engineer',
      prerequisiteAssignmentIds: ['engineer-circuit-basics'],
    },
    rewards: {
      professionExp: 80,
      characterExp: 60,
      gold: 50,
      reputation: 4,
      subjectMasteryExp: [
        { subject: SubjectId.Physics, amount: 25 },
        { subject: SubjectId.Mathematics, amount: 15 },
      ],
    },
    repeatable: false,
    provisional: true,
  },

  // ───────────────────────────── Architect ─────────────────────────────
  {
    id: 'architect-floor-plan',
    title: 'Interpret Floor Plans',
    description: 'Read a set of floor plans and answer questions about the layout.',
    professionId: 'architect',
    taskType: AssignmentTaskType.KnowledgeAssessment,
    difficulty: 1,
    requiredQuestionTopics: ['design', 'drafting'],
    requiredSubjects: [SubjectId.Mathematics],
    educationalTier: EducationalTier.Elementary,
    stages: [
      {
        id: 'read-plans',
        name: 'Read the Plans',
        objectives: [
          {
            id: 'plan-questions',
            description: 'Answer the floor-plan questions correctly',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 3,
            targetId: 'drafting',
          },
        ],
      },
    ],
    requirements: { minRankId: 'architectural-trainee' },
    rewards: {
      professionExp: 40,
      gold: 30,
      reputation: 2,
      subjectMasteryExp: [{ subject: SubjectId.Mathematics, amount: 20 }],
    },
    repeatable: false,
    provisional: true,
  },
  {
    id: 'architect-design-challenge',
    title: 'Design Challenge',
    description:
      'Calculate the dimensions for a small structure, then assemble a complete design proposal.',
    professionId: 'architect',
    taskType: AssignmentTaskType.ProjectCompletion,
    difficulty: 3,
    requiredQuestionTopics: ['design', 'structures'],
    requiredSubjects: [SubjectId.Mathematics, SubjectId.Physics],
    educationalTier: EducationalTier.JuniorHigh,
    stages: [
      {
        id: 'dimensions',
        name: 'Calculate Building Dimensions',
        objectives: [
          {
            id: 'dimension-questions',
            description: 'Calculate the correct dimensions',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 2,
            targetId: 'structures',
          },
        ],
      },
      {
        id: 'assemble-design',
        name: 'Complete the Design',
        description: 'Assemble the final design proposal from the parts you have prepared.',
        objectives: [
          {
            id: 'design-steps',
            description: 'Assemble the design proposal',
            // A non-question objective: a generic milestone counter, showing the
            // engine is not restricted to answering questions.
            type: AssignmentObjectiveType.CompleteSteps,
            required: 1,
            targetId: 'design-proposal',
          },
        ],
      },
    ],
    requirements: {
      minRankId: 'junior-architect',
      prerequisiteAssignmentIds: ['architect-floor-plan'],
    },
    rewards: {
      professionExp: 80,
      characterExp: 60,
      gold: 50,
      reputation: 5,
      subjectMasteryExp: [
        { subject: SubjectId.Mathematics, amount: 25 },
        { subject: SubjectId.Physics, amount: 15 },
      ],
    },
    repeatable: false,
    provisional: true,
  },

  // ──────────────────────── Teacher (Phase 27.7) ────────────────────────
  // Added purely through configuration alongside the Teacher profession to
  // prove the assignment engine needs no profession-specific changes.
  {
    id: 'teacher-lesson-basics',
    title: 'Prepare a Lesson',
    description:
      'Choose a topic and answer the knowledge questions that underpin a clear introductory lesson.',
    professionId: 'teacher',
    taskType: AssignmentTaskType.KnowledgeAssessment,
    difficulty: 1,
    requiredQuestionTopics: ['teaching', 'pedagogy'],
    requiredSubjects: [SubjectId.GeneralKnowledge],
    educationalTier: EducationalTier.Elementary,
    stages: [
      {
        id: 'lesson-knowledge',
        name: 'Lesson Knowledge',
        objectives: [
          {
            id: 'lesson-questions',
            description: 'Answer the lesson knowledge questions correctly',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 3,
            targetId: 'teaching',
          },
        ],
      },
    ],
    requirements: { minRankId: 'teaching-assistant' },
    rewards: {
      professionExp: 40,
      gold: 30,
      reputation: 2,
      subjectMasteryExp: [{ subject: SubjectId.GeneralKnowledge, amount: 20 }],
    },
    repeatable: false,
    provisional: true,
  },
  {
    id: 'teacher-class-assessment',
    title: 'Assess a Class',
    description:
      'Review a class\u2019s answers to a topic quiz, then record a short assessment of their progress.',
    professionId: 'teacher',
    taskType: AssignmentTaskType.CaseAnalysis,
    difficulty: 3,
    requiredQuestionTopics: ['teaching', 'pedagogy', 'assessment'],
    requiredSubjects: [SubjectId.GeneralKnowledge, SubjectId.Science],
    educationalTier: EducationalTier.JuniorHigh,
    stages: [
      {
        id: 'review-answers',
        name: 'Review Class Answers',
        objectives: [
          {
            id: 'assessment-questions',
            description: 'Assess the class\u2019s topic answers',
            type: AssignmentObjectiveType.AnswerQuestions,
            required: 2,
            targetId: 'pedagogy',
          },
        ],
      },
      {
        id: 'record-assessment',
        name: 'Record the Assessment',
        description: 'Write up the class assessment for the record.',
        objectives: [
          {
            id: 'assessment-report',
            description: 'Report the assessment outcome',
            type: AssignmentObjectiveType.ReportOutcome,
            required: 1,
            targetId: 'class-assessment',
          },
        ],
      },
    ],
    requirements: {
      minRankId: 'junior-teacher',
      prerequisiteAssignmentIds: ['teacher-lesson-basics'],
    },
    rewards: {
      professionExp: 80,
      characterExp: 60,
      gold: 50,
      reputation: 4,
      subjectMasteryExp: [
        { subject: SubjectId.GeneralKnowledge, amount: 25 },
        { subject: SubjectId.Science, amount: 15 },
      ],
    },
    repeatable: false,
    provisional: true,
  },
];

/** Registry of every assignment definition, keyed by assignment id. */
export const ASSIGNMENT_REGISTRY: Record<string, AssignmentDefinition> = Object.fromEntries(
  ASSIGNMENT_DEFINITIONS.map((assignment) => [assignment.id, assignment]),
);

/** Returns the assignment definition for `assignmentId`, or `undefined` when unknown. */
export function getAssignment(assignmentId: string): AssignmentDefinition | undefined {
  return ASSIGNMENT_REGISTRY[assignmentId];
}

/** Returns every registered assignment definition. */
export function getAssignments(): AssignmentDefinition[] {
  return [...ASSIGNMENT_DEFINITIONS];
}

/** Returns the assignments associated with a profession. */
export function getAssignmentsForProfession(professionId: string): AssignmentDefinition[] {
  return ASSIGNMENT_DEFINITIONS.filter((assignment) => assignment.professionId === professionId);
}
