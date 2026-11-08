import type { SaveData, GameSettings } from './StorageTypes';
import { SAVE_DATA_SCHEMA_VERSION, DEFAULT_GAME_SETTINGS } from './StorageTypes';
import { DEFAULT_INITIAL_PLAYER_DATA } from '../player/PlayerData';
import { SubjectId } from '../core/types/education';
import { createInitialMasteryMap } from '../mastery/MasteryData';
import { DEFAULT_INVENTORY_CAPACITY } from '../inventory/InventoryManager';

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

/**
 * Validates GameSettings and applies sensible defaults if properties are missing/invalid.
 */
export function validateGameSettings(raw: unknown): GameSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GAME_SETTINGS };
  }

  const obj = raw as Partial<GameSettings>;
  const clampVol = (v: unknown, def: number) =>
    typeof v === 'number' && !isNaN(v) ? Math.max(0, Math.min(1, v)) : def;

  return {
    masterVolume: clampVol(obj.masterVolume, DEFAULT_GAME_SETTINGS.masterVolume),
    sfxVolume: clampVol(obj.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
    musicVolume: clampVol(obj.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
    showDamageNumbers: typeof obj.showDamageNumbers === 'boolean' ? obj.showDamageNumbers : true,
    controlLayout: obj.controlLayout === 'arrows' ? 'arrows' : 'wasd',
  };
}

/**
 * Validates SaveData payload.
 * Returns validated data (with repaired missing elements) or errors if severely corrupted.
 */
export function validateSaveData(raw: unknown): ValidationResult<SaveData> {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      errors: ['Save data is null or not an object'],
    };
  }

  const candidate = raw as Partial<SaveData>;

  // Check version
  const version = typeof candidate.version === 'number' ? candidate.version : SAVE_DATA_SCHEMA_VERSION;
  const updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now();

  // Validate player
  if (!candidate.player || typeof candidate.player !== 'object') {
    errors.push('Missing or invalid player data object');
  }

  const p = candidate.player as Partial<SaveData['player']>;
  if (!p || typeof p.name !== 'string' || !p.name.trim()) {
    errors.push('Player name is required');
  }

  // If critical player errors occurred, reject immediately
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const sanitizedPlayer = {
    id: typeof p.id === 'string' && p.id ? p.id : 'player-1',
    name: p.name || 'Hero',
    level: typeof p.level === 'number' && p.level >= 1 ? p.level : 1,
    currentExp: typeof p.currentExp === 'number' && p.currentExp >= 0 ? p.currentExp : 0,
    maxHp: typeof p.maxHp === 'number' && p.maxHp > 0 ? p.maxHp : DEFAULT_INITIAL_PLAYER_DATA.maxHp,
    currentHp: typeof p.currentHp === 'number' ? Math.max(0, p.currentHp) : DEFAULT_INITIAL_PLAYER_DATA.currentHp,
    maxMp: typeof p.maxMp === 'number' && p.maxMp >= 0 ? p.maxMp : DEFAULT_INITIAL_PLAYER_DATA.maxMp,
    currentMp: typeof p.currentMp === 'number' ? Math.max(0, p.currentMp) : DEFAULT_INITIAL_PLAYER_DATA.currentMp,
    attack: typeof p.attack === 'number' && p.attack >= 0 ? p.attack : DEFAULT_INITIAL_PLAYER_DATA.attack,
    defense: typeof p.defense === 'number' && p.defense >= 0 ? p.defense : DEFAULT_INITIAL_PLAYER_DATA.defense,
    intelligence: typeof p.intelligence === 'number' && p.intelligence >= 0 ? p.intelligence : DEFAULT_INITIAL_PLAYER_DATA.intelligence,
    critRate: typeof p.critRate === 'number' && p.critRate >= 0 ? p.critRate : DEFAULT_INITIAL_PLAYER_DATA.critRate,
    movementSpeed: typeof p.movementSpeed === 'number' && p.movementSpeed > 0 ? p.movementSpeed : DEFAULT_INITIAL_PLAYER_DATA.movementSpeed,
  };

  // Validate Mastery
  const defaultMastery = createInitialMasteryMap();
  const sanitizedMastery = { ...defaultMastery };

  if (candidate.mastery && typeof candidate.mastery === 'object') {
    for (const subject of Object.values(SubjectId)) {
      const rec = candidate.mastery[subject];
      if (rec && typeof rec === 'object') {
        sanitizedMastery[subject] = {
          subject,
          level: typeof rec.level === 'number' && rec.level >= 1 ? rec.level : 1,
          currentExp: typeof rec.currentExp === 'number' && rec.currentExp >= 0 ? rec.currentExp : 0,
          totalCorrect: typeof rec.totalCorrect === 'number' && rec.totalCorrect >= 0 ? rec.totalCorrect : 0,
          totalAttempted: typeof rec.totalAttempted === 'number' && rec.totalAttempted >= 0 ? rec.totalAttempted : 0,
        };
      }
    }
  }

  // Validate Inventory
  const sanitizedInventory: SaveData['inventory'] = {
    capacity:
      candidate.inventory && typeof candidate.inventory.capacity === 'number'
        ? candidate.inventory.capacity
        : DEFAULT_INVENTORY_CAPACITY,
    slots:
      candidate.inventory && Array.isArray(candidate.inventory.slots)
        ? candidate.inventory.slots.map((s, idx) =>
            s && typeof s === 'object' && typeof s.itemId === 'string'
              ? { slotIndex: idx, itemId: s.itemId, quantity: Math.max(1, s.quantity || 1) }
              : null,
          )
        : Array.from({ length: DEFAULT_INVENTORY_CAPACITY }, () => null),
    equipped:
      candidate.inventory && typeof candidate.inventory.equipped === 'object'
        ? { ...candidate.inventory.equipped }
        : {},
  };

  // Validate Quests
  const sanitizedQuests = Array.isArray(candidate.quests) ? [...candidate.quests] : [];

  // Validate Currency (Phase 21.2: Gold persistence & backward compatibility)
  let sanitizedGold = 0;
  if (candidate.currency && typeof candidate.currency === 'object') {
    const rawGold = candidate.currency.gold;
    if (typeof rawGold === 'number' && Number.isFinite(rawGold) && rawGold >= 0) {
      sanitizedGold = Math.floor(rawGold);
    }
  }

  // Validate Settings
  const sanitizedSettings = validateGameSettings(candidate.settings);

  return {
    isValid: true,
    errors: [],
    data: {
      version,
      updatedAt,
      player: sanitizedPlayer,
      mastery: sanitizedMastery,
      inventory: sanitizedInventory,
      quests: sanitizedQuests,
      currency: {
        gold: sanitizedGold,
      },
      settings: sanitizedSettings,
    },
  };
}
