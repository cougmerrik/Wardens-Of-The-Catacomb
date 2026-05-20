import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getMageDirectionIndexFromVector,
  getMageFramePose,
  getMageFrameProfile
} from "../src/rendering/mageSpriteSheet.js";
import { getMageVisualSpec } from "../src/rendering/mageVisualPresentation.js";
import {
  getMageGreenFlameBladeGeometry,
  getMageStaffRigGeometry
} from "../src/rendering/rendererEffectsMageStaffMethods.js";

function angleForFacing(facing) {
  return (facing / 8) * Math.PI * 2;
}

for (let facing = 0; facing < 8; facing++) {
  const angle = angleForFacing(facing);
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  assert.equal(getMageDirectionIndexFromVector(dirX, dirY), facing, `mage direction index should preserve facing ${facing}`);
  const profile = getMageFrameProfile(dirX, dirY);
  if (facing === 0 || facing === 4) assert.equal(profile.sideProfile, true, `facing ${facing} should render as side profile`);
  if (facing === 2) assert.equal(profile.front, true, "downward cursor should render front profile");
  if (facing === 6) assert.equal(profile.back, true, "upward cursor should render back profile");
  if ([1, 3, 5, 7].includes(facing)) {
    assert.equal(profile.diagonal, true, `facing ${facing} should render as a distinct diagonal profile`);
    assert.equal(profile.sideProfile, false, `facing ${facing} should not collapse into the side profile`);
  }

  const frames = [0, 1, 2, 3, 4, 5].map((frameIndex) => getMageFramePose(dirX, dirY, frameIndex));
  assert.equal(new Set(frames.map((pose) => `${pose.stride},${pose.bob},${pose.rearLeg.footX},${pose.frontLeg.footX}`)).size, 6, `facing ${facing} should expose six distinct walk frames`);
  assert.ok(Math.hypot(frames[0].rearLeg.footX - frames[3].rearLeg.footX, frames[0].rearLeg.footY - frames[3].rearLeg.footY) >= 2.4, `facing ${facing} robe/foot motion should alternate`);
  assert.ok(Math.hypot(frames[0].frontLeg.footX - frames[3].frontLeg.footX, frames[0].frontLeg.footY - frames[3].frontLeg.footY) >= 2.4, `facing ${facing} front foot motion should alternate`);
  for (const pose of frames) {
    assert.ok(Math.abs((pose.rearLeg.footX + pose.frontLeg.footX) * 0.5) <= 0.45, `facing ${facing} foot center should stay under robe`);
    assert.ok(Math.abs(pose.rearLeg.footX - pose.frontLeg.footX) <= 5.8, `facing ${facing} feet should avoid wide splay`);
  }

  const staff = getMageStaffRigGeometry({ dirX, dirY }, 100, 100, 0);
  const staffLength = Math.hypot(staff.tipX - staff.baseX, staff.tipY - staff.baseY);
  assert.ok(staffLength >= 20 && staffLength <= 31, `facing ${facing} staff should be readable but not oversized, got ${staffLength}`);
  const shaftDx = staff.tipX - staff.baseX;
  const shaftDy = staff.tipY - staff.baseY;
  const handDx = staff.handX - staff.baseX;
  const handDy = staff.handY - staff.baseY;
  const shaftCross = Math.abs(shaftDx * handDy - shaftDy * handDx) / (staffLength || 1);
  const handRatioFromBase = Math.hypot(handDx, handDy) / (staffLength || 1);
  assert.ok(shaftCross <= 0.05, `facing ${facing} staff hand should sit on a straight shaft`);
  assert.ok(handRatioFromBase >= 0.68 && handRatioFromBase <= 0.78, `facing ${facing} staff hand should grip about three quarters up the shaft`);
  assert.ok(staff.orbY < staff.handY - 5, `facing ${facing} staff orb should sit above hand without overextending the shaft`);
  if (facing === 5 || facing === 6 || facing === 7) assert.equal(staff.layer, "under", `facing ${facing} staff should draw behind the mage body`);
  if (facing === 1 || facing === 2 || facing === 3) assert.equal(staff.layer, "over", `facing ${facing} staff should draw over the mage body`);
  if ([1, 3, 5, 7].includes(facing)) {
    const sideStaff = getMageStaffRigGeometry({ dirX: Math.sign(dirX), dirY: 0 }, 100, 100, 0);
    const verticalStaff = getMageStaffRigGeometry({ dirX: 0, dirY: Math.sign(dirY) }, 100, 100, 0);
    const sideDiff = Math.hypot(staff.tipX - sideStaff.tipX, staff.handX - sideStaff.handX);
    const verticalDiff = Math.hypot(staff.tipX - verticalStaff.tipX, staff.handX - verticalStaff.handX);
    assert.ok(sideDiff >= 2.5, `facing ${facing} diagonal staff should differ from side row`);
    assert.ok(verticalDiff >= 2.5, `facing ${facing} diagonal staff should differ from vertical row`);
  }

  const idleMotion = getMageStaffRigGeometry({ dirX, dirY }, 100, 100, 0);
  const castMotion = getMageStaffRigGeometry({ dirX, dirY }, 100, 100, 0.8);
  const tipTravel = Math.hypot(castMotion.tipX - idleMotion.tipX, castMotion.tipY - idleMotion.tipY);
  const castProjection = (castMotion.tipX - idleMotion.tipX) * dirX + (castMotion.tipY - idleMotion.tipY) * dirY;
  assert.ok(tipTravel >= 3.2, `facing ${facing} casting staff tip should visibly move`);
  assert.ok(castProjection > 0.4, `facing ${facing} casting staff motion should project along firing direction`);

  const idleBlade = getMageGreenFlameBladeGeometry({ dirX, dirY }, 100, 100, 0);
  const swingBlade = getMageGreenFlameBladeGeometry({ dirX, dirY }, 100, 100, 0.55);
  const bladeLength = Math.hypot(idleBlade.tipX - idleBlade.handX, idleBlade.tipY - idleBlade.handY);
  const bladeSwingTravel = Math.hypot(swingBlade.tipX - idleBlade.tipX, swingBlade.tipY - idleBlade.tipY);
  const bladeProjection = (idleBlade.tipX - idleBlade.handX) * dirX + (idleBlade.tipY - idleBlade.handY) * dirY;
  assert.ok(bladeLength >= 16 && bladeLength <= 21, `facing ${facing} Green-Flame Blade should replace staff with a compact blade`);
  assert.ok(idleBlade.handY >= idleMotion.handY + 5, `facing ${facing} Green-Flame Blade grip should sit lower on the mage torso than the staff grip`);
  assert.ok(bladeProjection >= 8, `facing ${facing} Green-Flame Blade should point generally with cursor direction`);
  assert.ok(bladeSwingTravel >= 7, `facing ${facing} Green-Flame Blade should visibly swing during attacks`);
  assert.equal(idleBlade.layer, idleMotion.layer, `facing ${facing} Green-Flame Blade should preserve mage weapon layering`);
}

assert.equal(getMageDirectionIndexFromVector(0, -1), 6, "up cursor should select mage back row");
assert.equal(getMageDirectionIndexFromVector(0, 1), 2, "down cursor should select mage front row");
assert.equal(getMageDirectionIndexFromVector(-1, 0), 4, "left cursor should select mage side row");

const greenFlameSpec = getMageVisualSpec({ necromancerTalents: { greenFlameBladeCantrip: { points: 1 } } });
assert.equal(greenFlameSpec.weapon, "greenFlameBlade", "Green-Flame Blade should replace the mage runestaff");
assert.equal(greenFlameSpec.cantrip, "greenFlameBladeCantrip", "Green-Flame Blade visual spec should preserve selected cantrip");
assert.ok(greenFlameSpec.costume.bladeCore && greenFlameSpec.costume.bladeEdge, "Green-Flame Blade should expose blade palette colors");

const rendererSource = readFileSync(new URL("../src/rendering/rendererEffectsPlayerMethods.js", import.meta.url), "utf8");
const mageSheetSource = readFileSync(new URL("../src/rendering/mageSpriteSheet.js", import.meta.url), "utf8");
const mageIconSource = readFileSync(new URL("../src/rendering/hud/mageSkillIcons.js", import.meta.url), "utf8");
const frozenOrbIcon = readFileSync(new URL("../assets/images/skills/mage/frozenOrbCantrip.png", import.meta.url));
const sceneSource = readFileSync(new URL("../src/rendering/RendererRuntimeScene.js", import.meta.url), "utf8");
const chilledTintSource = readFileSync(new URL("../src/rendering/chilledEnemyTint.js", import.meta.url), "utf8");
const projectileSource = readFileSync(new URL("../src/rendering/rendererEffectsProjectileMethods.js", import.meta.url), "utf8");
assert.ok(rendererSource.includes("getMageDirectionIndexFromVector(p.dirX || 1, p.dirY || 0)"), "local mage sprite row should use aim direction");
assert.ok(rendererSource.includes("getMageDirectionIndexFromVector(player.dirX || 1, player.dirY || 0)"), "remote mage sprite row should use serialized aim direction");
assert.ok(rendererSource.includes("mageSpec ? this.getPlayerSpriteSheet(mageSpec)"), "remote mage should use generated mage sprite sheet");
assert.ok(rendererSource.includes("mageVisualSpec ? this.getPlayerSpriteSheet(mageVisualSpec)"), "local mage should use generated mage sprite sheet");
assert.ok(rendererSource.includes('drawPlayerMageStaffRig(player, screenX, screenY, firePulse, "under")'), "remote mage should draw staff underlay before sprite");
assert.ok(rendererSource.includes('drawPlayerMageStaffRig(player, screenX, screenY, firePulse, "over")'), "remote mage should draw staff overlay after sprite");
assert.ok(rendererSource.includes('drawPlayerMageStaffRig(p, playerScreenX, playerScreenY, firePulse, "under")'), "local mage should draw staff underlay before sprite");
assert.ok(rendererSource.includes('drawPlayerMageStaffRig(p, playerScreenX, playerScreenY, firePulse, "over")'), "local mage should draw staff overlay after sprite");
assert.ok(!mageSheetSource.includes("function drawMageStaff"), "mage sprite sheet should not bake the staff into body frames");
assert.ok(mageIconSource.includes("frozenOrbCantrip.png"), "Frozen Orb should use a dedicated mage skill icon asset");
assert.equal(frozenOrbIcon.readUInt32BE(16), 128, "Frozen Orb icon should keep the 128px skill icon contract");
assert.equal(frozenOrbIcon.readUInt32BE(20), 128, "Frozen Orb icon should keep the 128px skill icon contract");
assert.ok(sceneSource.includes("drawChilledEnemyTint"), "enemy scene rendering should tint chilled/slowed enemies");
assert.ok(sceneSource.includes("drawChilledSceneEnemyBody"), "chilled enemies should render through a sprite-only buffer");
assert.ok(chilledTintSource.includes("rgba(88, 211, 255"), "chilled enemy tint should be bright blue");
assert.ok(chilledTintSource.includes('globalCompositeOperation = "source-atop"'), "chilled enemy tint should be clipped to enemy sprite pixels");
const statusBadgeSource = readFileSync(new URL("../src/rendering/enemyStatusBadges.js", import.meta.url), "utf8");
assert.ok(!statusBadgeSource.includes('statuses.push("slow")'), "Chill should not draw a separate slow badge over enemies");
assert.ok(projectileSource.includes('type === "mage_shock"'), "Shock cantrip should use a dedicated lightning arc projectile renderer");
assert.ok(projectileSource.includes("lineTo(length * 0.18"), "Shock cantrip renderer should include branch arcs");

const staffRigSource = readFileSync(new URL("../src/rendering/rendererEffectsMageStaffMethods.js", import.meta.url), "utf8");
assert.ok(staffRigSource.includes("drawPlayerMageGreenFlameBladeRig"), "Green-Flame Blade should draw a dedicated blade rig instead of the staff rig");
assert.ok(staffRigSource.includes('mageVisual.weapon === "greenFlameBlade"'), "mage staff renderer should branch on Green-Flame Blade weapon identity");

console.log(JSON.stringify({ ok: true, checks: ["mage-8-direction-sheet", "mage-diagonal-profiles", "mage-staff-rig-layering", "mage-aim-row-selection", "mage-casting-staff-motion", "mage-green-flame-blade-rig", "frozen-orb-skill-icon", "chilled-enemy-sprite-tint", "no-chill-status-badge", "shock-lightning-arcs"] }, null, 2));
