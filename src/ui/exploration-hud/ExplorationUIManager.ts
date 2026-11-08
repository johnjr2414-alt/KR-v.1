import Phaser from 'phaser';
import { ExplorationHUD } from './ExplorationHUD';
import { InventoryPanel } from '../inventory-panel';
import { MasteryPanel } from '../mastery-panel';
import { PauseModal } from '../pause-modal';
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
  private activePauseModal: PauseModal | null = null;
  private readonly onQuitToMenu?: () => void;

  private keyI!: Phaser.Input.Keyboard.Key;
  private keyM!: Phaser.Input.Keyboard.Key;
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
      onOpenMastery: () => this.toggleMastery(),
    });
    this.hud.show();
  }

  private initKeyboardShortcuts(): void {
    if (!this.scene.input || !this.scene.input.keyboard) return;

    this.keyI = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.keyM = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.keyEsc = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.keyI.on('down', () => {
      if (this.isTypingInInput()) return;
      this.toggleInventory();
    });

    this.keyM.on('down', () => {
      if (this.isTypingInInput()) return;
      this.toggleMastery();
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
      this.activePauseModal !== null
    );
  }

  private handleEscape(): void {
    // If an inventory or mastery panel is open, close it first
    if (this.activeInventoryPanel) {
      this.closeInventory();
      return;
    }
    if (this.activeMasteryPanel) {
      this.closeMastery();
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
      // Close mastery if open
      if (this.activeMasteryPanel) {
        this.closeMastery();
      }
      this.openInventory();
    }
  }

  toggleMastery(): void {
    if (this.activeMasteryPanel) {
      this.closeMastery();
    } else {
      // Close inventory if open
      if (this.activeInventoryPanel) {
        this.closeInventory();
      }
      this.openMastery();
    }
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
    if (this.keyEsc) {
      this.keyEsc.removeAllListeners();
    }

    this.hud?.destroy();
    this.hud = null;

    this.activeInventoryPanel?.destroy();
    this.activeInventoryPanel = null;

    this.activeMasteryPanel?.destroy();
    this.activeMasteryPanel = null;

    this.activePauseModal?.destroy();
    this.activePauseModal = null;

    this.inputAdapter.setInputEnabled(true);
  }
}
