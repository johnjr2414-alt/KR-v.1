import { SubjectId } from '../core/types/education';
import type {
  ProfessionDefinition,
  ProfessionExperienceSettings,
} from './ProfessionTypes';

/** Shared provisional EXP ladder used by the starter professions. */
function standardExperience(maxProfessionLevel = 50): ProfessionExperienceSettings {
  return {
    maxProfessionLevel,
    baseExp: 100,
    growthFactor: 1.15,
  };
}

/**
 * Starter profession catalogue (Phase 27.1).
 *
 * Doctor, Electrical Engineer, and Architect are fully defined per the phase
 * spec. Nurse, Civil Engineer, and Lawyer are additionally provided as
 * definition-only entries to demonstrate that new professions are additive —
 * their workplaces, assignments, and content arrive in later phases. Teacher
 * (added in Phase 27.7) is a configuration-only addition that is fully wired
 * through existing workplaces, assignments, and question samples. All
 * balance values are provisional.
 */
export const PROFESSION_DEFINITIONS: readonly ProfessionDefinition[] = [
  // ── Healthcare — fully defined ──
  {
    id: 'doctor',
    name: 'Doctor',
    categoryId: 'healthcare',
    description:
      'Diagnose and treat illness, tending to patients with medical knowledge and steady judgement.',
    responsibilities: [
      'Diagnose illnesses and injuries',
      'Prescribe and monitor treatments',
      'Counsel patients on health and prevention',
    ],
    workplaceIds: ['hospital'],
    enrollment: {
      minCharacterLevel: 5,
      mastery: [{ subject: SubjectId.Science, minLevel: 2 }],
      goldCost: 200,
    },
    ranks: [
      { id: 'medical-trainee', name: 'Medical Trainee', minLevel: 1 },
      { id: 'junior-doctor', name: 'Junior Doctor', minLevel: 3 },
      { id: 'general-practitioner', name: 'General Practitioner', minLevel: 6 },
      { id: 'senior-doctor', name: 'Senior Doctor', minLevel: 10 },
      { id: 'medical-specialist', name: 'Medical Specialist', minLevel: 15 },
      { id: 'chief-physician', name: 'Chief Physician', minLevel: 20 },
    ],
    experience: standardExperience(),
    questionTags: ['medicine', 'anatomy', 'diagnosis'],
    subjectTags: [SubjectId.Science, SubjectId.GeneralKnowledge],
    specializations: [
      {
        id: 'cardiology',
        name: 'Cardiology',
        description: 'Specialise in the heart and circulatory system.',
        minLevel: 15,
      },
      {
        id: 'pediatrics',
        name: 'Pediatrics',
        description: 'Specialise in the care of children.',
        minLevel: 15,
      },
    ],
    provisional: true,
  },

  // ── Engineering and Technology — fully defined ──
  {
    id: 'electrical-engineer',
    name: 'Electrical Engineer',
    categoryId: 'engineering-technology',
    description:
      'Design and maintain electrical circuits, power systems, and electronic devices.',
    responsibilities: [
      'Design electrical circuits and systems',
      'Maintain and repair electronic equipment',
      'Ensure installations meet safety standards',
    ],
    workplaceIds: ['engineering-center'],
    enrollment: {
      minCharacterLevel: 5,
      mastery: [{ subject: SubjectId.Physics, minLevel: 2 }],
      goldCost: 150,
    },
    ranks: [
      { id: 'engineering-intern', name: 'Engineering Intern', minLevel: 1 },
      { id: 'junior-engineer', name: 'Junior Engineer', minLevel: 3 },
      { id: 'engineer', name: 'Engineer', minLevel: 6 },
      { id: 'senior-engineer', name: 'Senior Engineer', minLevel: 10 },
      { id: 'lead-engineer', name: 'Lead Engineer', minLevel: 15 },
      { id: 'principal-engineer', name: 'Principal Engineer', minLevel: 20 },
    ],
    experience: standardExperience(),
    questionTags: ['circuits', 'electronics', 'power-systems'],
    subjectTags: [SubjectId.Physics, SubjectId.Mathematics],
    provisional: true,
  },

  // ── Architecture and Construction — fully defined ──
  {
    id: 'architect',
    name: 'Architect',
    categoryId: 'architecture-construction',
    description:
      'Design buildings and spaces that are functional, safe, and beautiful.',
    responsibilities: [
      'Draft building designs and blueprints',
      'Balance aesthetics with structural safety',
      'Coordinate plans with builders and engineers',
    ],
    workplaceIds: ['architecture-studio'],
    enrollment: {
      minCharacterLevel: 5,
      mastery: [{ subject: SubjectId.Mathematics, minLevel: 2 }],
      goldCost: 150,
    },
    ranks: [
      { id: 'architectural-trainee', name: 'Architectural Trainee', minLevel: 1 },
      { id: 'junior-architect', name: 'Junior Architect', minLevel: 3 },
      { id: 'architect', name: 'Architect', minLevel: 6 },
      { id: 'senior-architect', name: 'Senior Architect', minLevel: 10 },
      { id: 'lead-architect', name: 'Lead Architect', minLevel: 15 },
      { id: 'principal-architect', name: 'Principal Architect', minLevel: 20 },
    ],
    experience: standardExperience(),
    questionTags: ['design', 'structures', 'drafting'],
    subjectTags: [SubjectId.Mathematics, SubjectId.Physics],
    provisional: true,
  },

  // ── Definition-only entries (gameplay arrives in later phases) ──
  {
    id: 'nurse',
    name: 'Nurse',
    categoryId: 'healthcare',
    description: 'Provide frontline patient care and support to medical teams.',
    responsibilities: [
      'Monitor patient wellbeing',
      'Administer care and treatment',
      'Assist physicians and patients',
    ],
    workplaceIds: ['hospital'],
    enrollment: {
      minCharacterLevel: 3,
      mastery: [{ subject: SubjectId.Science, minLevel: 1 }],
      goldCost: 100,
    },
    ranks: [
      { id: 'nursing-assistant', name: 'Nursing Assistant', minLevel: 1 },
      { id: 'staff-nurse', name: 'Staff Nurse', minLevel: 3 },
      { id: 'senior-nurse', name: 'Senior Nurse', minLevel: 6 },
      { id: 'head-nurse', name: 'Head Nurse', minLevel: 10 },
      { id: 'nurse-practitioner', name: 'Nurse Practitioner', minLevel: 15 },
      { id: 'chief-nurse', name: 'Chief Nurse', minLevel: 20 },
    ],
    experience: standardExperience(),
    questionTags: ['nursing', 'patient-care'],
    subjectTags: [SubjectId.Science, SubjectId.GeneralKnowledge],
    provisional: true,
  },
  {
    id: 'civil-engineer',
    name: 'Civil Engineer',
    categoryId: 'architecture-construction',
    description: 'Plan and construct infrastructure such as roads, bridges, and buildings.',
    responsibilities: [
      'Design load-bearing structures',
      'Select and test construction materials',
      'Oversee infrastructure projects',
    ],
    workplaceIds: ['engineering-center'],
    enrollment: {
      minCharacterLevel: 5,
      mastery: [
        { subject: SubjectId.Mathematics, minLevel: 2 },
        { subject: SubjectId.Physics, minLevel: 1 },
      ],
      goldCost: 150,
    },
    ranks: [
      { id: 'civil-engineering-intern', name: 'Civil Engineering Intern', minLevel: 1 },
      { id: 'junior-civil-engineer', name: 'Junior Civil Engineer', minLevel: 3 },
      { id: 'civil-engineer', name: 'Civil Engineer', minLevel: 6 },
      { id: 'senior-civil-engineer', name: 'Senior Civil Engineer', minLevel: 10 },
      { id: 'lead-civil-engineer', name: 'Lead Civil Engineer', minLevel: 15 },
      { id: 'principal-civil-engineer', name: 'Principal Civil Engineer', minLevel: 20 },
    ],
    experience: standardExperience(),
    questionTags: ['structures', 'materials', 'infrastructure'],
    subjectTags: [SubjectId.Physics, SubjectId.Mathematics],
    provisional: true,
  },
  {
    id: 'lawyer',
    name: 'Lawyer',
    categoryId: 'law',
    description: 'Advise clients and argue cases within the framework of the law.',
    responsibilities: [
      'Interpret laws and regulations',
      'Draft and review contracts',
      'Represent clients in disputes',
    ],
    workplaceIds: ['courthouse'],
    enrollment: {
      minCharacterLevel: 8,
      mastery: [
        { subject: SubjectId.Business, minLevel: 2 },
        { subject: SubjectId.GeneralKnowledge, minLevel: 2 },
      ],
      goldCost: 250,
    },
    ranks: [
      { id: 'law-clerk', name: 'Law Clerk', minLevel: 1 },
      { id: 'junior-associate', name: 'Junior Associate', minLevel: 3 },
      { id: 'associate', name: 'Associate', minLevel: 6 },
      { id: 'senior-associate', name: 'Senior Associate', minLevel: 10 },
      { id: 'partner', name: 'Partner', minLevel: 15 },
      { id: 'senior-partner', name: 'Senior Partner', minLevel: 20 },
    ],
    experience: standardExperience(),
    questionTags: ['law', 'contracts', 'advocacy'],
    subjectTags: [SubjectId.Business, SubjectId.GeneralKnowledge],
    provisional: true,
  },

  // ── Education and Science — added in Phase 27.7 purely through configuration ──
  // Demonstrates extensibility: a new profession is added by appending catalogue
  // data only (no core profession-engine changes). It reuses the existing
  // Academy workplace and its interactive NPC, and gains its own assignments and
  // profession question samples.
  {
    id: 'teacher',
    name: 'Teacher',
    categoryId: 'education-science',
    description: 'Guide learners through subjects, plan lessons, and assess their progress.',
    responsibilities: [
      'Plan and deliver lessons',
      'Assess and support student progress',
      'Mentor learners toward their goals',
    ],
    workplaceIds: ['academy'],
    enrollment: {
      minCharacterLevel: 3,
      mastery: [{ subject: SubjectId.GeneralKnowledge, minLevel: 1 }],
      goldCost: 100,
    },
    ranks: [
      { id: 'teaching-assistant', name: 'Teaching Assistant', minLevel: 1 },
      { id: 'junior-teacher', name: 'Junior Teacher', minLevel: 3 },
      { id: 'teacher', name: 'Teacher', minLevel: 6 },
      { id: 'senior-teacher', name: 'Senior Teacher', minLevel: 10 },
      { id: 'lead-teacher', name: 'Lead Teacher', minLevel: 15 },
      { id: 'head-teacher', name: 'Head Teacher', minLevel: 20 },
    ],
    experience: standardExperience(),
    questionTags: ['teaching', 'pedagogy'],
    subjectTags: [SubjectId.GeneralKnowledge, SubjectId.Science],
    provisional: true,
  },
];

/** Registry of every profession definition, keyed by profession id. */
export const PROFESSION_REGISTRY: Record<string, ProfessionDefinition> = Object.fromEntries(
  PROFESSION_DEFINITIONS.map((profession) => [profession.id, profession]),
);

/** Returns the profession definition for `professionId`, or `undefined` when unknown. */
export function getProfession(professionId: string): ProfessionDefinition | undefined {
  return PROFESSION_REGISTRY[professionId];
}

/** Returns every registered profession definition. */
export function getProfessions(): ProfessionDefinition[] {
  return [...PROFESSION_DEFINITIONS];
}

/** Returns every profession belonging to a category. */
export function getProfessionsByCategory(categoryId: string): ProfessionDefinition[] {
  return PROFESSION_DEFINITIONS.filter((profession) => profession.categoryId === categoryId);
}
