/** Colosseum Challenge Arena — headless single-player PvE challenge system. */

export {
  ChallengeMode,
  ChallengeStatus,
  type ChallengeStage,
  type ChallengeRewardItem,
  type ChallengeRewardConfig,
  type ChallengeDefinition,
  type ChallengeRewardResult,
  type ChallengeProgress,
} from './ChallengeTypes';

export {
  ChallengeProgressTracker,
  type ChallengeProgressSnapshot,
} from './ChallengeProgressTracker';

export {
  CHALLENGE_REGISTRY,
  CHALLENGE_DEFINITIONS,
  getChallengeById,
  getChallengesForMode,
  getChallengesForSubject,
} from './ChallengeRegistry';

export {
  ChallengeArenaSession,
  resolveChallengeOpponent,
  type ChallengeClock,
  type ChallengeArenaOptions,
} from './ChallengeArenaSession';
