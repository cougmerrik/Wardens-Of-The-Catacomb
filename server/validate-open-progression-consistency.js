import assert from "node:assert/strict";
import { OPEN_PROGRESSION_TIER_COUNT, OPEN_PROGRESSION_TIER_LEVELS, getOpenProgressionSkillPointGainForLevel } from "../src/game/openProgression.js";
import { getRangerRowRequirement, getRangerSkillPointGainForLevel, getRangerTalentDefs } from "../src/game/rangerTalentTree.js";
import { getWarriorRowRequirement, getWarriorSkillPointGainForLevel, getWarriorTalentDefs } from "../src/game/warriorTalentTree.js";
import { getNecromancerRowRequirement, getNecromancerSkillPointGainForLevel, getNecromancerTalentDefs } from "../src/game/necromancerTalentTree.js";
import { getBaseClassDisplayLabel, getClassDisplayLabel } from "../src/game/classDisplay.js";
import { getLeaderboardClassText, normalizeLeaderboardRow } from "../src/leaderboard/leaderboardClient.js";
import { normalizeRow as normalizeStoredLeaderboardRow } from "./leaderboardStore.js";

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

function validateClassDisplayLabels() {
  assert.equal(getBaseClassDisplayLabel("archer"), "Scout", "archer base display label");
  assert.equal(getBaseClassDisplayLabel("fighter"), "Warrior", "fighter base display label");
  assert.equal(getBaseClassDisplayLabel("warrior"), "Warrior", "legacy warrior base display label");
  assert.equal(getBaseClassDisplayLabel("necromancer"), "Mage", "mage base display label");
  assert.equal(getClassDisplayLabel({ classType: "archer", rangerTalents: {} }), "Scout", "archer stays base before path");
  assert.equal(getClassDisplayLabel({ classType: "archer", rangerTalents: { roguePath: { points: 1 } } }), "Rogue", "archer displays selected path");
  assert.equal(getClassDisplayLabel({ classType: "fighter", warriorTalents: { paladinDoctrine: { points: 1 } } }), "Paladin", "warrior displays selected path");
  assert.equal(getClassDisplayLabel({ classType: "necromancer", necromancerTalents: { enchanterPath: { points: 1 } } }), "Enchanter", "mage displays selected path");
  assert.equal(getLeaderboardClassText({ classType: "archer" }), "Scout", "leaderboard uses base display label by default");
  assert.equal(getLeaderboardClassText({ classType: "archer", classLabel: "Assassin" }), "Assassin", "leaderboard preserves submitted path label");
  assert.deepEqual(normalizeLeaderboardRow({ boardType: "group", classTypes: ["archer", "fighter"], classLabels: ["Ranger", "Berserker"] }).classLabels, ["Ranger", "Berserker"], "group leaderboard preserves path labels");
  assert.deepEqual(normalizeStoredLeaderboardRow({ boardType: "group", classTypes: ["archer", "fighter"], classLabels: ["Ranger", "Berserker"] }).classLabels, ["Ranger", "Berserker"], "stored leaderboard preserves path labels");
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
validateClassDisplayLabels();

console.log("Open progression consistency validation passed.");
