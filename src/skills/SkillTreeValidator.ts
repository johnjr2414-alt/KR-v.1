import type { SubjectSkillTree, SkillTreeValidationResult } from './SkillTreeTypes';

/**
 * Validates that a SubjectSkillTree forms a valid Directed Acyclic Graph (DAG):
 * 1. Checks that all prerequisite IDs exist within the tree or registry.
 * 2. Detects any circular dependencies / cycles using depth-first search.
 * 3. Ensures all root nodes have no prerequisites.
 */
export function validateSkillTreeDAG(tree: SubjectSkillTree): SkillTreeValidationResult {
  const errors: string[] = [];
  const cycles: string[][] = [];
  const missingPrerequisites: Array<{ skillId: string; missingId: string }> = [];

  const nodes = tree.nodes;
  const nodeKeys = Object.keys(nodes);

  // 1. Check for missing prerequisites and subject alignment
  for (const [skillId, node] of Object.entries(nodes)) {
    if (node.skill.subject !== tree.subject) {
      errors.push(
        `Skill "${skillId}" has subject "${node.skill.subject}" which does not match tree subject "${tree.subject}"`,
      );
    }

    for (const prereqId of node.prerequisites) {
      if (!nodes[prereqId]) {
        missingPrerequisites.push({ skillId, missingId: prereqId });
        errors.push(`Skill "${skillId}" requires missing prerequisite "${prereqId}" in subject tree "${tree.subject}"`);
      }
    }
  }

  // 2. Cycle Detection using DFS (White = 0/unvisited, Gray = 1/visiting, Black = 2/visited)
  const visitedState: Record<string, 0 | 1 | 2> = {};
  for (const k of nodeKeys) {
    visitedState[k] = 0;
  }

  const currentPath: string[] = [];

  function dfs(currentId: string): void {
    visitedState[currentId] = 1; // Mark as visiting
    currentPath.push(currentId);

    const node = nodes[currentId];
    if (node) {
      for (const childId of node.children) {
        if (!nodes[childId]) continue;

        if (visitedState[childId] === 1) {
          // Found cycle
          const cycleStartIdx = currentPath.indexOf(childId);
          const cycle = currentPath.slice(cycleStartIdx).concat(childId);
          cycles.push(cycle);
          errors.push(`Circular prerequisite detected in tree "${tree.subject}": ${cycle.join(' -> ')}`);
        } else if (visitedState[childId] === 0) {
          dfs(childId);
        }
      }
    }

    currentPath.pop();
    visitedState[currentId] = 2; // Mark as completely visited
  }

  for (const k of nodeKeys) {
    if (visitedState[k] === 0) {
      dfs(k);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cycles,
    missingPrerequisites,
  };
}
