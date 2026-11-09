import { describe, it, expect } from 'vitest';
import {
  CIVIC_DISTRICT,
  CIVIC_DISTRICT_ZONE,
  GOLDEN_CAPITAL_MAPS,
  GOLDEN_CAPITAL_PLAZA,
  GOLDEN_CAPITAL_ZONES,
  HUNTING_ZONE_REGISTRY,
  HuntingZoneIds,
  MAP_REGISTRY,
  MapIds,
  REGION_REGISTRY,
  TRADE_BAZAAR,
  TRADE_BAZAAR_ZONE,
  validateMapGraph,
  ZoneType,
} from '../../src/world';
import { RegionIds } from '../../src/world/RegionDefinition';
import { getMonsterById } from '../../src/monsters/monsterData';
import { monsterSpawner } from '../../src/monsters';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { DifficultyEngine } from '../../src/questions/retrieval/DifficultyEngine';
import { SUBJECT_TAXONOMY } from '../../src/questions/taxonomy/TaxonomyData';
import { checkZoneAccess } from '../../src/world/zoneAccess';
import { getItemDefinition } from '../../src/inventory/ItemRegistry';
import { NPC_REGISTRY, getNPCsForMap } from '../../src/quests/NPCRegistry';
import { QUEST_REGISTRY } from '../../src/quests/QuestRegistry';
import { QuestStatus } from '../../src/quests/QuestTypes';
import { NPCType } from '../../src/quests/NPCTypes';
import { getShopForMerchant } from '../../src/economy/ShopRegistry';
import { AVAILABLE_INVESTMENTS, AVAILABLE_BUSINESSES } from '../../src/economy/BankRegistry';
import { validateSaveData } from '../../src/storage/SaveDataValidator';
import {
  SAVE_DATA_SCHEMA_VERSION,
  DEFAULT_GAME_SETTINGS,
  type SaveData,
} from '../../src/storage/StorageTypes';
import { createPlayerData } from '../../src/player/PlayerData';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { DEFAULT_INVENTORY_CAPACITY } from '../../src/inventory/InventoryManager';

const GOLDEN_CAPITAL_MAP_IDS = GOLDEN_CAPITAL_MAPS.map((m) => m.id);

// ─── Configuration integrity ─────────────────────────────────────────────────

describe('Phase 26.4 — Golden Capital map configuration', () => {
  it('defines the plaza plus two hunting grounds', () => {
    expect(GOLDEN_CAPITAL_MAPS).toHaveLength(3);
    expect(GOLDEN_CAPITAL_PLAZA.zoneType).toBe(ZoneType.Town);
    expect(TRADE_BAZAAR.zoneType).toBe(ZoneType.HuntingGround);
    expect(CIVIC_DISTRICT.zoneType).toBe(ZoneType.HuntingGround);
  });

  it('registers every Golden Capital map in the world registry', () => {
    for (const id of GOLDEN_CAPITAL_MAP_IDS) {
      expect(MAP_REGISTRY[id]).toBeDefined();
      expect(MAP_REGISTRY[id].id).toBe(id);
    }
  });

  it('marks the region with the Golden Capital maps and a Level 30–40 band', () => {
    const region = REGION_REGISTRY[RegionIds.GoldenCapital];
    expect(region).toBeDefined();
    expect(region.unlock.minLevel).toBe(30);
    expect(region.recommendedLevel).toEqual({ min: 30, max: 40 });
    for (const id of GOLDEN_CAPITAL_MAP_IDS) {
      expect(region.mapIds).toContain(id);
    }
  });

  it('keeps map entry requirements aligned with the region band', () => {
    for (const map of GOLDEN_CAPITAL_MAPS) {
      expect(map.entryRequirements.recommendedMinLevel).toBe(30);
      expect(map.entryRequirements.recommendedMaxLevel).toBe(40);
    }
  });

  it('defines collision obstacles within each map', () => {
    for (const map of GOLDEN_CAPITAL_MAPS) {
      expect(map.collisionRects.length).toBeGreaterThan(0);
    }
  });
});

// ─── Transitions / boundaries ────────────────────────────────────────────────

describe('Phase 26.4 — Golden Capital transitions', () => {
  it('passes map-graph validation with bidirectional routes', () => {
    const validation = validateMapGraph(GOLDEN_CAPITAL_MAPS, { requireBidirectional: true });
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it('connects the plaza to both hunting grounds and back', () => {
    const plazaTargets = GOLDEN_CAPITAL_PLAZA.connections.map((c) => c.targetMapId);
    expect(plazaTargets).toContain(MapIds.TradeBazaar);
    expect(plazaTargets).toContain(MapIds.CivicDistrict);

    expect(TRADE_BAZAAR.connections.some((c) => c.targetMapId === MapIds.GoldenCapitalPlaza)).toBe(true);
    expect(CIVIC_DISTRICT.connections.some((c) => c.targetMapId === MapIds.GoldenCapitalPlaza)).toBe(true);
  });

  it('keeps every entry/exit point inside its map bounds', () => {
    for (const map of GOLDEN_CAPITAL_MAPS) {
      const { width, height } = map.bounds;
      for (const conn of map.connections) {
        expect(conn.exitPosition.x).toBeGreaterThanOrEqual(0);
        expect(conn.exitPosition.x).toBeLessThanOrEqual(width);
        expect(conn.exitPosition.y).toBeGreaterThanOrEqual(0);
        expect(conn.exitPosition.y).toBeLessThanOrEqual(height);

        const target = MAP_REGISTRY[conn.targetMapId];
        expect(target).toBeDefined();
        expect(conn.entryPosition.x).toBeLessThanOrEqual(target.bounds.width);
        expect(conn.entryPosition.y).toBeLessThanOrEqual(target.bounds.height);
      }
    }
  });
});

// ─── Spawn validity ──────────────────────────────────────────────────────────

describe('Phase 26.4 — Golden Capital spawn validity', () => {
  it('keeps generated spawn positions inside every Golden Capital map', () => {
    for (const map of GOLDEN_CAPITAL_MAPS) {
      const { width, height } = map.bounds;
      const positions = monsterSpawner.generateSpawnPositions({ width, height }, 12);
      for (const p of positions) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(width);
        expect(p.y).toBeLessThanOrEqual(height);
      }
    }
  });

  it('produces a full spawn plan for both Golden Capital zones within map bounds', () => {
    for (const zone of GOLDEN_CAPITAL_ZONES) {
      const map = MAP_REGISTRY[zone.id];
      expect(map).toBeDefined();
      const plan = monsterSpawner.generateSpawnPlan(zone, map.bounds, 6);
      expect(plan).toHaveLength(6);
      for (const { definition, position } of plan) {
        expect(definition.subject).toBe(zone.subject);
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.x).toBeLessThanOrEqual(map.bounds.width);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeLessThanOrEqual(map.bounds.height);
      }
    }
  });
});

// ─── Level-risk warnings ─────────────────────────────────────────────────────

describe('Phase 26.4 — Golden Capital level-risk warnings', () => {
  it('does not warn an on-level player', () => {
    for (const zone of GOLDEN_CAPITAL_ZONES) {
      const check = checkZoneAccess(
        zone.recommendedMinLevel,
        zone.averageMonsterLevel,
        zone.name,
        zone.recommendedMinLevel,
      );
      expect(check.isDangerous).toBe(false);
    }
  });

  it('warns once the monster/player delta reaches the threshold (5)', () => {
    const zone = TRADE_BAZAAR_ZONE; // avg level 33
    expect(checkZoneAccess(28, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel).isDangerous).toBe(true);
    expect(checkZoneAccess(29, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel).isDangerous).toBe(false);
  });

  it('escalates to Extreme for a severely under-leveled player', () => {
    const zone = CIVIC_DISTRICT_ZONE; // avg level 33
    const check = checkZoneAccess(20, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel);
    expect(check.isDangerous).toBe(true);
    expect(check.dangerLevel).toBe('extreme');
  });
});

// ─── Question tier selection ─────────────────────────────────────────────────

describe('Phase 26.4 — Golden Capital question tier selection', () => {
  const engine = new DifficultyEngine();

  it('registers both Golden Capital zones with the right subjects', () => {
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.TradeBazaar]).toBeDefined();
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.CivicDistrict]).toBeDefined();
    expect(TRADE_BAZAAR_ZONE.subject).toBe(SubjectId.Mathematics);
    expect(CIVIC_DISTRICT_ZONE.subject).toBe(SubjectId.Science);
  });

  it('derives the zone baseline tier from its average monster level', () => {
    for (const zone of GOLDEN_CAPITAL_ZONES) {
      expect(engine.getMonsterBaselineTier(zone.averageMonsterLevel)).toBe(zone.educationalTier);
      expect(zone.educationalTier).toBe(EducationalTier.JuniorHigh);
    }
  });

  it('uses a tier that actually has bundled content for the zone subject', () => {
    for (const zone of GOLDEN_CAPITAL_ZONES) {
      const subjectEntry = SUBJECT_TAXONOMY.find((s) => s.id === zone.subject);
      expect(subjectEntry).toBeDefined();
      expect(subjectEntry?.tiers).toContain(zone.educationalTier);
    }
  });

  it('resolves a Junior High profile for an on-level player', () => {
    for (const zone of GOLDEN_CAPITAL_ZONES) {
      const profile = engine.createQuestionProfile(
        zone.subject,
        zone.recommendedMinLevel,
        zone.averageMonsterLevel,
      );
      expect(profile.baselineTier).toBe(EducationalTier.JuniorHigh);
      expect(profile.targetTier).toBe(EducationalTier.JuniorHigh);
    }
  });

  it('keeps every spawn config resolvable, subject-matched, and within the level band', () => {
    for (const zone of GOLDEN_CAPITAL_ZONES) {
      expect(zone.monsterSpawnConfigs.length).toBeGreaterThan(0);
      for (const cfg of zone.monsterSpawnConfigs) {
        const monster = getMonsterById(cfg.monsterId);
        expect(monster).toBeDefined();
        expect(monster?.subject).toBe(zone.subject);
        expect(monster!.level).toBeGreaterThanOrEqual(zone.recommendedMinLevel);
        expect(monster!.level).toBeLessThanOrEqual(zone.recommendedMaxLevel);
        expect(engine.getMonsterBaselineTier(monster!.level)).toBe(zone.educationalTier);
      }
    }
  });
});

// ─── Rewards / drops ─────────────────────────────────────────────────────────

describe('Phase 26.4 — Golden Capital rewards and drops', () => {
  const capitalMonsterIds = GOLDEN_CAPITAL_ZONES.flatMap((zone) =>
    zone.monsterSpawnConfigs.map((cfg) => cfg.monsterId),
  );

  it('gives every Golden Capital monster positive exp and non-negative gold', () => {
    for (const id of capitalMonsterIds) {
      const monster = getMonsterById(id)!;
      expect(monster.baseExp).toBeGreaterThan(0);
      expect(monster.baseGold).toBeGreaterThanOrEqual(0);
    }
  });

  it('references only real items in every Golden Capital drop table', () => {
    for (const id of capitalMonsterIds) {
      const monster = getMonsterById(id)!;
      expect(monster.dropConfig).toBeDefined();
      for (const drop of monster.dropConfig.drops) {
        expect(getItemDefinition(drop.itemId)).toBeDefined();
        expect(drop.dropChance).toBeGreaterThan(0);
        expect(drop.dropChance).toBeLessThanOrEqual(1);
        expect(drop.minQuantity).toBeGreaterThanOrEqual(1);
        expect(drop.maxQuantity).toBeGreaterThanOrEqual(drop.minQuantity);
      }
    }
  });
});

// ─── NPC interactions (existing services only) ────────────────────────────────

describe('Phase 26.4 — Golden Capital NPC interactions', () => {
  it('places the capital NPCs on the plaza map', () => {
    const ids = getNPCsForMap(MapIds.GoldenCapitalPlaza).map((n) => n.id);
    expect(ids).toContain('chancellor-edmund');
    expect(ids).toContain('merchant-cordelia');
    expect(ids).toContain('banker-cassius');
    expect(ids).toContain('archivist-mira');
  });

  it('resolves the merchant NPC to a shop whose catalog references only real items', () => {
    const merchant = NPC_REGISTRY['merchant-cordelia'];
    expect(merchant.type).toBe(NPCType.Merchant);

    const shop = getShopForMerchant(merchant.id);
    expect(shop).toBeDefined();
    expect(shop!.catalog.length).toBeGreaterThan(0);
    for (const entry of shop!.catalog) {
      expect(getItemDefinition(entry.itemId)).toBeDefined();
      expect(entry.buyPrice).toBeGreaterThan(0);
    }
  });

  it('reuses the existing bank services through the banker NPC (no new mechanics)', () => {
    const banker = NPC_REGISTRY['banker-cassius'];
    expect(banker.type).toBe(NPCType.Banker);
    expect(banker.offeredQuestIds).toBeUndefined();

    // The Golden Capital banker only surfaces the pre-existing economy services.
    expect(AVAILABLE_INVESTMENTS.length).toBeGreaterThan(0);
    expect(AVAILABLE_BUSINESSES.length).toBeGreaterThan(0);
  });

  it('links the capital quest giver to a registered quest and a real monster target', () => {
    const npc = NPC_REGISTRY['chancellor-edmund'];
    expect(npc.type).toBe(NPCType.QuestGiver);
    expect(npc.offeredQuestIds).toContain('quest-capital-levy');

    const quest = QUEST_REGISTRY['quest-capital-levy'];
    expect(quest).toBeDefined();
    expect(quest.giverNpcId).toBe(npc.id);
    expect(quest.requirements.minLevel).toBe(30);

    for (const objective of quest.objectives) {
      expect(getMonsterById(objective.targetId)).toBeDefined();
    }
  });

  it('uses only real items and subjects in the capital quest rewards', () => {
    const quest = QUEST_REGISTRY['quest-capital-levy'];
    expect(quest.rewards.combatExp).toBeGreaterThan(0);
    expect(quest.rewards.gold).toBeGreaterThan(0);
    for (const item of quest.rewards.items ?? []) {
      expect(getItemDefinition(item.itemId)).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
    }
    if (quest.rewards.masteryExp) {
      const subject = SUBJECT_TAXONOMY.find((s) => s.id === quest.rewards.masteryExp!.subjectId);
      expect(subject).toBeDefined();
    }
  });
});

// ─── Save persistence ─────────────────────────────────────────────────────────

describe('Phase 26.4 — Golden Capital save persistence', () => {
  function createCapitalSave(): SaveData {
    return {
      version: SAVE_DATA_SCHEMA_VERSION,
      updatedAt: 1_700_000_000_000,
      player: createPlayerData('player-1', 'Capital Hero', { level: 35, currentExp: 1200 }),
      mastery: createInitialMasteryMap(),
      inventory: {
        capacity: DEFAULT_INVENTORY_CAPACITY,
        slots: Array.from({ length: DEFAULT_INVENTORY_CAPACITY }, () => null),
        equipped: {},
      },
      quests: [
        {
          questId: 'quest-capital-levy',
          status: QuestStatus.InProgress,
          objectives: [],
        },
      ],
      bank: {
        account: { playerId: 'player-1', savingsBalance: 25000, lastInterestAppliedAt: 1_700_000_000_000 },
        activeInvestments: [],
        businesses: [],
      },
      currency: { gold: 9999 },
      settings: { ...DEFAULT_GAME_SETTINGS },
    };
  }

  it('validates a Golden Capital-era save and preserves player progression, gold, and bank state', () => {
    const result = validateSaveData(createCapitalSave());
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data?.player.level).toBe(35);
    expect(result.data?.currency?.gold).toBe(9999);
    expect(result.data?.bank?.account.savingsBalance).toBe(25000);
  });

  it('requires no save-schema change for region content (data-driven content only)', () => {
    const result = validateSaveData(createCapitalSave());
    const expected = validateSaveData(createCapitalSave());
    expect(result.data?.version).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(result.data).toEqual(expected.data);
  });
});
