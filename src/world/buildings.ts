import type { BuildingDefinition } from './BuildingDefinition';
import { SubjectId } from '../core/types/education';

/**
 * IDs for all village buildings.
 */
export const BuildingIds = {
  MathBuilding: 'math-building',
  Library: 'general-knowledge-library',
  ScienceLab: 'science-laboratory',
  TechWorkshop: 'technology-workshop',
} as const;

/**
 * IDs for hunting zones accessible from the village buildings.
 *
 * Emerald Forest zones (Phase 26.2) are region content rather than village
 * buildings, but they share this registry so the hunting-zone lookup stays a
 * single source of truth.
 */
export const HuntingZoneIds = {
  MathHuntingGround: 'math-hunting-ground',
  LibraryHuntingGround: 'library-hunting-ground',
  ScienceHuntingGround: 'science-hunting-ground',
  TechHuntingGround: 'tech-hunting-ground',
  GeneralHuntingGround: 'beginners-hunting-ground',
  // ── Emerald Forest (Phase 26.2) ──
  VerdantGlade: 'verdant-glade',
  RunestoneGrove: 'runestone-grove',
  // ── Ironhold Kingdom (Phase 26.3) ──
  ForgeDistrict: 'forge-district',
  SiegeWorks: 'siege-works',
  // ── Golden Capital (Phase 26.4) ──
  TradeBazaar: 'trade-bazaar',
  CivicDistrict: 'civic-district',
  // ── Arcane Technological City (Phase 26.5) ──
  ManaFoundry: 'mana-foundry',
  LogicSpire: 'logic-spire',
  // ── Forgotten Lands (Phase 26.6) ──
  AshenWastes: 'ashen-wastes',
  RuinedArchive: 'ruined-archive',
} as const;

/**
 * Mathematics Building — Levels 1–10, Mathematics subject.
 */
export const MATH_BUILDING_DEF: BuildingDefinition = {
  id: BuildingIds.MathBuilding,
  name: 'Mathematics Building',
  description: 'Practice arithmetic, logic, and basic algebra against Math Slimes and Number Goblins.',
  subject: SubjectId.Mathematics,
  huntingZoneIds: [HuntingZoneIds.MathHuntingGround],
  interactionPosition: { x: 160, y: 255 }, // bottom-center of landmark
};

/**
 * General Knowledge Library — Levels 1–10, General Knowledge subject.
 */
export const LIBRARY_DEF: BuildingDefinition = {
  id: BuildingIds.Library,
  name: 'General Knowledge Library',
  description: 'Test your trivia and world knowledge against Book Mimics and Quiz Spirits.',
  subject: SubjectId.GeneralKnowledge,
  huntingZoneIds: [HuntingZoneIds.LibraryHuntingGround],
  interactionPosition: { x: 400, y: 255 },
};

/**
 * Science Laboratory — Levels 1–10, Science subject.
 */
export const SCIENCE_LAB_DEF: BuildingDefinition = {
  id: BuildingIds.ScienceLab,
  name: 'Science Laboratory',
  description: 'Face Chemical Blobs and Atom Bugs with questions on biology and basic chemistry.',
  subject: SubjectId.Science,
  huntingZoneIds: [HuntingZoneIds.ScienceHuntingGround],
  interactionPosition: { x: 160, y: 555 },
};

/**
 * Technology Workshop — Levels 1–10, Programming subject.
 */
export const TECH_WORKSHOP_DEF: BuildingDefinition = {
  id: BuildingIds.TechWorkshop,
  name: 'Technology Workshop',
  description: 'Debug Binary Slimes and Circuit Beetles with programming and tech questions.',
  subject: SubjectId.Programming,
  huntingZoneIds: [HuntingZoneIds.TechHuntingGround],
  interactionPosition: { x: 400, y: 555 },
};

/**
 * Registry of all buildings by ID.
 */
export const BUILDING_REGISTRY: Record<string, BuildingDefinition> = {
  [BuildingIds.MathBuilding]: MATH_BUILDING_DEF,
  [BuildingIds.Library]: LIBRARY_DEF,
  [BuildingIds.ScienceLab]: SCIENCE_LAB_DEF,
  [BuildingIds.TechWorkshop]: TECH_WORKSHOP_DEF,
};
