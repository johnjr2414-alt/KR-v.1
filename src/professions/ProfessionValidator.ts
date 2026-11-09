import { SubjectId } from '../core/types/education';
import type {
  ProfessionCategoryDefinition,
  ProfessionDefinition,
} from './ProfessionTypes';

/** Severity of a profession-catalogue validation finding. */
export enum ProfessionValidationSeverity {
  Error = 'error',
  Warning = 'warning',
}

/** A single validation finding. */
export interface ProfessionValidationIssue {
  severity: ProfessionValidationSeverity;
  /** Stable machine-readable code (e.g. `duplicate-profession-id`). */
  code: string;
  /** Human-readable description. */
  message: string;
  /** Profession this issue relates to, when applicable. */
  professionId?: string;
}

/** Aggregate validation report. */
export interface ProfessionValidationReport {
  isValid: boolean;
  issues: ProfessionValidationIssue[];
}

export interface ProfessionValidationOptions {
  /**
   * Known quest ids. When provided, unknown prerequisite quest references are
   * flagged as errors; when omitted, unexplored references are not checked.
   */
  knownQuestIds?: ReadonlySet<string>;
  /**
   * Known workplace ids. When provided, unknown workplace references are flagged
   * as warnings (workplaces are introduced in Phase 27.2). When omitted, they
   * are ignored so configurations can precede world content.
   */
  knownWorkplaceIds?: ReadonlySet<string>;
}

const VALID_SUBJECTS = new Set<string>(Object.values(SubjectId));

function issue(
  severity: ProfessionValidationSeverity,
  code: string,
  message: string,
  professionId?: string,
): ProfessionValidationIssue {
  return { severity, code, message, professionId };
}

/**
 * Validates the profession category catalogue: unique ids and non-empty fields.
 */
export function validateProfessionCategories(
  categories: readonly ProfessionCategoryDefinition[],
): ProfessionValidationReport {
  const issues: ProfessionValidationIssue[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    if (!category.id || typeof category.id !== 'string') {
      issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-category-id', 'Category id is required.'));
      continue;
    }
    if (seen.has(category.id)) {
      issues.push(issue(ProfessionValidationSeverity.Error, 'duplicate-category-id', `Duplicate category id '${category.id}'.`));
    }
    seen.add(category.id);

    if (!category.name || !category.name.trim()) {
      issues.push(issue(ProfessionValidationSeverity.Error, 'missing-category-name', `Category '${category.id}' is missing a name.`));
    }
    if (!category.description || !category.description.trim()) {
      issues.push(issue(ProfessionValidationSeverity.Warning, 'missing-category-description', `Category '${category.id}' is missing a description.`));
    }
  }

  return { isValid: !issues.some((i) => i.severity === ProfessionValidationSeverity.Error), issues };
}

/**
 * Validates a full profession catalogue against its categories. Detects
 * duplicate ids, broken category references, malformed rank ladders and
 * progression settings, invalid enrollment requirements, and missing
 * references. Missing/invalid definitions are reported rather than thrown.
 */
export function validateProfessionCatalogue(
  professions: readonly ProfessionDefinition[],
  categories: readonly ProfessionCategoryDefinition[],
  options: ProfessionValidationOptions = {},
): ProfessionValidationReport {
  const issues: ProfessionValidationIssue[] = [...validateProfessionCategories(categories).issues];

  const categoryIds = new Set(categories.map((c) => c.id));
  const seenProfessionIds = new Set<string>();

  for (const def of professions) {
    const id = def.id;

    if (!id || typeof id !== 'string') {
      issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-profession-id', 'Profession id is required.'));
      continue;
    }
    if (seenProfessionIds.has(id)) {
      issues.push(issue(ProfessionValidationSeverity.Error, 'duplicate-profession-id', `Duplicate profession id '${id}'.`, id));
    }
    seenProfessionIds.add(id);

    if (!def.name || !def.name.trim()) {
      issues.push(issue(ProfessionValidationSeverity.Error, 'missing-profession-name', `Profession '${id}' is missing a name.`, id));
    }
    if (!def.description || !def.description.trim()) {
      issues.push(issue(ProfessionValidationSeverity.Warning, 'missing-profession-description', `Profession '${id}' is missing a description.`, id));
    }

    // ── Category reference ──
    if (!def.categoryId || !categoryIds.has(def.categoryId)) {
      issues.push(issue(ProfessionValidationSeverity.Error, 'unknown-category', `Profession '${id}' references unknown category '${def.categoryId}'.`, id));
    }

    // ── Experience settings ──
    const exp = def.experience;
    if (!exp || typeof exp !== 'object') {
      issues.push(issue(ProfessionValidationSeverity.Error, 'missing-experience', `Profession '${id}' is missing EXP progression settings.`, id));
    } else {
      if (!(exp.maxProfessionLevel >= 1)) {
        issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-max-level', `Profession '${id}' must have maxProfessionLevel >= 1.`, id));
      }
      if (!(exp.baseExp > 0)) {
        issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-base-exp', `Profession '${id}' must have baseExp > 0.`, id));
      }
      if (!(exp.growthFactor >= 1)) {
        issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-growth-factor', `Profession '${id}' must have growthFactor >= 1.`, id));
      }
    }

    // ── Rank ladder ──
    const maxLevel = exp && typeof exp === 'object' && exp.maxProfessionLevel >= 1 ? exp.maxProfessionLevel : Number.POSITIVE_INFINITY;
    if (!Array.isArray(def.ranks) || def.ranks.length === 0) {
      issues.push(issue(ProfessionValidationSeverity.Error, 'empty-ranks', `Profession '${id}' must define at least one rank.`, id));
    } else {
      const rankIds = new Set<string>();
      let previousMinLevel = -Infinity;
      let strictlyAscending = true;

      for (const rank of def.ranks) {
        if (!rank.id || rankIds.has(rank.id)) {
          issues.push(issue(ProfessionValidationSeverity.Error, 'duplicate-rank-id', `Profession '${id}' has a missing or duplicate rank id '${rank.id}'.`, id));
        }
        rankIds.add(rank.id);

        if (!rank.name || !rank.name.trim()) {
          issues.push(issue(ProfessionValidationSeverity.Error, 'missing-rank-name', `Profession '${id}' rank '${rank.id}' is missing a name.`, id));
        }
        if (!(rank.minLevel >= 1)) {
          issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-rank-threshold', `Profession '${id}' rank '${rank.id}' must have minLevel >= 1.`, id));
        }
        if (rank.minLevel > maxLevel) {
          issues.push(issue(ProfessionValidationSeverity.Error, 'rank-threshold-out-of-range', `Profession '${id}' rank '${rank.id}' minLevel ${rank.minLevel} exceeds maxProfessionLevel ${maxLevel}.`, id));
        }
        if (rank.minLevel <= previousMinLevel) {
          strictlyAscending = false;
        }
        previousMinLevel = Math.max(previousMinLevel, rank.minLevel);
      }

      if (!strictlyAscending) {
        issues.push(issue(ProfessionValidationSeverity.Error, 'rank-thresholds-not-ascending', `Profession '${id}' rank thresholds must be strictly ascending.`, id));
      }
      if (def.ranks[0] && def.ranks[0].minLevel !== 1) {
        issues.push(issue(ProfessionValidationSeverity.Error, 'first-rank-must-start-at-one', `Profession '${id}' first rank must start at profession level 1.`, id));
      }
    }

    // ── Enrollment requirements ──
    const enrollment = def.enrollment;
    if (enrollment && typeof enrollment === 'object') {
      if (enrollment.minCharacterLevel !== undefined && !(enrollment.minCharacterLevel >= 1)) {
        issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-min-character-level', `Profession '${id}' minCharacterLevel must be >= 1.`, id));
      }
      if (enrollment.goldCost !== undefined && !(enrollment.goldCost >= 0)) {
        issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-gold-cost', `Profession '${id}' goldCost must be >= 0.`, id));
      }
      if (Array.isArray(enrollment.mastery)) {
        for (const req of enrollment.mastery) {
          if (!VALID_SUBJECTS.has(req.subject)) {
            issues.push(issue(ProfessionValidationSeverity.Error, 'unknown-subject', `Profession '${id}' references unknown subject '${req.subject}'.`, id));
          }
          if (!(req.minLevel >= 1)) {
            issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-mastery-level', `Profession '${id}' mastery requirement for '${req.subject}' must be >= 1.`, id));
          }
        }
      }
      if (Array.isArray(enrollment.prerequisiteQuestIds) && options.knownQuestIds) {
        for (const questId of enrollment.prerequisiteQuestIds) {
          if (!options.knownQuestIds.has(questId)) {
            issues.push(issue(ProfessionValidationSeverity.Error, 'unknown-prerequisite-quest', `Profession '${id}' references unknown prerequisite quest '${questId}'.`, id));
          }
        }
      }
    }

    // ── Subject / question tags ──
    if (Array.isArray(def.subjectTags)) {
      for (const subject of def.subjectTags) {
        if (!VALID_SUBJECTS.has(subject)) {
          issues.push(issue(ProfessionValidationSeverity.Error, 'unknown-subject-tag', `Profession '${id}' has unknown subject tag '${subject}'.`, id));
        }
      }
    }
    if (!Array.isArray(def.questionTags) || def.questionTags.length === 0) {
      issues.push(issue(ProfessionValidationSeverity.Warning, 'missing-question-tags', `Profession '${id}' defines no question tags.`, id));
    }

    // ── Workplace references ──
    if (Array.isArray(def.workplaceIds) && options.knownWorkplaceIds) {
      for (const workplaceId of def.workplaceIds) {
        if (!options.knownWorkplaceIds.has(workplaceId)) {
          issues.push(issue(ProfessionValidationSeverity.Warning, 'unknown-workplace', `Profession '${id}' references workplace '${workplaceId}' that is not yet registered.`, id));
        }
      }
    }

    // ── Specializations ──
    if (Array.isArray(def.specializations)) {
      const specIds = new Set<string>();
      for (const spec of def.specializations) {
        if (!spec.id || specIds.has(spec.id)) {
          issues.push(issue(ProfessionValidationSeverity.Error, 'duplicate-specialization-id', `Profession '${id}' has a missing or duplicate specialization id '${spec.id}'.`, id));
        }
        specIds.add(spec.id);
        if (!(spec.minLevel >= 1) || spec.minLevel > maxLevel) {
          issues.push(issue(ProfessionValidationSeverity.Error, 'invalid-specialization-level', `Profession '${id}' specialization '${spec.id}' minLevel is out of range.`, id));
        }
      }
    }
  }

  return { isValid: !issues.some((i) => i.severity === ProfessionValidationSeverity.Error), issues };
}
