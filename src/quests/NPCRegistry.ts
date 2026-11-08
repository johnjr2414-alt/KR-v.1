import { NPCType, type NPCDefinition } from './NPCTypes';

export const NPC_REGISTRY: Record<string, NPCDefinition> = {
  'elder-aldous': {
    id: 'elder-aldous',
    name: 'Elder Aldous',
    title: 'Village Elder',
    type: NPCType.QuestGiver,
    mapId: 'beginners-village',
    position: { x: 620, y: 500 },
    spriteColor: 0x93c5fd,
    dialogue: {
      default: [
        'Greetings, young traveler. Knowledge is the sharpest weapon in our realm.',
        'Study the ancient subjects, test your wits against the realm monsters, and honor our village.',
      ],
      questAvailable: [
        'Ah, novice! Slimes are multiplying near the math groves.',
        'Could you slay 2 slimes to keep our roads safe?',
      ],
      questInProgress: [
        'Have you taken care of those slimes yet? Keep your mind sharp in battle!',
      ],
      questCompleted: [
        'Magnificent work! You have proven both courage and knowledge.',
      ],
    },
    offeredQuestIds: ['quest-slime-hunter'],
  },
  'scholar-lyra': {
    id: 'scholar-lyra',
    name: 'Scholar Lyra',
    title: 'Chief Archivist',
    type: NPCType.Scholar,
    mapId: 'beginners-village',
    position: { x: 300, y: 250 },
    spriteColor: 0xc084fc,
    dialogue: {
      default: [
        'The Mathematics Building holds secrets to numbers, algebra, and logic.',
        'True masters conquer monsters by solving questions with swift accuracy.',
      ],
      questAvailable: [
        'Our students need slime samples to study organic chemical reactions.',
        'Could you bring me 1 Slime Gel?',
      ],
      questInProgress: [
        'Still searching for that Slime Gel? Slay slimes in the hunting grounds.',
      ],
      questCompleted: [
        'Incredible! This sample will advance our academic research greatly.',
      ],
    },
    offeredQuestIds: ['quest-slime-sample'],
  },
  'merchant-barnaby': {
    id: 'merchant-barnaby',
    name: 'Merchant Barnaby',
    title: 'Village Provisioner',
    type: NPCType.Merchant,
    mapId: 'beginners-village',
    position: { x: 750, y: 520 },
    spriteColor: 0xf59e0b,
    dialogue: {
      default: [
        'Welcome, adventurer! Browse my wares or sell your monster spoils.',
        'Potions, weapons, and scholar armor—fair prices guaranteed!',
      ],
    },
  },
  'treasurer-aurelius': {
    id: 'treasurer-aurelius',
    name: 'Treasurer Aurelius',
    title: 'Village Banker & Investor',
    type: NPCType.Banker,
    mapId: 'beginners-village',
    position: { x: 500, y: 520 },
    spriteColor: 0xfacc15,
    dialogue: {
      default: [
        'Welcome to the Beginners Village Treasury and Municipal Vault!',
        'Keep your hard-earned gold safe from monster perils, earn compound interest, and fund venture expeditions.',
      ],
    },
  },
};

export function getNPCDefinition(id: string): NPCDefinition | undefined {
  return NPC_REGISTRY[id];
}

export function getNPCsForMap(mapId: string): NPCDefinition[] {
  return Object.values(NPC_REGISTRY).filter((npc) => npc.mapId === mapId);
}
