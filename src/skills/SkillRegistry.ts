import { COMPREHENSIVE_SKILL_REGISTRY } from './SkillTreeRegistry';
import type { SkillDefinition } from './SkillTypes';

export const SKILL_REGISTRY: Record<string, SkillDefinition> = COMPREHENSIVE_SKILL_REGISTRY;

export function getSkillDefinition(skillId: string): SkillDefinition | undefined {
  return SKILL_REGISTRY[skillId];
}

export function getAllSkillDefinitions(): SkillDefinition[] {
  return Object.values(SKILL_REGISTRY);
}
