import { getItemDefinition } from '../inventory/ItemRegistry';
import type { InventoryManager } from '../inventory/InventoryManager';
import {
  GATHERING_SNAPSHOT_VERSION,
  GatheringFailureReason,
  GatheringProfession,
  type GatherResult,
  type GatheringCheck,
  type GatheringSnapshot,
  type ResourceNodeDefinition,
  type ResourceNodeState,
} from './GatheringTypes';
import { GATHERING_NODE_DEFINITIONS } from './GatheringRegistry';

export interface GatheringServiceOptions {
  /** Node catalogue. Defaults to the full {@link GATHERING_NODE_DEFINITIONS}. */
  nodes?: readonly ResourceNodeDefinition[];
  /** Clock used for respawn timing. Injectable for deterministic tests. */
  now?: () => number;
  /** Random source (0..1) for yield rolls. Injectable for deterministic tests. */
  random?: () => number;
}

/**
 * Headless gathering service (Phase 27.2).
 *
 * Validates a gather attempt against the node's requirements (level, optional
 * tool), its respawn cooldown, and available inventory capacity. A successful
 * gather is atomic: the node is consumed (its cooldown starts) only when the
 * full rolled yield has been stored — a failed gather never partially consumes
 * a node or items. Repeated input is naturally rejected by the respawn cooldown.
 */
export class GatheringService {
  private readonly nodes: Map<string, ResourceNodeDefinition>;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly nodeStates = new Map<string, ResourceNodeState>();
  private readonly inFlight = new Set<string>();

  constructor(options: GatheringServiceOptions = {}) {
    const definitions = options.nodes ?? GATHERING_NODE_DEFINITIONS;
    this.nodes = new Map(definitions.map((node) => [node.id, node]));
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? Math.random;
    for (const node of definitions) {
      this.nodeStates.set(node.id, { nodeId: node.id, lastGatheredAt: 0 });
    }
  }

  /** Returns a node definition, or `undefined` when unknown. */
  getNode(nodeId: string): ResourceNodeDefinition | undefined {
    return this.nodes.get(nodeId);
  }

  /** Returns every registered node definition. */
  getNodes(): ResourceNodeDefinition[] {
    return [...this.nodes.values()];
  }

  /** Returns every node belonging to a profession. */
  getNodesForProfession(profession: GatheringProfession): ResourceNodeDefinition[] {
    return [...this.nodes.values()].filter((node) => node.profession === profession);
  }

  /** Milliseconds until `nodeId` can be gathered again (0 when ready). */
  getRespawnRemainingMs(nodeId: string, now = this.now()): number {
    const node = this.nodes.get(nodeId);
    const state = this.nodeStates.get(nodeId);
    if (!node || !state || state.lastGatheredAt <= 0) return 0;
    const elapsed = now - state.lastGatheredAt;
    return Math.max(0, node.respawnMs - elapsed);
  }

  /**
   * Non-mutating availability check. Used for interaction prompts and as the
   * shared precondition for {@link gather}.
   */
  canGather(nodeId: string, inventory: InventoryManager, playerLevel: number): GatheringCheck {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return {
        canGather: false,
        reason: GatheringFailureReason.UnknownNode,
        message: 'There is nothing to gather here.',
      };
    }

    if (this.inFlight.has(nodeId)) {
      return {
        canGather: false,
        reason: GatheringFailureReason.OnCooldown,
        message: 'You are already gathering this node.',
      };
    }

    if (playerLevel < node.requiredLevel) {
      return {
        canGather: false,
        reason: GatheringFailureReason.LevelTooLow,
        message: `You must be level ${node.requiredLevel} to gather ${node.name}.`,
      };
    }

    if (node.requiredToolId && !inventory.hasItem(node.requiredToolId)) {
      const toolName = getItemDefinition(node.requiredToolId)?.name ?? node.requiredToolId;
      return {
        canGather: false,
        reason: GatheringFailureReason.MissingTool,
        message: `You need a ${toolName} to gather ${node.name}.`,
      };
    }

    const remaining = this.getRespawnRemainingMs(nodeId);
    if (remaining > 0) {
      return {
        canGather: false,
        reason: GatheringFailureReason.OnCooldown,
        respawnRemainingMs: remaining,
        message: `${node.name} is replenishing.`,
      };
    }

    if (this.countFreeSpace(inventory, node.itemId) <= 0) {
      return {
        canGather: false,
        reason: GatheringFailureReason.InventoryFull,
        message: 'Your bag is full.',
      };
    }

    return { canGather: true, message: `Gather ${node.name}.` };
  }

  /**
   * Attempts to gather `nodeId`. On success the rolled yield is stored and the
   * node's respawn cooldown begins. Never partially consumes a node or items.
   */
  gather(nodeId: string, inventory: InventoryManager, playerLevel: number): GatherResult {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return {
        success: false,
        nodeId,
        quantity: 0,
        addedQuantity: 0,
        reason: GatheringFailureReason.UnknownNode,
        message: 'There is nothing to gather here.',
      };
    }

    const check = this.canGather(nodeId, inventory, playerLevel);
    if (!check.canGather) {
      return {
        success: false,
        nodeId,
        quantity: 0,
        addedQuantity: 0,
        reason: check.reason,
        message: check.message,
        respawnRemainingMs: check.respawnRemainingMs,
      };
    }

    const quantity = this.rollYield(node);

    // Atomicity: only proceed when the full rolled yield fits. This prevents a
    // partial gather (and partial consumption of the node) when space is tight.
    if (this.countFreeSpace(inventory, node.itemId) < quantity) {
      return {
        success: false,
        nodeId,
        quantity: 0,
        addedQuantity: 0,
        reason: GatheringFailureReason.InventoryFull,
        message: 'Not enough space for the full yield.',
      };
    }

    // Guard against re-entrant gathers (e.g. a listener triggering another).
    this.inFlight.add(nodeId);
    try {
      const add = inventory.addItem(node.itemId, quantity);
      if (add.addedQuantity < quantity) {
        // Defensive rollback; should not trigger given the pre-check above.
        if (add.addedQuantity > 0) {
          inventory.removeItem(node.itemId, add.addedQuantity);
        }
        return {
          success: false,
          nodeId,
          quantity: 0,
          addedQuantity: 0,
          reason: GatheringFailureReason.InventoryFull,
          message: 'Not enough space for the full yield.',
        };
      }

      const state = this.nodeStates.get(nodeId);
      if (state) state.lastGatheredAt = this.now();

      const itemName = getItemDefinition(node.itemId)?.name ?? node.itemId;
      return {
        success: true,
        nodeId,
        itemId: node.itemId,
        quantity,
        addedQuantity: add.addedQuantity,
        message: `You gathered ${quantity} × ${itemName}.`,
      };
    } finally {
      this.inFlight.delete(nodeId);
    }
  }

  /** Returns a serialisable snapshot of per-node respawn state. */
  snapshot(): GatheringSnapshot {
    const nodes: Record<string, ResourceNodeState> = {};
    for (const [id, state] of this.nodeStates) {
      nodes[id] = { ...state };
    }
    return { version: GATHERING_SNAPSHOT_VERSION, nodes };
  }

  /** Restores respawn state; unknown node ids are ignored, missing ones reset. */
  loadSnapshot(snapshot: GatheringSnapshot): void {
    this.nodeStates.clear();
    for (const node of this.nodes.values()) {
      const saved = snapshot.nodes[node.id];
      const lastGatheredAt =
        saved && typeof saved.lastGatheredAt === 'number' && saved.lastGatheredAt >= 0
          ? saved.lastGatheredAt
          : 0;
      this.nodeStates.set(node.id, { nodeId: node.id, lastGatheredAt });
    }
    this.inFlight.clear();
  }

  private rollYield(node: ResourceNodeDefinition): number {
    const span = node.yieldMax - node.yieldMin + 1;
    if (span <= 1) return node.yieldMin;
    return Math.floor(this.random() * span) + node.yieldMin;
  }

  /** Total units of `itemId` the inventory can accept right now. */
  private countFreeSpace(inventory: InventoryManager, itemId: string): number {
    const def = getItemDefinition(itemId);
    if (!def) return 0;
    let capacity = 0;
    for (const slot of inventory.getState().slots) {
      if (slot === null) {
        capacity += def.stackLimit;
      } else if (slot.itemId === itemId) {
        capacity += Math.max(0, def.stackLimit - slot.quantity);
      }
    }
    return capacity;
  }
}

/**
 * Sanitises an unknown value into a {@link GatheringSnapshot}, or `undefined`
 * when the payload is unusable. Backward-compatible: absent gathering data is
 * valid and produces `undefined`.
 */
export function sanitizeGatheringSnapshot(raw: unknown): GatheringSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const candidate = raw as Partial<GatheringSnapshot>;
  const version =
    typeof candidate.version === 'number' && Number.isInteger(candidate.version) && candidate.version > 0
      ? candidate.version
      : GATHERING_SNAPSHOT_VERSION;

  const nodes: Record<string, ResourceNodeState> = {};
  if (candidate.nodes && typeof candidate.nodes === 'object') {
    for (const [nodeId, value] of Object.entries(candidate.nodes)) {
      if (!value || typeof value !== 'object') continue;
      const lastGatheredAt = (value as Partial<ResourceNodeState>).lastGatheredAt;
      if (typeof lastGatheredAt === 'number' && Number.isFinite(lastGatheredAt) && lastGatheredAt >= 0) {
        nodes[nodeId] = { nodeId, lastGatheredAt };
      }
    }
  }

  return { version, nodes };
}

/** Shared default gathering service instance. */
export const gatheringService = new GatheringService();
