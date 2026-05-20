import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createWarriorTalentState } from "../src/game/warriorTalentTree.js";
import { syncRemotePlayers } from "../src/net/clientSnapshotHelpers.js";
import { syncByIdLerp } from "../src/net/clientStateSync.js";
import { createActivePlayerSnapshot } from "../src/net/playerSnapshotSchema.js";
import { getWarriorHatchetGeometry, getWarriorRigPose, getWarriorSpearPose, getWarriorTwinHatchetPose, getWarriorWhipPose } from "../src/rendering/rendererEffectsFighterRigMethods.js";
import { getWarriorBattleCryAuraState } from "../src/rendering/warriorBattleCryAura.js";
import { getWarriorDirectionIndexFromVector, getWarriorFramePose, getWarriorFrameSockets } from "../src/rendering/warriorSpriteSheet.js";
import { getWarriorVisualSpec } from "../src/rendering/warriorVisualPresentation.js";

function makeWarrior(keys = [], runtime = {}) {
  const warriorTalents = createWarriorTalentState();
  for (const key of keys) {
    assert.ok(warriorTalents[key], `unknown warrior talent key ${key}`);
    warriorTalents[key].points = 1;
  }
  return {
    classType: "fighter",
    warriorTalents,
    warriorRuntime: runtime
  };
}

function assertIncludes(list, value, message) {
  assert.ok(Array.isArray(list), `${message}: expected list`);
  assert.ok(list.includes(value), `${message}: expected ${value}`);
}

function getPlayerSpriteDrawY(screenY, renderSize, isWarrior = false) {
  return screenY - renderSize * (isWarrior ? 0.75 : 0.56);
}

function angleDelta(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function assertSwordHandTracksAim(player, message) {
  const pose = getWarriorRigPose(player, 100, 100, 0, 0.2);
  const handAngle = Math.atan2(pose.swordHandY - pose.frontShoulderY, pose.swordHandX - pose.frontShoulderX);
  const aimAngle = Math.atan2(player.dirY, player.dirX);
  const delta = angleDelta(handAngle, aimAngle);
  assert.ok(delta < 0.4, `${message}: sword arm should track raw cursor aim; delta ${delta}`);
  return pose;
}

const defaultSpec = getWarriorVisualSpec(makeWarrior());
assert.equal(defaultSpec.classKey, "warrior", "default spec should identify warrior class");
assert.equal(defaultSpec.weapon, "broadswing", "default weapon should be broadswing");
assert.equal(defaultSpec.doctrine, "battlecry", "default doctrine should be battlecry");
assertIncludes(defaultSpec.sprite.gear, "wolfClasp", "default should include wolf clasp");
assertIncludes(defaultSpec.sprite.gear, "platePauldrons", "default should include plate pauldrons");
assert.equal(defaultSpec.costume.hair, "#b8b5a5", "default should use gray veteran hair");
assert.equal(defaultSpec.weaponVisual.style, "broadswing", "default weapon visual should match broadswing");
assert.equal(defaultSpec.pathPresentation.tint, null, "default battlecry should not tint the body red");
assert.ok(!defaultSpec.sprite.secondaryAccents.includes("redBattleSash"), "default visual should avoid red as a main costume accent");

const weaponCases = [
  ["longspear", "longspear", "spearStrap"],
  ["warWhip", "warWhip", "coiledWhip"],
  ["twinHatchets", "twinHatchets", "pairedHatchets"]
];
for (const [talent, style, gear] of weaponCases) {
  const spec = getWarriorVisualSpec(makeWarrior([talent]));
  assert.equal(spec.weapon, style, `${talent} should select weapon`);
  assert.equal(spec.weaponVisual.style, style, `${talent} should select weapon visual`);
  assertIncludes(spec.sprite.gear, gear, `${talent} should add gear`);
}
assert.notEqual(getWarriorVisualSpec(makeWarrior(["twinHatchets"])).weaponVisual.guard, "#d86f5e", "twin hatchets should avoid red as the main weapon accent");
const twinHatchetsSpec = getWarriorVisualSpec(makeWarrior(["twinHatchets"]));
assert.equal(twinHatchetsSpec.weaponVisual.blade, "#dce5e0", "twin hatchets should keep a readable worn-steel blade");
assert.equal(twinHatchetsSpec.weaponVisual.haft, "#72462c", "twin hatchets should use leather/wood handles");

const hatchetGeometry = getWarriorHatchetGeometry(100, 100, 1, 0, 0, 1, 1);
const projectX = ([x]) => x - 100;
const projectY = (([, y]) => y - 100);
const cheekYs = hatchetGeometry.cheek.map(projectY);
const cheekWidth = Math.max(...cheekYs) - Math.min(...cheekYs);
const handleLength = Math.hypot(hatchetGeometry.handleEnd[0] - hatchetGeometry.handleStart[0], hatchetGeometry.handleEnd[1] - hatchetGeometry.handleStart[1]);
assert.ok(handleLength >= 14, `twin hatchet handle should be short but readable, got ${handleLength}`);
assert.ok(cheekWidth >= 11, `twin hatchet head should have a broad axe cheek/bit, got ${cheekWidth}`);
assert.ok(Math.max(...hatchetGeometry.edge.map(projectX)) > projectX(hatchetGeometry.eye) + 4, "twin hatchet bit should extend forward of the eye");
assert.ok(Math.min(...hatchetGeometry.poll.map(projectX)) < projectX(hatchetGeometry.eye) - 3, "twin hatchet poll should sit behind the eye");
assert.ok(hatchetGeometry.cheek.length >= 6, "twin hatchet head should include cheek and beard points instead of a diamond blade");

const hatchetRig = getWarriorRigPose({ dirX: 1, dirY: 0, facing: 0 }, 100, 100, 0, 0.5);
const hatchetPose = getWarriorTwinHatchetPose(hatchetRig, 0.5);
const hatchetStartPose = getWarriorTwinHatchetPose(hatchetRig, 1);
const hatchetEndPose = getWarriorTwinHatchetPose(hatchetRig, 0);
const hatchetHandSeparation = Math.hypot(hatchetPose.mainGripX - hatchetPose.offGripX, hatchetPose.mainGripY - hatchetPose.offGripY);
const hatchetAngleSeparation = angleDelta(Math.atan2(hatchetPose.mainAy, hatchetPose.mainAx), Math.atan2(hatchetPose.offAy, hatchetPose.offAx));
const hatchetMainTravel = Math.hypot(hatchetEndPose.mainGripX - hatchetStartPose.mainGripX, hatchetEndPose.mainGripY - hatchetStartPose.mainGripY);
const hatchetOffTravel = Math.hypot(hatchetEndPose.offGripX - hatchetStartPose.offGripX, hatchetEndPose.offGripY - hatchetStartPose.offGripY);
const hatchetMainAngleTravel = angleDelta(Math.atan2(hatchetEndPose.mainAy, hatchetEndPose.mainAx), Math.atan2(hatchetStartPose.mainAy, hatchetStartPose.mainAx));
const hatchetOffAngleTravel = angleDelta(Math.atan2(hatchetEndPose.offAy, hatchetEndPose.offAx), Math.atan2(hatchetStartPose.offAy, hatchetStartPose.offAx));
assert.ok(hatchetHandSeparation >= 7, `twin hatchet attack hands should separate instead of stacking; got ${hatchetHandSeparation}`);
assert.ok(hatchetAngleSeparation >= 1.2, `twin hatchets should counter-swing with distinct blade angles; got ${hatchetAngleSeparation}`);
assert.ok(Math.abs(hatchetPose.mainGripY - hatchetPose.offGripY) <= 6.5, `twin hatchet hands should avoid a wide V spread; got ${Math.abs(hatchetPose.mainGripY - hatchetPose.offGripY)}`);
assert.ok(hatchetMainTravel >= 3.2 && hatchetOffTravel >= 2.8, `twin hatchet hands should visibly travel through attack; got ${hatchetMainTravel}/${hatchetOffTravel}`);
assert.ok(hatchetMainAngleTravel >= 1.6 && hatchetOffAngleTravel >= 1.4, `twin hatchet blade angles should visibly sweep; got ${hatchetMainAngleTravel}/${hatchetOffAngleTravel}`);
assert.ok(Math.hypot(hatchetPose.mainGripX - hatchetRig.frontShoulderX, hatchetPose.mainGripY - hatchetRig.frontShoulderY) <= 14, "main hatchet hand should stay close enough to avoid an overlong arm");
assert.ok(Math.hypot(hatchetPose.offGripX - hatchetRig.rearShoulderX, hatchetPose.offGripY - hatchetRig.rearShoulderY) <= 12.5, "off-hand hatchet should stay close enough to avoid an overlong arm");
const whipRig = getWarriorRigPose({ dirX: 1, dirY: 0, facing: 0 }, 100, 100, 0, 0.5);
const whipPose = getWarriorWhipPose(whipRig, 0.5);
const whipStartPose = getWarriorWhipPose(whipRig, 1);
const whipEndPose = getWarriorWhipPose(whipRig, 0);
const whipGripDistance = Math.hypot(whipPose.gripX - whipRig.frontShoulderX, whipPose.gripY - whipRig.frontShoulderY);
const whipBraceDistance = Math.hypot(whipPose.braceHandX - whipRig.rearShoulderX, whipPose.braceHandY - whipRig.rearShoulderY);
const whipGripTravel = Math.hypot(whipEndPose.gripX - whipStartPose.gripX, whipEndPose.gripY - whipStartPose.gripY);
const whipTailTravel = Math.hypot(whipEndPose.tailX - whipStartPose.tailX, whipEndPose.tailY - whipStartPose.tailY);
assert.ok(whipGripDistance <= 13.5, `war-whip grip should stay shoulder-rooted like other warrior weapons, got ${whipGripDistance}`);
assert.ok(whipBraceDistance <= 8.5, `war-whip brace hand should stay close to rear shoulder, got ${whipBraceDistance}`);
assert.ok(whipPose.gripX > whipRig.frontShoulderX, "side-facing war-whip grip should sit forward of the front shoulder");
assert.ok(whipPose.braceHandX > whipRig.rearShoulderX, "side-facing war-whip brace hand should support from the rear shoulder instead of floating behind");
assert.ok(whipGripTravel >= 1.2, `war-whip grip should travel through attack frames, got ${whipGripTravel}`);
assert.ok(whipTailTravel >= 8, `war-whip lash should visibly extend through attack frames, got ${whipTailTravel}`);
const fighterRigSource = readFileSync(new URL("../src/rendering/rendererEffectsFighterRigMethods.js", import.meta.url), "utf8");
assert.ok(fighterRigSource.includes("if (attackPulse > 0.01)") && fighterRigSource.indexOf("if (attackPulse > 0.01)") < fighterRigSource.indexOf("ctx.arc(chestX, chestY, 20"), "twin-hatchet swing arcs should not render while idle");

const doctrineCases = [
  ["paladinDoctrine", "paladin", "holyTrim", "#f5cf6f"],
  ["berserkerDoctrine", "berserker", "redWarPaint", "#dd6e62"],
  ["gladiatorDoctrine", "gladiator", "arenaBronze", "#d6b487"],
  ["eldritchDoctrine", "eldritch", "arcaneRunes", "#9d7bff"]
];
for (const [talent, doctrine, accent, tint] of doctrineCases) {
  const spec = getWarriorVisualSpec(makeWarrior(["broadswing", "stanceACleaving", "stanceBFocused", talent]));
  assert.equal(spec.doctrine, doctrine, `${talent} should select doctrine`);
  assertIncludes(spec.sprite.secondaryAccents, accent, `${talent} should add doctrine accent`);
  assert.equal(spec.pathPresentation.tint, tint, `${talent} should set doctrine tint`);
}

const stanceSpec = getWarriorVisualSpec(makeWarrior(["broadswing", "stanceAHeavy", "stanceBMarked"]));
assert.equal(stanceSpec.stanceA, "heavy", "stance A should resolve heavy");
assert.equal(stanceSpec.stanceB, "marked", "stance B should resolve marked");
assertIncludes(stanceSpec.sprite.secondaryAccents, "weightedPommel", "heavy stance should add weighted pommel");
assertIncludes(stanceSpec.sprite.secondaryAccents, "etchedMark", "marked stance should add etched mark");

const extrasSpec = getWarriorVisualSpec(makeWarrior(["broadswing", "stanceAGuarded", "stanceBCleaving", "eldritchDoctrine", "shockRelease", "secondWind", "spellknight"]));
assert.deepEqual(extrasSpec.extras, ["shockRelease", "secondWind"], "extras should preserve selected tier-5 order");
assert.equal(extrasSpec.capstone, "spellknight", "capstone should resolve spellknight");
assert.equal(extrasSpec.effects.shock, "arcaneShockWave", "eldritch shock release should be arcane");
assert.equal(extrasSpec.effects.capstone, "spellbladeEcho", "spellknight should add spellblade echo");
assertIncludes(extrasSpec.sprite.secondaryAccents, "spellbladeRunes", "spellknight should add rune accent");

const bastionSpec = getWarriorVisualSpec(makeWarrior(["broadswing", "stanceAGuarded", "stanceBFocused", "paladinDoctrine", "consecratedGround", "bastion"]));
assert.equal(bastionSpec.capstone, "bastion", "bastion capstone should resolve");
assertIncludes(bastionSpec.sprite.secondaryAccents, "towerShieldClasp", "bastion should add shield clasp");
assert.equal(bastionSpec.effects.capstone, "bastionGuard", "bastion should add guard effect");

const inactiveAura = getWarriorBattleCryAuraState(makeWarrior(), { warriorRage: { duration: 10 } }, 0);
assert.equal(inactiveAura, null, "battle cry aura should be hidden when rage is inactive");
const activeAura = getWarriorBattleCryAuraState({ ...makeWarrior(), warriorRageActiveTimer: 5 }, { warriorRage: { duration: 10 } }, 0);
assert.equal(activeAura.doctrine, "battlecry", "default battle cry aura should use battlecry doctrine");
assert.ok(activeAura.alpha > 0 && activeAura.radiusX > activeAura.radiusY, "active battle cry aura should render as a base ellipse");
const scaledAura = getWarriorBattleCryAuraState({ ...makeWarrior(), size: 22, warriorRageActiveTimer: 5 }, { warriorRage: { duration: 10 }, player: { spriteRenderSize: 44 } }, 0);
assert.ok(scaledAura.offsetY >= 10.5 && scaledAura.offsetY <= 11.5, `battle cry aura should anchor near collision feet, got ${scaledAura.offsetY}`);
const warriorDrawY = getPlayerSpriteDrawY(100, 44, true);
assert.ok(Math.abs((warriorDrawY + 44) - 111) <= 0.1, "warrior sprite bottom should stay near collision foot line");
const rangerDrawY = getPlayerSpriteDrawY(100, 44, false);
assert.ok(rangerDrawY + 44 > warriorDrawY + 44, "warrior sprite should be anchored higher than ranger/mage sprites");
const paladinAura = getWarriorBattleCryAuraState({ ...makeWarrior(["paladinDoctrine"]), warriorRageActiveTimer: 5 }, { warriorRage: { duration: 10 } }, 0);
assert.equal(paladinAura.doctrine, "paladin", "doctrine aura should follow selected warrior doctrine");
assert.notEqual(paladinAura.colors.core, activeAura.colors.core, "doctrine aura colors should differ from default battlecry");

for (let facing = 0; facing < 8; facing++) {
  const sockets = getWarriorFrameSockets(facing, 2, 4);
  assert.equal(sockets.facing, facing, `socket metadata should preserve facing ${facing}`);
  assert.equal(sockets.frame, 2, `socket metadata should preserve walk frame for facing ${facing}`);
  assert.equal(sockets.attackFrame, 4, `socket metadata should preserve attack frame for facing ${facing}`);
  assert.ok(Array.isArray(sockets.frontShoulder) && sockets.frontShoulder.length === 2, `facing ${facing} should expose front shoulder socket`);
  assert.ok(Array.isArray(sockets.rearShoulder) && sockets.rearShoulder.length === 2, `facing ${facing} should expose rear shoulder socket`);
  assert.ok(Array.isArray(sockets.frontHand) && sockets.frontHand.length === 2, `facing ${facing} should expose front hand socket`);
  assert.ok(Array.isArray(sockets.rearHand) && sockets.rearHand.length === 2, `facing ${facing} should expose rear hand socket`);
  const pose = getWarriorRigPose({ dirX: sockets.ax, dirY: sockets.ay, facing: 0 }, 100, 100, 2 / 6, 0.2);
  assert.equal(pose.facing, facing, `rig should select socket facing ${facing} from cursor vector`);
  assert.equal(pose.frame, 2, `rig should select socket walk frame for facing ${facing}`);
  assert.equal(pose.attackFrame, 4, `rig should select socket attack frame for facing ${facing}`);
  assert.deepEqual(pose.sockets.frontShoulder, sockets.frontShoulder, `rig should consume warrior socket metadata for facing ${facing}`);
  assert.equal(pose.frontShoulderX, 100 + sockets.frontShoulder[0], `rig front shoulder x should come from socket metadata for facing ${facing}`);
  assert.equal(pose.frontShoulderY, 100 + sockets.frontShoulder[1], `rig front shoulder y should come from socket metadata for facing ${facing}`);
}
assert.equal(getWarriorDirectionIndexFromVector(0, -1), 6, "upward cursor should quantize to back-facing socket direction");
assert.equal(getWarriorDirectionIndexFromVector(0, 1), 2, "downward cursor should quantize to front-facing socket direction");
assert.equal(getWarriorDirectionIndexFromVector(-1, 0), 4, "left cursor should quantize to side-facing socket direction");

for (const dirX of [-1, 1]) {
  const pose = getWarriorRigPose({ dirX, dirY: 0, facing: dirX < 0 ? 4 : 0 }, 100, 100, 0, 0.5);
  const shoulderDistance = Math.hypot(pose.frontShoulderX - pose.rearShoulderX, pose.frontShoulderY - pose.rearShoulderY);
  assert.ok(shoulderDistance <= 6.2, `side-facing shoulders should compress into side profile for dirX ${dirX}`);
  assert.ok(Math.sign(pose.frontShoulderX - 100) === dirX, `front shoulder should sit on facing side for dirX ${dirX}`);
}

for (let facing = 0; facing < 8; facing++) {
  const pose = getWarriorRigPose({ dirX: Math.cos(facing * Math.PI / 4), dirY: Math.sin(facing * Math.PI / 4), facing }, 100, 100, 0, 0.5);
  const shoulderDistance = Math.hypot(pose.frontShoulderX - pose.rearShoulderX, pose.frontShoulderY - pose.rearShoulderY);
  const swordArmDistance = Math.hypot(pose.swordHandX - pose.frontShoulderX, pose.swordHandY - pose.frontShoulderY);
  const guardArmDistance = Math.hypot(pose.guardHandX - pose.rearShoulderX, pose.guardHandY - pose.rearShoulderY);
  const sideProfile = facing !== 2 && facing !== 6;
  assert.ok(sideProfile ? shoulderDistance <= 6.2 : shoulderDistance >= 7 && shoulderDistance <= 9, `facing ${facing} shoulder sockets should stay on torso`);
  assert.ok(swordArmDistance <= 20, `facing ${facing} sword hand should remain attached to shoulder`);
  assert.ok(guardArmDistance <= 12, `facing ${facing} guard hand should remain attached to shoulder`);
}

const staleFacingPose = assertSwordHandTracksAim({ dirX: 0, dirY: -1, facing: 0 }, "stale local facing");
assert.ok(staleFacingPose.swordHandY < staleFacingPose.frontShoulderY - 8, "stale-facing sword hand should still point upward from the shoulder");

const remoteWarrior = {
  id: "remote-warrior",
  classType: "fighter",
  x: 200,
  y: 200,
  size: 22,
  health: 100,
  maxHealth: 100,
  dirX: 0,
  dirY: -1,
  facing: 0,
  warriorTalents: createWarriorTalentState(),
  alive: true
};
const snapshot = createActivePlayerSnapshot(remoteWarrior);
assert.equal(snapshot.dirX, 0, "network warrior snapshot should preserve zero dirX");
assert.equal(snapshot.dirY, -1, "network warrior snapshot should preserve upward dirY");
const networkGame = {
  remotePlayers: [{
    id: "remote-warrior",
    classType: "fighter",
    x: 198,
    y: 198,
    size: 22,
    dirX: 1,
    dirY: 0,
    facing: 0,
    alive: true
  }]
};
syncRemotePlayers(networkGame, { players: [{ id: "local-player" }, snapshot] }, "local-player", 0.72, syncByIdLerp);
assert.equal(networkGame.remotePlayers.length, 1, "network sync should keep the remote warrior");
assert.equal(networkGame.remotePlayers[0].dirX, 0, "remote warrior sync should update dirX from snapshot");
assert.equal(networkGame.remotePlayers[0].dirY, -1, "remote warrior sync should update dirY from snapshot");
assertSwordHandTracksAim(networkGame.remotePlayers[0], "network remote warrior");

for (const aim of [
  { dirX: 0, dirY: -1, facing: 0 },
  { dirX: 0, dirY: 1, facing: 4 },
  { dirX: Math.SQRT1_2, dirY: -Math.SQRT1_2, facing: 2 }
]) {
  const pose = getWarriorRigPose(aim, 100, 100, 0, 0.2);
  const spear = getWarriorSpearPose(pose, 0.2);
  const shaftAngle = Math.atan2(spear.tipY - spear.buttY, spear.tipX - spear.buttX);
  const aimAngle = Math.atan2(aim.dirY, aim.dirX);
  const delta = angleDelta(shaftAngle, aimAngle);
  assert.ok(delta < 0.001, `longspear shaft should align to raw cursor aim; delta ${delta}`);
  assert.ok(Math.hypot(spear.spearHandX - pose.frontShoulderX, spear.spearHandY - pose.frontShoulderY) <= 18, "longspear front hand should remain shoulder-rooted");
  assert.ok(Math.hypot(spear.braceHandX - pose.rearShoulderX, spear.braceHandY - pose.rearShoulderY) <= 10, "longspear rear hand should remain shoulder-rooted");
}

for (let facing = 0; facing < 8; facing++) {
  const angle = facing * Math.PI / 4;
  const poses = [0, 1, 2, 3, 4, 5].map((frameIndex) => getWarriorFramePose(Math.cos(angle), Math.sin(angle), frameIndex));
  assert.equal(new Set(poses.map((pose) => `${pose.leftFootOffsetX.toFixed(2)},${pose.leftFootOffsetY.toFixed(2)},${pose.rightFootOffsetX.toFixed(2)},${pose.rightFootOffsetY.toFixed(2)}`)).size, 6, `warrior facing ${facing} should expose six distinct leg poses`);
  assert.ok(Math.hypot(poses[0].leftFootOffsetX - poses[3].leftFootOffsetX, poses[0].leftFootOffsetY - poses[3].leftFootOffsetY) >= 2.8, `warrior facing ${facing} opposite contact left foot should move`);
  assert.ok(Math.hypot(poses[0].rightFootOffsetX - poses[3].rightFootOffsetX, poses[0].rightFootOffsetY - poses[3].rightFootOffsetY) >= 2.8, `warrior facing ${facing} opposite contact right foot should move`);
  assert.ok(poses[1].leftLeg.lift > poses[1].rightLeg.lift, `warrior facing ${facing} early swing should lift left leg`);
  assert.ok(poses[4].rightLeg.lift > poses[4].leftLeg.lift, `warrior facing ${facing} late swing should lift right leg`);
  for (const pose of poses) {
    if (facing === 2 || facing === 6) {
      assert.ok(pose.leftFootOffsetX < pose.rightFootOffsetX, `warrior facing ${facing} front/back feet should not cross`);
      assert.ok(pose.rightFootOffsetX - pose.leftFootOffsetX <= 3.6, `warrior facing ${facing} front/back feet should not splay into a wide V`);
    }
    assert.ok(pose.leftLeg.kneeY > pose.leftLeg.hipY, `warrior facing ${facing} left knee should sit below hip`);
    assert.ok(pose.rightLeg.kneeY > pose.rightLeg.hipY, `warrior facing ${facing} right knee should sit below hip`);
  }
}

console.log("Warrior visual validation passed.");
