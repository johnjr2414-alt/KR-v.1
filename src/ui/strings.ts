/**
 * Centralized player-facing UI text. Educational question/answer content is
 * intentionally excluded: it is authored content from the question bank and
 * must never be translated or altered by UI-localization changes.
 *
 * To add a UI language, provide an alternate object with the same shape and
 * select it here; `formatUiString` fills `{name}` placeholders.
 */
export const UI_STRINGS = {
  common: {
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    equip: 'Equip',
    unequip: 'Unequip',
  },
  startMenu: {
    enterAsUser: 'Enter as User',
    savedLocally: 'Progress is saved locally in this browser.',
    localAdminAccess: 'Local admin access',
  },
  hud: {
    level: 'Lv. {level}',
    health: 'Health Points',
    mana: 'Mana Points',
    experience: 'Character Experience Progress',
    hp: 'HP',
    mp: 'MP',
    exp: 'EXP',
    max: 'MAX',
    gold: '{amount} G',
    bag: 'Bag',
    skills: 'Skills',
    mastery: 'Mastery',
    quests: 'Quests',
  },
  battle: {
    playerName: '⚔️ {name}',
    monsterName: '👾 {name}',
    level: 'Lv. {level}',
    hp: '{current} / {max} HP',
    questionProgress: 'Question {current} of {total}',
    defeat: 'Defeat...',
    victory: '🏆 Victory!',
    monsterEscaped: '💨 Monster Escaped!',
    questionsAnswered: 'Questions Answered',
    correctAnswers: 'Correct Answers',
    incorrectAnswers: 'Incorrect Answers',
    combatExp: 'Combat EXP',
    gold: 'Gold',
    itemsDropped: 'Items Dropped',
    masteryGains: 'Mastery Gains',
    returnToMenu: 'Return',
  },
  pause: {
    titlePaused: '⏸️ Game Paused',
    resume: '▶️ Resume Game',
    settings: '⚙️ Settings',
    controls: '🎮 Controls & Shortcuts',
    returnToStartMenu: '🚪 Return to Start Menu',
    settingsTitle: '⚙️ Game Settings',
    masterVolume: 'Master Volume',
    sfxVolume: 'Sound Effects (SFX)',
    musicVolume: 'Music Volume',
    showDamageNumbers: 'Show Damage Numbers in Combat',
    textSize: 'Text Size',
    textSizeStandard: 'Standard',
    textSizeLarge: 'Large',
    textSizeExtraLarge: 'Extra Large',
    controlsTitle: '🎮 Controls Guide',
    moveCharacter: 'Move Character:',
    moveKeys: 'W A S D or Arrows',
    interact: 'Interact / Dialogue / Battle:',
    interactKeys: 'SPACE or ENTER',
    inventoryKeys: 'Inventory / Equipment:',
    skillKeys: 'Skill Trees & Hotbar:',
    masteryKeys: 'Subject Mastery:',
    questKeys: 'Quest Journal:',
    pauseKeys: 'Pause / Settings:',
    confirmExitTitle: '⚠️ Confirm Exit',
    confirmExitQuestion: 'Are you sure you want to return to the start menu?',
    confirmExitDetail: 'Your character, gold, inventory, and quest progress will be saved automatically.',
    confirmSaveAndExit: 'Yes, Save & Exit',
  },
  npcDialogue: {
    acceptQuest: 'Accept Quest',
    completeQuest: 'Complete Quest',
    careerCenter: '🎓 Career Center',
  },
  notices: {
    saveRecoveryDismiss: 'Dismiss save recovery notice',
    updateAvailable: 'A new version of Knowledge Realms is available.',
    saveAndReload: 'Save & Reload',
    later: 'Later',
    offlineReady: 'Ready to play offline. Your browser may clear offline data if storage is reclaimed.',
  },
} as const;

/** Values substituted into UI templates such as `{name}`. */
export type UiTemplateValues = Record<string, string | number>;

/** Replaces `{key}` placeholders; unknown placeholders are left intact. */
export function formatUiString(template: string, values: UiTemplateValues = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

/** Locale-aware number formatting for player-facing values (gold, EXP, timers). */
export function formatUiNumber(value: number, locale?: string): string {
  const resolved =
    locale ?? (typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en');
  return new Intl.NumberFormat(resolved).format(value);
}
