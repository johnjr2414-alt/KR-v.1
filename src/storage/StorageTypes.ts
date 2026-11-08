import type { PlayerData } from '../player/PlayerData';
import type { SubjectId } from '../core/types/education';
import type { MasteryRecord } from '../core/types/mastery';
import type { InventoryState } from '../inventory/ItemTypes';
import type { PlayerQuestRecord } from '../quests/QuestTypes';

export interface GameSettings {
  masterVolume: number; // 0.0 - 1.0
  sfxVolume: number; // 0.0 - 1.0
  musicVolume: number; // 0.0 - 1.0
  showDamageNumbers: boolean;
  controlLayout: 'wasd' | 'arrows';
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.7,
  showDamageNumbers: true,
  controlLayout: 'wasd',
};

/**
 * Complete snapshot of a player's save game state.
 */
export interface SaveData {
  version: number;
  updatedAt: number;
  player: PlayerData;
  mastery: Record<SubjectId, MasteryRecord>;
  inventory: InventoryState;
  quests: PlayerQuestRecord[];
  currency?: {
    gold: number;
  };
  settings: GameSettings;
}

export const SAVE_DATA_SCHEMA_VERSION = 2;

/**
 * Storage Service contract for player game state and configuration.
 */
export interface StorageService {
  init(): Promise<void>;
  saveGame(saveData: SaveData): Promise<void>;
  loadGame(): Promise<SaveData | null>;
  saveSettings(settings: GameSettings): Promise<void>;
  loadSettings(): Promise<GameSettings>;
  clearSave(): Promise<void>;
}
