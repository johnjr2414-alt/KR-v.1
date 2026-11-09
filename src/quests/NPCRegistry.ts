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
    offeredQuestIds: ['quest-slime-sample', 'quest-side-lost-chalk'],
  },
  'chronicler-selene': {
    id: 'chronicler-selene',
    name: 'Chronicler Selene',
    title: "Keeper of the Realm's Memory",
    type: NPCType.QuestGiver,
    mapId: 'beginners-village',
    position: { x: 300, y: 560 },
    spriteColor: 0x38bdf8,
    dialogue: {
      default: [
        "I record every chapter of this realm's story — including the parts not yet written.",
        'Return when you are ready to begin the first page.',
      ],
      questAvailable: [
        'Another chapter waits to be scribed, scholar. Will you take up the quill?',
      ],
      questInProgress: [
        'The next page is not finished. See the chapter through before we continue.',
      ],
      questCompleted: [
        'Another chapter closed. Your deeds are recorded in full.',
      ],
    },
    offeredQuestIds: [
      'quest-archivist-1-first-page',
      'quest-archivist-2-lost-formula',
      'quest-archivist-3-final-proof',
    ],
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
  'gladius-the-bold': {
    id: 'gladius-the-bold',
    name: 'Arena Master Gladius',
    title: 'Colosseum Sparring Arbiter',
    type: NPCType.ArenaMaster,
    mapId: 'beginners-village',
    position: { x: 420, y: 520 },
    spriteColor: 0xef4444,
    dialogue: {
      default: [
        'Welcome to the Colosseum Sparring Grounds, challenger!',
        'Test your academic wits in friendly duels against rival scholars under the Reverse Difficulty Rule.',
      ],
    },
  },

  // ── Real-World Professions (Phase 27.2, extended Phase 27.6) — Career Center, provisional ──
  'career-advisor-marisol': {
    id: 'career-advisor-marisol',
    name: 'Career Advisor Marisol',
    title: 'Director of the Career Center',
    type: NPCType.CareerAdvisor,
    mapId: 'beginners-village',
    position: { x: 740, y: 580 },
    spriteColor: 0xf472b6,
    dialogue: {
      default: [
        'Welcome to the Career Center! Every hero here also masters a real-world trade.',
        'Speak with me to discover the professions you can pursue — doctor, engineer, architect, and more.',
        'Meet a profession\u2019s requirements and you may enroll. Your profession level grows on its own, apart from your combat level.',
      ],
      questAvailable: [
        'New to the working world? Let me walk you through your first steps.',
        'Complete the Career Orientation so I know you are ready to choose a path.',
      ],
      questInProgress: [
        'Take your time. Explore the professions, then check back with me.',
      ],
      questCompleted: [
        'Well done! The working world is open to you now. Choose a profession you love.',
      ],
    },
    offeredQuestIds: ['quest-career-orientation'],
    workplaceId: 'career-center',
  },

  // ── Workplace staff & professional contacts (Phase 27.6) — provisional ──
  'academy-instructor-lena': {
    id: 'academy-instructor-lena',
    name: 'Instructor Lena',
    title: 'Academy Faculty',
    type: NPCType.Scholar,
    mapId: 'beginners-village',
    position: { x: 400, y: 320 },
    spriteColor: 0x7dd3fc,
    dialogue: {
      default: [
        'The Academy sits beside our Library — classrooms, examinations, and research rooms.',
        'Show me the interest and the grades, and the lecture halls will open to you.',
      ],
    },
    workplaceId: 'academy',
  },
  'doctor-quinn': {
    id: 'doctor-quinn',
    name: 'Doctor Quinn',
    title: 'Hospital Physician',
    type: NPCType.Scholar,
    mapId: 'beginners-village',
    position: { x: 1000, y: 320 },
    spriteColor: 0x86efac,
    dialogue: {
      default: [
        'I keep the Hospital running — healing takes steady hands and sharper answers.',
        'If medicine calls to you, I can show you the wards and the work that awaits.',
      ],
    },
    workplaceId: 'hospital',
  },
  'engineer-rurik': {
    id: 'engineer-rurik',
    name: 'Engineer Rurik',
    title: 'Engineering Center Foreman',
    type: NPCType.Scholar,
    mapId: 'beginners-village',
    position: { x: 1050, y: 620 },
    spriteColor: 0x38bdf8,
    dialogue: {
      default: [
        'The Engineering Center is where circuits are tamed and machines are made.',
        'If engineering is your calling, I can show you the benches and the work that awaits.',
      ],
    },
    workplaceId: 'engineering-center',
  },
  'architect-ines': {
    id: 'architect-ines',
    name: 'Architect Ines',
    title: 'Architecture Studio Designer',
    type: NPCType.Scholar,
    mapId: 'beginners-village',
    position: { x: 1050, y: 180 },
    spriteColor: 0xf0abfc,
    dialogue: {
      default: [
        'Every building begins as a drawing. The Architecture Studio is where that drawing is made.',
        'Visit the studio if design and structures interest you — there is much to learn.',
      ],
    },
    workplaceId: 'architecture-studio',
  },

  // ── Ironhold Kingdom (Phase 26.3) — placeholder content, provisional ──
  'forgemaster-durn': {
    id: 'forgemaster-durn',
    name: 'Forgemaster Durn',
    title: 'Master of the Forge District',
    type: NPCType.QuestGiver,
    mapId: 'ironhold-gate',
    position: { x: 600, y: 450 },
    spriteColor: 0xb45309,
    dialogue: {
      default: [
        'Welcome to Ironhold, traveler. Steel and science keep these walls standing.',
        'The forges run hot — and so do the beasts that feed on them.',
      ],
      questAvailable: [
        'Magma Hounds are wandering out of the Forge District and scorching our supply lines.',
        'Cull 3 of them and I will see you rewarded.',
      ],
      questInProgress: [
        'The hounds still prowl. Keep your questions sharp and your blade sharper.',
      ],
      questCompleted: [
        'Aye, that will do. The Kingdom owes you a debt, scholar-smith.',
      ],
    },
    offeredQuestIds: ['quest-forge-order'],
  },

  // ── Golden Capital (Phase 26.4) — placeholder content, provisional ──
  'chancellor-edmund': {
    id: 'chancellor-edmund',
    name: 'Chancellor Edmund',
    title: 'Lord Chancellor of the Capital',
    type: NPCType.QuestGiver,
    mapId: 'golden-capital-plaza',
    position: { x: 620, y: 450 },
    spriteColor: 0xfcd34d,
    dialogue: {
      default: [
        'Welcome to the Golden Capital, the beating heart of the realm\u2019s commerce.',
        'Coin flows as freely as questions here — mind both, and you will prosper.',
      ],
      questAvailable: [
        'Rogue Ledger Golems are skewing the capital\u2019s ledgers and shaking trade confidence.',
        'Destroy 4 of them and the treasury shall reward you handsomely.',
      ],
      questInProgress: [
        'The ledgers still run red. Balance the books, scholar — with steel if you must.',
      ],
      questCompleted: [
        'Splendid. The capital\u2019s accounts are honest once more. Take your due.',
      ],
    },
    offeredQuestIds: ['quest-capital-levy'],
  },
  'merchant-cordelia': {
    id: 'merchant-cordelia',
    name: 'Merchant Cordelia',
    title: 'Grand Bazaar Proprietor',
    type: NPCType.Merchant,
    mapId: 'golden-capital-plaza',
    position: { x: 760, y: 520 },
    spriteColor: 0xf59e0b,
    dialogue: {
      default: [
        'Welcome to the Grand Bazaar, traveler! The finest wares in all the realm.',
        'Browse my stock, or sell me your hard-won spoils — fair coin, always.',
      ],
    },
  },
  'banker-cassius': {
    id: 'banker-cassius',
    name: 'Banker Cassius',
    title: 'Keeper of the Capital Vault',
    type: NPCType.Banker,
    mapId: 'golden-capital-plaza',
    position: { x: 500, y: 520 },
    spriteColor: 0xfacc15,
    dialogue: {
      default: [
        'The Capital Vault keeps your gold safe from the wilds — and puts it to work.',
        'Deposit for interest, or underwrite a venture. The choice, as ever, is yours.',
      ],
    },
  },
  'archivist-mira': {
    id: 'archivist-mira',
    name: 'Archivist Mira',
    title: 'Curator of the Capital Records',
    type: NPCType.Scholar,
    mapId: 'golden-capital-plaza',
    position: { x: 340, y: 250 },
    spriteColor: 0xc084fc,
    dialogue: {
      default: [
        'The Capital Records preserve ledgers, charts, and the arithmetic of the realm.',
        'Every answer you master here sharpens the mind that governs a city.',
      ],
    },
  },

  // ── Arcane Technological City (Phase 26.5) — placeholder content, provisional ──
  'engineer-vesper': {
    id: 'engineer-vesper',
    name: 'Engineer Vesper',
    title: 'Chief Magitech Engineer',
    type: NPCType.QuestGiver,
    mapId: 'arcane-city-plaza',
    position: { x: 620, y: 450 },
    spriteColor: 0x22d3ee,
    dialogue: {
      default: [
        'Welcome to the Arcane Technological City, where spellcraft drives the machine.',
        'Here science and sorcery are one discipline — and both are tested in battle.',
      ],
      questAvailable: [
        'A rogue Mana Automaton has broken loose in the Mana Foundry and is destabilizing the grid.',
        'Overload 5 of them and I will recalibrate your reward circuits personally.',
      ],
      questInProgress: [
        'The foundry readings are still unstable. Neutralize those Automatons, scholar.',
      ],
      questCompleted: [
        'Readings nominal. The grid holds — and the City owes you a debt of logic.',
      ],
    },
    offeredQuestIds: ['quest-arcane-calibration'],
  },
  'scholar-aeon': {
    id: 'scholar-aeon',
    name: 'Scholar Aeon',
    title: 'Archmage of Computational Lore',
    type: NPCType.Scholar,
    mapId: 'arcane-city-plaza',
    position: { x: 340, y: 250 },
    spriteColor: 0x818cf8,
    dialogue: {
      default: [
        'Every algorithm is a spell; every equation, an incantation.',
        'The Logic Spire rewards minds that see the pattern beneath the arcane.',
      ],
    },
  },
  'artificer-nova': {
    id: 'artificer-nova',
    name: 'Artificer Nova',
    title: 'Plaza Tinkerer',
    type: NPCType.Villager,
    mapId: 'arcane-city-plaza',
    position: { x: 780, y: 500 },
    spriteColor: 0x67e8f9,
    dialogue: {
      default: [
        'Mind the loose conduits, traveler — the plaza hums with raw mana.',
        'Between you and me, the tougher the question, the brighter the sparks.',
      ],
    },
  },

  // ── Forgotten Lands (Phase 26.6) — placeholder content, provisional ──
  'warden-thalia': {
    id: 'warden-thalia',
    name: 'Warden Thalia',
    title: 'Last Warden of the Forgotten Lands',
    type: NPCType.QuestGiver,
    mapId: 'forgotten-crossroads',
    position: { x: 620, y: 450 },
    spriteColor: 0x94a3b8,
    dialogue: {
      default: [
        'Few reach the Forgotten Lands, and fewer still return from the Ashen Wastes.',
        'The questions here cut deeper than steel — only the truly learned endure.',
      ],
      questAvailable: [
        'A Blight Horror roams the Ashen Wastes, corrupting what little life remains.',
        'Put down 5 of them and I will see you rewarded for your courage.',
      ],
      questInProgress: [
        'The wasteland still festers. Finish the Blight Horrors, scholar.',
      ],
      questCompleted: [
        'The rot recedes. You have earned the respect of the Forgotten Lands.',
      ],
    },
    offeredQuestIds: ['quest-forgotten-vigil'],
  },
  'hermit-orin': {
    id: 'hermit-orin',
    name: 'Hermit Orin',
    title: 'Hermit of the Crossroads',
    type: NPCType.Scholar,
    mapId: 'forgotten-crossroads',
    position: { x: 340, y: 250 },
    spriteColor: 0xa8a29e,
    dialogue: {
      default: [
        'I once studied the halls that became the Ruined Archive. Now I only study survival.',
        'Mind the level difference — the deeper ruins do not forgive the unprepared.',
      ],
    },
  },

  // ── Colosseum (Phase 26.7) — placeholder content, provisional ──
  'grand-arbiter-theron': {
    id: 'grand-arbiter-theron',
    name: 'Grand Arbiter Theron',
    title: 'Master of the Colosseum',
    type: NPCType.ArenaMaster,
    mapId: 'colosseum-grounds',
    position: { x: 600, y: 450 },
    spriteColor: 0xf59e0b,
    dialogue: {
      default: [
        'Only champions reach these sands. Whatever you survived to get here, it ends now.',
        'Speak to me to enter a trial: an endurance gauntlet, a duel against the Grand Champion, a subject gauntlet, or a timed dash for the crowd.',
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
