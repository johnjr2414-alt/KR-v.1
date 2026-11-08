import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { validateGameSettings } from '../../src/storage/SaveDataValidator';
import { DEFAULT_GAME_SETTINGS } from '../../src/storage/StorageTypes';

describe('Phase 21.6 — Pause Menu and Settings Unit Tests', () => {
  let storage: InMemoryStorageService;
  let session: PlayerSessionManager;

  beforeEach(() => {
    PlayerSessionManager.resetInstance();
    storage = new InMemoryStorageService();
    session = PlayerSessionManager.getInstance({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(),
      currency: new CurrencyService(100),
      progression: new ProgressionService(),
    });
  });

  it('1. Settings validator clamps volume within [0.0, 1.0] and enforces boolean/layout defaults', () => {
    const raw = {
      masterVolume: 1.5, // exceeds 1.0 -> should clamp to 1.0
      sfxVolume: -0.2, // below 0.0 -> should clamp to 0.0
      musicVolume: 'invalid', // not number -> fallback to default
      showDamageNumbers: false,
      controlLayout: 'arrows',
    };

    const validated = validateGameSettings(raw);
    expect(validated.masterVolume).toBe(1.0);
    expect(validated.sfxVolume).toBe(0.0);
    expect(validated.musicVolume).toBe(DEFAULT_GAME_SETTINGS.musicVolume);
    expect(validated.showDamageNumbers).toBe(false);
    expect(validated.controlLayout).toBe('arrows');
  });

  it('2. PlayerSessionManager updates and persists settings to storage', async () => {
    await session.initializeSession('Hero');

    session.updateSettings({
      masterVolume: 0.45,
      showDamageNumbers: false,
    });

    const activeSettings = session.getSettings();
    expect(activeSettings.masterVolume).toBe(0.45);
    expect(activeSettings.showDamageNumbers).toBe(false);

    // Verify persisted settings survive in storage
    const loaded = await storage.loadGame();
    expect(loaded?.settings.masterVolume).toBe(0.45);
    expect(loaded?.settings.showDamageNumbers).toBe(false);
  });

  it('3. Pre-quit session save cleanly snapshots player state before exiting', async () => {
    await session.initializeSession('Leaving Hero');
    session.currency.addGold(50);
    session.inventory.addItem('wooden-sword', 1);

    // Save session (simulating the pre-quit action in PauseModal)
    const saveSuccess = await session.saveSession();
    expect(saveSuccess).toBe(true);

    const saved = await storage.loadGame();
    expect(saved?.player.name).toBe('Leaving Hero');
    expect(saved?.currency?.gold).toBe(150);
    expect(saved?.inventory.slots.some((s) => s?.itemId === 'wooden-sword')).toBe(true);
  });
});
