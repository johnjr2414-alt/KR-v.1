import type { SubjectId } from '../core/types/education';

/**
 * A building within the game world, associated with an academic subject.
 * Data only — no rendering or interaction logic.
 */
export interface BuildingDefinition {
  /** Unique building identifier. */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /** Short description shown when the player approaches. */
  description: string;
  /** The academic subject taught/practiced in this building. */
  subject: SubjectId;
  /** IDs of hunting zones accessible from this building. */
  huntingZoneIds: string[];
  /**
   * Position (relative to the parent map) where the interaction
   * prompt appears and the player must stand to interact.
   */
  interactionPosition: { x: number; y: number };
}
