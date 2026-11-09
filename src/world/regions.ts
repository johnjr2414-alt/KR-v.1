import type { RegionDefinition } from './RegionDefinition';
import { RegionIds } from './RegionDefinition';
import { ARCANE_CITY_MAPS, COLOSSEUM_MAPS, EMERALD_FOREST_MAPS, FORGOTTEN_LANDS_MAPS, GOLDEN_CAPITAL_MAPS, IRONHOLD_MAPS, MapIds } from './maps';

/**
 * The seven planned world regions, in navigation order.
 *
 * ⚠ DRAFT PROVISIONAL VALUES: every `unlock.minLevel` and `recommendedLevel`
 * below is a provisional placeholder pending approval (each region is flagged
 * `provisional: true`). They live in configuration so they can be corrected
 * without changing any navigation logic. `recommendedLevel` is advisory only
 * and never locks entry; `unlock.minLevel` is the hard gate.
 *
 * Travel routes form a linear chain so return travel is always valid. There is
 * no persistence of discovery: region discovery is derived from the player's
 * level and the world graph (see `regionAccess.ts`).
 */
export const WORLD_REGIONS: readonly RegionDefinition[] = [
  {
    id: RegionIds.BeginnersVillage,
    name: 'Beginners Village',
    description: 'A peaceful starting town with subject academies and a training ground.',
    order: 1,
    recommendedLevel: { min: 1, max: 10 },
    unlock: { minLevel: 1, requiresDiscovery: false },
    travelPoints: [
      { targetRegionId: RegionIds.EmeraldForest, label: 'Forest Trail' },
    ],
    mapIds: [
      MapIds.BeginnersVillage,
      MapIds.MathBuilding,
      MapIds.ScienceLab,
      MapIds.Library,
      MapIds.TechWorkshop,
      MapIds.BeginnersHuntingGround,
    ],
    provisional: true,
  },
  {
    id: RegionIds.EmeraldForest,
    name: 'Emerald Forest',
    description: 'A lush woodland of nature and life-science questions.',
    order: 2,
    recommendedLevel: { min: 10, max: 20 },
    unlock: { minLevel: 10, requiresDiscovery: true },
    travelPoints: [
      { targetRegionId: RegionIds.BeginnersVillage, label: 'Village Path' },
      { targetRegionId: RegionIds.IronholdKingdom, label: 'Mountain Pass' },
    ],
    mapIds: EMERALD_FOREST_MAPS.map((map) => map.id),
    provisional: true,
  },
  {
    id: RegionIds.IronholdKingdom,
    name: 'Ironhold Kingdom',
    description: 'A fortified realm of engineering and physical-science trials.',
    order: 3,
    recommendedLevel: { min: 20, max: 30 },
    unlock: { minLevel: 20, requiresDiscovery: true },
    travelPoints: [
      { targetRegionId: RegionIds.EmeraldForest, label: 'Forest Border' },
      { targetRegionId: RegionIds.GoldenCapital, label: "King's Road" },
    ],
    mapIds: IRONHOLD_MAPS.map((map) => map.id),
    provisional: true,
  },
  {
    id: RegionIds.GoldenCapital,
    name: 'Golden Capital',
    description: 'The trade heart of the realm — commerce, civic life, and business questions.',
    order: 4,
    recommendedLevel: { min: 30, max: 40 },
    unlock: { minLevel: 30, requiresDiscovery: true },
    travelPoints: [
      { targetRegionId: RegionIds.IronholdKingdom, label: "King's Road" },
      { targetRegionId: RegionIds.ArcaneTechnologicalCity, label: 'Arcane Highway' },
    ],
    mapIds: GOLDEN_CAPITAL_MAPS.map((map) => map.id),
    provisional: true,
  },
  {
    id: RegionIds.ArcaneTechnologicalCity,
    name: 'Arcane Technological City',
    description: 'A fusion of magic and machinery — advanced science and programming.',
    order: 5,
    recommendedLevel: { min: 40, max: 50 },
    unlock: { minLevel: 40, requiresDiscovery: true },
    travelPoints: [
      { targetRegionId: RegionIds.GoldenCapital, label: 'Arcane Highway' },
      { targetRegionId: RegionIds.ForgottenLands, label: 'Rift Gate' },
    ],
    mapIds: ARCANE_CITY_MAPS.map((map) => map.id),
    provisional: true,
  },
  {
    id: RegionIds.ForgottenLands,
    name: 'Forgotten Lands',
    description: 'Ruined wilds holding the realm\u2019s hardest challenges.',
    order: 6,
    recommendedLevel: { min: 50, max: 60 },
    unlock: { minLevel: 50, requiresDiscovery: true },
    travelPoints: [
      { targetRegionId: RegionIds.ArcaneTechnologicalCity, label: 'Rift Gate' },
      { targetRegionId: RegionIds.Colosseum, label: "Champion's Gate" },
    ],
    mapIds: FORGOTTEN_LANDS_MAPS.map((map) => map.id),
    provisional: true,
  },
  {
    id: RegionIds.Colosseum,
    name: 'Colosseum',
    description: 'The endgame arena where champions are crowned.',
    order: 7,
    recommendedLevel: { min: 60, max: null },
    unlock: { minLevel: 60, requiresDiscovery: true },
    travelPoints: [
      { targetRegionId: RegionIds.ForgottenLands, label: "Champion's Gate" },
    ],
    mapIds: COLOSSEUM_MAPS.map((map) => map.id),
    provisional: true,
  },
];

/** Registry of all regions by ID for quick lookup. */
export const REGION_REGISTRY: Record<string, RegionDefinition> = Object.fromEntries(
  WORLD_REGIONS.map((region) => [region.id, region]),
);

/** The region every new player begins in. */
export const STARTING_REGION_ID: string = RegionIds.BeginnersVillage;
