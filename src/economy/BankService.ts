import type { BankAccount, BankConfig, InvestmentOpportunity, BusinessModel } from './BankTypes';
import { DEFAULT_BANK_CONFIG } from './BankTypes';
import { CurrencyService, currencyService } from './CurrencyService';

/**
 * Headless Bank & Savings Service.
 * Implements bank deposit, withdrawal, configurable interest accrual,
 * investment maturation, and player-owned business accounting.
 */
export class BankService {
  private account: BankAccount;
  private readonly config: BankConfig;
  private currency: CurrencyService;
  private investments: Map<string, InvestmentOpportunity> = new Map();
  private businesses: Map<string, BusinessModel> = new Map();

  constructor(
    playerId = 'player-1',
    currency: CurrencyService = currencyService,
    config: BankConfig = DEFAULT_BANK_CONFIG,
    initialSavings = 0,
  ) {
    this.currency = currency;
    this.config = config;
    this.account = {
      playerId,
      savingsBalance: initialSavings,
      lastInterestAppliedAt: Date.now(),
    };
  }

  getSavingsBalance(): number {
    return this.account.savingsBalance;
  }

  getAccount(): Readonly<BankAccount> {
    return { ...this.account };
  }

  deposit(amount: number): boolean {
    const validAmount = Math.floor(amount);
    if (validAmount <= 0) return false;

    if (!this.currency.hasGold(validAmount)) {
      return false;
    }

    if (this.account.savingsBalance + validAmount > this.config.maxSavingsLimit) {
      return false;
    }

    this.currency.spendGold(validAmount);
    this.account.savingsBalance += validAmount;
    return true;
  }

  withdraw(amount: number): boolean {
    const validAmount = Math.floor(amount);
    if (validAmount <= 0) return false;

    if (this.account.savingsBalance < validAmount) {
      return false;
    }

    this.account.savingsBalance -= validAmount;
    this.currency.addGold(validAmount);
    return true;
  }

  /**
   * Applies interest if interval time has elapsed.
   * Returns amount of interest earned.
   */
  applyInterest(currentTime = Date.now()): number {
    const elapsed = currentTime - this.account.lastInterestAppliedAt;
    if (elapsed < this.config.interestIntervalMs) {
      return 0;
    }

    const intervals = Math.floor(elapsed / this.config.interestIntervalMs);
    let totalInterest = 0;

    for (let i = 0; i < intervals; i++) {
      const interest = Math.floor(this.account.savingsBalance * this.config.interestRatePerInterval);
      if (interest <= 0) break;
      this.account.savingsBalance = Math.min(
        this.config.maxSavingsLimit,
        this.account.savingsBalance + interest,
      );
      totalInterest += interest;
    }

    this.account.lastInterestAppliedAt += intervals * this.config.interestIntervalMs;
    return totalInterest;
  }

  // ── Investments ──────────────────────────────────────────────
  startInvestment(opp: InvestmentOpportunity, currentTime = Date.now()): boolean {
    if (this.investments.has(opp.id)) return false;
    if (!this.currency.hasGold(opp.cost)) return false;

    this.currency.spendGold(opp.cost);
    this.investments.set(opp.id, {
      ...opp,
      startedAt: currentTime,
      isMatured: false,
    });
    return true;
  }

  claimInvestment(investmentId: string, currentTime = Date.now()): { success: boolean; payout: number } {
    const inv = this.investments.get(investmentId);
    if (!inv || !inv.startedAt) return { success: false, payout: 0 };

    const elapsed = currentTime - inv.startedAt;
    if (elapsed < inv.durationMs) {
      return { success: false, payout: 0 }; // Not yet matured
    }

    const payout = Math.floor(inv.cost * (1 + inv.expectedReturnRate));
    this.currency.addGold(payout);
    this.investments.delete(investmentId);

    return { success: true, payout };
  }

  // ── Businesses ───────────────────────────────────────────────
  registerBusiness(business: BusinessModel): void {
    this.businesses.set(business.id, { ...business });
  }

  getBusiness(businessId: string): BusinessModel | undefined {
    return this.businesses.get(businessId);
  }

  calculateDailyNetProfit(businessId: string): number {
    const biz = this.businesses.get(businessId);
    if (!biz) return 0;
    return biz.dailyRevenue - biz.dailyExpenses;
  }
}

export const bankService = new BankService();
