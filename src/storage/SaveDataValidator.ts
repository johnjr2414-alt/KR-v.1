import type { SaveData, GameSettings } from './StorageTypes';
import { SAVE_DATA_SCHEMA_VERSION, DEFAULT_GAME_SETTINGS } from './StorageTypes';
import { DEFAULT_INITIAL_PLAYER_DATA, DEFAULT_ALLOCATED_STATS, type AllocatedStats } from '../player/PlayerData';
import { ALLOCATABLE_STATS } from '../config/statAllocationConfig';
import { getTotalStatPointsForLevel, getTotalAllocatedPoints } from '../core/progression/StatAllocationService';
import { SubjectId } from '../core/types/education';
import { createInitialMasteryMap } from '../mastery/MasteryData';
import { sanitizeAnalyticsSnapshot } from '../analytics/LearningAnalytics';
import { sanitizeGatheringSnapshot } from '../gathering/GatheringService';
import { sanitizeCareerSnapshot } from '../professions/CareerService';
import { sanitizeAssignmentSnapshot } from '../professions/AssignmentService';
import { DEFAULT_INVENTORY_CAPACITY } from '../inventory/InventoryManager';
import type {
  SaveDiagnosticsReport,
  SaveSectionId,
  SaveSectionStatus,
  SectionDiagnostic,
} from './SaveDiagnostics';
import { buildRecoveryUserMessage, isRecognizableSave } from './SaveDiagnostics';

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
  /** Phase 28.3 — per-section outcome (content-free). */
  diagnostics?: SaveDiagnosticsReport;
}

/** Reads a stored schema version without importing the migration chain. */
function readSourceVersion(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const version = (raw as { version?: unknown }).version;
  return typeof version === 'number' && Number.isInteger(version) && version >= 1 ? version : null;
}

function buildDiagnosticsReport(
  raw: unknown,
  sections: SectionDiagnostic[],
): SaveDiagnosticsReport {
  const recoveredSections = sections
    .filter((s) => s.status === 'repaired' || s.status === 'reset')
    .map((s) => s.section);
  const failedSections = sections
    .filter((s) => s.status === 'failed')
    .map((s) => s.section);

  const report: SaveDiagnosticsReport = {
    sourceSchemaVersion: readSourceVersion(raw),
    currentSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
    sections,
    recoveredSections,
    failedSections,
    recognizable: isRecognizableSave(raw),
    userMessage: null,
  };
  report.userMessage = buildRecoveryUserMessage(report);
  return report;
}

function section(id: SaveSectionId, status: SaveSectionStatus, reason?: string): SectionDiagnostic {
  return reason ? { section: id, status, reason } : { section: id, status };
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** Returns true when persisted settings contain values that will be replaced. */
function settingsNeedRepair(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  const volume = (value: unknown): boolean =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

  return !(
    volume(obj.masterVolume) &&
    volume(obj.sfxVolume) &&
    volume(obj.musicVolume) &&
    typeof obj.showDamageNumbers === 'boolean' &&
    (obj.controlLayout === 'wasd' || obj.controlLayout === 'arrows')
  );
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
 *
 * Repairs every optional section independently so one malformed record cannot
 * discard the rest of the save (Phase 28.3). The returned `diagnostics` report
 * names the sections that were repaired, reset, or could not be preserved.
 * Returns validated data or errors if the player record itself is unusable.
 */
export function validateSaveData(raw: unknown): ValidationResult<SaveData> {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      errors: ['Save data is null or not an object'],
      diagnostics: buildDiagnosticsReport(raw, []),
    };
  }

  const candidate = raw as Partial<SaveData>;
  const sections: SectionDiagnostic[] = [];

  // Version
  const version = typeof candidate.version === 'number' ? candidate.version : SAVE_DATA_SCHEMA_VERSION;
  const updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now();
  if (typeof candidate.version === 'number') {
    sections.push(section('version', 'intact'));
  } else if (hasOwn(candidate, 'version')) {
    sections.push(section('version', 'repaired', 'invalid-version'));
  } else {
    sections.push(section('version', 'missing', 'absent'));
  }

  // ── Player (required) ──────────────────────────────────────────────────────
  if (!candidate.player || typeof candidate.player !== 'object') {
    errors.push('Missing or invalid player data object');
    sections.push(section('player', 'failed', 'missing-player'));
    return {
      isValid: false,
      errors,
      diagnostics: buildDiagnosticsReport(raw, sections),
    };
  }

  const p = candidate.player as Partial<SaveData['player']>;
  if (!p || typeof p.name !== 'string' || !p.name.trim()) {
    errors.push('Player name is required');
    sections.push(section('player', 'failed', 'invalid-name'));
    return {
      isValid: false,
      errors,
      diagnostics: buildDiagnosticsReport(raw, sections),
    };
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
    unallocatedStatPoints: 0,
    allocatedStats: { ...DEFAULT_ALLOCATED_STATS },
  };

  // Detect player repairs by comparing the repaired record with the source.
  const playerFieldKeys = [
    'id',
    'level',
    'currentExp',
    'maxHp',
    'currentHp',
    'maxMp',
    'currentMp',
    'attack',
    'defense',
    'intelligence',
    'critRate',
    'movementSpeed',
  ] as const;
  const rawPlayer = p as Record<string, unknown>;
  const repairedPlayerRecord = sanitizedPlayer as unknown as Record<string, unknown>;
  let playerRepaired = playerFieldKeys.some((key) => rawPlayer[key] !== repairedPlayerRecord[key]);

  let allocationRepaired = false;
  if (p.allocatedStats !== undefined) {
    if (!p.allocatedStats || typeof p.allocatedStats !== 'object') {
      allocationRepaired = true;
    } else {
      const rawAllocated = p.allocatedStats as Record<string, unknown>;
      for (const stat of ALLOCATABLE_STATS) {
        const val = rawAllocated[stat];
        if (val !== undefined && !(typeof val === 'number' && Number.isInteger(val) && val >= 0)) {
          allocationRepaired = true;
        }
      }
    }
  }
  if (
    p.unallocatedStatPoints !== undefined &&
    !(typeof p.unallocatedStatPoints === 'number' &&
      Number.isInteger(p.unallocatedStatPoints) &&
      p.unallocatedStatPoints >= 0)
  ) {
    allocationRepaired = true;
  }
  playerRepaired = playerRepaired || allocationRepaired;

  // Validate or migrate stat allocation (Phase 24.1)
  const validatedAllocatedStats: AllocatedStats = { ...DEFAULT_ALLOCATED_STATS };
  if (p.allocatedStats && typeof p.allocatedStats === 'object') {
    const rawAllocated = p.allocatedStats as Record<string, unknown>;
    for (const stat of ALLOCATABLE_STATS) {
      const val = rawAllocated[stat];
      if (typeof val === 'number' && Number.isInteger(val) && val >= 0) {
        validatedAllocatedStats[stat] = val;
      }
    }
  }
  sanitizedPlayer.allocatedStats = validatedAllocatedStats;

  if (typeof p.unallocatedStatPoints === 'number' && Number.isInteger(p.unallocatedStatPoints) && p.unallocatedStatPoints >= 0) {
    sanitizedPlayer.unallocatedStatPoints = p.unallocatedStatPoints;
  } else {
    // Migration: grant retroactive stat points for levels gained if missing
    const earned = getTotalStatPointsForLevel(sanitizedPlayer.level);
    const spent = getTotalAllocatedPoints(sanitizedPlayer.allocatedStats);
    sanitizedPlayer.unallocatedStatPoints = Math.max(0, earned - spent);
  }

  sections.push(
    playerRepaired ? section('player', 'repaired', 'invalid-fields') : section('player', 'intact'),
  );

  // ── Mastery ────────────────────────────────────────────────────────────────
  const defaultMastery = createInitialMasteryMap();
  const sanitizedMastery = { ...defaultMastery };
  let masteryRepaired = false;

  if (
    candidate.mastery !== undefined &&
    (!candidate.mastery || typeof candidate.mastery !== 'object' || Array.isArray(candidate.mastery))
  ) {
    sections.push(section('mastery', 'reset', 'invalid-object'));
  } else if (candidate.mastery === undefined) {
    sections.push(section('mastery', 'missing', 'absent'));
  } else {
    for (const subject of Object.values(SubjectId)) {
      const rec = candidate.mastery[subject];
      if (rec && typeof rec === 'object') {
        if (
          !(typeof rec.level === 'number' && rec.level >= 1) ||
          !(typeof rec.currentExp === 'number' && rec.currentExp >= 0) ||
          !(typeof rec.totalCorrect === 'number' && rec.totalCorrect >= 0) ||
          !(typeof rec.totalAttempted === 'number' && rec.totalAttempted >= 0)
        ) {
          masteryRepaired = true;
        }
        sanitizedMastery[subject] = {
          subject,
          level: typeof rec.level === 'number' && rec.level >= 1 ? rec.level : 1,
          currentExp: typeof rec.currentExp === 'number' && rec.currentExp >= 0 ? rec.currentExp : 0,
          totalCorrect: typeof rec.totalCorrect === 'number' && rec.totalCorrect >= 0 ? rec.totalCorrect : 0,
          totalAttempted: typeof rec.totalAttempted === 'number' && rec.totalAttempted >= 0 ? rec.totalAttempted : 0,
        };
      } else if (rec !== undefined) {
        masteryRepaired = true;
      }
    }
    sections.push(masteryRepaired ? section('mastery', 'repaired', 'invalid-records') : section('mastery', 'intact'));
  }

  // ── Inventory ──────────────────────────────────────────────────────────────
  let inventoryRepaired = false;
  if (candidate.inventory !== undefined && (!candidate.inventory || typeof candidate.inventory !== 'object')) {
    sections.push(section('inventory', 'reset', 'invalid-object'));
  } else if (candidate.inventory === undefined) {
    sections.push(section('inventory', 'missing', 'absent'));
  } else {
    const inv = candidate.inventory;
    if (!(typeof inv.capacity === 'number' && Number.isInteger(inv.capacity) && inv.capacity > 0)) {
      inventoryRepaired = true;
    }
    if (!Array.isArray(inv.slots)) {
      inventoryRepaired = true;
    } else if (
      inv.slots.some(
        (slot) =>
          slot !== null &&
          (typeof slot !== 'object' || typeof (slot as { itemId?: unknown }).itemId !== 'string'),
      )
    ) {
      inventoryRepaired = true;
    }
    if (inv.equipped !== undefined && (!inv.equipped || typeof inv.equipped !== 'object')) {
      inventoryRepaired = true;
    }
    if (
      inv.equippedEnhancements !== undefined &&
      (!inv.equippedEnhancements || typeof inv.equippedEnhancements !== 'object')
    ) {
      inventoryRepaired = true;
    }
    sections.push(
      inventoryRepaired ? section('inventory', 'repaired', 'invalid-fields') : section('inventory', 'intact'),
    );
  }

  const sanitizedInventory: SaveData['inventory'] = {
    capacity:
      candidate.inventory &&
      typeof candidate.inventory.capacity === 'number' &&
      Number.isInteger(candidate.inventory.capacity) &&
      candidate.inventory.capacity > 0
        ? candidate.inventory.capacity
        : DEFAULT_INVENTORY_CAPACITY,
    slots:
      candidate.inventory && Array.isArray(candidate.inventory.slots)
        ? candidate.inventory.slots.map((s, idx) =>
            s && typeof s === 'object' && typeof s.itemId === 'string'
              ? {
                  slotIndex: idx,
                  itemId: s.itemId,
                  quantity: Math.max(1, s.quantity || 1),
                  enhancementLevel: typeof s.enhancementLevel === 'number' && s.enhancementLevel > 0 ? Math.floor(s.enhancementLevel) : 0,
                }
              : null,
          )
        : Array.from({ length: DEFAULT_INVENTORY_CAPACITY }, () => null),
    equipped:
      candidate.inventory && typeof candidate.inventory.equipped === 'object' && candidate.inventory.equipped
        ? { ...candidate.inventory.equipped }
        : {},
    equippedEnhancements:
      candidate.inventory &&
      typeof candidate.inventory.equippedEnhancements === 'object' &&
      candidate.inventory.equippedEnhancements
        ? { ...candidate.inventory.equippedEnhancements }
        : {},
  };

  // ── Quests ─────────────────────────────────────────────────────────────────
  if (candidate.quests === undefined) {
    sections.push(section('quests', 'missing', 'absent'));
  } else if (!Array.isArray(candidate.quests)) {
    sections.push(section('quests', 'reset', 'invalid-type'));
  } else {
    sections.push(section('quests', 'intact'));
  }
  const sanitizedQuests = Array.isArray(candidate.quests) ? [...candidate.quests] : [];

  // ── Currency ───────────────────────────────────────────────────────────────
  let sanitizedGold = 0;
  if (candidate.currency === undefined) {
    sections.push(section('currency', 'missing', 'absent'));
  } else if (!candidate.currency || typeof candidate.currency !== 'object') {
    sections.push(section('currency', 'reset', 'invalid-object'));
  } else {
    const rawGold = candidate.currency.gold;
    if (typeof rawGold === 'number' && Number.isFinite(rawGold) && rawGold >= 0) {
      sanitizedGold = Math.floor(rawGold);
      sections.push(section('currency', 'intact'));
    } else {
      sections.push(section('currency', 'repaired', 'invalid-gold'));
    }
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  if (candidate.settings === undefined) {
    sections.push(section('settings', 'missing', 'absent'));
  } else if (!candidate.settings || typeof candidate.settings !== 'object') {
    sections.push(section('settings', 'reset', 'invalid-object'));
  } else if (settingsNeedRepair(candidate.settings)) {
    sections.push(section('settings', 'repaired', 'invalid-values'));
  } else {
    sections.push(section('settings', 'intact'));
  }
  const sanitizedSettings = validateGameSettings(candidate.settings);

  // ── Skills ─────────────────────────────────────────────────────────────────
  if (candidate.skills === undefined) {
    sections.push(section('skills', 'missing', 'absent'));
  } else if (!candidate.skills || typeof candidate.skills !== 'object') {
    sections.push(section('skills', 'reset', 'invalid-object'));
  } else {
    sections.push(section('skills', 'intact'));
  }
  const sanitizedSkills =
    candidate.skills && typeof candidate.skills === 'object'
      ? {
          unlockedSkills: candidate.skills.unlockedSkills && typeof candidate.skills.unlockedSkills === 'object' ? { ...candidate.skills.unlockedSkills } : {},
          equippedActiveSkillIds: Array.isArray(candidate.skills.equippedActiveSkillIds) ? [...candidate.skills.equippedActiveSkillIds] : [],
        }
      : undefined;

  // ── Bank ───────────────────────────────────────────────────────────────────
  if (candidate.bank === undefined) {
    sections.push(section('bank', 'missing', 'absent'));
  } else if (!candidate.bank || typeof candidate.bank !== 'object' || !candidate.bank.account) {
    sections.push(section('bank', 'reset', 'invalid-object'));
  } else {
    sections.push(section('bank', 'intact'));
  }
  const sanitizedBank =
    candidate.bank && typeof candidate.bank === 'object' && candidate.bank.account
      ? {
          account: {
            playerId: typeof candidate.bank.account.playerId === 'string' ? candidate.bank.account.playerId : 'player-1',
            savingsBalance: typeof candidate.bank.account.savingsBalance === 'number' && Number.isFinite(candidate.bank.account.savingsBalance) && candidate.bank.account.savingsBalance >= 0 ? Math.floor(candidate.bank.account.savingsBalance) : 0,
            lastInterestAppliedAt: typeof candidate.bank.account.lastInterestAppliedAt === 'number' ? candidate.bank.account.lastInterestAppliedAt : Date.now(),
          },
          activeInvestments: Array.isArray(candidate.bank.activeInvestments) ? [...candidate.bank.activeInvestments] : [],
          businesses: Array.isArray(candidate.bank.businesses) ? [...candidate.bank.businesses] : [],
        }
      : undefined;

  // ── Optional snapshots ─────────────────────────────────────────────────────
  const snapshotStatus = (value: unknown): SaveSectionStatus => {
    if (value === undefined) return 'missing';
    if (!value || typeof value !== 'object') return 'reset';
    return 'intact';
  };

  sections.push(section('analytics', snapshotStatus(candidate.analytics)));
  const sanitizedAnalytics = sanitizeAnalyticsSnapshot(candidate.analytics);

  sections.push(section('gathering', snapshotStatus(candidate.gathering)));
  const sanitizedGathering = sanitizeGatheringSnapshot(candidate.gathering);

  sections.push(section('careers', snapshotStatus(candidate.careers)));
  const sanitizedCareers = sanitizeCareerSnapshot(candidate.careers);

  sections.push(section('assignments', snapshotStatus(candidate.assignments)));
  const sanitizedAssignments = sanitizeAssignmentSnapshot(candidate.assignments);

  return {
    isValid: true,
    errors: [],
    diagnostics: buildDiagnosticsReport(raw, sections),
    data: {
      version,
      updatedAt,
      player: sanitizedPlayer,
      mastery: sanitizedMastery,
      inventory: sanitizedInventory,
      quests: sanitizedQuests,
      skills: sanitizedSkills,
      bank: sanitizedBank,
      currency: {
        gold: sanitizedGold,
      },
      analytics: sanitizedAnalytics,
      gathering: sanitizedGathering,
      careers: sanitizedCareers,
      assignments: sanitizedAssignments,
      settings: sanitizedSettings,
    },
  };
}
