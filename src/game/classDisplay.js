const BASE_CLASS_LABELS = {
  archer: "Scout",
  fighter: "Warrior",
  warrior: "Warrior",
  necromancer: "Mage"
};

const RANGER_PATH_LABELS = {
  rangerPath: "Ranger",
  roguePath: "Rogue",
  assassinPath: "Assassin",
  beastMasterPath: "Beast Master"
};

const WARRIOR_PATH_LABELS = {
  paladinDoctrine: "Paladin",
  berserkerDoctrine: "Berserker",
  gladiatorDoctrine: "Gladiator",
  eldritchDoctrine: "Eldritch"
};

const MAGE_PATH_LABELS = {
  wizardPath: "Wizard",
  necromancerPath: "Necromancer",
  sorcererPath: "Sorcerer",
  enchanterPath: "Enchanter"
};

function hasPoint(tree, key) {
  return (tree?.[key]?.points || 0) > 0;
}

function findSelectedLabel(tree, labels) {
  for (const [key, label] of Object.entries(labels)) {
    if (hasPoint(tree, key)) return label;
  }
  return "";
}

export function normalizeBaseClassType(classType) {
  if (classType === "fighter" || classType === "warrior") return "fighter";
  if (classType === "necromancer") return "necromancer";
  return "archer";
}

export function getBaseClassDisplayLabel(classType) {
  return BASE_CLASS_LABELS[normalizeBaseClassType(classType)] || BASE_CLASS_LABELS.archer;
}

export function getClassDisplayLabel(source = {}) {
  const classType = normalizeBaseClassType(source?.classType);
  if (classType === "archer") return findSelectedLabel(source?.rangerTalents, RANGER_PATH_LABELS) || BASE_CLASS_LABELS.archer;
  if (classType === "fighter") return findSelectedLabel(source?.warriorTalents, WARRIOR_PATH_LABELS) || BASE_CLASS_LABELS.fighter;
  if (classType === "necromancer") return findSelectedLabel(source?.necromancerTalents, MAGE_PATH_LABELS) || BASE_CLASS_LABELS.necromancer;
  return BASE_CLASS_LABELS.archer;
}
