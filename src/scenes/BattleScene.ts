import Phaser from 'phaser';
import type { MonsterDefinition } from '../core/types/monster';
import { type PlayerData, playerSessionManager, createPlayerData } from '../player';
import { BattleSession } from '../combat/BattleSession';
import { QuestionRepository } from '../questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../questions/retrieval/QuestionLoader';
import { BattleOverlay } from '../ui/battle-overlay/BattleOverlay';
import { QuestionModal } from '../ui/question-modal/QuestionModal';
import { AnswerOutcome } from '../core/types/combat';
import '../ui/battle-overlay/battle-overlay.css';
import '../ui/question-modal/question-modal.css';
import '../ui/inventory-panel/inventory-panel.css';

export interface BattleSceneInitData {
  monster: MonsterDefinition;
  player?: PlayerData;
  returnSceneKey?: string;
  returnPosition?: { x: number; y: number };
}

/**
 * BattleScene — Visual Phaser representation and orchestrator for turn-based battle encounters.
 * Coordinates the headless BattleSession with QuestionModal and BattleOverlay.
 */
export class BattleScene extends Phaser.Scene {
  static readonly KEY = 'BattleScene';

  private monster!: MonsterDefinition;
  private player!: PlayerData;
  private returnSceneKey = 'HuntingScene';
  private returnPosition = { x: 100, y: 400 };

  private session!: BattleSession;
  private overlay!: BattleOverlay;
  private activeQuestionModal: QuestionModal | null = null;

  private playerVisual!: Phaser.GameObjects.Graphics;
  private monsterVisual!: Phaser.GameObjects.Graphics;
  private rewardsProcessed = false;

  constructor() {
    super({ key: BattleScene.KEY });
  }

  init(data: BattleSceneInitData): void {
    this.rewardsProcessed = false;
    this.monster = data.monster;
    if (playerSessionManager.isInitialized()) {
      this.player = playerSessionManager.getPlayer();
    } else if (data.player) {
      this.player = data.player;
    } else {
      this.player = createPlayerData('player-1', 'Novice Hero');
    }

    if (data.returnSceneKey) this.returnSceneKey = data.returnSceneKey;
    if (data.returnPosition) this.returnPosition = { ...data.returnPosition };
  }

  create(): void {
    const { width, height } = this.scale;

    // Arena background
    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle combat ring
    bg.lineStyle(2, 0x1e293b, 1);
    bg.strokeCircle(width / 2, height / 2 + 50, 180);

    // Render placeholder combatants
    this.createCombatantVisuals(width, height);

    // Setup question repository with bundled questions
    const bundled = loadBundledQuestions();
    const repo = new QuestionRepository(bundled.questions);

    // Initialize headless BattleSession using active player session managers
    this.session = new BattleSession({
      player: this.player,
      monster: this.monster,
      repository: repo,
      masteryManager: playerSessionManager.mastery,
    });

    // Create DOM Battle HUD overlay
    this.overlay = new BattleOverlay({
      session: this.session,
      onContinue: () => {
        this.exitBattle();
      },
    });
    this.overlay.show();

    // Start first question round
    this.time.delayedCall(600, () => {
      this.promptNextQuestion();
    });
  }

  private createCombatantVisuals(width: number, height: number): void {
    // Player on left
    const playerX = width / 2 - 140;
    const playerY = height / 2 + 40;

    this.playerVisual = this.add.graphics();
    this.playerVisual.fillStyle(0x3b82f6, 1);
    this.playerVisual.fillRoundedRect(playerX - 25, playerY - 35, 50, 70, 8);
    this.playerVisual.lineStyle(2, 0x60a5fa, 1);
    this.playerVisual.strokeRoundedRect(playerX - 25, playerY - 35, 50, 70, 8);

    this.add.text(playerX, playerY + 45, this.player.name, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#93c5fd',
    }).setOrigin(0.5);

    // Monster on right
    const monsterX = width / 2 + 140;
    const monsterY = height / 2 + 40;

    this.monsterVisual = this.add.graphics();
    this.monsterVisual.fillStyle(this.monster.spriteColor || 0xef4444, 1);
    this.monsterVisual.fillRoundedRect(monsterX - 30, monsterY - 40, 60, 80, 8);
    this.monsterVisual.lineStyle(2, 0xfca5a5, 1);
    this.monsterVisual.strokeRoundedRect(monsterX - 30, monsterY - 40, 60, 80, 8);

    this.add.text(monsterX, monsterY + 50, `${this.monster.name} (Lv.${this.monster.level})`, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#fca5a5',
    }).setOrigin(0.5);
  }

  private promptNextQuestion(): void {
    if (this.session.isBattleOver()) {
      this.finishBattle();
      return;
    }

    const question = this.session.getCurrentQuestion();
    if (!question) {
      this.finishBattle();
      return;
    }

    this.session.beginTurn();
    this.overlay.update();

    this.activeQuestionModal = new QuestionModal({
      question,
      onAnswer: (evaluation) => {
        const turnResult = this.session.processAnswer(evaluation);
        this.overlay.update();

        // Animate combat hit
        if (turnResult.outcome === AnswerOutcome.Correct) {
          this.animatePlayerAttack(turnResult.damageToMonster, turnResult.isCritical);
        } else {
          this.animateMonsterAttack(turnResult.damageToPlayer);
        }
      },
      onClose: () => {
        this.activeQuestionModal = null;
        if (this.session.isBattleOver()) {
          this.finishBattle();
        } else {
          this.time.delayedCall(400, () => {
            this.promptNextQuestion();
          });
        }
      },
    });

    this.activeQuestionModal.show();
  }

  private animatePlayerAttack(damage: number, isCritical: boolean): void {
    this.tweens.add({
      targets: this.playerVisual,
      x: '+=30',
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.monsterVisual,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    const critText = isCritical ? ' CRIT!' : '';
    this.overlay.showLogMessage(`⚔️ Player deals ${damage} damage!${critText}`);
  }

  private animateMonsterAttack(damage: number): void {
    this.tweens.add({
      targets: this.monsterVisual,
      x: '-=30',
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.playerVisual,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    this.overlay.showLogMessage(`💥 Monster retaliates for ${damage} damage!`);
  }

  private finishBattle(): void {
    const summary = this.session.getEndSummary();

    // Idempotent reward processing guard: process exactly once
    if (!this.rewardsProcessed) {
      this.rewardsProcessed = true;

      // Sync remaining HP to active player
      this.player.currentHp = summary.remainingPlayerHp;

      if (summary.monsterDefeated) {
        // 1. Award combat EXP via ProgressionService
        if (summary.expEarned > 0) {
          playerSessionManager.progression.awardExp(this.player, summary.expEarned);
        }

        // 2. Award Gold via CurrencyService
        if (summary.goldEarned > 0) {
          playerSessionManager.currency.addGold(summary.goldEarned);
        }

        // 3. Deposit victory item drops into active inventory
        if (summary.droppedItems && summary.droppedItems.length > 0) {
          for (const drop of summary.droppedItems) {
            playerSessionManager.inventory.addItem(drop.itemId, drop.quantity);
          }
        }
      } else if (summary.playerDefeated) {
        // Player defeated: Defeat handling & respawn preparation
        // Fully restore player HP on defeat/respawn (configured default respawn rule)
        this.player.currentHp = this.player.maxHp;
        // Point return scene to Beginners Village plaza
        this.returnSceneKey = 'VillageScene';
        this.returnPosition = { x: 600, y: 550 };
      }

      // Auto-save session upon battle resolution
      void playerSessionManager.saveSession();
    }

    this.overlay.showEndSummary(summary);
  }

  private exitBattle(): void {
    this.activeQuestionModal?.destroy();
    this.activeQuestionModal = null;
    this.overlay?.destroy();

    // Auto-save before transitioning out of battle
    void playerSessionManager.saveSession();

    this.scene.start(this.returnSceneKey, {
      spawnPosition: this.returnPosition,
    });
  }

  shutdown(): void {
    this.activeQuestionModal?.destroy();
    this.activeQuestionModal = null;
    this.overlay?.destroy();
  }
}
