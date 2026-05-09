import assert from "node:assert/strict";
import { OPEN_PROGRESSION_TIER_COUNT, OPEN_PROGRESSION_TIER_LEVELS, getOpenProgressionSkillPointGainForLevel } from "../src/game/openProgression.js";
import { getRangerRowRequirement, getRangerSkillPointGainForLevel, getRangerTalentDefs } from "../src/game/rangerTalentTree.js";
import { getWarriorRowRequirement, getWarriorSkillPointGainForLevel, getWarriorTalentDefs } from "../src/game/warriorTalentTree.js";
import { getNecromancerRowRequirement, getNecromancerSkillPointGainForLevel, getNecromancerTalentDefs } from "../src/game/necromancerTalentTree.js";

const EXPECTED_SP_LEVELS = new Set([2, 3, 5, 7, 9, 10, 12, 14, 16]);

function validateRows(label, getRowRequirement) {
  for (let row = 0; row < OPEN_PROGRESSION_TIER_COUNT; row++) {
    const tier = row + 1;
    assert.equal(getRowRequirement(row), OPEN_PROGRESSION_TIER_LEVELS[tier], `${label} tier ${tier} unlock level`);
  }
}

function validateSkillPointSchedule(label, getSkillPointGain, classType) {
  for (let level = 1; level <= 16; level++) {
    const expected = EXPECTED_SP_LEVELS.has(level) ? 1 : 0;
    assert.equal(getSkillPointGain(level, classType), expected, `${label} SP gain at level ${level}`);
  }
  assert.equal(getSkillPointGain(18, classType), 1, `${label} post-12 even-level SP gain`);
  assert.equal(getSkillPointGain(19, classType), 0, `${label} post-12 odd-level SP gap`);
}

function validateTierShape(label, defs) {
  const tiers = new Set(defs.map((def) => def.tier));
  assert.equal(tiers.size, OPEN_PROGRESSION_TIER_COUNT, `${label} tier count`);
  for (let tier = 1; tier <= OPEN_PROGRESSION_TIER_COUNT; tier++) {
    assert.ok(tiers.has(tier), `${label} includes tier ${tier}`);
  }
}

validateRows("Ranger", getRangerRowRequirement);
validateRows("Warrior", getWarriorRowRequirement);
validateRows("Mage", getNecromancerRowRequirement);

validateSkillPointSchedule("Shared", getOpenProgressionSkillPointGainForLevel);
validateSkillPointSchedule("Ranger", getRangerSkillPointGainForLevel, "archer");
validateSkillPointSchedule("Warrior", getWarriorSkillPointGainForLevel, "fighter");
validateSkillPointSchedule("Mage", getNecromancerSkillPointGainForLevel, "necromancer");

validateTierShape("Ranger", getRangerTalentDefs());
validateTierShape("Warrior", getWarriorTalentDefs());
validateTierShape("Mage", getNecromancerTalentDefs());

console.log("Open progression consistency validation passed.");
