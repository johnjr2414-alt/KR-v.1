export {
  ProgressionService,
  progressionService,
  type LevelUpEvent,
  type ExpAwardResult,
  type LevelUpListener,
  type ProgressionServiceOptions,
} from './ProgressionService';

export {
  calculateStatsForLevel,
  applyLevelStatsToPlayer,
  type ComputedAttributes,
} from './StatGrowthService';

export {
  allocateStatPoints,
  recomputePlayerStats,
  calculateAllocationBonuses,
  getTotalAllocatedPoints,
  getTotalStatPointsForLevel,
  migratePlayerToStatAllocation,
  type AllocationResult,
} from './StatAllocationService';

export {
  ProgressionSimulator,
  type PlayerArchetype,
  type LevelProgressionData,
  type EncounterSimulationResult,
  type SimulationReportData,
} from './ProgressionSimulator';
