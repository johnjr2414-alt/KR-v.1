import { describe, it, expect, beforeEach } from 'vitest';
import { GatheringService, sanitizeGatheringSnapshot } from '../../src/gathering/GatheringService';
import {
  GATHERING_NODE_DEFINITIONS,
  GATHERING_NODE_REGISTRY,
  getResourceNode,
  getResourceNodesForProfession,
} from '../../src/gathering/GatheringRegistry';
import {
  GATHERING_SNAPSHOT_VERSION,
  GatheringFailureReason,
  GatheringProfession,
  type ResourceNodeDefinition,
} from '../../src/gathering/GatheringTypes';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { ItemType } from '../../src/inventory/ItemTypes';
import { getItemDefinition } from '../../src/inventory/ItemRegistry';
import { validateSaveData } from '../../src/storage/SaveDataValidator';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';

// ─── Registry integrity ──────────────────────────────────────────────────────

describe('Phase 27.2 — resource registry integrity', () => {
  it('has unique ids matching their registry keys', () => {
    for (const [key, def] of Object.entries(GATHERING_NODE_REGISTRY)) {
      expect(def.id).toBe(key);
    }
  });

  it('gives every node a valid yield range and positive respawn', () => {
    for (const node of GATHERING_NODE_DEFINITIONS) {
      expect(node.yieldMin).toBeGreaterThan(0);
      expect(node.yieldMax).toBeGreaterThanOrEqual(node.yieldMin);
      expect(node.respawnMs).toBeGreaterThan(0);
      expect(node.interactionRadiusPx).toBeGreaterThan(0);
    }
  });

  it('yields items that exist in the item registry', () => {
    for (const node of GATHERING_NODE_DEFINITIONS) {
      expect(getItemDefinition(node.itemId), `unknown item '${node.itemId}'`).toBeDefined();
    }
  });

  it('references a real Tool item whenever a tool is required', () => {
    for (const node of GATHERING_NODE_DEFINITIONS) {
      if (node.requiredToolId) {
        const tool = getItemDefinition(node.requiredToolId);
        expect(tool, `unknown tool '${node.requiredToolId}'`).toBeDefined();
        expect(tool!.type).toBe(ItemType.Tool);
      }
    }
  });

  it('marks every node provisional (draft values)', () => {
    expect(GATHERING_NODE_DEFINITIONS.every((n) => n.provisional)).toBe(true);
  });

  it('covers all three approved professions', () => {
    for (const profession of Object.values(GatheringProfession)) {
      expect(getResourceNodesForProfession(profession).length).toBeGreaterThan(0);
    }
  });

  it('exposes every approved profession from the service', () => {
    const service = new GatheringService();
    for (const profession of Object.values(GatheringProfession)) {
      expect(service.getNodesForProfession(profession).length).toBeGreaterThan(0);
    }
    expect(getResourceNode('copper-vein')).toBeDefined();
    expect(getResourceNode('does-not-exist')).toBeUndefined();
  });
});

// ─── Yield rules ─────────────────────────────────────────────────────────────

describe('Phase 27.2 — yield rules', () => {
  it('rolls within the inclusive yield range', () => {
    // random 0 -> minimum
    const lowInventory = new InventoryManager();
    lowInventory.addItem('iron-pickaxe', 1);
    const low = new GatheringService({ random: () => 0 });
    const lowResult = low.gather('copper-vein', lowInventory, 5);
    expect(lowResult.success).toBe(true);
    expect(lowResult.quantity).toBe(1);

    // random just below 1 -> maximum
    const highInventory = new InventoryManager();
    highInventory.addItem('iron-pickaxe', 1);
    const high = new GatheringService({ random: () => 0.9999 });
    const highResult = high.gather('copper-vein', highInventory, 5);
    expect(highResult.success).toBe(true);
    expect(highResult.quantity).toBe(3);
  });

  it('always yields exactly the fixed quantity for single-yield nodes', () => {
    const inventory = new InventoryManager();
    inventory.addItem('herbalist-sickle', 1);
    const service = new GatheringService({ random: () => 0.5 });
    const result = service.gather('moonpetal-patch', inventory, 20);
    expect(result.success).toBe(true);
    expect(result.quantity).toBe(1);
  });
});

// ─── Requirements ────────────────────────────────────────────────────────────

describe('Phase 27.2 — gathering requirements', () => {
  let inventory: InventoryManager;

  beforeEach(() => {
    inventory = new InventoryManager();
  });

  it('rejects gathering when the player level is too low', () => {
    const service = new GatheringService({ random: () => 0 });
    const check = service.canGather('iron-deposit', inventory, 7);
    expect(check.canGather).toBe(false);
    expect(check.reason).toBe(GatheringFailureReason.LevelTooLow);

    const result = service.gather('iron-deposit', inventory, 7);
    expect(result.success).toBe(false);
    expect(result.reason).toBe(GatheringFailureReason.LevelTooLow);
  });

  it('rejects gathering when the required tool is missing', () => {
    const service = new GatheringService({ random: () => 0 });
    const check = service.canGather('copper-vein', inventory, 5);
    expect(check.canGather).toBe(false);
    expect(check.reason).toBe(GatheringFailureReason.MissingTool);
  });

  it('allows gathering once the required tool is carried', () => {
    inventory.addItem('iron-pickaxe', 1);
    const service = new GatheringService({ random: () => 0 });
    const result = service.gather('copper-vein', inventory, 5);
    expect(result.success).toBe(true);
    expect(result.itemId).toBe('copper-ore');
    expect(inventory.getItemCount('copper-ore')).toBe(result.quantity);
  });

  it('treats the tool requirement as optional for tool-free nodes', () => {
    const service = new GatheringService({ random: () => 0 });
    const result = service.gather('healing-bloom', inventory, 1);
    expect(result.success).toBe(true);
    expect(result.itemId).toBe('healing-herb');
  });

  it('reports an unknown node without mutating the inventory', () => {
    const service = new GatheringService({ random: () => 0 });
    const result = service.gather('no-such-node', inventory, 99);
    expect(result.success).toBe(false);
    expect(result.reason).toBe(GatheringFailureReason.UnknownNode);
    expect(inventory.getItemCount('healing-herb')).toBe(0);
  });
});

// ─── Inventory capacity ──────────────────────────────────────────────────────

describe('Phase 27.2 — inventory capacity', () => {
  it('rejects gathering when the bag is full', () => {
    const inventory = new InventoryManager();
    // Fill all 24 slots with non-stacking tools (pickaxe also satisfies the tool req).
    for (let i = 0; i < 24; i += 1) inventory.addItem('iron-pickaxe', 1);

    const service = new GatheringService({ random: () => 0 });
    const check = service.canGather('copper-vein', inventory, 5);
    expect(check.canGather).toBe(false);
    expect(check.reason).toBe(GatheringFailureReason.InventoryFull);

    const result = service.gather('copper-vein', inventory, 5);
    expect(result.success).toBe(false);
    expect(result.reason).toBe(GatheringFailureReason.InventoryFull);
    // A failed gather must never start the node's respawn cooldown.
    expect(service.getRespawnRemainingMs('copper-vein')).toBe(0);
  });

  it('fails atomically when space cannot hold the full rolled yield', () => {
    const inventory = new InventoryManager();
    // 23 slots of tools + one copper-ore stack at 98/99 => capacity of exactly 1.
    for (let i = 0; i < 23; i += 1) inventory.addItem('iron-pickaxe', 1);
    inventory.addItem('copper-ore', 98);

    const fullYieldNode: ResourceNodeDefinition = {
      id: 'test-vein',
      name: 'Test Vein',
      profession: GatheringProfession.Mining,
      itemId: 'copper-ore',
      yieldMin: 3,
      yieldMax: 3,
      requiredLevel: 1,
      respawnMs: 1_000,
      interactionRadiusPx: 48,
      provisional: true,
    };

    const service = new GatheringService({ nodes: [fullYieldNode], random: () => 0 });
    expect(service.canGather('test-vein', inventory, 1).canGather).toBe(true);

    const result = service.gather('test-vein', inventory, 1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe(GatheringFailureReason.InventoryFull);
    // No partial consumption: the existing stack is untouched and the node is ready.
    expect(inventory.getItemCount('copper-ore')).toBe(98);
    expect(service.getRespawnRemainingMs('test-vein')).toBe(0);
  });
});

// ─── Repeat interaction / respawn ────────────────────────────────────────────

describe('Phase 27.2 — repeat interaction and respawn', () => {
  it('prevents a duplicate claim from repeated input while on cooldown', () => {
    let clock = 1_000;
    const inventory = new InventoryManager();
    const service = new GatheringService({ now: () => clock, random: () => 0.5 });

    const first = service.gather('healing-bloom', inventory, 1);
    expect(first.success).toBe(true);
    const afterFirst = inventory.getItemCount('healing-herb');

    // Immediate repeated input is rejected and grants nothing.
    const second = service.gather('healing-bloom', inventory, 1);
    expect(second.success).toBe(false);
    expect(second.reason).toBe(GatheringFailureReason.OnCooldown);
    expect(second.respawnRemainingMs).toBeGreaterThan(0);
    expect(inventory.getItemCount('healing-herb')).toBe(afterFirst);
  });

  it('allows gathering again once the respawn time has elapsed', () => {
    let clock = 1_000;
    const inventory = new InventoryManager();
    const node = getResourceNode('healing-bloom')!;
    const service = new GatheringService({ now: () => clock, random: () => 0 });

    expect(service.gather('healing-bloom', inventory, 1).success).toBe(true);
    expect(service.getRespawnRemainingMs('healing-bloom')).toBe(node.respawnMs);

    clock += node.respawnMs;
    expect(service.getRespawnRemainingMs('healing-bloom')).toBe(0);
    expect(service.gather('healing-bloom', inventory, 1).success).toBe(true);
  });
});

// ─── Persistence ─────────────────────────────────────────────────────────────

describe('Phase 27.2 — persistence', () => {
  it('round-trips respawn state through a snapshot', () => {
    let clock = 2_000;
    const inventory = new InventoryManager();
    const service = new GatheringService({ now: () => clock, random: () => 0 });
    service.gather('healing-bloom', inventory, 1);

    const snapshot = service.snapshot();
    expect(snapshot.version).toBe(GATHERING_SNAPSHOT_VERSION);
    expect(snapshot.nodes['healing-bloom'].lastGatheredAt).toBe(2_000);

    const restored = new GatheringService({ now: () => clock });
    restored.loadSnapshot(snapshot);
    expect(restored.getRespawnRemainingMs('healing-bloom')).toBeGreaterThan(0);
  });

  it('ignores unknown node ids and resets missing ones', () => {
    const restored = new GatheringService({ now: () => 5_000 });
    restored.loadSnapshot({
      version: GATHERING_SNAPSHOT_VERSION,
      nodes: {
        'legacy-node': { nodeId: 'legacy-node', lastGatheredAt: 1_234 },
      },
    });
    expect(restored.getRespawnRemainingMs('healing-bloom')).toBe(0);
    expect(restored.snapshot().nodes['legacy-node']).toBeUndefined();
  });

  it('sanitises unknown payloads and filters invalid entries', () => {
    expect(sanitizeGatheringSnapshot(undefined)).toBeUndefined();
    expect(sanitizeGatheringSnapshot('nope')).toBeUndefined();

    const sanitized = sanitizeGatheringSnapshot({
      version: 1,
      nodes: {
        good: { nodeId: 'good', lastGatheredAt: 42 },
        bad: { nodeId: 'bad', lastGatheredAt: -5 },
        junk: 'not-an-object',
      },
    });
    expect(sanitized).toEqual({
      version: 1,
      nodes: { good: { nodeId: 'good', lastGatheredAt: 42 } },
    });
  });

  it('is validated and preserved by the save validator', () => {
    const result = validateSaveData({
      player: { name: 'Hero' },
      gathering: {
        version: 1,
        nodes: { 'copper-vein': { nodeId: 'copper-vein', lastGatheredAt: 999 } },
      },
    });
    expect(result.isValid).toBe(true);
    expect(result.data?.gathering?.nodes['copper-vein']?.lastGatheredAt).toBe(999);
  });

  it('remains backward compatible when gathering data is absent', () => {
    const result = validateSaveData({ player: { name: 'Hero' } });
    expect(result.isValid).toBe(true);
    expect(result.data?.gathering).toBeUndefined();
  });

  it('persists through a player session save/load round trip', async () => {
    PlayerSessionManager.resetInstance();
    const storage = new InMemoryStorageService();
    const inventory = new InventoryManager();
    const gathering = new GatheringService({ now: () => 7_000, random: () => 0 });

    const session = new PlayerSessionManager({
      storage,
      inventory,
      mastery: new MasteryManager(),
      quests: new QuestManager(inventory),
      currency: new CurrencyService(100),
      gathering,
    });

    await session.initializeSession('Hero');
    const gatherResult = session.gathering.gather('healing-bloom', inventory, 1);
    expect(gatherResult.success).toBe(true);
    await session.saveSession();

    const reloaded = await storage.loadGame();
    expect(reloaded?.gathering?.nodes['healing-bloom']?.lastGatheredAt).toBe(7_000);

    // A fresh session restores the cooldown from the save.
    PlayerSessionManager.resetInstance();
    const reloadedGathering = new GatheringService({ now: () => 7_000 });
    const reloadedSession = new PlayerSessionManager({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(new InventoryManager()),
      currency: new CurrencyService(100),
      gathering: reloadedGathering,
    });
    await reloadedSession.initializeSession('Hero');
    expect(reloadedSession.gathering.getRespawnRemainingMs('healing-bloom')).toBeGreaterThan(0);
  });
});
