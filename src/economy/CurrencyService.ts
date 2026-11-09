export interface TransactionResult {
  success: boolean;
  amount: number;
  newBalance: number;
  error?: string;
}

export type BalanceChangeListener = (newBalance: number, delta: number) => void;

/**
 * Headless Currency Service.
 * Manages player Gold balance, strictly preventing negative balances and enforcing integer rounding.
 */
export class CurrencyService {
  private gold: number;
  private listeners: BalanceChangeListener[] = [];

  constructor(initialGold = 0) {
    this.gold = Math.max(0, Math.floor(initialGold));
  }

  getGold(): number {
    return this.gold;
  }

  onBalanceChange(listener: BalanceChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  addGold(amount: number): TransactionResult {
    const validAmount = Math.floor(amount);
    if (validAmount <= 0) {
      return {
        success: false,
        amount: 0,
        newBalance: this.gold,
        error: 'Amount to add must be positive',
      };
    }

    this.gold += validAmount;
    this.notifyListeners(validAmount);

    return {
      success: true,
      amount: validAmount,
      newBalance: this.gold,
    };
  }

  spendGold(amount: number): TransactionResult {
    const validAmount = Math.floor(amount);
    if (validAmount <= 0) {
      return {
        success: false,
        amount: 0,
        newBalance: this.gold,
        error: 'Amount to spend must be positive',
      };
    }

    if (this.gold < validAmount) {
      return {
        success: false,
        amount: 0,
        newBalance: this.gold,
        error: `Insufficient funds. Required: ${validAmount}, Available: ${this.gold}`,
      };
    }

    this.gold -= validAmount;
    this.notifyListeners(-validAmount);

    return {
      success: true,
      amount: validAmount,
      newBalance: this.gold,
    };
  }

  hasGold(amount: number): boolean {
    return this.gold >= Math.floor(amount);
  }

  /**
   * Sets the gold balance directly (used when loading a saved session).
   */
  setGold(amount: number): void {
    const validAmount = typeof amount === 'number' && Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    const delta = validAmount - this.gold;
    this.gold = validAmount;
    if (delta !== 0) {
      this.notifyListeners(delta);
    }
  }

  private notifyListeners(delta: number): void {
    for (const listener of this.listeners) {
      listener(this.gold, delta);
    }
  }
}

export const currencyService = new CurrencyService(100);
