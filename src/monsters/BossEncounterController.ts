import { EliteEncounterDefinition, BossPhase } from './EliteBossRegistry';

/**
 * State tracking for an active Elite or Boss encounter session.
 */
export interface EncounterProgressState {
  encounterId: string;
  encounterDef: EliteEncounterDefinition;
  currentPhaseIndex: number;
  currentPhase: BossPhase | null;
  phaseTransitionOccurred: boolean;
  phaseAlertMessage?: string;
  clearedBefore: boolean;
}

/**
 * Headless controller for Elite/Boss mechanics.
 * Monitors HP thresholds during combat, coordinates phase shifts, and protects first-clear rewards.
 */
export class BossEncounterController {
  private progress: EncounterProgressState;

  constructor(
    encounterDef: EliteEncounterDefinition,
    alreadyCleared = false,
  ) {
    const phases = encounterDef.phases || [];
    const firstPhase = phases.length > 0 ? phases[0] : null;

    this.progress = {
      encounterId: encounterDef.id,
      encounterDef,
      currentPhaseIndex: 0,
      currentPhase: firstPhase,
      phaseTransitionOccurred: false,
      clearedBefore: alreadyCleared,
    };
  }

  getProgress(): Readonly<EncounterProgressState> {
    return { ...this.progress };
  }

  /**
   * Evaluates the current monster HP against configured phase thresholds.
   * Returns true if a phase transition was triggered.
   */
  evaluateHpThreshold(currentHp: number, maxHp: number): boolean {
    const phases = this.progress.encounterDef.phases;
    if (!phases || phases.length <= 1) {
      return false;
    }

    const hpPercent = (currentHp / maxHp) * 100;
    this.progress.phaseTransitionOccurred = false;
    this.progress.phaseAlertMessage = undefined;

    // Check next phase threshold
    const nextPhaseIndex = this.progress.currentPhaseIndex + 1;
    if (nextPhaseIndex < phases.length) {
      const candidatePhase = phases[nextPhaseIndex];
      if (hpPercent <= candidatePhase.hpThresholdPercent) {
        this.progress.currentPhaseIndex = nextPhaseIndex;
        this.progress.currentPhase = candidatePhase;
        this.progress.phaseTransitionOccurred = true;
        this.progress.phaseAlertMessage = candidatePhase.phaseEnrageMessage;
        return true;
      }
    }

    return false;
  }

  /**
   * Applies the current phase multipliers to monster attack and defense.
   */
  getEffectiveBossStats(baseAttack: number, baseDefense: number): { attack: number; defense: number } {
    if (!this.progress.currentPhase) {
      return { attack: baseAttack, defense: baseDefense };
    }

    return {
      attack: Math.round(baseAttack * this.progress.currentPhase.attackMultiplier),
      defense: Math.round(baseDefense * this.progress.currentPhase.defenseMultiplier),
    };
  }

  /**
   * Resolves first-clear bonus idempotently.
   * Only returns the bonus if the player hasn't cleared this encounter before.
   */
  claimFirstClearBonus(): EliteEncounterDefinition['firstClearBonus'] | null {
    if (this.progress.clearedBefore) {
      return null;
    }

    if (!this.progress.encounterDef.firstClearBonus) {
      return null;
    }

    this.progress.clearedBefore = true;
    return { ...this.progress.encounterDef.firstClearBonus };
  }
}
