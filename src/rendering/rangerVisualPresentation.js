const DEFAULT_RANGER_VISUAL = {
  weapon: "longbow",
  weaponMode: "ranged",
  swapStyle: null,
  modifier: null,
  path: null,
  generalSkills: [],
  capstone: null,
  costume: {
    hood: "#2f5d3b",
    tunic: "#3a7d4d",
    trim: "#62b276",
    leather: "#6f5534",
    accent: "#8eb8ff",
    hair: "#8b6540"
  },
  sprite: {
    silhouette: "elfArcher",
    stance: "steady",
    gear: ["quiver", "bracers"],
    secondaryAccents: []
  },
  weaponVisual: {
    style: "longbow",
    silhouette: "tallBow",
    color: "#8eb8ff",
    trail: "sparseArrow"
  },
  motion: {
    stance: "steady",
    cadence: "normal",
    accent: null
  },
  pathPresentation: {
    tint: null,
    alpha: 0,
    filter: "none"
  },
  projectile: {
    family: "arrow",
    head: "#d8c9a7",
    trail: "#8eb8ff",
    impact: "cleanSpark"
  },
  effects: {
    swap: null,
    hit: "cleanSpark",
    buff: null,
    capstone: null
  }
};

const WEAPON_VISUALS = {
  longbow: {
    spriteGear: ["quiver", "bracers", "tallBow"],
    weaponVisual: { style: "longbow", silhouette: "tallBow", color: "#8eb8ff", trail: "sparseArrow" },
    projectile: { family: "arrow", head: "#d8c9a7", trail: "#8eb8ff", impact: "cleanSpark" },
    motion: { stance: "steady", cadence: "normal", accent: "drawFocus" }
  },
  throwingKnives: {
    spriteGear: ["knifeBelt", "bracers"],
    weaponVisual: { style: "throwingKnives", silhouette: "handKnives", color: "#78dcb6", trail: "shortSilverStreak" },
    projectile: { family: "knife", head: "#dce6e2", trail: "#78dcb6", impact: "knifeGlint" },
    motion: { stance: "quickHands", cadence: "quick", accent: "spinGlint" }
  },
  twinDaggers: {
    spriteGear: ["pairedDaggers", "lowBelt"],
    weaponVisual: { style: "twinDaggers", silhouette: "pairedBlades", color: "#b7f4dc", trail: "pairedShortStreaks" },
    projectile: { family: "pairedBlade", head: "#dce6e2", trail: "#b7f4dc", impact: "dualSlash" },
    motion: { stance: "lowMeleeReady", cadence: "quick", accent: "pairedSlash" }
  },
  rapierPistol: {
    spriteGear: ["rapier", "smallPistol", "duelistSash"],
    weaponVisual: { style: "rapierPistol", silhouette: "rapierAndPistol", color: "#e7d08c", trail: "muzzleSpark" },
    projectile: { family: "bullet", head: "#f7e6a8", trail: "#e7d08c", impact: "muzzleFlash" },
    motion: { stance: "duelist", cadence: "measured", accent: "thrustLine" }
  }
};

const SWAP_VISUALS = {
  opportunist: { motionAccent: "readyGlint", effect: "blueReadyWindow", color: "#7cd5ff" },
  ambush: { motionAccent: "coiledBurst", effect: "warmBurstFlash", color: "#ffba6d" },
  predator: { motionAccent: "forwardLean", effect: "feralComboPulse", color: "#d0f09d" },
  footwork: { motionAccent: "guardedSidestep", effect: "guardBrace", color: "#cbb5ff" }
};

const MODIFIER_VISUALS = {
  precision: { cadence: "steady", projectileImpact: "criticalGlint", effect: "aimGlint", color: "#d6e4ff" },
  flurry: { cadence: "fast", projectileImpact: "rapidTicks", effect: "speedTicks", color: "#88efaa" },
  bleed: { cadence: "normal", projectileImpact: "bleedFlecks", effect: "shortRedFlecks", color: "#d36a62" },
  trickShots: { cadence: "syncopated", projectileImpact: "ricochetSpark", effect: "blueAngleSpark", color: "#aac7ff" },
  skirmisher: { cadence: "mobile", projectileImpact: "tealMotionSpark", effect: "cloakFlick", color: "#8ee1c6" }
};

const PATH_VISUALS = {
  rangerPath: {
    costume: { trim: "#ff9b52", accent: "#ffbd68" },
    pathPresentation: { tint: "#4fae5f", alpha: 0.48, filter: "saturate(1.1) brightness(1.02)" },
    spriteAccents: ["fireArrowTrim", "strongQuiver"],
    projectile: { head: "#ff9b52", trail: "#ffbd68", impact: "containedFireBurst" },
    effect: "emberBurst"
  },
  roguePath: {
    costume: { hood: "#30313f", tunic: "#3f4050", trim: "#b78dff", accent: "#9c88ff" },
    pathPresentation: { tint: "#8e9297", alpha: 0.58, filter: "saturate(0.75) brightness(0.95)" },
    spriteAccents: ["darkCloak", "stealthWrap"],
    projectile: { trail: "#9c88ff", impact: "shadowPuff" },
    effect: "shadowstepSmear"
  },
  assassinPath: {
    costume: { hood: "#15161a", tunic: "#272018", trim: "#f0c39b", accent: "#d36a62" },
    pathPresentation: { tint: "#101116", alpha: 0.62, filter: "brightness(0.72) contrast(1.15)" },
    spriteAccents: ["executionMark", "sharpDaggerPosture"],
    projectile: { trail: "#f0c39b", impact: "executeSlash" },
    effect: "markedExecutionFlash"
  },
  beastMasterPath: {
    costume: { hood: "#395f35", tunic: "#45683a", trim: "#a6d77c", accent: "#fff0bd" },
    pathPresentation: { tint: "#c7a16a", alpha: 0.48, filter: "sepia(0.22) saturate(1.08)" },
    spriteAccents: ["wolfPactCharm", "naturalTrim"],
    projectile: { trail: "#a6d77c", impact: "leafPulse" },
    effect: "wolfPactPulse"
  }
};

const GENERAL_VISUALS = {
  shadowVeil: { accent: "shadowFade", effect: "breakStealthFlash", color: "#9c88ff" },
  venomCoating: { accent: "venomVial", effect: "poisonDroplet", color: "#8ae06f" },
  quarry: { accent: "hunterMark", effect: "markedHitFlash", color: "#f5e8b0" },
  smokeBomb: { accent: "smokeSatchel", effect: "smokePuff", color: "#9ea7ad" },
  comboSurge: { accent: "comboThread", effect: "surgeShockwave", color: "#ffe27c" },
  predatorsFeast: { accent: "predatorTrophy", effect: "feastPulse", color: "#ffb36a" },
  forager: { accent: "herbPouch", effect: "healingMote", color: "#b7e38a" },
  relentless: { accent: "comboBand", effect: "relentlessTick", color: "#ffe27c" }
};

const CAPSTONE_VISUALS = {
  stormcaller: { accent: "stormThread", projectileImpact: "stormFork", effect: "stormFlash", color: "#d8f4ff" },
  livingShadow: { accent: "shadowEcho", projectileImpact: "echoHit", effect: "shadowDuplicate", color: "#c7a5ff" },
  deathChain: { accent: "chainMark", projectileImpact: "chainJump", effect: "deathChainLine", color: "#ffc0b3" },
  apexPredator: { accent: "apexCharm", projectileImpact: "apexPulse", effect: "wolfPounceImpact", color: "#fff0bd" }
};

function cloneSpec(spec) {
  return JSON.parse(JSON.stringify(spec));
}

function getPoints(source, key) {
  const points = source?.rangerTalents?.[key]?.points ?? source?.skills?.[key]?.points;
  return Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
}

function selectFirst(source, keys) {
  return keys.find((key) => getPoints(source, key) > 0) || null;
}

function selectMany(source, keys) {
  return keys.filter((key) => getPoints(source, key) > 0);
}

function getWeaponMode(source) {
  const mode = source?.rangerRuntime?.weaponMode ?? source?.player?.rangerRuntime?.weaponMode;
  return mode === "melee" ? "melee" : "ranged";
}

export function getRangerVisualSpec(source = null) {
  const spec = cloneSpec(DEFAULT_RANGER_VISUAL);
  const weapon = selectFirst(source, ["longbow", "throwingKnives", "twinDaggers", "rapierPistol"]) || "longbow";
  const weaponMode = getWeaponMode(source);
  const swapStyle = selectFirst(source, ["opportunist", "ambush", "predator", "footwork"]);
  const modifier = selectFirst(source, ["precision", "flurry", "bleed", "trickShots", "skirmisher"]);
  const path = selectFirst(source, ["rangerPath", "roguePath", "assassinPath", "beastMasterPath"]);
  const generalSkills = selectMany(source, ["shadowVeil", "relentless", "venomCoating", "forager", "predatorsFeast", "comboSurge", "smokeBomb", "quarry"]);
  const capstone = selectFirst(source, ["stormcaller", "livingShadow", "deathChain", "apexPredator"]);

  spec.weapon = weapon;
  spec.weaponMode = weaponMode;
  spec.swapStyle = swapStyle;
  spec.modifier = modifier;
  spec.path = path;
  spec.generalSkills = generalSkills;
  spec.capstone = capstone;

  const weaponVisual = WEAPON_VISUALS[weapon] || WEAPON_VISUALS.longbow;
  spec.sprite.gear = [...weaponVisual.spriteGear];
  spec.weaponVisual = { ...spec.weaponVisual, ...weaponVisual.weaponVisual };
  spec.projectile = { ...spec.projectile, ...weaponVisual.projectile };
  spec.motion = { ...spec.motion, ...weaponVisual.motion };

  if (swapStyle && SWAP_VISUALS[swapStyle]) {
    const visual = SWAP_VISUALS[swapStyle];
    spec.motion.accent = visual.motionAccent;
    spec.effects.swap = visual.effect;
    spec.sprite.secondaryAccents.push(`${swapStyle}:${visual.motionAccent}`);
  }

  if (modifier && MODIFIER_VISUALS[modifier]) {
    const visual = MODIFIER_VISUALS[modifier];
    spec.motion.cadence = visual.cadence;
    spec.projectile.impact = visual.projectileImpact;
    spec.effects.hit = visual.effect;
    spec.sprite.secondaryAccents.push(`${modifier}:${visual.effect}`);
  }

  if (path && PATH_VISUALS[path]) {
    const visual = PATH_VISUALS[path];
    spec.costume = { ...spec.costume, ...visual.costume };
    spec.pathPresentation = { ...visual.pathPresentation };
    spec.sprite.secondaryAccents.push(...visual.spriteAccents);
    spec.projectile = { ...spec.projectile, ...visual.projectile };
    spec.effects.buff = visual.effect;
  }

  for (const skill of generalSkills.slice(0, 2)) {
    const visual = GENERAL_VISUALS[skill];
    if (!visual) continue;
    spec.sprite.secondaryAccents.push(visual.accent);
    spec.effects[skill] = visual.effect;
  }

  if (capstone && CAPSTONE_VISUALS[capstone]) {
    const visual = CAPSTONE_VISUALS[capstone];
    spec.sprite.secondaryAccents.push(visual.accent);
    spec.projectile.impact = visual.projectileImpact;
    spec.effects.capstone = visual.effect;
    spec.costume.accent = visual.color;
  }

  return spec;
}

export function getRangerPathPresentation(source = null) {
  return getRangerVisualSpec(source).pathPresentation;
}

export function getRangerWeaponPresentation(source = null) {
  return getRangerVisualSpec(source).weaponVisual.style;
}

export function getRangerProjectileVisualSpec(source = null, context = {}) {
  const spec = getRangerVisualSpec(source);
  const mode = context.mode === "melee" ? "melee" : "ranged";
  const projectileKind = context.projectileKind || spec.projectile.family;
  const active = context.active || {};
  const accents = [];
  if (spec.effects.buff) accents.push(spec.effects.buff);
  if (spec.effects.capstone) accents.push(spec.effects.capstone);
  if (active.fireArrow || spec.path === "rangerPath") accents.push("emberTrail");
  if (active.shadow || spec.path === "roguePath") accents.push("shadowPuff");
  if (active.poison || spec.generalSkills.includes("venomCoating")) accents.push("poisonDroplet");
  if (active.marked || spec.generalSkills.includes("quarry")) accents.push("markedHitFlash");
  if (active.combo && spec.capstone === "apexPredator") accents.push("apexPulse");
  return {
    weapon: spec.weapon,
    path: spec.path,
    capstone: spec.capstone,
    mode,
    projectileKind,
    family: spec.projectile.family,
    head: spec.projectile.head,
    trail: spec.projectile.trail,
    impact: spec.projectile.impact,
    trailStyle: spec.weaponVisual.trail,
    effectAccents: [...new Set(accents)],
    lifetime: "short",
    allowLingering: false
  };
}

export function getRangerEffectVisualSpec(source = null, effectType = "hit", context = {}) {
  const spec = getRangerVisualSpec(source);
  const active = context.active || {};
  const baseEffect = spec.effects[effectType] || spec.effects.hit || "cleanSpark";
  const overlays = [];
  if (effectType === "swap" && spec.effects.swap) overlays.push(spec.effects.swap);
  if (effectType === "buff" && spec.effects.buff) overlays.push(spec.effects.buff);
  if (effectType === "capstone" && spec.effects.capstone) overlays.push(spec.effects.capstone);
  if (active.stealth || spec.generalSkills.includes("shadowVeil")) overlays.push("breakStealthFlash");
  if (active.poison || spec.generalSkills.includes("venomCoating")) overlays.push("poisonDroplet");
  if (active.bleed || spec.modifier === "bleed") overlays.push("shortRedFlecks");
  if (active.marked || spec.generalSkills.includes("quarry")) overlays.push("markedHitFlash");
  return {
    type: effectType,
    weapon: spec.weapon,
    path: spec.path,
    modifier: spec.modifier,
    capstone: spec.capstone,
    primary: baseEffect,
    overlays: [...new Set(overlays)],
    color: spec.costume.accent,
    duration: effectType === "swap" ? "brief" : "veryShort",
    allowLingering: false
  };
}
