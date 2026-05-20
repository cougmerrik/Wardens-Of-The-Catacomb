const MAGE_SKILL_ICON_SOURCES = {
  fireBoltCantrip: "./assets/images/skills/mage/fireBoltCantrip.png",
  frostShardCantrip: "./assets/images/skills/mage/frostShardCantrip.png",
  shockCantrip: "./assets/images/skills/mage/shockCantrip.png",
  arcaneMissileCantrip: "./assets/images/skills/mage/arcaneMissileCantrip.png",
  necroticBeamCantrip: "./assets/images/skills/mage/necroticBeamCantrip.png",
  greenFlameBladeCantrip: "./assets/images/skills/mage/greenFlameBladeCantrip.png",
  fireballSpell: "./assets/images/skills/mage/fireballSpell.png",
  chromaticOrbSpell: "./assets/images/skills/mage/chromaticOrbSpell.png",
  cloudDaggersSpell: "./assets/images/skills/mage/cloudDaggersSpell.png",
  confusionSpell: "./assets/images/skills/mage/confusionSpell.png",
  invisibilitySpell: "./assets/images/skills/mage/invisibilitySpell.png",
  flamingSphereSpell: "./assets/images/skills/mage/flamingSphereSpell.png",
  highFocus: "./assets/images/skills/mage/highFocus.png",
  rapidCasting: "./assets/images/skills/mage/rapidCasting.png",
  bloodCasting: "./assets/images/skills/mage/bloodCasting.png",
  battleCaster: "./assets/images/skills/mage/battleCaster.png",
  wizardPath: "./assets/images/skills/mage/wizardPath.png",
  necromancerPath: "./assets/images/skills/mage/necromancerPath.png",
  sorcererPath: "./assets/images/skills/mage/sorcererPath.png",
  enchanterPath: "./assets/images/skills/mage/enchanterPath.png",
  arcaneClarity: "./assets/images/skills/mage/arcaneClarity.png",
  deepReserves: "./assets/images/skills/mage/deepReserves.png",
  manaSurge: "./assets/images/skills/mage/manaSurge.png",
  phaseBarrier: "./assets/images/skills/mage/phaseBarrier.png",
  catalyst: "./assets/images/skills/mage/catalyst.png",
  arcanePresence: "./assets/images/skills/mage/arcanePresence.png",
  lingeringPower: "./assets/images/skills/mage/lingeringPower.png",
  arcaneBind: "./assets/images/skills/mage/arcaneBind.png",
  archmage: "./assets/images/skills/mage/archmage.png",
  lich: "./assets/images/skills/mage/lich.png",
  battlemage: "./assets/images/skills/mage/battlemage.png",
  runicMastery: "./assets/images/skills/mage/runicMastery.png"
};

const ICON_CACHE = new Map();

function isIconKey(key) {
  return Boolean(MAGE_SKILL_ICON_SOURCES[key]);
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
  record.image.src = MAGE_SKILL_ICON_SOURCES[key];
  ICON_CACHE.set(key, record);
  return record;
}

export function preloadMageSkillIcons() {
  for (const key of Object.keys(MAGE_SKILL_ICON_SOURCES)) getIconRecord(key);
}

export function drawMageSkillIcon(ctx, key, x, y, size, padding = 1, muted = false) {
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
