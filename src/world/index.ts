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
} from './huntingZones';

export type { ZoneAccessCheckResult } from './zoneAccess';
export { checkZoneAccess, DANGER_WARNING_THRESHOLD_LEVEL_DELTA } from './zoneAccess';

export {
  MapIds,
  MAP_REGISTRY,
  BEGINNERS_VILLAGE,
  BEGINNERS_HUNTING_GROUND,
  MATH_BUILDING,
  SCIENCE_LAB,
  LIBRARY,
  TECH_WORKSHOP,
} from './maps';
