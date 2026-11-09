export type {
  MapDefinition,
  MapConnection,
  MapEntryRequirements,
  MapLandmark,
  CollisionRect,
} from './MapDefinition';
export { ZoneType } from './MapDefinition';

export type { BuildingDefinition } from './BuildingDefinition';
export {
  BuildingIds,
  HuntingZoneIds,
  BUILDING_REGISTRY,
  MATH_BUILDING_DEF,
  LIBRARY_DEF,
  SCIENCE_LAB_DEF,
  TECH_WORKSHOP_DEF,
} from './buildings';

export type { HuntingZoneDefinition, MonsterSpawnConfig } from './HuntingZoneDefinition';
export { ZoneMonsterCategory, ZoneDangerLevel, calculateZoneDanger } from './HuntingZoneDefinition';

export {
  HUNTING_ZONE_REGISTRY,
  MATH_HUNTING_ZONE,
  LIBRARY_HUNTING_ZONE,
  SCIENCE_HUNTING_ZONE,
  TECH_HUNTING_ZONE,
  GENERAL_BEGINNER_ZONE,
  VERDANT_GLADE_ZONE,
  RUNESTONE_GROVE_ZONE,
  EMERALD_FOREST_ZONES,
  FORGE_DISTRICT_ZONE,
  SIEGE_WORKS_ZONE,
  IRONHOLD_ZONES,
  TRADE_BAZAAR_ZONE,
  CIVIC_DISTRICT_ZONE,
  GOLDEN_CAPITAL_ZONES,
  MANA_FOUNDRY_ZONE,
  LOGIC_SPIRE_ZONE,
  ARCANE_CITY_ZONES,
  ASHEN_WASTES_ZONE,
  RUINED_ARCHIVE_ZONE,
  FORGOTTEN_LANDS_ZONES,
} from './huntingZones';

export type { ZoneAccessCheckResult } from './zoneAccess';
export { checkZoneAccess, DANGER_WARNING_THRESHOLD_LEVEL_DELTA } from './zoneAccess';

export type {
  RegionId,
  RegionUnlockRequirement,
  RegionTravelPoint,
  RegionDefinition,
} from './RegionDefinition';
export { RegionIds, RegionAccessState } from './RegionDefinition';

export { WORLD_REGIONS, REGION_REGISTRY, STARTING_REGION_ID } from './regions';

export type {
  RegionAccessOptions,
  RegionAccessResult,
  RegionGraphValidation,
} from './regionAccess';
export {
  isRegionUnlockSatisfied,
  deriveDiscoveredRegions,
  evaluateAllRegionAccess,
  validateRegionGraph,
} from './regionAccess';

export {
  MapIds,
  MAP_REGISTRY,
  BEGINNERS_VILLAGE,
  BEGINNERS_HUNTING_GROUND,
  MATH_BUILDING,
  SCIENCE_LAB,
  LIBRARY,
  TECH_WORKSHOP,
  EMERALD_FOREST_OUTPOST,
  VERDANT_GLADE,
  RUNESTONE_GROVE,
  EMERALD_FOREST_MAPS,
  IRONHOLD_GATE,
  FORGE_DISTRICT,
  SIEGE_WORKS,
  IRONHOLD_MAPS,
  GOLDEN_CAPITAL_PLAZA,
  TRADE_BAZAAR,
  CIVIC_DISTRICT,
  GOLDEN_CAPITAL_MAPS,
  ARCANE_CITY_PLAZA,
  MANA_FOUNDRY,
  LOGIC_SPIRE,
  ARCANE_CITY_MAPS,
  FORGOTTEN_CROSSROADS,
  ASHEN_WASTES,
  RUINED_ARCHIVE,
  FORGOTTEN_LANDS_MAPS,
  COLOSSEUM_GROUNDS,
  COLOSSEUM_MAPS,
} from './maps';

export type {
  MapGraphValidation,
  MapGraphValidationOptions,
} from './mapGraph';
export { validateMapGraph } from './mapGraph';
