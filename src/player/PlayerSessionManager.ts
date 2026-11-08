import type { PlayerData } from './PlayerData';
import { createPlayerData } from './PlayerData';
import type { StorageService, SaveData, GameSettings } from '../storage/StorageTypes';
import { SAVE_DATA_SCHEMA_VERSION, DEFAULT_GAME_SETTINGS } from '../storage/StorageTypes';
import { storageService } from '../storage/IndexedDBStorageService';
import { InventoryManager, inventoryManager } from '../inventory/InventoryManager';
import { MasteryManager, masteryManager } from '../mastery/MasteryManager';
import { QuestManager, questManager } from '../quests/QuestManager';
import { CurrencyService, currencyService } from '../economy/CurrencyService';
import { createInitialMasteryMap } from '../mastery/MasteryData';

export interface PlayerSessionConfig {
  storage?: StorageService;
  inventory?: InventoryManager;
  mastery?: MasteryManager;
  quests?: QuestManager;
  currency?: CurrencyService;
}

/**
 * PlayerSessionManager — Centralized authority holding the active player session
 * and coordinating persistent player-related services across all scenes.
 *
 * Responsibilities:
 * - Holding authoritative active `PlayerData` state.
 * - Loading existing save data from `storageService` or creating a new player on first boot.
 * - Hydrating `inventoryManager`, `masteryManager`, and `questManager` from save snapshots.
 * - Serializing and persisting current game state safely with concurrency guards.
 * - Preventing multiple duplicate initializations.
 */
export class PlayerSessionManager {
  private static instance: PlayerSessionManager | null = null;

  private player: PlayerData | null = null;
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
  private initialized = false;
  private initPromise: Promise<PlayerData> | null = null;
  private isSaving = false;
  private pendingSave = false;

  readonly storage: StorageService;
  readonly inventory: InventoryManager;
  readonly mastery: MasteryManager;
  readonly quests: QuestManager;
  readonly currency: CurrencyService;

  constructor(config: PlayerSessionConfig = {}) {
    this.storage = config.storage || storageService;
    this.inventory = config.inventory || inventoryManager;
    this.mastery = config.mastery || masteryManager;
    this.quests = config.quests || questManager;
    this.currency = config.currency || currencyService;
  }

  /**
   * Singleton accessor.
   */
  static getInstance(config?: PlayerSessionConfig): PlayerSessionManager {
    if (!PlayerSessionManager.instance) {
      PlayerSessionManager.instance = new PlayerSessionManager(config);
    }
    return PlayerSessionManager.instance;
  }

  /**
   * For unit tests only — resets the singleton instance.
   */
  static resetInstance(): void {
    PlayerSessionManager.instance = null;
  }

  isInitialized(): boolean {
    return this.initialized && this.player !== null;
  }

  getPlayer(): PlayerData {
    if (!this.player) {
      throw new Error('Player session not initialized. Call initializeSession() first.');
    }
    return this.player;
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    void this.saveSession();
  }

  /**
   * Initializes the session only once:
   * 1. Calls storageService.init()
   * 2. Checks storageService.loadGame()
   * 3. If save exists, hydrates player, inventory, mastery, quests, and settings.
   * 4. If no save exists, creates a new player and initializes default state.
   */
  async initializeSession(defaultName = 'Novice Hero'): Promise<PlayerData> {
    if (this.initialized && this.player) {
      return this.player;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        await this.storage.init();
      } catch (err) {
        console.warn('[PlayerSessionManager] Storage init warning:', err);
      }

      let loadedSave: SaveData | null = null;
      try {
        loadedSave = await this.storage.loadGame();
      } catch (err) {
        console.error('[PlayerSessionManager] Failed to load save data:', err);
      }

      if (loadedSave) {
        // Restore player
        this.player = { ...loadedSave.player };

        // Restore settings
        this.settings = { ...loadedSave.settings };

        // Hydrate domain services
        if (loadedSave.inventory) {
          this.inventory.loadState(loadedSave.inventory);
        }
        if (loadedSave.mastery) {
          this.mastery.loadRecords(loadedSave.mastery);
        }
        if (loadedSave.quests) {
          this.quests.loadQuests(loadedSave.quests);
        }
      } else {
        // Create new player character
        this.player = createPlayerData('player-1', defaultName);

        // Populate initial mastery map
        this.mastery.loadRecords(createInitialMasteryMap());

        this.initialized = true;

        // Perform initial baseline save
        try {
          await this.saveSession();
        } catch (err) {
          console.warn('[PlayerSessionManager] Initial baseline save failed:', err);
        }
      }

      this.initialized = true;
      return this.player;
    })();

    return this.initPromise;
  }

  /**
   * Produces an immutable SaveData snapshot of the current session.
   */
  createSnapshot(): SaveData {
    if (!this.player) {
      throw new Error('Cannot create snapshot: player is not initialized');
    }

    return {
      version: SAVE_DATA_SCHEMA_VERSION,
      updatedAt: Date.now(),
      player: { ...this.player },
      mastery: this.mastery.getAllMastery(),
      inventory: this.inventory.getState(),
      quests: this.quests.getAllQuests(),
      settings: { ...this.settings },
    };
  }

  /**
   * Saves the current session to IndexedDB with concurrency protection.
   */
  async saveSession(): Promise<boolean> {
    if (!this.player || !this.initialized) {
      return false;
    }

    if (this.isSaving) {
      this.pendingSave = true;
      return true;
    }

    this.isSaving = true;

    try {
      const snapshot = this.createSnapshot();
      await this.storage.saveGame(snapshot);
      return true;
    } catch (err) {
      console.error('[PlayerSessionManager] Failed to save game state:', err);
      return false;
    } finally {
      this.isSaving = false;
      if (this.pendingSave) {
        this.pendingSave = false;
        void this.saveSession();
      }
    }
  }
}

export const playerSessionManager = PlayerSessionManager.getInstance();
