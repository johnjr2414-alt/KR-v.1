import type { MapDefinition } from './MapDefinition';
import { ZoneType } from './MapDefinition';

/**
 * Map IDs used throughout the game world.
 */
export const MapIds = {
  BeginnersVillage: 'beginners-village',
  MathBuilding: 'math-building',
  ScienceLab: 'science-lab',
  Library: 'library',
  TechWorkshop: 'tech-workshop',
  BeginnersHuntingGround: 'beginners-hunting-ground',
  // ── Emerald Forest (Phase 26.2) ──
  EmeraldForestOutpost: 'emerald-forest-outpost',
  VerdantGlade: 'verdant-glade',
  RunestoneGrove: 'runestone-grove',
  // ── Ironhold Kingdom (Phase 26.3) ──
  IronholdGate: 'ironhold-gate',
  ForgeDistrict: 'forge-district',
  SiegeWorks: 'siege-works',
  // ── Golden Capital (Phase 26.4) ──
  GoldenCapitalPlaza: 'golden-capital-plaza',
  TradeBazaar: 'trade-bazaar',
  CivicDistrict: 'civic-district',
  // ── Arcane Technological City (Phase 26.5) ──
  ArcaneCityPlaza: 'arcane-city-plaza',
  ManaFoundry: 'mana-foundry',
  LogicSpire: 'logic-spire',
  // ── Forgotten Lands (Phase 26.6) ──
  ForgottenCrossroads: 'forgotten-crossroads',
  AshenWastes: 'ashen-wastes',
  RuinedArchive: 'ruined-archive',
  // ── Colosseum (Phase 26.7) ──
  ColosseumGrounds: 'colosseum-grounds',
} as const;

/**
 * Beginners Village — the starting town for all new players (Levels 1–10).
 *
 * Layout (1200 × 900 pixel map):
 *
 *   ┌─────────────────────────────────────────────┐
 *   │                 Village Map                  │
 *   │                                              │
 *   │   [Math]   [Library]                         │
 *   │                          [Fountain]          │
 *   │   [Science] [Tech]                           │
 *   │                                              │
 *   │                        [Exit → Hunting]      │
 *   └─────────────────────────────────────────────┘
 */
export const BEGINNERS_VILLAGE: MapDefinition = {
  id: MapIds.BeginnersVillage,
  name: 'Beginners Village',
  zoneType: ZoneType.Town,
  entryRequirements: {
    recommendedMinLevel: 1,
    recommendedMaxLevel: 10,
  },
  bounds: { width: 1200, height: 900 },
  landmarks: [
    {
      id: 'fountain',
      name: 'Village Fountain',
      position: { x: 600, y: 400 },
      width: 64,
      height: 64,
      color: 0x4488cc,
    },
    {
      id: 'math-building',
      name: 'Mathematics Building',
      position: { x: 160, y: 200 },
      width: 120,
      height: 100,
      color: 0xcc6644,
      targetMapId: MapIds.MathBuilding,
    },
    {
      id: 'library',
      name: 'General Knowledge Library',
      position: { x: 400, y: 200 },
      width: 120,
      height: 100,
      color: 0x44aa66,
      targetMapId: MapIds.Library,
    },
    {
      id: 'science-lab',
      name: 'Science Laboratory',
      position: { x: 160, y: 500 },
      width: 120,
      height: 100,
      color: 0x6644cc,
      targetMapId: MapIds.ScienceLab,
    },
    {
      id: 'tech-workshop',
      name: 'Technology Workshop',
      position: { x: 400, y: 500 },
      width: 120,
      height: 100,
      color: 0xaaaa44,
      targetMapId: MapIds.TechWorkshop,
    },
    {
      id: 'shop',
      name: 'General Merchant',
      position: { x: 850, y: 200 },
      width: 100,
      height: 80,
      color: 0xcc9944,
    },
    {
      // Phase 27.2 — the Career Center that hosts the real-world professions
      // and enrollment system. Like the merchant, it is a village location
      // interacted with through an NPC (Career Advisor Marisol) rather than an
      // enterable hunting-zone building; its workplace definition lives in
      // `src/professions/WorkplaceRegistry.ts`.
      id: 'career-center',
      name: 'Career Center',
      position: { x: 850, y: 500 },
      width: 140,
      height: 100,
      color: 0x8b5cf6,
    },
  ],
  connections: [
    {
      targetMapId: MapIds.BeginnersHuntingGround,
      exitPosition: { x: 1150, y: 750 },
      entryPosition: { x: 50, y: 400 },
      exitWidth: 60,
      exitHeight: 100,
    },
  ],
  collisionRects: [],
};

/**
 * Beginners Hunting Ground — first outdoor combat zone.
 */
export const BEGINNERS_HUNTING_GROUND: MapDefinition = {
  id: MapIds.BeginnersHuntingGround,
  name: 'Beginners Hunting Ground',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: {
    recommendedMinLevel: 1,
    recommendedMaxLevel: 10,
  },
  bounds: { width: 1200, height: 900 },
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.BeginnersVillage,
      exitPosition: { x: 10, y: 350 },
      entryPosition: { x: 1100, y: 750 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [],
};

/**
 * Building interiors — placeholder definitions.
 */
const BUILDING_BOUNDS = { width: 600, height: 400 };

function createBuildingMap(
  id: string,
  name: string,
  returnMapId: string,
): MapDefinition {
  return {
    id,
    name,
    zoneType: ZoneType.Building,
    entryRequirements: { recommendedMinLevel: 1, recommendedMaxLevel: 10 },
    bounds: BUILDING_BOUNDS,
    landmarks: [],
    connections: [
      {
        targetMapId: returnMapId,
        exitPosition: { x: 300, y: 370 },
        entryPosition: { x: 0, y: 0 }, // resolved at runtime from landmark position
        exitWidth: 60,
        exitHeight: 30,
      },
    ],
    collisionRects: [],
  };
}

export const MATH_BUILDING = createBuildingMap(
  MapIds.MathBuilding, 'Mathematics Building', MapIds.BeginnersVillage,
);

export const SCIENCE_LAB = createBuildingMap(
  MapIds.ScienceLab, 'Science Laboratory', MapIds.BeginnersVillage,
);

export const LIBRARY = createBuildingMap(
  MapIds.Library, 'General Knowledge Library', MapIds.BeginnersVillage,
);

export const TECH_WORKSHOP = createBuildingMap(
  MapIds.TechWorkshop, 'Technology Workshop', MapIds.BeginnersVillage,
);

// ─────────────────────────────────────────────────────────────────────────────
// Emerald Forest (Phase 26.2) — a reusable region content package.
//
// The region's landing map (outpost) links to two hunting grounds. All routes
// are bidirectional and self-contained within the region; the region-to-region
// trail from Beginners Village is a world-navigation concern (Phase 26.1) and
// is intentionally not wired as a village map connection here.
//
// All values (bounds, obstacle rects, level ranges) are provisional and live in
// data so they can be tuned without touching navigation or scene logic.
// ─────────────────────────────────────────────────────────────────────────────

const EMERALD_FOREST_BOUNDS = { width: 1200, height: 900 };
const EMERALD_FOREST_LEVELS = { recommendedMinLevel: 10, recommendedMaxLevel: 20 };

/**
 * Emerald Forest Outpost — the region's landing clearing (Levels 10–20).
 *
 * Layout (1200 × 900):
 *   ┌──────────────────────────────┐
 *   │                  ┌─► Verdant Glade    (Science)
 *   │   [clearing]     │
 *   │                  └─► Runestone Grove  (Mathematics)
 *   └──────────────────────────────┘
 */
export const EMERALD_FOREST_OUTPOST: MapDefinition = {
  id: MapIds.EmeraldForestOutpost,
  name: 'Emerald Forest Outpost',
  zoneType: ZoneType.Town,
  entryRequirements: { ...EMERALD_FOREST_LEVELS },
  bounds: EMERALD_FOREST_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.VerdantGlade,
      exitPosition: { x: 1160, y: 300 },
      entryPosition: { x: 80, y: 300 },
      exitWidth: 60,
      exitHeight: 100,
    },
    {
      targetMapId: MapIds.RunestoneGrove,
      exitPosition: { x: 1160, y: 700 },
      entryPosition: { x: 80, y: 700 },
      exitWidth: 60,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 360, y: 220, width: 90, height: 70 },
    { x: 620, y: 460, width: 120, height: 80 },
    { x: 420, y: 700, width: 100, height: 70 },
    { x: 840, y: 160, width: 80, height: 60 },
  ],
};

/**
 * Verdant Glade — Emerald Forest's nature/life-science hunting ground.
 */
export const VERDANT_GLADE: MapDefinition = {
  id: MapIds.VerdantGlade,
  name: 'Verdant Glade',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...EMERALD_FOREST_LEVELS },
  bounds: EMERALD_FOREST_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.EmeraldForestOutpost,
      exitPosition: { x: 40, y: 300 },
      entryPosition: { x: 1100, y: 300 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 420, y: 260, width: 110, height: 80 },
    { x: 760, y: 380, width: 130, height: 90 },
    { x: 520, y: 680, width: 100, height: 70 },
    { x: 940, y: 720, width: 90, height: 70 },
  ],
};

/**
 * Runestone Grove — Emerald Forest's mathematics (algebra/geometry) hunting ground.
 */
export const RUNESTONE_GROVE: MapDefinition = {
  id: MapIds.RunestoneGrove,
  name: 'Runestone Grove',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...EMERALD_FOREST_LEVELS },
  bounds: EMERALD_FOREST_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.EmeraldForestOutpost,
      exitPosition: { x: 40, y: 700 },
      entryPosition: { x: 1100, y: 700 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 380, y: 340, width: 100, height: 80 },
    { x: 640, y: 200, width: 120, height: 70 },
    { x: 820, y: 560, width: 110, height: 90 },
    { x: 480, y: 760, width: 90, height: 60 },
  ],
};

/** All maps that make up the Emerald Forest region. */
export const EMERALD_FOREST_MAPS: readonly MapDefinition[] = [
  EMERALD_FOREST_OUTPOST,
  VERDANT_GLADE,
  RUNESTONE_GROVE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Ironhold Kingdom (Phase 26.3) — a reusable region content package.
//
// Built on the Phase 26.2 architecture: the region's landing map (the gate)
// links to two hunting grounds and back. All routes are bidirectional and
// self-contained within the region; the inter-region trail (Emerald Forest ↔
// Ironhold, "Mountain Pass") is a world-navigation concern and is intentionally
// not wired as a map connection here.
//
// All values (bounds, obstacle rects, level ranges) are provisional and live in
// data so they can be tuned without touching navigation or scene logic.
// ─────────────────────────────────────────────────────────────────────────────

const IRONHOLD_BOUNDS = { width: 1200, height: 900 };
const IRONHOLD_LEVELS = { recommendedMinLevel: 20, recommendedMaxLevel: 30 };

/**
 * Ironhold Gate — the region's fortified landing courtyard (Levels 20–30).
 *
 * Layout (1200 × 900):
 *   ┌──────────────────────────────┐
 *   │                  ┌─► Forge District  (Science)
 *   │   [courtyard]    │
 *   │                  └─► Siege Works     (Mathematics)
 *   └──────────────────────────────┘
 */
export const IRONHOLD_GATE: MapDefinition = {
  id: MapIds.IronholdGate,
  name: 'Ironhold Gate',
  zoneType: ZoneType.Town,
  entryRequirements: { ...IRONHOLD_LEVELS },
  bounds: IRONHOLD_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.ForgeDistrict,
      exitPosition: { x: 1160, y: 300 },
      entryPosition: { x: 80, y: 300 },
      exitWidth: 60,
      exitHeight: 100,
    },
    {
      targetMapId: MapIds.SiegeWorks,
      exitPosition: { x: 1160, y: 700 },
      entryPosition: { x: 80, y: 700 },
      exitWidth: 60,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 340, y: 200, width: 110, height: 80 },
    { x: 600, y: 440, width: 140, height: 90 },
    { x: 400, y: 700, width: 110, height: 80 },
    { x: 820, y: 150, width: 90, height: 70 },
  ],
};

/**
 * Forge District — Ironhold's engineering / physical-science hunting ground.
 */
export const FORGE_DISTRICT: MapDefinition = {
  id: MapIds.ForgeDistrict,
  name: 'Forge District',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...IRONHOLD_LEVELS },
  bounds: IRONHOLD_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.IronholdGate,
      exitPosition: { x: 40, y: 300 },
      entryPosition: { x: 1100, y: 300 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 400, y: 240, width: 130, height: 90 },
    { x: 750, y: 380, width: 140, height: 100 },
    { x: 500, y: 690, width: 120, height: 80 },
    { x: 930, y: 700, width: 100, height: 80 },
  ],
};

/**
 * Siege Works — Ironhold's mathematics (algebra/geometry) hunting ground.
 */
export const SIEGE_WORKS: MapDefinition = {
  id: MapIds.SiegeWorks,
  name: 'Siege Works',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...IRONHOLD_LEVELS },
  bounds: IRONHOLD_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.IronholdGate,
      exitPosition: { x: 40, y: 700 },
      entryPosition: { x: 1100, y: 700 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 360, y: 320, width: 120, height: 90 },
    { x: 630, y: 180, width: 130, height: 80 },
    { x: 800, y: 560, width: 120, height: 100 },
    { x: 470, y: 760, width: 100, height: 70 },
  ],
};

/** All maps that make up the Ironhold Kingdom region. */
export const IRONHOLD_MAPS: readonly MapDefinition[] = [
  IRONHOLD_GATE,
  FORGE_DISTRICT,
  SIEGE_WORKS,
];

// ─────────────────────────────────────────────────────────────────────────────
// Golden Capital (Phase 26.4) — a reusable region content package.
//
// Built on the same data-driven architecture as Emerald Forest (26.2) and
// Ironhold Kingdom (26.3): the region's landing map (the plaza) links to two
// hunting grounds and back. All routes are bidirectional and self-contained
// within the region; the inter-region road (Ironhold ↔ Golden Capital,
// "King's Road") is a world-navigation concern and is intentionally not wired
// as a map connection here.
//
// All values (bounds, obstacle rects, level ranges) are provisional and live in
// data so they can be tuned without touching navigation or scene logic.
// ─────────────────────────────────────────────────────────────────────────────

const GOLDEN_CAPITAL_BOUNDS = { width: 1200, height: 900 };
const GOLDEN_CAPITAL_LEVELS = { recommendedMinLevel: 30, recommendedMaxLevel: 40 };

/**
 * Golden Capital Plaza — the region's grand landing square (Levels 30–40).
 *
 * Layout (1200 × 900):
 *   ┌──────────────────────────────┐
 *   │                  ┌─► Trade Bazaar   (Mathematics)
 *   │   [plaza]        │
 *   │                  └─► Civic District (Science)
 *   └──────────────────────────────┘
 */
export const GOLDEN_CAPITAL_PLAZA: MapDefinition = {
  id: MapIds.GoldenCapitalPlaza,
  name: 'Golden Capital Plaza',
  zoneType: ZoneType.Town,
  entryRequirements: { ...GOLDEN_CAPITAL_LEVELS },
  bounds: GOLDEN_CAPITAL_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.TradeBazaar,
      exitPosition: { x: 1160, y: 300 },
      entryPosition: { x: 80, y: 300 },
      exitWidth: 60,
      exitHeight: 100,
    },
    {
      targetMapId: MapIds.CivicDistrict,
      exitPosition: { x: 1160, y: 700 },
      entryPosition: { x: 80, y: 700 },
      exitWidth: 60,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 430, y: 230, width: 130, height: 90 },
    { x: 620, y: 450, width: 150, height: 100 },
    { x: 400, y: 690, width: 120, height: 80 },
    { x: 850, y: 160, width: 100, height: 80 },
  ],
};

/**
 * Trade Bazaar — Golden Capital's commerce/mathematics hunting ground.
 */
export const TRADE_BAZAAR: MapDefinition = {
  id: MapIds.TradeBazaar,
  name: 'Trade Bazaar',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...GOLDEN_CAPITAL_LEVELS },
  bounds: GOLDEN_CAPITAL_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.GoldenCapitalPlaza,
      exitPosition: { x: 40, y: 300 },
      entryPosition: { x: 1100, y: 300 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 390, y: 250, width: 130, height: 90 },
    { x: 740, y: 380, width: 150, height: 100 },
    { x: 500, y: 700, width: 120, height: 80 },
    { x: 920, y: 690, width: 110, height: 90 },
  ],
};

/**
 * Civic District — Golden Capital's civic/public-science hunting ground.
 */
export const CIVIC_DISTRICT: MapDefinition = {
  id: MapIds.CivicDistrict,
  name: 'Civic District',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...GOLDEN_CAPITAL_LEVELS },
  bounds: GOLDEN_CAPITAL_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.GoldenCapitalPlaza,
      exitPosition: { x: 40, y: 700 },
      entryPosition: { x: 1100, y: 700 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 370, y: 320, width: 130, height: 100 },
    { x: 650, y: 190, width: 140, height: 80 },
    { x: 810, y: 560, width: 130, height: 100 },
    { x: 470, y: 770, width: 110, height: 70 },
  ],
};

/** All maps that make up the Golden Capital region. */
export const GOLDEN_CAPITAL_MAPS: readonly MapDefinition[] = [
  GOLDEN_CAPITAL_PLAZA,
  TRADE_BAZAAR,
  CIVIC_DISTRICT,
];

// ─────────────────────────────────────────────────────────────────────────────
// Arcane Technological City (Phase 26.5) — a reusable region content package.
//
// Built on the same data-driven architecture as Phases 26.2–26.4: the region's
// landing map (the plaza) links to two hunting grounds and back. Its theme
// combines science and technology, but it introduces no new educational
// subjects — only Mathematics and Science (the subjects with Junior High
// content) are used, so encounters resolve to real material.
//
// All routes are bidirectional and self-contained within the region; the
// inter-region road (Golden Capital ↔ Arcane City, "Arcane Highway") is a
// world-navigation concern and is intentionally not wired as a map connection
// here. All values are provisional and live in data.
// ─────────────────────────────────────────────────────────────────────────────

const ARCANE_CITY_BOUNDS = { width: 1200, height: 900 };
const ARCANE_CITY_LEVELS = { recommendedMinLevel: 40, recommendedMaxLevel: 50 };

/**
 * Arcane City Plaza — the region's magitech landing concourse (Levels 40–50).
 *
 * Layout (1200 × 900):
 *   ┌──────────────────────────────┐
 *   │                  ┌─► Mana Foundry (Science)
 *   │   [concourse]    │
 *   │                  └─► Logic Spire  (Mathematics)
 *   └──────────────────────────────┘
 */
export const ARCANE_CITY_PLAZA: MapDefinition = {
  id: MapIds.ArcaneCityPlaza,
  name: 'Arcane City Plaza',
  zoneType: ZoneType.Town,
  entryRequirements: { ...ARCANE_CITY_LEVELS },
  bounds: ARCANE_CITY_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.ManaFoundry,
      exitPosition: { x: 1160, y: 300 },
      entryPosition: { x: 80, y: 300 },
      exitWidth: 60,
      exitHeight: 100,
    },
    {
      targetMapId: MapIds.LogicSpire,
      exitPosition: { x: 1160, y: 700 },
      entryPosition: { x: 80, y: 700 },
      exitWidth: 60,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 440, y: 220, width: 140, height: 90 },
    { x: 610, y: 460, width: 150, height: 110 },
    { x: 410, y: 700, width: 120, height: 80 },
    { x: 860, y: 170, width: 110, height: 80 },
  ],
};

/**
 * Mana Foundry — Arcane City's arcane-machinery / energy-science hunting ground.
 */
export const MANA_FOUNDRY: MapDefinition = {
  id: MapIds.ManaFoundry,
  name: 'Mana Foundry',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...ARCANE_CITY_LEVELS },
  bounds: ARCANE_CITY_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.ArcaneCityPlaza,
      exitPosition: { x: 40, y: 300 },
      entryPosition: { x: 1100, y: 300 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 400, y: 240, width: 140, height: 100 },
    { x: 750, y: 390, width: 150, height: 100 },
    { x: 510, y: 710, width: 130, height: 80 },
    { x: 930, y: 680, width: 110, height: 90 },
  ],
};

/**
 * Logic Spire — Arcane City's computational-logic / mathematics hunting ground.
 */
export const LOGIC_SPIRE: MapDefinition = {
  id: MapIds.LogicSpire,
  name: 'Logic Spire',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...ARCANE_CITY_LEVELS },
  bounds: ARCANE_CITY_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.ArcaneCityPlaza,
      exitPosition: { x: 40, y: 700 },
      entryPosition: { x: 1100, y: 700 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 380, y: 320, width: 130, height: 100 },
    { x: 660, y: 180, width: 140, height: 80 },
    { x: 820, y: 560, width: 130, height: 110 },
    { x: 460, y: 770, width: 120, height: 70 },
  ],
};

/** All maps that make up the Arcane Technological City region. */
export const ARCANE_CITY_MAPS: readonly MapDefinition[] = [
  ARCANE_CITY_PLAZA,
  MANA_FOUNDRY,
  LOGIC_SPIRE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Forgotten Lands (Phase 26.6) — the realm's hardest endgame wilds.
//
// The region (Levels 50–60) intentionally reaches across the Junior High →
// Senior High educational boundary (character level 50/51). Encounter tiers are
// derived from monster level and resolved through the EXISTING higher-level PvE
// difficulty-jump rules and question-pool fallback protections (see
// `DifficultyEngine`); this region adds no new difficulty rules and does not
// bypass those protections. Monster levels are capped at the region maximum so
// the level delta — and therefore the tier jump — stays bounded (+1 tier at
// most from the region's recommended minimum), never producing an unbounded or
// impossible challenge.
//
// All routes are bidirectional and self-contained within the region; the
// inter-region gates (Arcane City "Rift Gate", Colosseum "Champion's Gate") are
// world-navigation concerns and are intentionally not wired as map connections.
// All values are provisional and live in data.
// ─────────────────────────────────────────────────────────────────────────────

const FORGOTTEN_LANDS_BOUNDS = { width: 1200, height: 900 };
const FORGOTTEN_LANDS_LEVELS = { recommendedMinLevel: 50, recommendedMaxLevel: 60 };

/**
 * Forgotten Crossroads — the region's ruined landing waypoint (Levels 50–60).
 *
 * Layout (1200 × 900):
 *   ┌──────────────────────────────┐
 *   │                  ┌─► Ashen Wastes   (Science)
 *   │   [crossroads]   │
 *   │                  └─► Ruined Archive (Mathematics)
 *   └──────────────────────────────┘
 */
export const FORGOTTEN_CROSSROADS: MapDefinition = {
  id: MapIds.ForgottenCrossroads,
  name: 'Forgotten Crossroads',
  zoneType: ZoneType.Town,
  entryRequirements: { ...FORGOTTEN_LANDS_LEVELS },
  bounds: FORGOTTEN_LANDS_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.AshenWastes,
      exitPosition: { x: 1160, y: 300 },
      entryPosition: { x: 80, y: 300 },
      exitWidth: 60,
      exitHeight: 100,
    },
    {
      targetMapId: MapIds.RuinedArchive,
      exitPosition: { x: 1160, y: 700 },
      entryPosition: { x: 80, y: 700 },
      exitWidth: 60,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 430, y: 240, width: 130, height: 90 },
    { x: 620, y: 440, width: 150, height: 110 },
    { x: 400, y: 690, width: 120, height: 80 },
    { x: 870, y: 180, width: 110, height: 80 },
  ],
};

/**
 * Ashen Wastes — Forgotten Lands' decayed-wilderness / science hunting ground.
 */
export const ASHEN_WASTES: MapDefinition = {
  id: MapIds.AshenWastes,
  name: 'Ashen Wastes',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...FORGOTTEN_LANDS_LEVELS },
  bounds: FORGOTTEN_LANDS_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.ForgottenCrossroads,
      exitPosition: { x: 40, y: 300 },
      entryPosition: { x: 1100, y: 300 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 390, y: 250, width: 140, height: 100 },
    { x: 740, y: 400, width: 150, height: 100 },
    { x: 500, y: 710, width: 130, height: 80 },
    { x: 920, y: 680, width: 120, height: 90 },
  ],
};

/**
 * Ruined Archive — Forgotten Lands' collapsed-archive / mathematics hunting ground.
 */
export const RUINED_ARCHIVE: MapDefinition = {
  id: MapIds.RuinedArchive,
  name: 'Ruined Archive',
  zoneType: ZoneType.HuntingGround,
  entryRequirements: { ...FORGOTTEN_LANDS_LEVELS },
  bounds: FORGOTTEN_LANDS_BOUNDS,
  landmarks: [],
  connections: [
    {
      targetMapId: MapIds.ForgottenCrossroads,
      exitPosition: { x: 40, y: 700 },
      entryPosition: { x: 1100, y: 700 },
      exitWidth: 40,
      exitHeight: 100,
    },
  ],
  collisionRects: [
    { x: 380, y: 320, width: 130, height: 100 },
    { x: 660, y: 190, width: 140, height: 80 },
    { x: 820, y: 560, width: 130, height: 110 },
    { x: 460, y: 760, width: 120, height: 70 },
  ],
};

/** All maps that make up the Forgotten Lands region. */
export const FORGOTTEN_LANDS_MAPS: readonly MapDefinition[] = [
  FORGOTTEN_CROSSROADS,
  ASHEN_WASTES,
  RUINED_ARCHIVE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Colosseum (Phase 26.7) — the endgame Challenge Arena.
//
// Unlike the wilderness regions, the Colosseum is a single Arena-type map that
// hosts the headless single-player Challenge Arena (see `src/arena/challenge`).
// It has no hunting-ground connections: challenge modes are entered through the
// challenge system, not by walking into a zone. The inter-region gate
// (Forgotten Lands "Champion's Gate") is a world-navigation concern and is
// intentionally not wired as a map connection. Values are provisional.
// ─────────────────────────────────────────────────────────────────────────────

const COLOSSEUM_BOUNDS = { width: 1200, height: 900 };
const COLOSSEUM_LEVELS = { recommendedMinLevel: 60, recommendedMaxLevel: 70 };

/**
 * Colosseum Grounds — the endgame arena floor (Levels 60+).
 *
 * Layout (1200 × 900):
 *   ┌──────────────────────────────┐
 *   │        [sands of the         │
 *   │         Colosseum]           │
 *   │   [Grand Champion statue]    │
 *   └──────────────────────────────┘
 */
export const COLOSSEUM_GROUNDS: MapDefinition = {
  id: MapIds.ColosseumGrounds,
  name: 'Colosseum Grounds',
  zoneType: ZoneType.Arena,
  entryRequirements: { ...COLOSSEUM_LEVELS },
  bounds: COLOSSEUM_BOUNDS,
  landmarks: [],
  connections: [],
  collisionRects: [
    { x: 300, y: 250, width: 140, height: 100 },
    { x: 720, y: 250, width: 140, height: 100 },
    { x: 480, y: 560, width: 240, height: 40 },
  ],
};

/** All maps that make up the Colosseum region. */
export const COLOSSEUM_MAPS: readonly MapDefinition[] = [
  COLOSSEUM_GROUNDS,
];

/**
 * Registry of all maps by ID for quick lookup.
 */
export const MAP_REGISTRY: Record<string, MapDefinition> = {
  [MapIds.BeginnersVillage]: BEGINNERS_VILLAGE,
  [MapIds.BeginnersHuntingGround]: BEGINNERS_HUNTING_GROUND,
  [MapIds.MathBuilding]: MATH_BUILDING,
  [MapIds.ScienceLab]: SCIENCE_LAB,
  [MapIds.Library]: LIBRARY,
  [MapIds.TechWorkshop]: TECH_WORKSHOP,
  [MapIds.EmeraldForestOutpost]: EMERALD_FOREST_OUTPOST,
  [MapIds.VerdantGlade]: VERDANT_GLADE,
  [MapIds.RunestoneGrove]: RUNESTONE_GROVE,
  [MapIds.IronholdGate]: IRONHOLD_GATE,
  [MapIds.ForgeDistrict]: FORGE_DISTRICT,
  [MapIds.SiegeWorks]: SIEGE_WORKS,
  [MapIds.GoldenCapitalPlaza]: GOLDEN_CAPITAL_PLAZA,
  [MapIds.TradeBazaar]: TRADE_BAZAAR,
  [MapIds.CivicDistrict]: CIVIC_DISTRICT,
  [MapIds.ArcaneCityPlaza]: ARCANE_CITY_PLAZA,
  [MapIds.ManaFoundry]: MANA_FOUNDRY,
  [MapIds.LogicSpire]: LOGIC_SPIRE,
  [MapIds.ForgottenCrossroads]: FORGOTTEN_CROSSROADS,
  [MapIds.AshenWastes]: ASHEN_WASTES,
  [MapIds.RuinedArchive]: RUINED_ARCHIVE,
  [MapIds.ColosseumGrounds]: COLOSSEUM_GROUNDS,
};
