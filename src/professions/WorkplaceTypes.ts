/**
 * Workplace, facility, and world-integration types (Phase 27.2).
 *
 * A *workplace* is the place where one or more professions practise (a hospital,
 * an engineering centre, an architecture studio, a school/university, the career
 * centre). A workplace contains *facilities* (rooms) whose access can be gated
 * independently — a player may enter a workplace without having access to every
 * facility, and facilities unlock as the player progresses in a profession.
 *
 * Everything here is headless and data-driven (no Phaser/DOM imports) so the
 * resolution/access rules stay independent of rendering. World locations are
 * referenced (map/landmark/building ids), never duplicated.
 */

import type { SubjectId } from '../core/types/education';
import type { SubjectMasteryRequirement } from './ProfessionTypes';

/**
 * One interaction point inside a workplace (reception desk, lab bench, etc.).
 * Interaction points are pure data consumed by the future workplace UI/scenes.
 */
export interface WorkplaceInteractionPoint {
  /** Unique within the owning workplace. */
  id: string;
  /** Player-facing label (e.g. "Reception Desk"). */
  label: string;
  /** Facility this point belongs to, when applicable (must resolve within the workplace). */
  facilityId?: string;
  /** Advisory map-local position (consumed by future UI). */
  position?: { x: number; y: number };
}

/**
 * Optional association to a physical location in the existing world. Workplaces
 * reference the world instead of duplicating it: `mapId`/`landmarkId`/`buildingId`
 * all point at definitions owned by `src/world`.
 */
export interface WorkplaceWorldLocation {
  /** Map the workplace physically exists on. */
  mapId: string;
  /** Landmark id on that map, when the workplace is a landmark. */
  landmarkId?: string;
  /** Existing building id, when the workplace maps onto a registered building. */
  buildingId?: string;
}

/**
 * Configurable access rule, shared by workplace entry and facility access.
 * Not every gate applies everywhere — omit what does not apply.
 */
export interface WorkplaceAccessRequirement {
  /** Minimum character (combat) level. */
  minCharacterLevel?: number;
  /**
   * Professions that grant access. When set, the player must be enrolled in at
   * least one of them. When omitted alongside a profession gate below, the
   * owning workplace's associated professions are used as candidates.
   */
  professionIds?: string[];
  /**
   * Minimum profession level, applied to any enrolled candidate profession
   * (explicit {@link professionIds} when set, otherwise the workplace's
   * associated professions).
   */
  minProfessionLevel?: number;
  /**
   * Required profession rank ids. Satisfied when the player's current rank in
   * any candidate profession matches one of these ids. Ranks unlock as the
   * player progresses in the profession.
   */
  requiredRankIds?: string[];
  /** Quests that must be completed before access is granted. */
  requiredQuestIds?: string[];
  /** Minimum subject mastery levels. */
  mastery?: SubjectMasteryRequirement[];
}

/** A room/amenity inside a workplace with its own access rule. */
export interface WorkplaceFacilityDefinition {
  /** Unique within the owning workplace. */
  id: string;
  /** Display name (e.g. "Examination Room"). */
  name: string;
  /** Short description of the facility. */
  description: string;
  /** Access gate. An empty requirement means the facility is open to everyone. */
  access: WorkplaceAccessRequirement;
}

/**
 * Static, data-driven definition of a workplace. New workplaces are added purely
 * through configuration without changing core logic.
 */
export interface WorkplaceDefinition {
  /** Unique workplace identifier (slug). */
  id: string;
  /** Display name. */
  name: string;
  /** Short description. */
  description: string;
  /**
   * Professions that operate here (reverse association). Resolved against the
   * profession catalogue; multiple professions may share one workplace.
   */
  professionIds: string[];
  /** Facilities (rooms) belonging to this workplace. */
  facilities: WorkplaceFacilityDefinition[];
  /** Associated NPC ids (must resolve against the NPC registry). */
  npcIds: string[];
  /** Interaction points inside the workplace. */
  interactionPoints: WorkplaceInteractionPoint[];
  /** Gate applied when entering the workplace (facilities gate separately). */
  entryRequirements: WorkplaceAccessRequirement;
  /** Optional physical location in the existing world. */
  worldLocation?: WorkplaceWorldLocation;
  /** Marks balance values as provisional / draft. */
  provisional: boolean;
}

/** A player's current state in one profession, as seen by the workplace rules. */
export interface WorkplaceProfessionState {
  /** Current profession level. */
  level: number;
  /** Current profession rank id (already resolved from the level by the caller). */
  rankId: string;
}

/**
 * Caller-supplied context used to evaluate workplace/facility access. Keeping
 * this a plain object keeps {@link import('./WorkplaceService').WorkplaceService}
 * headless and independent from the manager/session layer.
 */
export interface WorkplaceAccessContext {
  /** Player character (combat) level. */
  characterLevel: number;
  /** Resolves the player's state in a profession, or `undefined` when not enrolled. */
  getProfessionState?: (professionId: string) => WorkplaceProfessionState | undefined;
  /** Resolves the player's mastery level for a subject. */
  getMasteryLevel?: (subject: SubjectId) => number;
  /** Reports whether a quest has been completed. */
  isQuestCompleted?: (questId: string) => boolean;
}

/** Why a workplace or facility could not be accessed. */
export enum WorkplaceAccessFailureReason {
  UnknownWorkplace = 'unknown-workplace',
  UnknownFacility = 'unknown-facility',
  CharacterLevelTooLow = 'character-level-too-low',
  NotEnrolled = 'not-enrolled',
  ProfessionLevelTooLow = 'profession-level-too-low',
  RankTooLow = 'rank-too-low',
  QuestIncomplete = 'quest-incomplete',
  MasteryTooLow = 'mastery-too-low',
}

/** Per-requirement evaluation entry, useful for UI display. */
export interface WorkplaceRequirementStatus {
  /** Human-readable label of the requirement. */
  label: string;
  /** Whether the requirement is currently satisfied. */
  satisfied: boolean;
  /** Optional detail string (e.g. "requires level 5"). */
  detail?: string;
}

/** Result of a non-mutating workplace/facility access check. */
export interface WorkplaceAccessCheck {
  canAccess: boolean;
  /** Failure reasons (each failed requirement); empty when `canAccess`. */
  reasons: WorkplaceAccessFailureReason[];
  /** Full per-requirement breakdown. */
  requirements: WorkplaceRequirementStatus[];
  /** Player-facing summary message. */
  message: string;
}

/** Facility access result — a {@link WorkplaceAccessCheck} plus its identifiers. */
export interface FacilityAccessResult extends WorkplaceAccessCheck {
  workplaceId: string;
  facilityId: string;
}

/** A facility resolved together with its current accessibility. */
export interface ResolvedFacility {
  workplaceId: string;
  facility: WorkplaceFacilityDefinition;
  accessible: boolean;
}
