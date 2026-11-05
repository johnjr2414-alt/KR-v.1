/**
 * Dropped item instance after evaluation.
 */
export interface DroppedItem {
  itemId: string;
  quantity: number;
}

/**
 * Summary of all rewards computed from a monster defeat.
 */
export interface MonsterRewardResult {
  monsterId: string;
  monsterName: string;
  monsterLevel: number;
  combatExp: number;
  baseGold: number;
  bonusGold: number;
  totalGold: number;
  droppedItems: DroppedItem[];
}

/**
 * Event payload emitted when a monster is defeated in combat.
 * Provides decoupled notification for quests, logs, and progression.
 */
export interface MonsterDefeatedEvent {
  monsterId: string;
  monsterName: string;
  monsterLevel: number;
  subject: string;
  rewards: MonsterRewardResult;
  timestamp: string;
}
