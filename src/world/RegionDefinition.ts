/**
 * Region-level world model types.
 *
 * A *region* is a top-level world area (e.g. "Emerald Forest") that may contain
 * many maps. Regions are the unit of world navigation and unlocking, and are
 * deliberately separate from:
 *  - {@link ../world/MapDefinition} — individual maps/rooms inside a region.
 *  - `zoneAccess` — the risk-based **entry** warning for higher-level zones,
 *    which remains a non-blocking advisory and is not replaced by region
 *    unlocking.
 *
 * Everything here is data-driven and headless (no Phaser/DOM imports) so the
 * navigation rules stay independent of rendering.
 */

/** Canonical region identifiers, in world order. */
export const RegionIds = {
  BeginnersVillage: 'beginners-village',
  EmeraldForest: 'emerald-forest',
  IronholdKingdom: 'ironhold-kingdom',
  GoldenCapital: 'golden-capital',
  ArcaneTechnologicalCity: 'arcane-technological-city',
  ForgottenLands: 'forgotten-lands',
  Colosseum: 'colosseum',
} as const;

/** Union of all valid region identifier strings. */
export type RegionId = (typeof RegionIds)[keyof typeof RegionIds];

/**
 * Availability of a region to a particular player.
 *
 * - `locked`    — not yet accessible: the region is undiscovered, or the hard
 *                 unlock requirement is not satisfied.
 * - `unlocked`  — the region is open (requirements satisfied) but the player is
 *                 not currently adjacent to it, so it cannot be entered right
 *                 now.
 * - `available` — the region is open *and* can be entered right now (the player
 *                 is in it, or it is directly connected to the current region
 *                 through a valid travel point).
 */
export enum RegionAccessState {
  Locked = 'locked',
  Unlocked = 'unlocked',
  Available = 'available',
}

/**
 * Hard, configuration-driven unlock requirement for a region.
 *
 * The numeric values are **draft placeholders** pending approval — they are
 * kept in configuration precisely so they can be changed without touching the
 * navigation logic.
 */
export interface RegionUnlockRequirement {
  /**
   * Minimum character level required to unlock the region.
   * `null` means "undecided / no level gate" and never blocks entry.
   */
  minLevel: number | null;
  /**
   * When true, the region must also be discovered before it can be entered.
   * Discovery is derived from the world graph (see `deriveDiscoveredRegions`)
   * and is not persisted.
   */
  requiresDiscovery: boolean;
}

/** A direct travel route from one region to another. */
export interface RegionTravelPoint {
  /** Destination region ID. */
  targetRegionId: string;
  /** Short human-readable label for the route, e.g. "Forest Trail". */
  label: string;
}

/** Complete, data-driven definition of a world region. */
export interface RegionDefinition {
  /** Unique region identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** One-line theme/description for the world map. */
  description: string;
  /** Display order on the world map (ascending). */
  order: number;
  /**
   * Advisory recommended player level range. This is **never** used to lock
   * entry — it only informs the player. It is deliberately distinct from
   * `unlock.minLevel`.
   */
  recommendedLevel: { min: number | null; max: number | null };
  /** Hard unlock requirement. */
  unlock: RegionUnlockRequirement;
  /** Direct travel routes. Return travel is implicit (routes are bidirectional). */
  travelPoints: RegionTravelPoint[];
  /** Map IDs that belong to this region (may be empty for future content). */
  mapIds: string[];
  /** True while the numeric values here are provisional drafts awaiting approval. */
  provisional: boolean;
}
