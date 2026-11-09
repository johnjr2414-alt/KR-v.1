export enum NPCType {
  Villager = 'villager',
  QuestGiver = 'quest-giver',
  Merchant = 'merchant',
  Scholar = 'scholar',
  Banker = 'banker',
  ArenaMaster = 'arena-master',
  CareerAdvisor = 'career-advisor',
}

export interface NPCDialogueLine {
  text: string;
  speaker?: string;
}

export interface NPCDefinition {
  id: string;
  name: string;
  title?: string;
  type: NPCType;
  mapId: string;
  position: { x: number; y: number };
  spriteColor: number;
  dialogue: {
    default: string[];
    questAvailable?: string[];
    questInProgress?: string[];
    questCompleted?: string[];
  };
  offeredQuestIds?: string[];
  /**
   * Career workplace this NPC represents (Phase 27.6). When set, interacting
   * with the NPC opens the workplace's career interface. Purely a data link;
   * the workplace catalogue lists the same NPC under its `npcIds`.
   */
  workplaceId?: string;
}
