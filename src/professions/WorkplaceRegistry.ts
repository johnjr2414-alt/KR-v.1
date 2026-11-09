import { SubjectId } from '../core/types/education';
import type { WorkplaceDefinition } from './WorkplaceTypes';

/** Canonical workplace identifiers. */
export const WorkplaceIds = {
  CareerCenter: 'career-center',
  Hospital: 'hospital',
  EngineeringCenter: 'engineering-center',
  ArchitectureStudio: 'architecture-studio',
  Academy: 'academy',
  Courthouse: 'courthouse',
} as const;

/**
 * Starter workplace catalogue (Phase 27.2).
 *
 * Every workplace is configuration: facilities, interaction points, NPC
 * associations, world locations, entry gates, and per-facility access rules are
 * all data. Multiple professions share a workplace (the Hospital hosts Doctor
 * and Nurse; the Engineering Center hosts Electrical and Civil Engineers).
 *
 * World locations reference existing world definitions (`beginners-village`
 * and its landmarks/buildings) rather than duplicating them. The Career Center
 * is a new village landmark; the Academy reuses the existing General Knowledge
 * Library building. Workplaces without a `worldLocation` (Hospital, Engineering
 * Center, Architecture Studio, Courthouse) attach to world content as their
 * regions are built in later phases.
 *
 * All balance values are provisional.
 */
export const WORKPLACE_DEFINITIONS: readonly WorkplaceDefinition[] = [
  // ── Career Center — the profession/enrollment hub in the village ──
  {
    id: WorkplaceIds.CareerCenter,
    name: 'Career Center',
    description:
      "The realm's hub for discovering real-world professions and enrolling in a career path.",
    professionIds: [],
    facilities: [
      {
        id: 'reception',
        name: 'Reception',
        description: 'The front desk where visitors are welcomed and directed.',
        access: {},
      },
      {
        id: 'counseling-room',
        name: 'Counseling Room',
        description: 'Advisors help visitors choose a profession that suits them.',
        access: {},
      },
      {
        id: 'enrollment-desk',
        name: 'Enrollment Desk',
        description: 'Where qualified candidates formally enroll in a profession.',
        access: { minCharacterLevel: 5 },
      },
    ],
    npcIds: ['career-advisor-marisol'],
    interactionPoints: [
      { id: 'front-desk', label: 'Reception Desk', facilityId: 'reception' },
      { id: 'counseling-desk', label: 'Counseling Desk', facilityId: 'counseling-room' },
      { id: 'enrollment-desk-point', label: 'Enrollment Desk', facilityId: 'enrollment-desk' },
    ],
    entryRequirements: {},
    worldLocation: { mapId: 'beginners-village', landmarkId: 'career-center' },
    provisional: true,
  },

  // ── Hospital — shared by Doctor and Nurse ──
  {
    id: WorkplaceIds.Hospital,
    name: 'Hospital',
    description: 'A place of healing where medical professionals treat the sick and injured.',
    professionIds: ['doctor', 'nurse'],
    facilities: [
      {
        id: 'reception',
        name: 'Reception',
        description: 'The public entrance and waiting area.',
        access: {},
      },
      {
        id: 'examination-room',
        name: 'Examination Room',
        description: 'Where patients are assessed and diagnosed.',
        access: { professionIds: ['doctor', 'nurse'] },
      },
      {
        id: 'laboratory',
        name: 'Laboratory',
        description: 'Medical samples are analysed here by qualified staff.',
        access: { professionIds: ['doctor', 'nurse'], minProfessionLevel: 3, minCharacterLevel: 8 },
      },
      {
        id: 'medical-office',
        name: 'Medical Office',
        description: 'Reserved for physicians who have earned a practitioner rank.',
        access: { professionIds: ['doctor'], requiredRankIds: ['general-practitioner'] },
      },
    ],
    npcIds: ['doctor-quinn'],
    interactionPoints: [
      { id: 'reception-desk', label: 'Reception Desk', facilityId: 'reception' },
      { id: 'exam-bed', label: 'Examination Bed', facilityId: 'examination-room' },
      { id: 'lab-bench', label: 'Laboratory Bench', facilityId: 'laboratory' },
      { id: 'office-desk', label: 'Physician Desk', facilityId: 'medical-office' },
    ],
    entryRequirements: {},
    provisional: true,
  },

  // ── Engineering Center — shared by Electrical and Civil Engineers ──
  {
    id: WorkplaceIds.EngineeringCenter,
    name: 'Engineering Center',
    description: 'A working hub for engineers to design, build, and test their creations.',
    professionIds: ['electrical-engineer', 'civil-engineer'],
    facilities: [
      {
        id: 'design-office',
        name: 'Design Office',
        description: 'A shared drafting and planning space, open to all visitors.',
        access: {},
      },
      {
        id: 'electronics-laboratory',
        name: 'Electronics Laboratory',
        description: 'Circuit benches reserved for electrical engineers.',
        access: { professionIds: ['electrical-engineer'] },
      },
      {
        id: 'mechanical-workshop',
        name: 'Mechanical Workshop',
        description: 'Heavy tooling shared by engineers of every discipline.',
        access: { professionIds: ['electrical-engineer', 'civil-engineer'] },
      },
      {
        id: 'project-office',
        name: 'Project Office',
        description: 'Project leads coordinate here once they reach Engineer rank.',
        access: { minProfessionLevel: 6 },
      },
    ],
    npcIds: ['engineer-rurik'],
    interactionPoints: [
      { id: 'design-desk', label: 'Design Desk', facilityId: 'design-office' },
      { id: 'electronics-bench', label: 'Electronics Bench', facilityId: 'electronics-laboratory' },
      { id: 'workshop-bench', label: 'Workshop Bench', facilityId: 'mechanical-workshop' },
      { id: 'project-board', label: 'Project Board', facilityId: 'project-office' },
    ],
    entryRequirements: {},
    provisional: true,
  },

  // ── Architecture Studio — Architect workplace ──
  {
    id: WorkplaceIds.ArchitectureStudio,
    name: 'Architecture Studio',
    description: 'A studio where buildings and spaces are designed and planned.',
    professionIds: ['architect'],
    facilities: [
      {
        id: 'design-room',
        name: 'Design Room',
        description: 'The open drafting studio floor.',
        access: {},
      },
      {
        id: 'planning-office',
        name: 'Planning Office',
        description: 'Detailed plans and permits are prepared here.',
        access: { professionIds: ['architect'] },
      },
      {
        id: 'project-room',
        name: 'Project Room',
        description: 'Reserved for architects leading a proven project record.',
        access: {
          professionIds: ['architect'],
          minProfessionLevel: 6,
          requiredQuestIds: ['quest-archivist-3-final-proof'],
        },
      },
    ],
    npcIds: ['architect-ines'],
    interactionPoints: [
      { id: 'drafting-table', label: 'Drafting Table', facilityId: 'design-room' },
      { id: 'planning-desk', label: 'Planning Desk', facilityId: 'planning-office' },
      { id: 'project-wall', label: 'Project Wall', facilityId: 'project-room' },
    ],
    entryRequirements: {},
    provisional: true,
  },

  // ── Academy (School/University) — gated entry, largely open facilities ──
  {
    id: WorkplaceIds.Academy,
    name: 'Academy',
    description: 'A place of higher learning offering classrooms, examinations, and research.',
    professionIds: ['teacher'],
    facilities: [
      {
        id: 'classroom',
        name: 'Classroom',
        description: 'Lessons and lectures are held here.',
        access: {},
      },
      {
        id: 'examination-room',
        name: 'Examination Room',
        description: 'Where students sit assessments.',
        access: {},
      },
      {
        id: 'faculty-office',
        name: 'Faculty Office',
        description: 'Staff offices, accessible to advanced students.',
        access: { minCharacterLevel: 10 },
      },
      {
        id: 'research-room',
        name: 'Research Room',
        description: 'A shared research space for capable scholars.',
        access: { minCharacterLevel: 15, mastery: [{ subject: SubjectId.Science, minLevel: 3 }] },
      },
    ],
    npcIds: ['academy-instructor-lena'],
    interactionPoints: [
      { id: 'classroom-door', label: 'Classroom Door', facilityId: 'classroom' },
      { id: 'exam-hall', label: 'Examination Hall', facilityId: 'examination-room' },
      { id: 'faculty-desk', label: 'Faculty Desk', facilityId: 'faculty-office' },
      { id: 'research-desk', label: 'Research Desk', facilityId: 'research-room' },
    ],
    entryRequirements: { minCharacterLevel: 5 },
    worldLocation: { mapId: 'beginners-village', landmarkId: 'library', buildingId: 'general-knowledge-library' },
    provisional: true,
  },

  // ── Courthouse — Lawyer workplace (completes the seed profession set) ──
  {
    id: WorkplaceIds.Courthouse,
    name: 'Courthouse',
    description: 'Where disputes are argued and the law is applied.',
    professionIds: ['lawyer'],
    facilities: [
      {
        id: 'reception',
        name: 'Reception',
        description: 'The public entrance to the courts.',
        access: {},
      },
      {
        id: 'records-room',
        name: 'Records Room',
        description: 'Case files and statutes, open to practising lawyers.',
        access: { professionIds: ['lawyer'], minProfessionLevel: 3 },
      },
      {
        id: 'courtroom',
        name: 'Courtroom',
        description: 'Where cases are heard before a judge.',
        access: { professionIds: ['lawyer'] },
      },
      {
        id: 'chambers',
        name: 'Chambers',
        description: 'Private chambers for senior members of the bar.',
        access: { professionIds: ['lawyer'], minProfessionLevel: 6 },
      },
    ],
    npcIds: [],
    interactionPoints: [
      { id: 'court-reception', label: 'Reception Desk', facilityId: 'reception' },
      { id: 'records-shelf', label: 'Records Shelf', facilityId: 'records-room' },
      { id: 'court-bench', label: 'Court Bench', facilityId: 'courtroom' },
      { id: 'chambers-door', label: 'Chambers Door', facilityId: 'chambers' },
    ],
    entryRequirements: {},
    provisional: true,
  },
];

/** Registry of every workplace definition, keyed by workplace id. */
export const WORKPLACE_REGISTRY: Record<string, WorkplaceDefinition> = Object.fromEntries(
  WORKPLACE_DEFINITIONS.map((workplace) => [workplace.id, workplace]),
);

/** Returns the workplace definition for `workplaceId`, or `undefined` when unknown. */
export function getWorkplace(workplaceId: string): WorkplaceDefinition | undefined {
  return WORKPLACE_REGISTRY[workplaceId];
}

/** Returns every registered workplace definition. */
export function getWorkplaces(): WorkplaceDefinition[] {
  return [...WORKPLACE_DEFINITIONS];
}

/** Returns the workplaces that list `professionId` among their associated professions. */
export function getWorkplacesForProfession(professionId: string): WorkplaceDefinition[] {
  return WORKPLACE_DEFINITIONS.filter((workplace) => workplace.professionIds.includes(professionId));
}

/** Returns the professions associated with a workplace (empty when unknown). */
export function getProfessionsForWorkplace(workplaceId: string): string[] {
  return [...(WORKPLACE_REGISTRY[workplaceId]?.professionIds ?? [])];
}

/** Returns the facilities of a workplace (empty when unknown). */
export function getWorkplaceFacilities(workplaceId: string) {
  return [...(WORKPLACE_REGISTRY[workplaceId]?.facilities ?? [])];
}

/** Returns a single facility of a workplace, or `undefined` when unknown. */
export function getWorkplaceFacility(workplaceId: string, facilityId: string) {
  return WORKPLACE_REGISTRY[workplaceId]?.facilities.find((facility) => facility.id === facilityId);
}

/** Returns every workplace that is associated with a physical world location. */
export function getIntegratedWorkplaces(): WorkplaceDefinition[] {
  return WORKPLACE_DEFINITIONS.filter((workplace) => workplace.worldLocation !== undefined);
}
