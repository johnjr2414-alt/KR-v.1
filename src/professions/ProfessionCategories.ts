import type { ProfessionCategoryDefinition } from './ProfessionTypes';

/**
 * Configurable profession categories (Phase 27.1).
 *
 * Categories are additive data — the set below is a starter catalogue and can
 * be extended without touching core logic.
 */
export const PROFESSION_CATEGORY_DEFINITIONS: readonly ProfessionCategoryDefinition[] = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Professions dedicated to diagnosing, treating, and caring for patients.',
  },
  {
    id: 'engineering-technology',
    name: 'Engineering and Technology',
    description: 'Professions that design, build, and maintain systems, devices, and software.',
  },
  {
    id: 'architecture-construction',
    name: 'Architecture and Construction',
    description: 'Professions that plan, design, and raise the built environment.',
  },
  {
    id: 'education-science',
    name: 'Education and Science',
    description: 'Professions that teach, research, and advance human knowledge.',
  },
  {
    id: 'business-finance',
    name: 'Business and Finance',
    description: 'Professions that manage money, trade, and enterprise.',
  },
  {
    id: 'law',
    name: 'Law',
    description: 'Professions that interpret, apply, and uphold the law.',
  },
];

/** Registry of every profession category, keyed by category id. */
export const PROFESSION_CATEGORY_REGISTRY: Record<string, ProfessionCategoryDefinition> =
  Object.fromEntries(PROFESSION_CATEGORY_DEFINITIONS.map((category) => [category.id, category]));

/** Returns the category definition for `categoryId`, or `undefined` when unknown. */
export function getProfessionCategory(categoryId: string): ProfessionCategoryDefinition | undefined {
  return PROFESSION_CATEGORY_REGISTRY[categoryId];
}

/** Returns every registered category definition. */
export function getProfessionCategories(): ProfessionCategoryDefinition[] {
  return [...PROFESSION_CATEGORY_DEFINITIONS];
}
