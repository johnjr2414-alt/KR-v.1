export {
  DEFAULT_TIER_MASTERY_MULTIPLIERS,
  DEFAULT_DIFFICULTY_MASTERY_MULTIPLIERS,
  DEFAULT_MASTERY_CONFIG,
  getRequiredMasteryExp,
  type MasteryFormulaConfig,
} from '../config/masteryConfig';

export {
  createInitialMasteryRecord,
  createInitialMasteryMap,
} from './MasteryData';

export {
  MasteryCalculator,
  masteryCalculator,
  type MasteryCalculationContext,
  type MasteryExpBreakdown,
} from './MasteryCalculator';

export {
  MasteryManager,
  masteryManager,
  type MasteryLevelUpCallback,
} from './MasteryManager';
