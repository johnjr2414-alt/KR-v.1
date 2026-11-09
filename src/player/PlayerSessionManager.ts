import type { PlayerData } from './PlayerData';
import { createPlayerData } from './PlayerData';
import type { StorageService, SaveData, GameSettings, SaveLoadStatus } from '../storage/StorageTypes';
import { SAVE_DATA_SCHEMA_VERSION, DEFAULT_GAME_SETTINGS } from '../storage/StorageTypes';
import type { SaveDiagnosticsReport } from '../storage/SaveDiagnostics';
import { UNREADABLE_SAVE_MESSAGE } from '../storage/SaveDiagnostics';
import { storageService } from '../storage/IndexedDBStorageService';
import { InventoryManager, inventoryManager } from '../inventory/InventoryManager';
import { MasteryManager, masteryManager } from '../mastery/MasteryManager';
import { QuestManager, questManager } from '../quests/QuestManager';
import { CurrencyService, currencyService } from '../economy/CurrencyService';
import { ProgressionService, progressionService } from '../core/progression/ProgressionService';
import { createInitialMasteryMap } from '../mastery/MasteryData';
import { audioManager } from '../audio';
import { SkillManager, skillManager } from '../skills';
import { BankService, bankService } from '../economy/BankService';
import { GatheringService, gatheringService } from '../gathering/GatheringService';
import { CareerService, careerService } from '../professions/CareerService';
import { AssignmentService } from '../professions/AssignmentService';
import { ProfessionProgressionService } from '../professions/ProfessionProgressionService';
import { AssignmentRewardService } from '../professions/AssignmentRewardService';
import { WorkplaceService, workplaceService } from '../professions/WorkplaceService';
import {
  buildProfessionCatalogueView,
  buildCareerProfileView,
  buildWorkplaceView,
  buildAssignmentView,
  type CareerViewDeps,
  type ProfessionCatalogueView,
  type CareerProfileView,
  type WorkplaceView,
  type AssignmentView,
} from '../professions/CareerViewModels';
import type {
  AssignmentRewardContext,
  AssignmentRewardDistributionResult,
} from '../professions/AssignmentRewardService';
import type { EnrollmentContext } from '../professions/ProfessionTypes';
import type { AssignmentContext } from '../professions/AssignmentTypes';
import type { WorkplaceAccessContext } from '../professions/WorkplaceTypes';
import { QuestStatus } from '../quests/QuestTypes';
import { migratePlayerToStatAllocation, allocateStatPoints, type AllocationResult } from '../core/progression/StatAllocationService';
import type { AllocatableStat } from '../config/statAllocationConfig';

export interface PlayerSessionConfig {
  storage?: StorageService;
  inventory?: InventoryManager;
  mastery?: MasteryManager;
  quests?: QuestManager;
  skills?: SkillManager;
  bank?: BankService;
  gathering?: GatheringService;
  careers?: CareerService;
  assignments?: AssignmentService;
  workplaces?: WorkplaceService;
  professionProgression?: ProfessionProgressionService;
  assignmentRewards?: AssignmentRewardService;
  currency?: CurrencyService;
  progression?: ProgressionService;
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
  private saveRecoveryNotice: string | null = null;
  private lastSaveReport: SaveDiagnosticsReport | null = null;
  private storageAvailable = true;

  readonly storage: StorageService;
  readonly inventory: InventoryManager;
  readonly mastery: MasteryManager;
  readonly quests: QuestManager;
  readonly skills: SkillManager;
  readonly bank: BankService;
  readonly gathering: GatheringService;
  readonly careers: CareerService;
  readonly workplaces: WorkplaceService;
  readonly assignments: AssignmentService;
  readonly professionProgression: ProfessionProgressionService;
  readonly assignmentRewards: AssignmentRewardService;
  readonly currency: CurrencyService;
  readonly progression: ProgressionService;

  constructor(config: PlayerSessionConfig = {}) {
    this.storage = config.storage || storageService;
    this.inventory = config.inventory || inventoryManager;
    this.mastery = config.mastery || masteryManager;
    this.quests = config.quests || questManager;
    this.skills = config.skills || skillManager;
    this.bank = config.bank || bankService;
    this.gathering = config.gathering || gatheringService;
    this.careers = config.careers || careerService;
    this.workplaces = config.workplaces || workplaceService;
    this.currency = config.currency || currencyService;
    this.progression = config.progression || progressionService;
    this.professionProgression =
      config.professionProgression || new ProfessionProgressionService({ careers: this.careers });
    this.assignments =
      config.assignments ||
      new AssignmentService({
        // Integrate assignment completion with the career profile: a finished
        // assignment is recorded against the profession, then its configured
        // rewards are routed through the existing progression, mastery, and
        // currency services (idempotently).
        onCompleted: (entry) => {
          this.careers.recordAssignmentCompletion(entry.professionId, entry.assignmentId, entry.completedAt);
          this.distributeAssignmentRewards(entry.completionId);
        },
      });
    this.assignmentRewards =
      config.assignmentRewards || new AssignmentRewardService(this.buildRewardContext());
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

  /**
   * Phase 28.3 — content-free message describing any save recovery that
   * happened during initialization, or `null` when the save loaded cleanly.
   */
  getSaveRecoveryNotice(): string | null {
    return this.saveRecoveryNotice;
  }

  /** Per-section diagnostics from the last save load, if available. */
  getLastSaveReport(): SaveDiagnosticsReport | null {
    return this.lastSaveReport;
  }

  /** False when local storage could not be initialized or read this session. */
  isStorageAvailable(): boolean {
    return this.storageAvailable;
  }

  updateSettings(newSettings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    audioManager.updateSettings(this.settings);
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
      this.saveRecoveryNotice = null;
      this.lastSaveReport = null;
      this.storageAvailable = true;

      try {
        await this.storage.init();
      } catch (err) {
        this.storageAvailable = false;
        console.warn('[PlayerSessionManager] Storage init warning:', err);
      }

      let loadedSave: SaveData | null = null;
      let loadStatus: SaveLoadStatus = 'empty';

      if (this.storageAvailable) {
        try {
          if (this.storage.loadGameDetailed) {
            const detailed = await this.storage.loadGameDetailed();
            loadedSave = detailed.data ?? null;
            loadStatus = detailed.status;
            this.lastSaveReport = detailed.report ?? null;

            if (detailed.status === 'repaired' || detailed.status === 'salvaged') {
              this.saveRecoveryNotice =
                detailed.report?.userMessage ??
                'Some save data was damaged and has been repaired. Some progress may have been reset.';
            } else if (detailed.status === 'unreadable') {
              this.saveRecoveryNotice = detailed.report?.userMessage ?? UNREADABLE_SAVE_MESSAGE;
            }
          } else {
            loadedSave = await this.storage.loadGame();
            loadStatus = loadedSave ? 'intact' : 'empty';
          }
        } catch (err) {
          this.storageAvailable = false;
          console.error('[PlayerSessionManager] Failed to load save data:', err);
        }
      }

      if (!this.storageAvailable) {
        this.saveRecoveryNotice =
          'Local save storage could not be accessed. Your progress may not be saved this session.';
      }

      if (loadedSave) {
        // Restore player and ensure stat allocation fields are present
        this.player = migratePlayerToStatAllocation({ ...loadedSave.player });

        // Restore settings
        this.settings = { ...loadedSave.settings };
        audioManager.updateSettings(this.settings);

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
        if (loadedSave.skills) {
          this.skills.loadState(loadedSave.skills);
        }
        if (loadedSave.bank) {
          this.bank.loadState(loadedSave.bank);
        }
        if (loadedSave.gathering) {
          this.gathering.loadSnapshot(loadedSave.gathering);
        }
        if (loadedSave.careers) {
          this.careers.loadSnapshot(loadedSave.careers);
        }
        if (loadedSave.assignments) {
          this.assignments.loadSnapshot(loadedSave.assignments);
        }
        if (loadedSave.currency) {
          this.currency.setGold(loadedSave.currency.gold);
        } else {
          // Backward compatibility default for legacy saves without currency field
          this.currency.setGold(0);
        }
      } else {
        // Create new player character
        this.player = createPlayerData('player-1', defaultName);

        // Populate initial mastery map
        this.mastery.loadRecords(createInitialMasteryMap());

        // Baseline starter gold for fresh player (matches currencyService initial default of 100)
        this.currency.setGold(100);

        this.initialized = true;

        // Never overwrite an unreadable save on first boot: the storage layer
        // keeps the raw payload for recovery and the player is warned instead.
        if (this.storageAvailable && loadStatus !== 'unreadable') {
          try {
            await this.saveSession();
          } catch (err) {
            console.warn('[PlayerSessionManager] Initial baseline save failed:', err);
          }
        }
      }

      if (this.storage.isPersistent?.() === false && !this.saveRecoveryNotice) {
        this.saveRecoveryNotice =
          'Local save storage is unavailable in this browser. Progress will be kept for this session only.';
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
      player: {
        ...this.player,
        allocatedStats: { ...this.player.allocatedStats },
      },
      mastery: this.mastery.getAllMastery(),
      inventory: this.inventory.getState(),
      quests: this.quests.getAllQuests(),
      skills: this.skills.getState(),
      bank: this.bank.getState(),
      gathering: this.gathering.snapshot(),
      careers: this.careers.snapshot(),
      assignments: this.assignments.snapshot(),
      currency: {
        gold: this.currency.getGold(),
      },
      settings: { ...this.settings },
    };
  }

  /**
   * Allocates stat points to a specified attribute and auto-saves the session.
   */
  allocateStats(stat: AllocatableStat, points: number): AllocationResult {
    const player = this.getPlayer();
    const result = allocateStatPoints(player, stat, points);
    if (result.success) {
      void this.saveSession();
    }
    return result;
  }

  /**
   * Builds an enrollment context for career/profession enrollment, assembling
   * the authoritative player level, subject mastery, gold, and quest completion
   * state. Keeps {@link CareerService} headless while wiring it to the session.
   */
  buildEnrollmentContext(): EnrollmentContext {
    const player = this.getPlayer();
    return {
      characterLevel: player.level,
      getMasteryLevel: (subject) => this.mastery.getMastery(subject).level,
      gold: this.currency.getGold(),
      spendGold: (amount) => this.currency.spendGold(amount).success,
      isQuestCompleted: (questId) => this.quests.getQuestRecord(questId)?.status === QuestStatus.Completed,
    };
  }

  /**
   * Builds an access context for {@link import('../professions/WorkplaceService').WorkplaceService},
   * assembling the authoritative character level, per-profession state (level and
   * current rank), subject mastery, and quest completion state. Keeps the
   * workplace service headless while wiring it to the session.
   */
  buildWorkplaceContext(): WorkplaceAccessContext {
    const player = this.getPlayer();
    return {
      characterLevel: player.level,
      getProfessionState: (professionId) => {
        const record = this.careers.getProfessionRecord(professionId);
        if (!record) return undefined;
        const rank = this.careers.getRankForLevel(professionId, record.level);
        return { level: record.level, rankId: rank?.id ?? record.rankId };
      },
      getMasteryLevel: (subject) => this.mastery.getMastery(subject).level,
      isQuestCompleted: (questId) => this.quests.getQuestRecord(questId)?.status === QuestStatus.Completed,
    };
  }

  /**
   * Builds a context for {@link import('../professions/AssignmentService').AssignmentService},
   * assembling the authoritative per-profession state (level and current rank)
   * and quest completion state. Keeps the assignment engine headless while
   * wiring it to the session.
   */
  buildAssignmentContext(): AssignmentContext {
    return {
      getProfessionState: (professionId) => {
        const record = this.careers.getProfessionRecord(professionId);
        if (!record) return undefined;
        const rank = this.careers.getRankForLevel(professionId, record.level);
        return { level: record.level, rankId: rank?.id ?? record.rankId };
      },
      isQuestCompleted: (questId) => this.quests.getQuestRecord(questId)?.status === QuestStatus.Completed,
    };
  }

  /**
   * Builds a reward context for {@link AssignmentRewardService}, routing each
   * reward kind through the existing session services so no reward logic is
   * duplicated:
   * - profession EXP / reputation → {@link ProfessionProgressionService}
   * - character EXP               → {@link ProgressionService}
   * - gold                        → {@link CurrencyService}
   * - subject mastery EXP         → {@link MasteryManager}
   * Keeps the router headless while wiring it to the session.
   */
  buildRewardContext(): AssignmentRewardContext {
    return {
      getCompletion: (completionId) => this.assignments.getCompletion(completionId),
      getAssignment: (assignmentId) => this.assignments.getAssignment(assignmentId),
      claimRewards: (completionId) => this.assignments.claimRewards(completionId),
      awardProfessionExp: (professionId, amount) => {
        this.professionProgression.awardProfessionExp(professionId, amount);
      },
      awardReputation: (professionId, amount) => {
        this.professionProgression.awardReputation(professionId, amount);
      },
      awardCharacterExp: (amount) => {
        if (this.player) this.progression.awardExp(this.player, amount);
      },
      awardGold: (amount) => {
        this.currency.addGold(amount);
      },
      awardSubjectMasteryExp: (subject, amount) => {
        this.mastery.awardMasteryExp(subject, amount);
      },
    };
  }

  // ── Career interface view models (Phase 27.6) ─────────────────────────────
  //
  // These assemble the headless career/workplace/assignment services (with the
  // session's authoritative contexts) into display-ready view models. The UI
  // layer consumes them directly, so no game rules live in the DOM code.

  /** Bundles the headless services the career view-model builders read from. */
  careerViewDeps(): CareerViewDeps {
    return {
      careers: this.careers,
      workplaces: this.workplaces,
      assignments: this.assignments,
      progression: this.professionProgression,
    };
  }

  /** Career selection interface: professions with enrollment eligibility. */
  getCareerCatalogueView(): ProfessionCatalogueView {
    return buildProfessionCatalogueView(this.careerViewDeps(), this.buildEnrollmentContext());
  }

  /** Career profile interface: enrolled professions, progress, and history. */
  getCareerProfileView(): CareerProfileView {
    return buildCareerProfileView(this.careerViewDeps());
  }

  /** Workplace interface for one workplace (`undefined` when unknown). */
  getWorkplaceView(workplaceId: string): WorkplaceView | undefined {
    return buildWorkplaceView(
      this.careerViewDeps(),
      workplaceId,
      this.buildWorkplaceContext(),
      this.buildAssignmentContext(),
    );
  }

  /** Assignment interface for one assignment (`undefined` when unknown). */
  getAssignmentView(assignmentId: string): AssignmentView | undefined {
    return buildAssignmentView(
      this.careerViewDeps(),
      assignmentId,
      this.buildAssignmentContext(),
    );
  }

  /**
   * Distributes a completed assignment's rewards through the existing
   * progression, mastery, and currency services (idempotent), then persists the
   * session. Safe to call more than once for the same completion — repeated calls
   * grant nothing.
   */
  distributeAssignmentRewards(completionId: string): AssignmentRewardDistributionResult {
    const result = this.assignmentRewards.distributeCompletion(completionId);
    if (result.success && !result.alreadyClaimed) {
      void this.saveSession();
    }
    return result;
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
