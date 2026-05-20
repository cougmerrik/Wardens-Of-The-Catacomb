const WARRIOR_SKILL_ICON_SOURCES = {
  broadswing: "./assets/images/skills/warrior/broadswing.png",
  longspear: "./assets/images/skills/warrior/longspear.png",
  warWhip: "./assets/images/skills/warrior/warWhip.png",
  twinHatchets: "./assets/images/skills/warrior/twinHatchets.png",
  stanceACleaving: "./assets/images/skills/warrior/cleaving.png",
  stanceAFocused: "./assets/images/skills/warrior/focused.png",
  stanceASwift: "./assets/images/skills/warrior/swift.png",
  stanceAHeavy: "./assets/images/skills/warrior/heavy.png",
  stanceAGuarded: "./assets/images/skills/warrior/guarded.png",
  stanceAMarked: "./assets/images/skills/warrior/marked.png",
  stanceBCleaving: "./assets/images/skills/warrior/cleaving.png",
  stanceBFocused: "./assets/images/skills/warrior/focused.png",
  stanceBSwift: "./assets/images/skills/warrior/swift.png",
  stanceBHeavy: "./assets/images/skills/warrior/heavy.png",
  stanceBGuarded: "./assets/images/skills/warrior/guarded.png",
  stanceBMarked: "./assets/images/skills/warrior/marked.png",
  paladinDoctrine: "./assets/images/skills/warrior/paladinDoctrine.png",
  berserkerDoctrine: "./assets/images/skills/warrior/berserkerDoctrine.png",
  gladiatorDoctrine: "./assets/images/skills/warrior/gladiatorDoctrine.png",
  eldritchDoctrine: "./assets/images/skills/warrior/eldritchDoctrine.png",
  consecratedGround: "./assets/images/skills/warrior/consecratedGround.png",
  cleaveDiscipline: "./assets/images/skills/warrior/cleaveDiscipline.png",
  executionersReach: "./assets/images/skills/warrior/executionersReach.png",
  battleFrenzy: "./assets/images/skills/warrior/battleFrenzy.png",
  shockRelease: "./assets/images/skills/warrior/shockRelease.png",
  butchersPath: "./assets/images/skills/warrior/butchersPath.png",
  redTempest: "./assets/images/skills/warrior/redTempest.png",
  secondWind: "./assets/images/skills/warrior/secondWind.png",
  bastion: "./assets/images/skills/warrior/bastion.png",
  ravager: "./assets/images/skills/warrior/ravager.png",
  paragon: "./assets/images/skills/warrior/paragon.png",
  spellknight: "./assets/images/skills/warrior/spellknight.png"
};

const ICON_CACHE = new Map();

function isIconKey(key) {
  return Boolean(WARRIOR_SKILL_ICON_SOURCES[key]);
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
  record.image.src = WARRIOR_SKILL_ICON_SOURCES[key];
  ICON_CACHE.set(key, record);
  return record;
}

export function preloadWarriorSkillIcons() {
  for (const key of Object.keys(WARRIOR_SKILL_ICON_SOURCES)) getIconRecord(key);
}

export function drawWarriorSkillIcon(ctx, key, x, y, size, padding = 1, muted = false) {
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
