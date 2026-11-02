/**
 * Zone categories that determine visual theme and gameplay rules.
 */
export enum ZoneType {
  Town = 'town',
  Building = 'building',
  HuntingGround = 'hunting-ground',
  Dungeon = 'dungeon',
  Arena = 'arena',
}

/**
 * A connection from one map to another.
 */
export interface MapConnection {
  /** ID of the destination map. */
  targetMapId: string;
  /** Pixel position of the exit trigger on this map. */
  exitPosition: { x: number; y: number };
  /** Pixel position the player spawns at in the destination map. */
  entryPosition: { x: number; y: number };
  /** Width of the exit trigger zone in pixels. */
  exitWidth: number;
  /** Height of the exit trigger zone in pixels. */
  exitHeight: number;
}

/**
 * Entry requirements for accessing a map.
 */
export interface MapEntryRequirements {
  /** Recommended minimum player level (advisory, not hard-locked). */
  recommendedMinLevel: number;
  /** Recommended maximum player level (advisory). */
  recommendedMaxLevel: number;
}

/**
 * A named obstacle or collision zone within a map.
 */
export interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A building or landmark placeholder within a map.
 */
export interface MapLandmark {
  /** Unique landmark ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Position on the map. */
  position: { x: number; y: number };
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Colour used for placeholder rendering (hex number). */
  color: number;
  /** If set, entering this landmark transitions to this map ID. */
  targetMapId?: string;
}

/**
 * Complete map definition.
 */
export interface MapDefinition {
  /** Unique map identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Zone category. */
  zoneType: ZoneType;
  /** Entry requirements (advisory level range). */
  entryRequirements: MapEntryRequirements;
  /** Map dimensions in pixels. */
  bounds: { width: number; height: number };
  /** Connections to other maps. */
  connections: MapConnection[];
  /** Buildings and landmarks. */
  landmarks: MapLandmark[];
  /** Static collision rectangles. */
  collisionRects: CollisionRect[];
}
