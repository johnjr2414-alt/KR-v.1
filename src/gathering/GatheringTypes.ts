/**
 * Gathering profession framework (Phase 27.2).
 *
 * A "profession" groups resource nodes the player can harvest (mining,
 * herbalism, woodcutting). All rules here are headless and data-driven; the
 * framework intentionally models only what the phase requires — node
 * definitions, requirements, yields, respawn timing, and inventory capacity.
 */

/** Gathering professions supported by the Phase 27.2 framework. */
export enum GatheringProfession {
  Mining = 'mining',
  Herbalism = 'herbalism',
  Woodcutting = 'woodcutting',
}

/**
 * Static configuration describing one gatherable resource node.
 * Yields reference real item ids from `src/inventory/ItemRegistry`.
 */
export interface ResourceNodeDefinition {
  /** Unique node identifier. */
  id: string;
  /** Display name shown in interaction feedback. */
  name: string;
  /** Profession this node belongs to. */
  profession: GatheringProfession;
  /** Item granted when the node is successfully gathered. */
  itemId: string;
  /** Inclusive minimum yield per successful gather. */
  yieldMin: number;
  /** Inclusive maximum yield per successful gather. */
  yieldMax: number;
  /** Minimum character level required to gather. */
  requiredLevel: number;
  /**
   * Optional tool item that must be carried to gather. Tools are modelled as
   * plain inventory items (`ItemType.Tool`); leave undefined for tool-free nodes.
   */
  requiredToolId?: string;
  /** Milliseconds before the node replenishes after a successful gather. */
  respawnMs: number;
  /** Advisory interaction range in pixels (consumed by future world UI). */
  interactionRadiusPx: number;
  /** Marks balance values as provisional / draft. */
  provisional: boolean;
}

/** Why a gather attempt could not proceed. */
export enum GatheringFailureReason {
  UnknownNode = 'unknown-node',
  LevelTooLow = 'level-too-low',
  MissingTool = 'missing-tool',
  OnCooldown = 'on-cooldown',
  InventoryFull = 'inventory-full',
}

/** Result of a non-mutating gather availability check. */
export interface GatheringCheck {
  canGather: boolean;
  reason?: GatheringFailureReason;
  /** Player-facing interaction feedback. */
  message: string;
  /** Milliseconds until the node is available again (only for OnCooldown). */
  respawnRemainingMs?: number;
}

/** Result of a gather attempt. */
export interface GatherResult {
  success: boolean;
  nodeId: string;
  /** Item granted (present only on success). */
  itemId?: string;
  /** Quantity rolled for this gather (0 when nothing was gathered). */
  quantity: number;
  /** Quantity actually stored (0 when nothing was stored). */
  addedQuantity: number;
  reason?: GatheringFailureReason;
  /** Player-facing interaction feedback. */
  message: string;
  /** Milliseconds until the node is available again (only for cooldown failures). */
  respawnRemainingMs?: number;
}

/** Persisted per-node respawn bookkeeping. */
export interface ResourceNodeState {
  nodeId: string;
  /** Timestamp (ms) of the last successful gather, or 0 when never gathered. */
  lastGatheredAt: number;
}

export const GATHERING_SNAPSHOT_VERSION = 1;

/** Optional, backward-compatible save payload for gathering state. */
export interface GatheringSnapshot {
  version: number;
  nodes: Record<string, ResourceNodeState>;
}
