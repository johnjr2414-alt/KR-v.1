/**
 * Educational tiers aligned to character level brackets.
 * Level boundaries are configured externally in balance data.
 */
export enum EducationalTier {
  Elementary = 'elementary',
  JuniorHigh = 'junior-high',
  SeniorHigh = 'senior-high',
  College = 'college',
  Masters = 'masters',
  PhD = 'phd',
  Specialization = 'specialization',
}

/**
 * Academic subject disciplines available in Knowledge Realms.
 * New subjects can be added without altering core progression logic.
 */
export enum SubjectId {
  Mathematics = 'mathematics',
  GeneralKnowledge = 'general-knowledge',
  Science = 'science',
  Programming = 'programming',
  Physics = 'physics',
  Business = 'business',
}
