import {
  GatheringProfession,
  type ResourceNodeDefinition,
} from './GatheringTypes';

/**
 * Sample resource-node catalogue (Phase 27.2).
 *
 * These are a small, clearly-labelled content sample — one tier-1 and one
 * higher-tier node per approved profession (mining, herbalism, woodcutting).
 * All balance values are provisional. Item ids resolve against
 * `src/inventory/ItemRegistry`.
 */
export const GATHERING_NODE_DEFINITIONS: readonly ResourceNodeDefinition[] = [
  // ── Mining ──
  {
    id: 'copper-vein',
    name: 'Copper Vein',
    profession: GatheringProfession.Mining,
    itemId: 'copper-ore',
    yieldMin: 1,
    yieldMax: 3,
    requiredLevel: 1,
    requiredToolId: 'iron-pickaxe',
    respawnMs: 8_000,
    interactionRadiusPx: 48,
    provisional: true,
  },
  {
    id: 'iron-deposit',
    name: 'Iron Deposit',
    profession: GatheringProfession.Mining,
    itemId: 'iron-ore',
    yieldMin: 1,
    yieldMax: 2,
    requiredLevel: 8,
    requiredToolId: 'iron-pickaxe',
    respawnMs: 12_000,
    interactionRadiusPx: 48,
    provisional: true,
  },

  // ── Herbalism ──
  {
    // Tool-free: basic herbs may be picked by hand.
    id: 'healing-bloom',
    name: 'Healing Bloom',
    profession: GatheringProfession.Herbalism,
    itemId: 'healing-herb',
    yieldMin: 1,
    yieldMax: 3,
    requiredLevel: 1,
    respawnMs: 6_000,
    interactionRadiusPx: 48,
    provisional: true,
  },
  {
    id: 'moonpetal-patch',
    name: 'Moonpetal Patch',
    profession: GatheringProfession.Herbalism,
    itemId: 'moonpetal',
    yieldMin: 1,
    yieldMax: 1,
    requiredLevel: 10,
    requiredToolId: 'herbalist-sickle',
    respawnMs: 15_000,
    interactionRadiusPx: 48,
    provisional: true,
  },

  // ── Woodcutting ──
  {
    id: 'sturdy-oak',
    name: 'Sturdy Oak',
    profession: GatheringProfession.Woodcutting,
    itemId: 'oak-log',
    yieldMin: 1,
    yieldMax: 2,
    requiredLevel: 1,
    requiredToolId: 'woodcutters-axe',
    respawnMs: 9_000,
    interactionRadiusPx: 48,
    provisional: true,
  },
  {
    id: 'ashwood-grove',
    name: 'Ashwood Grove',
    profession: GatheringProfession.Woodcutting,
    itemId: 'ash-wood',
    yieldMin: 1,
    yieldMax: 2,
    requiredLevel: 12,
    requiredToolId: 'woodcutters-axe',
    respawnMs: 14_000,
    interactionRadiusPx: 48,
    provisional: true,
  },
];

/** Registry of every resource node, keyed by node id. */
export const GATHERING_NODE_REGISTRY: Record<string, ResourceNodeDefinition> =
  Object.fromEntries(GATHERING_NODE_DEFINITIONS.map((node) => [node.id, node]));

/** Returns the node definition for `nodeId`, or `undefined` when unknown. */
export function getResourceNode(nodeId: string): ResourceNodeDefinition | undefined {
  return GATHERING_NODE_REGISTRY[nodeId];
}

/** Returns every node belonging to a profession. */
export function getResourceNodesForProfession(
  profession: GatheringProfession,
): ResourceNodeDefinition[] {
  return GATHERING_NODE_DEFINITIONS.filter((node) => node.profession === profession);
}
