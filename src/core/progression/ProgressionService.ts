import type { PlayerData } from '../../player/PlayerData';
import {
  DEFAULT_EXP_CONFIG,
  getRequiredExpForNextLevel,
  type ExpFormulaConfig,
} from '../../config/expConfig';
import {
  DEFAULT_STAT_GROWTH_CONFIG,
  type StatGrowthConfig,
} from '../../config/statGrowthConfig';
import {
  applyLevelStatsToPlayer,
} from './StatGrowthService';

/**
 * Event payload emitted when a player character gains one or more levels.
 */
export interface LevelUpEvent {
  playerId: string;
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
  player: PlayerData;
}

/**
 * Comprehensive result of an EXP award operation.
 */
export interface ExpAwardResult {
  expAwarded: number;
  previousLevel: number;
  newLevel: number;
  previousExp: number;
  currentExp: number;
  expRequiredForNextLevel: number;
  leveledUp: boolean;
  levelUpEvents: LevelUpEvent[];
  player: PlayerData;
}

export type LevelUpListener = (event: LevelUpEvent) => void;

export interface ProgressionServiceOptions {
  expConfig?: ExpFormulaConfig;
  statGrowthConfig?: StatGrowthConfig;
}

/**
 * Player progression service.
 * Handles awarding character combat EXP, calculating level-ups, and updating stats.
 */
export class ProgressionService {
  private expConfig: ExpFormulaConfig;
  private statGrowthConfig: StatGrowthConfig;
  private levelUpListeners: LevelUpListener[] = [];

  constructor(options: ProgressionServiceOptions = {}) {
    this.expConfig = options.expConfig ?? DEFAULT_EXP_CONFIG;
    this.statGrowthConfig = options.statGrowthConfig ?? DEFAULT_STAT_GROWTH_CONFIG;
  }

  /**
   * Register a callback listener for level-up notifications.
   */
  onLevelUp(listener: LevelUpListener): () => void {
    this.levelUpListeners.push(listener);
    return () => {
      this.levelUpListeners = this.levelUpListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Awards combat EXP to a player, processing any resulting level-ups.
   *
   * @throws Error if expAmount is negative, NaN, or non-finite.
   */
  awardExp(player: PlayerData, expAmount: number): ExpAwardResult {
    if (typeof expAmount !== 'number' || !Number.isFinite(expAmount) || expAmount < 0) {
      throw new Error(`Invalid EXP amount: ${expAmount}. EXP awarded must be a non-negative finite number.`);
    }

    if (player.currentExp < 0) {
      player.currentExp = 0;
    }

    const previousLevel = player.level;
    const previousExp = player.currentExp;
    const levelUpEvents: LevelUpEvent[] = [];

    // If already at maximum level, no further EXP is accrued toward leveling
    if (player.level >= this.expConfig.maxLevel) {
      player.currentExp = 0;
      return {
        expAwarded: expAmount,
        previousLevel,
        newLevel: player.level,
        previousExp,
        currentExp: 0,
        expRequiredForNextLevel: 0,
        leveledUp: false,
        levelUpEvents: [],
        player,
      };
    }

    player.currentExp += expAmount;

    // Process potential multiple level-ups
    while (player.level < this.expConfig.maxLevel) {
      const requiredExp = getRequiredExpForNextLevel(player.level, this.expConfig);
      if (player.currentExp >= requiredExp) {
        player.currentExp -= requiredExp;
        const oldLevel = player.level;
        player.level += 1;

        // Apply level-based stat growth
        applyLevelStatsToPlayer(player, this.statGrowthConfig);

        const event: LevelUpEvent = {
          playerId: player.id,
          previousLevel: oldLevel,
          newLevel: player.level,
          levelsGained: 1,
          player,
        };

        levelUpEvents.push(event);
        this.notifyListeners(event);
      } else {
        break;
      }
    }

    // If max level was reached during this award, cap currentExp to 0
    if (player.level >= this.expConfig.maxLevel) {
      player.currentExp = 0;
    }

    const expRequiredForNextLevel = getRequiredExpForNextLevel(player.level, this.expConfig);

    return {
      expAwarded: expAmount,
      previousLevel,
      newLevel: player.level,
      previousExp,
      currentExp: player.currentExp,
      expRequiredForNextLevel,
      leveledUp: levelUpEvents.length > 0,
      levelUpEvents,
      player,
    };
  }

  private notifyListeners(event: LevelUpEvent): void {
    for (const listener of this.levelUpListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in LevelUpListener:', err);
      }
    }
  }
}

/** Global default progression service instance. */
export const progressionService = new ProgressionService();
