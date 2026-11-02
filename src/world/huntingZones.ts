import type { HuntingZoneDefinition } from './HuntingZoneDefinition';
import { ZoneMonsterCategory } from './HuntingZoneDefinition';
import { SubjectId, EducationalTier } from '../core/types/education';
import { HuntingZoneIds } from './buildings';

/**
 * Mathematics hunting ground — Math Slimes, Number Goblins, Fraction Bats.
 */
export const MATH_HUNTING_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.MathHuntingGround,
  name: 'Arithmetic Fields',
  subject: SubjectId.Mathematics,
  educationalTier: EducationalTier.Elementary,
  recommendedMinLevel: 1,
  recommendedMaxLevel: 10,
  averageMonsterLevel: 5,
  monsterSpawnConfigs: [
    { monsterId: 'math-slime', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'number-goblin', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'fraction-bat', category: ZoneMonsterCategory.Normal, spawnWeight: 15, maxCount: 2 },
  ],
};

/**
 * General Knowledge hunting ground — Book Mimics, Quiz Spirits, Knowledge Wisps.
 */
export const LIBRARY_HUNTING_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.LibraryHuntingGround,
  name: 'Knowledge Grove',
  subject: SubjectId.GeneralKnowledge,
  educationalTier: EducationalTier.Elementary,
  recommendedMinLevel: 1,
  recommendedMaxLevel: 10,
  averageMonsterLevel: 5,
  monsterSpawnConfigs: [
    { monsterId: 'book-mimic', category: ZoneMonsterCategory.Weak, spawnWeight: 40, maxCount: 5 },
    { monsterId: 'quiz-spirit', category: ZoneMonsterCategory.Normal, spawnWeight: 40, maxCount: 3 },
    { monsterId: 'knowledge-wisp', category: ZoneMonsterCategory.Strong, spawnWeight: 20, maxCount: 2 },
  ],
};

/**
 * Science hunting ground — Chemical Blobs, Atom Bugs, Experiment Golems.
 */
export const SCIENCE_HUNTING_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.ScienceHuntingGround,
  name: 'Experiment Marsh',
  subject: SubjectId.Science,
  educationalTier: EducationalTier.Elementary,
  recommendedMinLevel: 1,
  recommendedMaxLevel: 10,
  averageMonsterLevel: 5,
  monsterSpawnConfigs: [
    { monsterId: 'chemical-blob', category: ZoneMonsterCategory.Weak, spawnWeight: 45, maxCount: 5 },
    { monsterId: 'atom-bug', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'experiment-golem', category: ZoneMonsterCategory.Strong, spawnWeight: 20, maxCount: 2 },
  ],
};

/**
 * Technology hunting ground — Binary Slimes, Circuit Beetles, Glitch Sprites.
 */
export const TECH_HUNTING_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.TechHuntingGround,
  name: 'Circuit Wilds',
  subject: SubjectId.Programming,
  educationalTier: EducationalTier.Elementary,
  recommendedMinLevel: 1,
  recommendedMaxLevel: 10,
  averageMonsterLevel: 5,
  monsterSpawnConfigs: [
    { monsterId: 'binary-slime', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'circuit-beetle', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'glitch-sprite', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/**
 * General beginner hunting ground (from the village exit gate).
 */
export const GENERAL_BEGINNER_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.GeneralHuntingGround,
  name: 'Beginners Hunting Ground',
  subject: SubjectId.Mathematics, // default subject; mixes monster types
  educationalTier: EducationalTier.Elementary,
  recommendedMinLevel: 1,
  recommendedMaxLevel: 10,
  averageMonsterLevel: 3,
  monsterSpawnConfigs: [
    { monsterId: 'math-slime', category: ZoneMonsterCategory.Weak, spawnWeight: 30, maxCount: 4 },
    { monsterId: 'book-mimic', category: ZoneMonsterCategory.Weak, spawnWeight: 30, maxCount: 4 },
    { monsterId: 'chemical-blob', category: ZoneMonsterCategory.Weak, spawnWeight: 25, maxCount: 3 },
    { monsterId: 'binary-slime', category: ZoneMonsterCategory.Weak, spawnWeight: 15, maxCount: 3 },
  ],
};

/**
 * Registry of all hunting zones by ID.
 */
export const HUNTING_ZONE_REGISTRY: Record<string, HuntingZoneDefinition> = {
  [HuntingZoneIds.MathHuntingGround]: MATH_HUNTING_ZONE,
  [HuntingZoneIds.LibraryHuntingGround]: LIBRARY_HUNTING_ZONE,
  [HuntingZoneIds.ScienceHuntingGround]: SCIENCE_HUNTING_ZONE,
  [HuntingZoneIds.TechHuntingGround]: TECH_HUNTING_ZONE,
  [HuntingZoneIds.GeneralHuntingGround]: GENERAL_BEGINNER_ZONE,
};
