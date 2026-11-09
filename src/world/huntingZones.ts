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

// ─────────────────────────────────────────────────────────────────────────────
// Emerald Forest (Phase 26.2) — region hunting zones (Levels 10–20).
//
// Both zones sit in the Junior High educational tier (character level 11–50),
// whose subject content already exists in the bundled question bank. Subject /
// tier profiles are derived from monster level; the `educationalTier` field
// records the intended baseline and is verified against the monster levels in
// the Phase 26.2 test suite. Values are provisional.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verdant Glade — nature / life-science zone (Sporeling, Thornback Beast, Ancient Treant).
 */
export const VERDANT_GLADE_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.VerdantGlade,
  name: 'Verdant Glade',
  subject: SubjectId.Science,
  educationalTier: EducationalTier.JuniorHigh,
  recommendedMinLevel: 10,
  recommendedMaxLevel: 20,
  averageMonsterLevel: 13,
  monsterSpawnConfigs: [
    { monsterId: 'sporeling', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'thornback-beast', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'ancient-treant', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/**
 * Runestone Grove — mathematics (algebra/geometry) zone (Rune Keeper, Glyph Hound, Stone Warden).
 */
export const RUNESTONE_GROVE_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.RunestoneGrove,
  name: 'Runestone Grove',
  subject: SubjectId.Mathematics,
  educationalTier: EducationalTier.JuniorHigh,
  recommendedMinLevel: 10,
  recommendedMaxLevel: 20,
  averageMonsterLevel: 13,
  monsterSpawnConfigs: [
    { monsterId: 'rune-keeper', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'glyph-hound', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'stone-warden', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/** All hunting zones that belong to the Emerald Forest region. */
export const EMERALD_FOREST_ZONES: readonly HuntingZoneDefinition[] = [
  VERDANT_GLADE_ZONE,
  RUNESTONE_GROVE_ZONE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Ironhold Kingdom (Phase 26.3) — region hunting zones (Levels 20–30).
//
// Both zones sit in the Junior High educational tier (character level 11–50),
// whose subject content already exists in the bundled question bank. Subject /
// tier profiles are derived from monster level; the `educationalTier` field
// records the intended baseline and is verified against the monster levels in
// the Phase 26.3 test suite. Values are provisional.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Forge District — engineering / physical-science zone (Cinder Imp, Magma Hound, Iron Golem).
 */
export const FORGE_DISTRICT_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.ForgeDistrict,
  name: 'Forge District',
  subject: SubjectId.Science,
  educationalTier: EducationalTier.JuniorHigh,
  recommendedMinLevel: 20,
  recommendedMaxLevel: 30,
  averageMonsterLevel: 23,
  monsterSpawnConfigs: [
    { monsterId: 'cinder-imp', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'magma-hound', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'iron-golem', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/**
 * Siege Works — mathematics (algebra/geometry) zone (Pivot Sentry, Angle Knight, Bastion Warden).
 */
export const SIEGE_WORKS_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.SiegeWorks,
  name: 'Siege Works',
  subject: SubjectId.Mathematics,
  educationalTier: EducationalTier.JuniorHigh,
  recommendedMinLevel: 20,
  recommendedMaxLevel: 30,
  averageMonsterLevel: 23,
  monsterSpawnConfigs: [
    { monsterId: 'pivot-sentry', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'angle-knight', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'bastion-warden', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/** All hunting zones that belong to the Ironhold Kingdom region. */
export const IRONHOLD_ZONES: readonly HuntingZoneDefinition[] = [
  FORGE_DISTRICT_ZONE,
  SIEGE_WORKS_ZONE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Golden Capital (Phase 26.4) — region hunting zones (Levels 30–40).
//
// Both zones sit in the Junior High educational tier (character level 11–50),
// whose subject content already exists in the bundled question bank. Subject /
// tier profiles are derived from monster level; the `educationalTier` field
// records the intended baseline and is verified against the monster levels in
// the Phase 26.4 test suite. Values are provisional.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trade Bazaar — commerce/mathematics zone (Coin Courier, Ledger Golem, Vault Sentinel).
 */
export const TRADE_BAZAAR_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.TradeBazaar,
  name: 'Trade Bazaar',
  subject: SubjectId.Mathematics,
  educationalTier: EducationalTier.JuniorHigh,
  recommendedMinLevel: 30,
  recommendedMaxLevel: 40,
  averageMonsterLevel: 33,
  monsterSpawnConfigs: [
    { monsterId: 'coin-courier', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'ledger-golem', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'vault-sentinel', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/**
 * Civic District — civic/public-science zone (Miasma Wisp, Clockwork Beetle, Aether Engine).
 */
export const CIVIC_DISTRICT_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.CivicDistrict,
  name: 'Civic District',
  subject: SubjectId.Science,
  educationalTier: EducationalTier.JuniorHigh,
  recommendedMinLevel: 30,
  recommendedMaxLevel: 40,
  averageMonsterLevel: 33,
  monsterSpawnConfigs: [
    { monsterId: 'miasma-wisp', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'clockwork-beetle', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'aether-engine', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/** All hunting zones that belong to the Golden Capital region. */
export const GOLDEN_CAPITAL_ZONES: readonly HuntingZoneDefinition[] = [
  TRADE_BAZAAR_ZONE,
  CIVIC_DISTRICT_ZONE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Arcane Technological City (Phase 26.5) — region hunting zones (Levels 40–50).
//
// Its theme combines science and technology, but no new educational subjects
// are introduced: both zones use Mathematics / Science (the subjects with
// Junior High content). Both sit in the Junior High educational tier (character
// level 11–50), whose subject content already exists in the bundled question
// bank. Subject / tier profiles are derived from monster level; the
// `educationalTier` field records the intended baseline and is verified against
// the monster levels in the Phase 26.5 test suite. Values are provisional.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mana Foundry — arcane-machinery / energy-science zone (Arc Spark, Mana Automaton, Techno Golem).
 */
export const MANA_FOUNDRY_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.ManaFoundry,
  name: 'Mana Foundry',
  subject: SubjectId.Science,
  educationalTier: EducationalTier.JuniorHigh,
  recommendedMinLevel: 40,
  recommendedMaxLevel: 50,
  averageMonsterLevel: 43,
  monsterSpawnConfigs: [
    { monsterId: 'arc-spark', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'mana-automaton', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'techno-golem', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/**
 * Logic Spire — computational-logic / mathematics zone (Cipher Drone, Algorithm Hound, Qubit Warden).
 */
export const LOGIC_SPIRE_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.LogicSpire,
  name: 'Logic Spire',
  subject: SubjectId.Mathematics,
  educationalTier: EducationalTier.JuniorHigh,
  recommendedMinLevel: 40,
  recommendedMaxLevel: 50,
  averageMonsterLevel: 43,
  monsterSpawnConfigs: [
    { monsterId: 'cipher-drone', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'algorithm-hound', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'qubit-warden', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/** All hunting zones that belong to the Arcane Technological City region. */
export const ARCANE_CITY_ZONES: readonly HuntingZoneDefinition[] = [
  MANA_FOUNDRY_ZONE,
  LOGIC_SPIRE_ZONE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Forgotten Lands (Phase 26.6) — the realm's hardest zones (Levels 50–60).
//
// These zones deliberately straddle the Junior High → Senior High boundary
// (character level 50/51): their weak monsters have a Junior High baseline tier
// while their normal/strong monsters have a Senior High baseline tier. Senior
// High has no bundled content yet, so encounters resolve through the EXISTING
// question-pool fallback protections — this region neither adds new difficulty
// rules nor bypasses those protections. Monster levels are capped at the zone
// maximum (60) so that, from the zone's recommended minimum (50), the level
// delta and resulting tier jump stay bounded. Values are provisional.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ashen Wastes — decayed-wilderness / science zone (Ash Stalker, Blight Horror, Ruin Colossus).
 */
export const ASHEN_WASTES_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.AshenWastes,
  name: 'Ashen Wastes',
  subject: SubjectId.Science,
  educationalTier: EducationalTier.SeniorHigh,
  recommendedMinLevel: 50,
  recommendedMaxLevel: 60,
  averageMonsterLevel: 55,
  monsterSpawnConfigs: [
    { monsterId: 'ash-stalker', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'blight-horror', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'ruin-colossus', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/**
 * Ruined Archive — collapsed-archive / mathematics zone (Crumbling Sentry, Fractured Golem, Fallen Warden).
 */
export const RUINED_ARCHIVE_ZONE: HuntingZoneDefinition = {
  id: HuntingZoneIds.RuinedArchive,
  name: 'Ruined Archive',
  subject: SubjectId.Mathematics,
  educationalTier: EducationalTier.SeniorHigh,
  recommendedMinLevel: 50,
  recommendedMaxLevel: 60,
  averageMonsterLevel: 55,
  monsterSpawnConfigs: [
    { monsterId: 'crumbling-sentry', category: ZoneMonsterCategory.Weak, spawnWeight: 50, maxCount: 5 },
    { monsterId: 'fractured-golem', category: ZoneMonsterCategory.Normal, spawnWeight: 35, maxCount: 3 },
    { monsterId: 'fallen-warden', category: ZoneMonsterCategory.Strong, spawnWeight: 15, maxCount: 2 },
  ],
};

/** All hunting zones that belong to the Forgotten Lands region. */
export const FORGOTTEN_LANDS_ZONES: readonly HuntingZoneDefinition[] = [
  ASHEN_WASTES_ZONE,
  RUINED_ARCHIVE_ZONE,
];

/**
 * Registry of all hunting zones by ID.
 */
export const HUNTING_ZONE_REGISTRY: Record<string, HuntingZoneDefinition> = {
  [HuntingZoneIds.MathHuntingGround]: MATH_HUNTING_ZONE,
  [HuntingZoneIds.LibraryHuntingGround]: LIBRARY_HUNTING_ZONE,
  [HuntingZoneIds.ScienceHuntingGround]: SCIENCE_HUNTING_ZONE,
  [HuntingZoneIds.TechHuntingGround]: TECH_HUNTING_ZONE,
  [HuntingZoneIds.GeneralHuntingGround]: GENERAL_BEGINNER_ZONE,
  [HuntingZoneIds.VerdantGlade]: VERDANT_GLADE_ZONE,
  [HuntingZoneIds.RunestoneGrove]: RUNESTONE_GROVE_ZONE,
  [HuntingZoneIds.ForgeDistrict]: FORGE_DISTRICT_ZONE,
  [HuntingZoneIds.SiegeWorks]: SIEGE_WORKS_ZONE,
  [HuntingZoneIds.TradeBazaar]: TRADE_BAZAAR_ZONE,
  [HuntingZoneIds.CivicDistrict]: CIVIC_DISTRICT_ZONE,
  [HuntingZoneIds.ManaFoundry]: MANA_FOUNDRY_ZONE,
  [HuntingZoneIds.LogicSpire]: LOGIC_SPIRE_ZONE,
  [HuntingZoneIds.AshenWastes]: ASHEN_WASTES_ZONE,
  [HuntingZoneIds.RuinedArchive]: RUINED_ARCHIVE_ZONE,
};
