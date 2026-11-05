export interface BankAccount {
  playerId: string;
  savingsBalance: number;
  lastInterestAppliedAt: number; // timestamp
}

export interface BankConfig {
  interestRatePerInterval: number; // e.g. 0.02 (2% per interest tick)
  interestIntervalMs: number; // interval in milliseconds, e.g. 60,000 (1 minute for game demo)
  maxSavingsLimit: number;
}

export const DEFAULT_BANK_CONFIG: BankConfig = {
  interestRatePerInterval: 0.02, // 2%
  interestIntervalMs: 60_000, // 1 minute
  maxSavingsLimit: 1_000_000,
};

export interface InvestmentOpportunity {
  id: string;
  name: string;
  description: string;
  cost: number;
  expectedReturnRate: number; // e.g. 0.15 = +15%
  durationMs: number;
  startedAt?: number;
  isMatured?: boolean;
}

export enum BusinessType {
  Apothecary = 'apothecary',
  Blacksmith = 'blacksmith',
  Library = 'library',
  TradingPost = 'trading-post',
}

export interface BusinessModel {
  id: string;
  name: string;
  type: BusinessType;
  ownerId: string;
  level: number;
  employees: number;
  dailyRevenue: number;
  dailyExpenses: number;
  productionItemIds: string[];
}
