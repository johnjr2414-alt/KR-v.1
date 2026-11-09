import type { PlayerData } from '../player/PlayerData';
import type { SubjectId } from '../core/types/education';
import type { MasteryRecord } from '../core/types/mastery';
import type { LearningAnalyticsSnapshot } from '../analytics/AnalyticsTypes';
import type { InventoryState } from '../inventory/ItemTypes';
import type { PlayerQuestRecord } from '../quests/QuestTypes';
import type { PlayerSkillsState } from '../skills/SkillTypes';
import type { BankState } from '../economy/BankTypes';
import type { GatheringSnapshot } from '../gathering/GatheringTypes';
import type { CareerSnapshot } from '../professions/ProfessionTypes';
import type { AssignmentSnapshot } from '../professions/AssignmentTypes';
import type { RecoveryLogEntry, SaveDiagnosticsReport } from './SaveDiagnostics';

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
  skills?: PlayerSkillsState;
  bank?: BankState;
  currency?: {
    gold: number;
  };
  /**
   * Optional, backward-compatible local learning analytics (Phase 25.4).
   * Absent in saves written before the field existed.
   */
  analytics?: LearningAnalyticsSnapshot;
  /**
   * Optional, backward-compatible gathering state (Phase 27.2).
   * Absent in saves written before the field existed.
   */
  gathering?: GatheringSnapshot;
  /**
   * Optional, backward-compatible career/profession state (Phase 27.1).
   * Absent in saves written before the field existed.
   */
  careers?: CareerSnapshot;
  /**
   * Optional, backward-compatible professional assignment state (Phase 27.3).
   * Absent in saves written before the field existed.
   */
  assignments?: AssignmentSnapshot;
  settings: GameSettings;
}

export const SAVE_DATA_SCHEMA_VERSION = 6;

/** Named manual save slots (Phase 28.2). Cleanly supported by the KV store layout. */
export const SAVE_SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

/** Lightweight metadata about a manual save slot (no full payload). */
export interface SaveSlotInfo {
  slotId: string;
  exists: boolean;
  playerName?: string;
  level?: number;
  schemaVersion?: number;
  updatedAt?: number;
}

/** Outcome of a destructive restore. */
export interface RestoreResult {
  success: boolean;
  /** True when the previous active save was copied to the backup before replacing. */
  backupCreated: boolean;
  errors: string[];
}

/** Detailed load outcome used by the recovery/diagnostics layer (Phase 28.3). */
export type SaveLoadStatus = 'empty' | 'intact' | 'repaired' | 'salvaged' | 'unreadable';

export interface SaveLoadResult {
  status: SaveLoadStatus;
  /** Present whenever the save could be loaded (including repaired/salvaged). */
  data?: SaveData;
  /** Per-section diagnostics; content-free. */
  report?: SaveDiagnosticsReport;
  errors: string[];
}

/**
 * Storage Service contract for player game state and configuration.
 *
 * The slot/backup/restore methods (Phase 28.2) are optional so that lightweight
 * test doubles and alternative implementations remain valid; the bundled
 * IndexedDB and in-memory services implement all of them.
 */
export interface StorageService {
  init(): Promise<void>;
  /**
   * Whether saves survive a page reload. Optional so lightweight test doubles
   * remain valid; the bundled in-memory implementation reports `false`.
   */
  isPersistent?(): boolean;
  saveGame(saveData: SaveData): Promise<void>;
  loadGame(): Promise<SaveData | null>;
  /**
   * Load with a detailed status and content-free diagnostics (Phase 28.3).
   * Optional so lightweight test doubles remain valid; the bundled services
   * implement it.
   */
  loadGameDetailed?(): Promise<SaveLoadResult>;
  /** Bounded, content-free recovery history (Phase 28.3), newest entry last. */
  getRecoveryLog?(): Promise<RecoveryLogEntry[]>;
  saveSettings(settings: GameSettings): Promise<void>;
  loadSettings(): Promise<GameSettings>;
  clearSave(): Promise<void>;

  /** Lists manual save slots with lightweight metadata. */
  listSaveSlots?(): Promise<SaveSlotInfo[]>;
  /** Writes a validated save into a named slot. */
  saveToSlot?(slotId: string, save: SaveData): Promise<void>;
  /** Reads (migrated + validated) a save from a named slot. */
  loadFromSlot?(slotId: string): Promise<SaveData | null>;
  /** Removes a named slot. */
  deleteSlot?(slotId: string): Promise<void>;
  /** Copies the active save into the backup slot (best-effort). */
  backupActiveSave?(): Promise<void>;
  /**
   * Replaces the active save with `save`, first backing up the current save.
   * Requires `confirm: true` — a destructive replacement must be explicit.
   */
  restoreActiveSave?(save: SaveData, options: { confirm: boolean }): Promise<RestoreResult>;
}
