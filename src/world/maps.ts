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
};
