const SCOUT_SKILL_ICON_SOURCES = {
  longbow: "./assets/images/skills/scout/longbow.png",
  throwingKnives: "./assets/images/skills/scout/throwingKnives.png",
  twinDaggers: "./assets/images/skills/scout/twinDaggers.png",
  rapierPistol: "./assets/images/skills/scout/rapierPistol.png",
  opportunist: "./assets/images/skills/scout/opportunist.png",
  ambush: "./assets/images/skills/scout/ambush.png",
  predator: "./assets/images/skills/scout/predator.png",
  footwork: "./assets/images/skills/scout/footwork.png",
  precision: "./assets/images/skills/scout/precision.png",
  flurry: "./assets/images/skills/scout/flurry.png",
  bleed: "./assets/images/skills/scout/bleed.png",
  trickShots: "./assets/images/skills/scout/trickShots.png",
  skirmisher: "./assets/images/skills/scout/skirmisher.png",
  rangerPath: "./assets/images/skills/scout/rangerPath.png",
  roguePath: "./assets/images/skills/scout/roguePath.png",
  assassinPath: "./assets/images/skills/scout/assassinPath.png",
  beastMasterPath: "./assets/images/skills/scout/beastMasterPath.png",
  shadowVeil: "./assets/images/skills/scout/shadowVeil.png",
  relentless: "./assets/images/skills/scout/relentless.png",
  venomCoating: "./assets/images/skills/scout/venomCoating.png",
  forager: "./assets/images/skills/scout/forager.png",
  predatorsFeast: "./assets/images/skills/scout/predatorsFeast.png",
  comboSurge: "./assets/images/skills/scout/comboSurge.png",
  smokeBomb: "./assets/images/skills/scout/smokeBomb.png",
  quarry: "./assets/images/skills/scout/quarry.png",
  stormcaller: "./assets/images/skills/scout/stormcaller.png",
  livingShadow: "./assets/images/skills/scout/livingShadow.png",
  deathChain: "./assets/images/skills/scout/deathChain.png",
  apexPredator: "./assets/images/skills/scout/apexPredator.png"
};

const ICON_CACHE = new Map();

function isIconKey(key) {
  return Boolean(SCOUT_SKILL_ICON_SOURCES[key]);
}

function getIconRecord(key) {
  if (!isIconKey(key)) return null;
  if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  if (typeof Image !== "function") return null;

  const record = { image: new Image(), loaded: false, failed: false };
  record.image.addEventListener("load", () => {
    record.loaded = true;
  }, { once: true });
  record.image.addEventListener("error", () => {
    record.failed = true;
  }, { once: true });
  record.image.src = SCOUT_SKILL_ICON_SOURCES[key];
  ICON_CACHE.set(key, record);
  return record;
}

export function preloadScoutSkillIcons() {
  for (const key of Object.keys(SCOUT_SKILL_ICON_SOURCES)) getIconRecord(key);
}

export function getScoutSkillIconStatus(key) {
  if (!isIconKey(key)) return "missing";
  const record = getIconRecord(key);
  if (!record) return "missing";
  if (record.loaded) return "loaded";
  if (record.failed) return "failed";
  return "loading";
}

export function drawScoutSkillIcon(ctx, key, x, y, size, padding = 1, muted = false) {
  const record = getIconRecord(key);
  if (!record || !record.loaded || record.failed) return false;

  const previousSmoothing = ctx.imageSmoothingEnabled;
  const previousAlpha = ctx.globalAlpha;
  const previousFilter = ctx.filter;
  ctx.imageSmoothingEnabled = false;
  if (muted) {
    ctx.globalAlpha = 0.42;
    ctx.filter = "grayscale(1)";
  }
  ctx.drawImage(record.image, x + padding, y + padding, size - padding * 2, size - padding * 2);
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.globalAlpha = previousAlpha;
  ctx.filter = previousFilter;
  return true;
}
