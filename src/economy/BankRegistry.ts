import type { InvestmentOpportunity, BusinessModel } from './BankTypes';
import { BusinessType } from './BankTypes';

export const AVAILABLE_INVESTMENTS: InvestmentOpportunity[] = [
  {
    id: 'invest-apothecary',
    name: 'Apothecary Herb Expedition',
    description: 'Finance an expedition to harvest rare medicinal herbs in the math groves.',
    cost: 50,
    expectedReturnRate: 0.2, // +20% (yields 60 gold)
    durationMs: 45_000, // 45 seconds
  },
  {
    id: 'invest-caravan',
    name: 'Regional Trade Caravan',
    description: 'Underwrite trade carts transporting books and parchment between villages.',
    cost: 150,
    expectedReturnRate: 0.35, // +35% (yields 202 gold)
    durationMs: 120_000, // 2 minutes
  },
  {
    id: 'invest-mine',
    name: 'Crystal Deep Shaft Prospecting',
    description: 'High-risk deep mining excavation into logic gemstone veins.',
    cost: 300,
    expectedReturnRate: 0.5, // +50% (yields 450 gold)
    durationMs: 300_000, // 5 minutes
  },
];

export const AVAILABLE_BUSINESSES: BusinessModel[] = [
  {
    id: 'biz-village-tea',
    name: 'Village Herbal Tea Stall',
    type: BusinessType.Apothecary,
    ownerId: 'player-1',
    level: 1,
    employees: 1,
    dailyRevenue: 40,
    dailyExpenses: 15,
    productionItemIds: ['minor-health-potion'],
  },
  {
    id: 'biz-bookbindery',
    name: 'Scholar Bookbindery',
    type: BusinessType.Library,
    ownerId: 'player-1',
    level: 1,
    employees: 2,
    dailyRevenue: 90,
    dailyExpenses: 35,
    productionItemIds: ['scroll-of-wisdom'],
  },
];
