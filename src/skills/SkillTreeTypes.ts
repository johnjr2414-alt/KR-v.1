import type { SubjectId } from '../core/types/education';
import type { SkillDefinition } from './SkillTypes';

/**
 * Representation of a single node in a subject skill tree.
 */
export interface SkillTreeNode {
  skill: SkillDefinition;
  prerequisites: string[]; // List of prerequisite skill IDs
  children: string[]; // List of dependent child skill IDs
  tier: number; // 1-based vertical tier in the tree
}

/**
 * Subject-specific skill tree structure.
 */
export interface SubjectSkillTree {
  subject: SubjectId;
  name: string;
  description: string;
  nodes: Record<string, SkillTreeNode>;
  rootSkillIds: string[];
}

/**
 * Result of validating a subject skill tree's Directed Acyclic Graph (DAG).
 */
export interface SkillTreeValidationResult {
  valid: boolean;
  errors: string[];
  cycles: string[][];
  missingPrerequisites: Array<{ skillId: string; missingId: string }>;
}
