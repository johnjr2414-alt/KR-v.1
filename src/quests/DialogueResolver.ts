import type { NPCDefinition, NPCDialogueLine } from './NPCTypes';
import type { NpcQuestStatus } from './QuestTypes';
import type { QuestManager } from './QuestManager';

/**
 * Headless NPC dialogue resolution.
 *
 * Given an NPC and the player's quest state, this picks the dialogue lines that
 * match the current interaction state (available / in-progress / turn-in) and
 * falls back to the NPC's default lines when a state has no bespoke text.
 *
 * Keeping this out of the modal means dialogue conditions are logic the tests
 * can exercise directly, with no DOM involved.
 */

/** The resolved dialogue for one NPC interaction. */
export interface NpcDialogueResolution {
  /** Interaction state, identical to {@link QuestManager.getNpcQuestStatus}. */
  state: NpcQuestStatus;
  /** The quest the state refers to, when any quest is relevant. */
  questId?: string;
  /** Speaker name (the NPC's name). */
  speaker: string;
  /** The lines to display, already normalised to `{ text, speaker }`. */
  lines: NPCDialogueLine[];
}

/**
 * Selects an NPC's dialogue lines for the player's current quest state.
 * Precedence of state-specific lines: turn-in > in-progress > available; if the
 * matched state has no lines configured, the NPC's default lines are used.
 */
export function resolveNpcDialogue(
  npc: NPCDefinition,
  questManager: QuestManager,
  playerLevel = 1,
): NpcDialogueResolution {
  const { status, questId } = questManager.resolveNpcQuest(npc.id, playerLevel);

  let stateLines: string[] | undefined;
  if (status === 'ready-turn-in') {
    stateLines = npc.dialogue.questCompleted;
  } else if (status === 'in-progress') {
    stateLines = npc.dialogue.questInProgress;
  } else if (status === 'available') {
    stateLines = npc.dialogue.questAvailable;
  }

  const texts = stateLines && stateLines.length > 0 ? stateLines : npc.dialogue.default;

  return {
    state: status,
    questId,
    speaker: npc.name,
    lines: texts.map((text) => ({ text, speaker: npc.name })),
  };
}
