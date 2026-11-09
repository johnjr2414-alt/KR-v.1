/** Monster definitions, stat tables, and encounter logic. */
export { MONSTER_REGISTRY, getMonsterById, getAllMonsterIds } from './monsterData';
export { MonsterSpawner, monsterSpawner } from './MonsterSpawner';
export type { Position, MapBounds } from './MonsterSpawner';
export {
  ELITE_BOSS_REGISTRY,
  getEliteOrBossEncounter,
  type EliteEncounterDefinition,
  type BossPhase,
} from './EliteBossRegistry';
export {
  BossEncounterController,
  type EncounterProgressState,
} from './BossEncounterController';
