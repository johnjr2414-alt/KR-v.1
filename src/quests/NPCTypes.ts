export enum NPCType {
  Villager = 'villager',
  QuestGiver = 'quest-giver',
  Merchant = 'merchant',
  Scholar = 'scholar',
  Banker = 'banker',
  ArenaMaster = 'arena-master',
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
}
