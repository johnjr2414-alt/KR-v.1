import Phaser from 'phaser';
import { ExplorationHUD } from './ExplorationHUD';
import { InventoryPanel } from '../inventory-panel';
import { MasteryPanel } from '../mastery-panel';
import { PauseModal } from '../pause-modal';
import { QuestJournal } from '../quest-journal';
import { SkillModal } from '../skill-modal';
import { playerSessionManager } from '../../player';
import { PhaserInputAdapter } from '../../player/movement/PhaserInputAdapter';

export interface ExplorationUIManagerOptions {
  scene: Phaser.Scene;
  inputAdapter: PhaserInputAdapter;
  playerSprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  onQuitToMenu?: () => void;
}

/**
 * ExplorationUIManager — Coordinates HUD, panel overlays, keyboard shortcuts (I, M),
 * and movement suspension across exploration scenes (VillageScene, HuntingScene).
 */
export class ExplorationUIManager {
  private readonly scene: Phaser.Scene;
  private readonly inputAdapter: PhaserInputAdapter;
  private readonly playerSprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

  private hud: ExplorationHUD | null = null;
  private activeInventoryPanel: InventoryPanel | null = null;
  private activeMasteryPanel: MasteryPanel | null = null;
  private activeQuestJournal: QuestJournal | null = null;
  private activeSkillModal: SkillModal | null = null;
  private activePauseModal: PauseModal | null = null;
  private readonly onQuitToMenu?: () => void;

  private keyI!: Phaser.Input.Keyboard.Key;
  private keyM!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyK!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;

  constructor(options: ExplorationUIManagerOptions) {
    this.scene = options.scene;
    this.inputAdapter = options.inputAdapter;
    this.playerSprite = options.playerSprite;
    this.onQuitToMenu = options.onQuitToMenu;

    this.initHUD();
    this.initKeyboardShortcuts();
  }

  private initHUD(): void {
    this.hud = new ExplorationHUD({
      onOpenInventory: () => this.toggleInventory(),
      onOpenSkills: () => this.toggleSkills(),
      onOpenMastery: () => this.toggleMastery(),
      onOpenQuests: () => this.toggleQuests(),
    });
    this.hud.show();
  }

  private initKeyboardShortcuts(): void {
    if (!this.scene.input || !this.scene.input.keyboard) return;

    this.keyI = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.keyM = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.keyQ = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyK = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keyEsc = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.keyI.on('down', () => {
      if (this.isTypingInInput()) return;
      this.toggleInventory();
    });

    this.keyM.on('down', () => {
      if (this.isTypingInInput()) return;
      this.toggleMastery();
    });

    this.keyQ.on('down', () => {
      if (this.isTypingInInput()) return;
      this.toggleQuests();
    });

    this.keyK.on('down', () => {
      if (this.isTypingInInput()) return;
      this.toggleSkills();
    });

    this.keyEsc.on('down', () => {
      if (this.isTypingInInput()) return;
      this.handleEscape();
    });
  }

  isPanelOpen(): boolean {
    return (
      this.activeInventoryPanel !== null ||
      this.activeMasteryPanel !== null ||
      this.activeQuestJournal !== null ||
      this.activeSkillModal !== null ||
      this.activePauseModal !== null
    );
  }

  private handleEscape(): void {
    // If an inventory, mastery, quest, or skill panel is open, close it first
    if (this.activeInventoryPanel) {
      this.closeInventory();
      return;
    }
    if (this.activeSkillModal) {
      this.closeSkills();
      return;
    }
    if (this.activeMasteryPanel) {
      this.closeMastery();
      return;
    }
    if (this.activeQuestJournal) {
      this.closeQuests();
      return;
    }
    // Otherwise toggle pause menu
    this.togglePause();
  }

  togglePause(): void {
    if (this.activePauseModal) {
      this.closePause();
    } else {
      this.openPause();
    }
  }

  openPause(): void {
    this.freezePlayerMovement();

    this.activePauseModal = new PauseModal({
      onResume: () => {
        this.closePause();
      },
      onQuitToMenu: () => {
        this.closePause();
        this.onQuitToMenu?.();
      },
    });

    this.activePauseModal.show();
  }

  closePause(): void {
    if (this.activePauseModal) {
      this.activePauseModal.destroy();
      this.activePauseModal = null;
    }
    this.unfreezePlayerMovement();
  }

  private isTypingInInput(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || (active as HTMLElement).isContentEditable;
  }

  toggleInventory(): void {
    if (this.activeInventoryPanel) {
      this.closeInventory();
    } else {
      this.closeAllModals();
      this.openInventory();
    }
  }

  toggleMastery(): void {
    if (this.activeMasteryPanel) {
      this.closeMastery();
    } else {
      this.closeAllModals();
      this.openMastery();
    }
  }

  toggleQuests(): void {
    if (this.activeQuestJournal) {
      this.closeQuests();
    } else {
      this.closeAllModals();
      this.openQuests();
    }
  }

  openQuests(): void {
    this.freezePlayerMovement();

    this.activeQuestJournal = new QuestJournal({
      onClose: () => {
        this.closeQuests();
      },
    });

    this.activeQuestJournal.show();
  }

  closeQuests(): void {
    if (this.activeQuestJournal) {
      this.activeQuestJournal.destroy();
      this.activeQuestJournal = null;
    }
    this.unfreezePlayerMovement();
  }

  toggleSkills(): void {
    if (this.activeSkillModal) {
      this.closeSkills();
    } else {
      this.closeAllModals();
      this.openSkills();
    }
  }

  openSkills(): void {
    this.freezePlayerMovement();

    this.activeSkillModal = new SkillModal({
      skillManager: playerSessionManager.skills,
      onClose: () => {
        this.closeSkills();
      },
      onStateChange: () => {
        this.hud?.refresh();
      },
    });

    this.activeSkillModal.show();
  }

  closeSkills(): void {
    if (this.activeSkillModal) {
      this.activeSkillModal.destroy();
      this.activeSkillModal = null;
    }
    this.unfreezePlayerMovement();
  }

  private closeAllModals(): void {
    if (this.activeInventoryPanel) this.closeInventory();
    if (this.activeSkillModal) this.closeSkills();
    if (this.activeMasteryPanel) this.closeMastery();
    if (this.activeQuestJournal) this.closeQuests();
    if (this.activePauseModal) this.closePause();
  }

  openInventory(): void {
    this.freezePlayerMovement();

    const player = playerSessionManager.getPlayer();
    this.activeInventoryPanel = new InventoryPanel({
      manager: playerSessionManager.inventory,
      playerLevel: player.level,
      onClose: () => {
        this.closeInventory();
      },
      onStateChange: () => {
        // Equipment change occurred: update session save and refresh HUD
        void playerSessionManager.saveSession();
        this.hud?.refresh();
      },
    });

    this.activeInventoryPanel.show();
  }

  closeInventory(): void {
    if (this.activeInventoryPanel) {
      this.activeInventoryPanel.destroy();
      this.activeInventoryPanel = null;
    }
    this.unfreezePlayerMovement();
  }

  openMastery(): void {
    this.freezePlayerMovement();

    this.activeMasteryPanel = new MasteryPanel({
      manager: playerSessionManager.mastery,
      onClose: () => {
        this.closeMastery();
      },
    });

    this.activeMasteryPanel.show();
  }

  closeMastery(): void {
    if (this.activeMasteryPanel) {
      this.activeMasteryPanel.destroy();
      this.activeMasteryPanel = null;
    }
    this.unfreezePlayerMovement();
  }

  private freezePlayerMovement(): void {
    this.inputAdapter.setInputEnabled(false);
    this.playerSprite.setVelocity(0, 0);
  }

  private unfreezePlayerMovement(): void {
    if (!this.isPanelOpen()) {
      this.inputAdapter.setInputEnabled(true);
    }
  }

  refreshHUD(): void {
    this.hud?.refresh();
  }

  destroy(): void {
    if (this.keyI) {
      this.keyI.removeAllListeners();
    }
    if (this.keyM) {
      this.keyM.removeAllListeners();
    }
    if (this.keyQ) {
      this.keyQ.removeAllListeners();
    }
    if (this.keyK) {
      this.keyK.removeAllListeners();
    }
    if (this.keyEsc) {
      this.keyEsc.removeAllListeners();
    }

    this.hud?.destroy();
    this.hud = null;

    this.activeInventoryPanel?.destroy();
    this.activeInventoryPanel = null;

    this.activeSkillModal?.destroy();
    this.activeSkillModal = null;

    this.activeMasteryPanel?.destroy();
    this.activeMasteryPanel = null;

    this.activeQuestJournal?.destroy();
    this.activeQuestJournal = null;

    this.activePauseModal?.destroy();
    this.activePauseModal = null;

    this.inputAdapter.setInputEnabled(true);
  }
}
