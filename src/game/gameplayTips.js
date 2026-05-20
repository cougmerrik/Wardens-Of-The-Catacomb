export const GAMEPLAY_TIPS_STORAGE_KEY = "wardens.gameplayTipsEnabled";
export const GAMEPLAY_TIP_DURATION = 5;
const RANDOM_TIP_MIN_DELAY = 18;
const RANDOM_TIP_DELAY_SPREAD = 14;

export const GAMEPLAY_RANDOM_TIPS = [
  "The shop has items that can help you survive!",
  "Don't die!",
  "You can disable these tips in the options menu.",
  "Basic!",
  "Goblins eat gold to gain power.. and then kill you.",
  "Skeletons can be permanently destroyed with melee hits.",
  "Some chests may be harmful.",
  "Moving can help you escape from enemies.",
  "Killing monsters gives you XP.",
  "Selecting the skills is forever, unless you want to buy a refund.",
  "The shop is everywhere. Everywhere is the shop.",
  "You can turn the music up in the options menu.",
  "You can disable the ads by buying the full game, or through the options menu.",
  "Torches refill your lantern meter.",
  "Try to avoid fighting in the dark.",
  "Rat archers are pure evil."
];

export function getStoredGameplayTipsEnabled(storage = globalThis?.localStorage) {
  try {
    const raw = storage?.getItem?.(GAMEPLAY_TIPS_STORAGE_KEY);
    return raw === null || raw === undefined ? true : raw !== "false";
  } catch {
    return true;
  }
}

export function persistGameplayTipsEnabled(enabled, storage = globalThis?.localStorage) {
  try {
    storage?.setItem?.(GAMEPLAY_TIPS_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage failures; gameplay tips remain a local preference.
  }
}

export function createGameplayTipState(enabled = true) {
  return {
    enabled: enabled !== false,
    text: "",
    timer: 0,
    duration: GAMEPLAY_TIP_DURATION,
    randomCooldown: 0,
    randomLastIndex: -1,
    shown: {
      start: false,
      level2: false,
      level3: false
    }
  };
}

function getSwapSubject(game) {
  if (game?.isWarriorClass?.() || game?.classType === "fighter") return "stances";
  if (game?.isNecromancerClass?.() || game?.classType === "necromancer") return "spells";
  return "weapons";
}

function getTipText(game, eventKey) {
  const android = !!game?.isAndroidLayout || game?.platform === "android";
  if (eventKey === "start") {
    return android
      ? "Use the left touch area to move and drag the right touch area to aim and fire. Tap the special ability button to use your special ability."
      : "Use WASD to move and click to fire. Right click to use your special ability.";
  }
  if (eventKey === "level2") {
    const subject = getSwapSubject(game);
    return android
      ? `Tap Swap to swap between ${subject}.`
      : `Use Q to swap between ${subject}.`;
  }
  if (eventKey === "level3") {
    if (game?.isWarriorClass?.() || game?.classType === "fighter") return "Hit thing with stick.";
    if (game?.isNecromancerClass?.() || game?.classType === "necromancer") return "Mana regenerates faster when you stop casting.";
    return "Build up combo to strengthen your attacks.";
  }
  return "";
}

function formatTipText(text) {
  return `TIP: ${text}`;
}

function getRandomDelay(random = Math.random) {
  const roll = typeof random === "function" ? random() : Math.random();
  return RANDOM_TIP_MIN_DELAY + Math.max(0, Math.min(1, roll)) * RANDOM_TIP_DELAY_SPREAD;
}

export function triggerGameplayTip(game, eventKey) {
  const tips = game?.gameplayTips;
  if (!tips || tips.enabled === false) return false;
  if (tips.shown?.[eventKey]) return false;
  const text = getTipText(game, eventKey);
  if (!text) return false;
  tips.text = formatTipText(text);
  tips.timer = GAMEPLAY_TIP_DURATION;
  tips.duration = GAMEPLAY_TIP_DURATION;
  tips.shown[eventKey] = true;
  return true;
}

export function triggerRandomGameplayTip(game, random = Math.random) {
  const tips = game?.gameplayTips;
  if (!tips || tips.enabled === false || GAMEPLAY_RANDOM_TIPS.length <= 0) return false;
  if ((game.level || game.player?.level || 1) <= 3) return false;
  let index = Math.floor(Math.max(0, Math.min(0.999999, random())) * GAMEPLAY_RANDOM_TIPS.length);
  if (GAMEPLAY_RANDOM_TIPS.length > 1 && index === tips.randomLastIndex) index = (index + 1) % GAMEPLAY_RANDOM_TIPS.length;
  tips.randomLastIndex = index;
  tips.text = formatTipText(GAMEPLAY_RANDOM_TIPS[index]);
  tips.timer = GAMEPLAY_TIP_DURATION;
  tips.duration = GAMEPLAY_TIP_DURATION;
  tips.randomCooldown = getRandomDelay(random);
  return true;
}

export function tickGameplayTips(game, dt) {
  const tips = game?.gameplayTips;
  if (!tips) return;
  if (tips.enabled === false) {
    tips.text = "";
    tips.timer = 0;
    return;
  }
  const safeDt = Math.max(0, Number.isFinite(dt) ? dt : 0);
  const level = game.level || game.player?.level || 1;
  if (level >= 2) triggerGameplayTip(game, "level2");
  if (level >= 3) triggerGameplayTip(game, "level3");
  if ((tips.timer || 0) > 0) tips.timer = Math.max(0, tips.timer - safeDt);
  if (level > 3 && (tips.timer || 0) <= 0) {
    tips.randomCooldown = Math.max(0, (tips.randomCooldown || 0) - safeDt);
    if ((tips.randomCooldown || 0) <= 0) triggerRandomGameplayTip(game);
  }
}
