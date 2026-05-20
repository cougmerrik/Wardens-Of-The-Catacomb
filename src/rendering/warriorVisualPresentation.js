import {
  getWarriorCapstone,
  getWarriorDoctrine,
  getWarriorStanceModifier,
  getWarriorTalentPoints,
  getWarriorWeaponForm
} from "../game/warriorTalentTree.js";

const DEFAULT_WARRIOR_VISUAL = {
  classKey: "warrior",
  weapon: "broadswing",
  doctrine: "battlecry",
  stanceA: "",
  stanceB: "",
  extras: [],
  capstone: "",
  costume: {
    cloak: "#20241d",
    armor: "#6f7870",
    armorDark: "#343a38",
    trim: "#a89770",
    leather: "#6b4428",
    accent: "#c8d0c4",
    hair: "#b8b5a5",
    beard: "#8f8c80",
    skin: "#c89168"
  },
  sprite: {
    silhouette: "castleVeteran",
    gear: ["wolfClasp", "platePauldrons", "swordHilt", "darkCloak"],
    secondaryAccents: []
  },
  weaponVisual: {
    style: "broadswing",
    blade: "#d8e0dc",
    haft: "#7b5635",
    guard: "#b09b6b",
    trail: "#d8e0dc"
  },
  pathPresentation: {
    tint: null,
    alpha: 0,
    filter: "none"
  },
  effects: {
    rage: "battleCryPulse",
    guard: null,
    shock: null,
    capstone: null
  }
};

const WEAPON_VISUALS = {
  broadswing: {
    gear: ["broadSwordHilt", "wideGuard"],
    weaponVisual: { style: "broadswing", blade: "#d8e0dc", haft: "#7b5635", guard: "#b09b6b", trail: "#d8e0dc" }
  },
  longspear: {
    gear: ["spearStrap", "longSpearHead"],
    weaponVisual: { style: "longspear", blade: "#dbe6df", haft: "#806040", guard: "#c8c39a", trail: "#dfe8d7" }
  },
  warWhip: {
    gear: ["coiledWhip", "chainWrap"],
    weaponVisual: { style: "warWhip", blade: "#d3b489", haft: "#6d4a2c", guard: "#9b8fd4", trail: "#cab4ff" }
  },
  twinHatchets: {
    gear: ["pairedHatchets", "lowAxeBelt"],
    weaponVisual: { style: "twinHatchets", blade: "#dce5e0", haft: "#72462c", guard: "#9f8d68", trail: "#d8c6a0" }
  }
};

const DOCTRINE_VISUALS = {
  battlecry: {
    costume: {},
    pathPresentation: { tint: null, alpha: 0, filter: "none" },
    accents: ["battleCryEtching"],
    effects: { rage: "battleCryPulse" }
  },
  paladin: {
    costume: { trim: "#f1d98f", accent: "#ffe8a3", cloak: "#26271f" },
    pathPresentation: { tint: "#f5cf6f", alpha: 0.78, filter: "brightness(1.08) saturate(1.15)" },
    accents: ["holyTrim", "sunEtching"],
    effects: { rage: "sanctifyGlow", guard: "goldWard" }
  },
  berserker: {
    costume: { trim: "#d46d5d", accent: "#f08d77", cloak: "#2c1714", armorDark: "#3f2b29" },
    pathPresentation: { tint: "#dd6e62", alpha: 0.62, filter: "brightness(1.07) saturate(1.18)" },
    accents: ["redWarPaint", "scarredPlate"],
    effects: { rage: "bloodhowlPulse" }
  },
  gladiator: {
    costume: { trim: "#d6b487", accent: "#e0c692", cloak: "#2b271d", armor: "#766d5c" },
    pathPresentation: { tint: "#d6b487", alpha: 0.62, filter: "brightness(1.06) saturate(1.08)" },
    accents: ["arenaBronze", "commandCrest"],
    effects: { rage: "arenaCommandRing" }
  },
  eldritch: {
    costume: { trim: "#9d9fff", accent: "#b8c4ff", cloak: "#1b1b2b", armorDark: "#2c2d49" },
    pathPresentation: { tint: "#9d7bff", alpha: 0.72, filter: "brightness(1.08) saturate(1.2)" },
    accents: ["arcaneRunes", "blueWard"],
    effects: { rage: "arcaneArmament", guard: "eldritchWard" }
  }
};

const STANCE_ACCENTS = {
  cleaving: "wideEdge",
  focused: "pointedGuard",
  swift: "lightFootwork",
  heavy: "weightedPommel",
  guarded: "raisedPauldron",
  marked: "etchedMark"
};

const EXTRA_ACCENTS = {
  consecratedGround: "circleCharm",
  cleaveDiscipline: "wideSwingThread",
  executionersReach: "executionNotch",
  battleFrenzy: "frenzyWrap",
  shockRelease: "shockEtching",
  butchersPath: "butcherMark",
  redTempest: "tempestSash",
  secondWind: "greenTalisman"
};

const CAPSTONE_VISUALS = {
  bastion: { accent: "towerShieldClasp", color: "#f3ddb0", effect: "bastionGuard" },
  ravager: { accent: "ravagerScars", color: "#f08d77", effect: "ravagerHeat" },
  paragon: { accent: "paragonCrest", color: "#e0c692", effect: "paragonCommand" },
  spellknight: { accent: "spellbladeRunes", color: "#a7b7ff", effect: "spellbladeEcho" }
};

function cloneSpec(spec) {
  return JSON.parse(JSON.stringify(spec));
}

function selectedExtras(source) {
  return Object.keys(EXTRA_ACCENTS).filter((key) => getWarriorTalentPoints(source, key) > 0);
}

export function getWarriorVisualSpec(source = null) {
  const spec = cloneSpec(DEFAULT_WARRIOR_VISUAL);
  const weapon = getWarriorWeaponForm(source);
  const doctrine = getWarriorDoctrine(source);
  const stanceA = getWarriorStanceModifier(source, "A");
  const stanceB = getWarriorStanceModifier(source, "B");
  const extras = selectedExtras(source);
  const capstone = getWarriorCapstone(source);

  spec.weapon = weapon;
  spec.doctrine = doctrine;
  spec.stanceA = stanceA;
  spec.stanceB = stanceB;
  spec.extras = extras;
  spec.capstone = capstone;

  const weaponVisual = WEAPON_VISUALS[weapon] || WEAPON_VISUALS.broadswing;
  spec.sprite.gear.push(...weaponVisual.gear);
  spec.weaponVisual = { ...spec.weaponVisual, ...weaponVisual.weaponVisual };

  const doctrineVisual = DOCTRINE_VISUALS[doctrine] || DOCTRINE_VISUALS.battlecry;
  spec.costume = { ...spec.costume, ...doctrineVisual.costume };
  spec.pathPresentation = { ...doctrineVisual.pathPresentation };
  spec.sprite.secondaryAccents.push(...doctrineVisual.accents);
  spec.effects = { ...spec.effects, ...doctrineVisual.effects };

  for (const stance of [stanceA, stanceB]) {
    if (stance && STANCE_ACCENTS[stance]) spec.sprite.secondaryAccents.push(STANCE_ACCENTS[stance]);
  }
  for (const extra of extras.slice(0, 2)) {
    if (EXTRA_ACCENTS[extra]) spec.sprite.secondaryAccents.push(EXTRA_ACCENTS[extra]);
  }
  if (extras.includes("shockRelease")) spec.effects.shock = doctrine === "eldritch" ? "arcaneShockWave" : "physicalShockWave";

  if (capstone && CAPSTONE_VISUALS[capstone]) {
    const visual = CAPSTONE_VISUALS[capstone];
    spec.sprite.secondaryAccents.push(visual.accent);
    spec.costume.accent = visual.color;
    spec.effects.capstone = visual.effect;
  }

  return spec;
}

export function getWarriorPathPresentation(source = null) {
  return getWarriorVisualSpec(source).pathPresentation;
}
