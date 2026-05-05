import {
  createNecromancerBeamState,
  createRangerRuntimeState,
  createWarriorRuntimeState,
  createSkillState,
  createUpgradeState
} from "../../src/game/runtimeBaseStateFactories.js";

export function cloneSkillState(source = null) {
  const next = createSkillState();
  if (!source || typeof source !== "object") return next;
  for (const [key, skill] of Object.entries(next)) {
    const raw = source[key];
    if (!raw || typeof raw !== "object") continue;
    if (Number.isFinite(raw.points)) skill.points = Math.max(0, Math.min(skill.maxPoints, Math.floor(raw.points)));
  }
  return next;
}

export function cloneUpgradeState(source = null) {
  const next = createUpgradeState();
  if (!source || typeof source !== "object") return next;
  for (const [key, upgrade] of Object.entries(next)) {
    const raw = source[key];
    if (!raw || typeof raw !== "object") continue;
    if (Number.isFinite(raw.level)) upgrade.level = Math.max(0, Math.min(upgrade.maxLevel, Math.floor(raw.level)));
  }
  return next;
}

export function cloneRangerRuntimeState(source = null) {
  return {
    ...createRangerRuntimeState(),
    ...(source && typeof source === "object" ? source : {})
  };
}

export function cloneWarriorRuntimeState(source = null) {
  return {
    ...createWarriorRuntimeState(),
    ...(source && typeof source === "object" ? source : {})
  };
}

export function cloneNecromancerBeamState(source = null) {
  return {
    ...createNecromancerBeamState(),
    ...(source && typeof source === "object" ? source : {})
  };
}
