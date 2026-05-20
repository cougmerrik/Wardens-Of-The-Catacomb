import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRangerTalentState } from "../src/game/rangerTalentTree.js";
import {
  getRangerEffectVisualSpec,
  getRangerProjectileVisualSpec,
  getRangerVisualSpec
} from "../src/rendering/rangerVisualPresentation.js";
import { getRangerHandTargets, getRangerRigPose } from "../src/rendering/rangerRigPose.js";
import { getRangerFramePose } from "../src/rendering/rangerSpriteSheet.js";
import { getRangerStatusEffectLayers } from "../src/rendering/rangerStatusEffects.js";
import {
  advanceThrowingKnifeVisualHand,
  getThrowingKnifeMeleePresentation,
  getThrowingKnifeReloadState
} from "../src/rendering/rangerThrowingKnifeReload.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_OUTPUT_PATH = join(__dirname, "..", "artifacts", "ranger-visuals", "ranger-visual-fixtures-latest.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeBuild(keys = []) {
  const rangerTalents = createRangerTalentState();
  for (const key of keys) {
    assert(rangerTalents[key], `unknown ranger talent key in fixture: ${key}`);
    rangerTalents[key].points = 1;
  }
  return { classType: "archer", rangerTalents };
}

function withMode(build, weaponMode) {
  return {
    ...build,
    rangerRuntime: {
      ...(build.rangerRuntime || {}),
      weaponMode
    }
  };
}

function assertIncludes(values, expected, label) {
  assert(Array.isArray(values), `${label} should be an array`);
  assert(values.includes(expected), `${label} should include ${expected}; got ${values.join(", ")}`);
}

function validateDefaultSpec() {
  const spec = getRangerVisualSpec(makeBuild());
  assert(spec.weapon === "longbow", `default weapon should be longbow, got ${spec.weapon}`);
  assert(spec.path === null, `default path should be null, got ${spec.path}`);
  assert(spec.weaponVisual.style === "longbow", "default weapon visual should be longbow");
  assert(spec.projectile.family === "arrow", `default projectile should be arrow, got ${spec.projectile.family}`);
  assert(spec.pathPresentation.filter === "none", "default path presentation should not filter");
  assertIncludes(spec.sprite.gear, "quiver", "default gear");
}

function validateRangerStormcallerSpec() {
  const build = makeBuild(["longbow", "precision", "rangerPath", "shadowVeil", "venomCoating", "stormcaller"]);
  const spec = getRangerVisualSpec(build);
  assert(spec.weapon === "longbow", "ranger stormcaller weapon mismatch");
  assert(spec.modifier === "precision", "ranger stormcaller modifier mismatch");
  assert(spec.path === "rangerPath", "ranger stormcaller path mismatch");
  assert(spec.capstone === "stormcaller", "ranger stormcaller capstone mismatch");
  assert(spec.projectile.head === "#ff9b52", "Fire Arrow path should tint projectile head orange");
  assert(spec.projectile.impact === "stormFork", `Stormcaller should override impact with stormFork, got ${spec.projectile.impact}`);
  assert(spec.effects.capstone === "stormFlash", "Stormcaller should expose stormFlash capstone effect");
  assertIncludes(spec.sprite.secondaryAccents, "fireArrowTrim", "ranger path accents");
  assertIncludes(spec.sprite.secondaryAccents, "shadowFade", "general accents");
  assertIncludes(spec.sprite.secondaryAccents, "venomVial", "general accents");
  const projectile = getRangerProjectileVisualSpec(build, { active: { fireArrow: true, poison: true } });
  assert(projectile.impact === "stormFork", "stormcaller projectile impact should be stormFork");
  assert(projectile.allowLingering === false, "projectile visual specs should reject lingering artifacts");
  assertIncludes(projectile.effectAccents, "emberTrail", "stormcaller projectile accents");
  assertIncludes(projectile.effectAccents, "poisonDroplet", "stormcaller projectile accents");
}

function validateRogueLivingShadowSpec() {
  const build = makeBuild(["throwingKnives", "ambush", "roguePath", "smokeBomb", "quarry", "livingShadow"]);
  const spec = getRangerVisualSpec(build);
  assert(spec.weapon === "throwingKnives", "rogue weapon mismatch");
  assert(spec.swapStyle === "ambush", "rogue swap style mismatch");
  assert(spec.path === "roguePath", "rogue path mismatch");
  assert(spec.capstone === "livingShadow", "rogue capstone mismatch");
  assert(spec.projectile.family === "knife", `throwing knives should use knife projectile family, got ${spec.projectile.family}`);
  assert(spec.effects.swap === "warmBurstFlash", "ambush should expose warm burst swap effect");
  assert(spec.effects.buff === "shadowstepSmear", "rogue path should expose shadowstep smear");
  assert(spec.effects.capstone === "shadowDuplicate", "living shadow should expose shadow duplicate effect");
  assertIncludes(spec.sprite.gear, "knifeBelt", "rogue gear");
  assertIncludes(spec.sprite.secondaryAccents, "darkCloak", "rogue path accents");
  const swapEffect = getRangerEffectVisualSpec(build, "swap", { active: { stealth: true } });
  assert(swapEffect.primary === "warmBurstFlash", `rogue swap primary mismatch: ${swapEffect.primary}`);
  assertIncludes(swapEffect.overlays, "warmBurstFlash", "rogue swap overlays");
  assertIncludes(swapEffect.overlays, "breakStealthFlash", "rogue swap overlays");
}

function validateAssassinDeathChainSpec() {
  const build = makeBuild(["twinDaggers", "bleed", "assassinPath", "relentless", "comboSurge", "deathChain"]);
  const spec = getRangerVisualSpec(build);
  assert(spec.weapon === "twinDaggers", "assassin weapon mismatch");
  assert(spec.modifier === "bleed", "assassin modifier mismatch");
  assert(spec.path === "assassinPath", "assassin path mismatch");
  assert(spec.capstone === "deathChain", "assassin capstone mismatch");
  assert(spec.projectile.family === "pairedBlade", `twin daggers should use pairedBlade projectile family, got ${spec.projectile.family}`);
  assert(spec.projectile.impact === "chainJump", "Death Chain should override projectile impact");
  assert(spec.effects.hit === "shortRedFlecks", "bleed should expose short red hit flecks");
  assert(spec.effects.capstone === "deathChainLine", "death chain should expose chain line effect");
  assertIncludes(spec.sprite.secondaryAccents, "executionMark", "assassin path accents");
  const hitEffect = getRangerEffectVisualSpec(build, "hit", { active: { bleed: true } });
  assert(hitEffect.primary === "shortRedFlecks", "bleed hit primary should use short red flecks");
  assertIncludes(hitEffect.overlays, "shortRedFlecks", "assassin hit overlays");
  assert(hitEffect.duration === "veryShort", "hit effects should be very short-lived");
}

function validateBeastMasterApexSpec() {
  const build = makeBuild(["rapierPistol", "predator", "skirmisher", "beastMasterPath", "forager", "predatorsFeast", "apexPredator"]);
  const spec = getRangerVisualSpec(build);
  assert(spec.weapon === "rapierPistol", "beast master weapon mismatch");
  assert(spec.swapStyle === "predator", "beast master swap style mismatch");
  assert(spec.modifier === "skirmisher", "beast master modifier mismatch");
  assert(spec.path === "beastMasterPath", "beast master path mismatch");
  assert(spec.capstone === "apexPredator", "beast master capstone mismatch");
  assert(spec.projectile.family === "bullet", `rapier/pistol should use bullet projectile family, got ${spec.projectile.family}`);
  assert(spec.effects.swap === "feralComboPulse", "predator should expose feral combo pulse");
  assert(spec.effects.buff === "wolfPactPulse", "beast master path should expose wolf pact pulse");
  assert(spec.effects.capstone === "wolfPounceImpact", "apex predator should expose wolf pounce impact");
  assertIncludes(spec.sprite.gear, "smallPistol", "beast master gear");
  assertIncludes(spec.sprite.secondaryAccents, "wolfPactCharm", "beast master path accents");
  const projectile = getRangerProjectileVisualSpec(build, { active: { combo: true } });
  assert(projectile.family === "bullet", "rapier/pistol projectile resolver should keep bullet family");
  assert(projectile.impact === "apexPulse", "apex predator projectile impact should be apexPulse");
  assertIncludes(projectile.effectAccents, "apexPulse", "beast master projectile accents");
}

function validateEntitySkillFallback() {
  const spec = getRangerVisualSpec({
    classType: "archer",
    skills: {
      rapierPistol: { points: 1 },
      footwork: { points: 1 },
      trickShots: { points: 1 }
    }
  });
  assert(spec.weapon === "rapierPistol", "remote skill fallback should read weapon from skills");
  assert(spec.swapStyle === "footwork", "remote skill fallback should read swap style from skills");
  assert(spec.modifier === "trickShots", "remote skill fallback should read modifier from skills");
}

function validateWeaponModeSpecs() {
  for (const weapon of ["longbow", "throwingKnives", "twinDaggers", "rapierPistol"]) {
    const ranged = getRangerVisualSpec(withMode(makeBuild([weapon]), "ranged"));
    const melee = getRangerVisualSpec(withMode(makeBuild([weapon]), "melee"));
    assert(ranged.weapon === weapon, `${weapon} ranged spec lost weapon`);
    assert(melee.weapon === weapon, `${weapon} melee spec lost weapon`);
    assert(ranged.weaponMode === "ranged", `${weapon} ranged mode mismatch`);
    assert(melee.weaponMode === "melee", `${weapon} melee mode mismatch`);
    assert(ranged.weaponMode !== melee.weaponMode, `${weapon} ranged/melee specs should differ by mode`);
  }
}

function validateShoulderAnchors() {
  for (const weaponMode of ["ranged", "melee"]) {
    const seen = [];
    for (let facing = 0; facing < 8; facing++) {
      const angle = (facing / 8) * Math.PI * 2;
      const pose = getRangerRigPose(
        { facing, dirX: Math.cos(angle), dirY: Math.sin(angle) },
        120,
        96,
        0.25,
        weaponMode
      );
      assert(pose.shoulderRadius <= 5.1, `${weaponMode} facing ${facing} shoulder radius too large: ${pose.shoulderRadius}`);
      assert(Math.hypot(pose.frontShoulderX - pose.chestX, pose.frontShoulderY - pose.chestY) <= 5.1, `${weaponMode} facing ${facing} front shoulder detached`);
      assert(Math.hypot(pose.rearShoulderX - pose.chestX, pose.rearShoulderY - pose.chestY) <= 5.1, `${weaponMode} facing ${facing} rear shoulder detached`);
      seen.push(`${Math.round((pose.frontShoulderX - pose.chestX) * 10)},${Math.round((pose.frontShoulderY - pose.chestY) * 10)}`);
      const longbow = getRangerHandTargets(pose, 0.5, weaponMode, "longbow");
      if (weaponMode === "melee") {
        assert(Math.hypot(longbow.guardHandX - pose.frontShoulderX, longbow.guardHandY - pose.frontShoulderY) <= 9.3, `${weaponMode} facing ${facing} guard hand should stay rooted to front shoulder`);
        assert(Math.hypot(longbow.braceHandX - pose.rearShoulderX, longbow.braceHandY - pose.rearShoulderY) <= 5.2, `${weaponMode} facing ${facing} brace hand should stay rooted to rear shoulder`);
      } else {
        assert(Math.hypot(longbow.bowGripX - pose.frontShoulderX, longbow.bowGripY - pose.frontShoulderY) <= 12.4, `${weaponMode} facing ${facing} bow grip should stay rooted to front shoulder`);
        assert(Math.hypot(longbow.drawHandX - pose.rearShoulderX, longbow.drawHandY - pose.rearShoulderY) <= 6.4, `${weaponMode} facing ${facing} draw hand should stay rooted to rear shoulder`);
      }
      const pairedWeapons = getRangerHandTargets(pose, 0.5, weaponMode, "throwingKnives");
      assert(Math.hypot(pairedWeapons.mainHandX - pose.frontShoulderX, pairedWeapons.mainHandY - pose.frontShoulderY) <= 10.6, `${weaponMode} facing ${facing} main weapon hand should stay rooted to front shoulder`);
      assert(Math.hypot(pairedWeapons.offHandX - pose.rearShoulderX, pairedWeapons.offHandY - pose.rearShoulderY) <= 6.9, `${weaponMode} facing ${facing} off weapon hand should stay rooted to rear shoulder`);
    }
    assert(new Set(seen).size >= 6, `${weaponMode} shoulder anchors should vary by facing direction`);
  }
}

function validateWalkFramePose() {
  for (let facing = 0; facing < 8; facing++) {
    const angle = (facing / 8) * Math.PI * 2;
    const frames = [0, 1, 2, 3, 4, 5].map((frameIndex) => getRangerFramePose(Math.cos(angle), Math.sin(angle), frameIndex));
    assert(new Set(frames.map((pose) => `${pose.stride},${pose.bob},${pose.rearFootX},${pose.rearFootY},${pose.frontFootX},${pose.frontFootY}`)).size === 6, `facing ${facing} should expose six distinct walk poses`);
    assert(Math.hypot(frames[0].rearFootX - frames[3].rearFootX, frames[0].rearFootY - frames[3].rearFootY) >= 3.2, `facing ${facing} opposite contact rear foot should visibly alternate`);
    assert(Math.hypot(frames[0].frontFootX - frames[3].frontFootX, frames[0].frontFootY - frames[3].frontFootY) >= 3.2, `facing ${facing} opposite contact front foot should visibly alternate`);
    assert(frames[1].rearLeg.lift > frames[1].frontLeg.lift, `facing ${facing} early swing should lift rear leg`);
    assert(frames[4].frontLeg.lift > frames[4].rearLeg.lift, `facing ${facing} late swing should lift front leg`);
    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const center = (frames[frameIndex].rearFootX + frames[frameIndex].frontFootX) * 0.5;
      assert(Math.abs(center) <= 0.35, `facing ${facing} frame ${frameIndex} foot center drifted ${center}`);
      if (facing === 2 || facing === 6) {
        assert(frames[frameIndex].rearFootX < frames[frameIndex].frontFootX, `facing ${facing} frame ${frameIndex} front/back feet should not cross`);
        assert(Math.abs(frames[frameIndex].rearLeg.bootHalf) <= 2.5, `facing ${facing} frame ${frameIndex} boots should not splay wide`);
      }
      assert(Math.abs(frames[frameIndex].rearLeg.kneeY - frames[frameIndex].rearLeg.hipY) >= 3, `facing ${facing} frame ${frameIndex} rear knee should sit below hip`);
      assert(Math.abs(frames[frameIndex].frontLeg.kneeY - frames[frameIndex].frontLeg.hipY) >= 3, `facing ${facing} frame ${frameIndex} front knee should sit below hip`);
    }
  }
}

function validateStatusEffectLayers() {
  const build = {
    ...makeBuild(["longbow", "rangerPath", "venomCoating", "quarry", "stormcaller"]),
    rangerRuntime: {
      swapBuffTimer: 1,
      shadowVeilTimer: 0.5,
      venomCooldownTimer: 0.5,
      quarryStacks: 2,
      combo: 12
    }
  };
  const layers = getRangerStatusEffectLayers(build);
  assert(layers.length >= 5, `expected multiple ranger status effect layers, got ${layers.length}`);
  assert(layers.some((layer) => layer.type === "swap"), "status effects should include swap layer");
  assert(layers.some((layer) => layer.overlays.includes("breakStealthFlash")), "status effects should include stealth overlay");
  assert(layers.some((layer) => layer.overlays.includes("poisonDroplet")), "status effects should include poison overlay");
  assert(layers.some((layer) => layer.overlays.includes("markedHitFlash")), "status effects should include marked overlay");
  assert(layers.every((layer) => layer.alpha <= 0.42), "status effect overlays should stay restrained");
}

function validateThrowingKnifeReloadState() {
  const spec = getRangerVisualSpec(withMode(makeBuild(["throwingKnives"]), "ranged"));
  const meleeSpec = getRangerVisualSpec(withMode(makeBuild(["throwingKnives"]), "melee"));
  const runtime = {};
  advanceThrowingKnifeVisualHand(runtime);
  const firstRelease = getThrowingKnifeReloadState({ fireCooldown: 0.24, rangerRuntime: runtime }, 0.8, spec);
  advanceThrowingKnifeVisualHand(runtime);
  const secondRelease = getThrowingKnifeReloadState({ fireCooldown: 0.24, rangerRuntime: runtime }, 0.8, spec);
  const fastRelease = getThrowingKnifeReloadState({ fireCooldown: 0.24 }, 0.8, spec);
  const fastReady = getThrowingKnifeReloadState({ fireCooldown: 0.06 }, 0.2, spec);
  const slowRelease = getThrowingKnifeReloadState({ fireCooldown: 0.54 }, 0.9, spec);
  const melee = getThrowingKnifeReloadState({ fireCooldown: 0.24 }, 0.8, meleeSpec);
  assert(firstRelease.thrownHand === 1, `first throwing knife release should use main hand, got ${firstRelease.thrownHand}`);
  assert(secondRelease.thrownHand === -1, `second throwing knife release should use off hand, got ${secondRelease.thrownHand}`);
  assert(firstRelease.thrownHand !== secondRelease.thrownHand, "consecutive throwing knife releases should alternate hands");
  assert(fastRelease.released, "throwing knives should hide the thrown-hand blade immediately after a ranged throw");
  assert(!fastReady.released, "throwing knives should redraw the thrown-hand blade after the reload window");
  assert(slowRelease.releaseSeconds > fastRelease.releaseSeconds, "throwing knife reload window should scale with effective fire cooldown");
  assert(fastRelease.readyProgress < fastReady.readyProgress, "reload ready progress should increase after the release window");
  assert(!melee.released, "throwing knife melee mode should not use ranged reload hiding");
}

function validateThrowingKnifeMeleePresentation() {
  const rangedKnives = getRangerVisualSpec(withMode(makeBuild(["throwingKnives"]), "ranged"));
  const meleeKnives = getRangerVisualSpec(withMode(makeBuild(["throwingKnives"]), "melee"));
  const meleeDaggers = getRangerVisualSpec(withMode(makeBuild(["twinDaggers"]), "melee"));
  const rangedPresentation = getThrowingKnifeMeleePresentation(rangedKnives);
  const fallbackCloseCuts = getThrowingKnifeMeleePresentation(meleeKnives);
  const firstRuntime = {};
  advanceThrowingKnifeVisualHand(firstRuntime);
  const firstCloseCuts = getThrowingKnifeMeleePresentation(meleeKnives, { rangerRuntime: firstRuntime });
  advanceThrowingKnifeVisualHand(firstRuntime);
  const secondCloseCuts = getThrowingKnifeMeleePresentation(meleeKnives, { rangerRuntime: firstRuntime });
  const daggerPresentation = getThrowingKnifeMeleePresentation(meleeDaggers);
  assert(!rangedPresentation.active, "throwing knives ranged mode should not use Close Cuts melee presentation");
  assert(fallbackCloseCuts.active, "throwing knives melee mode should use Close Cuts presentation");
  assert(fallbackCloseCuts.primaryHand === -1, `Close Cuts fallback hand should be deterministic, got ${fallbackCloseCuts.primaryHand}`);
  assert(firstCloseCuts.profile === "closeCuts", `throwing knives melee profile mismatch: ${firstCloseCuts.profile}`);
  assert(firstCloseCuts.reach === "close", `throwing knives melee reach should be close, got ${firstCloseCuts.reach}`);
  assert(firstCloseCuts.maxForwardPixels <= 5.5, "Close Cuts should stay tight to the ranger body");
  assert(firstCloseCuts.arcCount === 2, `Close Cuts should retain compact paired knife read, got ${firstCloseCuts.arcCount} arcs`);
  assert(firstCloseCuts.primaryHand === 1, `first Close Cuts melee attack should emphasize main hand, got ${firstCloseCuts.primaryHand}`);
  assert(secondCloseCuts.primaryHand === -1, `second Close Cuts melee attack should emphasize off hand, got ${secondCloseCuts.primaryHand}`);
  assert(firstCloseCuts.primaryHand !== secondCloseCuts.primaryHand, "consecutive Close Cuts melee attacks should alternate primary slash hands");
  assert(firstCloseCuts.secondaryAlpha < 1, "Close Cuts secondary slash should be visually subordinate to the active hand");
  assert(!daggerPresentation.active, "twin daggers melee should keep its distinct dagger presentation");
}

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, stableSort(entry)])
  );
}

function hashFixture(value) {
  return createHash("sha256").update(JSON.stringify(stableSort(value))).digest("hex");
}

function makeRemoteSkillBuild(keys = []) {
  return {
    classType: "archer",
    skills: Object.fromEntries(keys.map((key) => [key, { points: 1 }]))
  };
}

function makeFixturePoseSet() {
  return {
    framePoses: [0, 1, 2, 3, 4, 5].map((frameIndex) => getRangerFramePose(1, 0, frameIndex)),
    rigPoses: [0, 1, 2, 3, 4, 5, 6, 7].map((facing) => {
      const angle = (facing / 8) * Math.PI * 2;
      return getRangerRigPose(
        { facing, dirX: Number(Math.cos(angle).toFixed(4)), dirY: Number(Math.sin(angle).toFixed(4)) },
        120,
        96,
        0.25,
        facing % 2 === 0 ? "ranged" : "melee"
      );
    })
  };
}

function buildVisualFixture({ id, label, keys, runtime = {}, projectileActive = {}, effects = ["hit", "swap", "buff"] }) {
  const build = { ...makeBuild(keys), rangerRuntime: runtime };
  const rangedBuild = withMode(build, "ranged");
  const meleeBuild = withMode(build, "melee");
  const fixture = {
    id,
    label,
    keys,
    spec: getRangerVisualSpec(build),
    rangedSpec: getRangerVisualSpec(rangedBuild),
    meleeSpec: getRangerVisualSpec(meleeBuild),
    projectileSpec: getRangerProjectileVisualSpec(build, { active: projectileActive }),
    effectSpecs: Object.fromEntries(effects.map((effect) => [effect, getRangerEffectVisualSpec(build, effect, { active: projectileActive })])),
    statusLayers: getRangerStatusEffectLayers(build),
    poses: makeFixturePoseSet()
  };
  return {
    ...stableSort(fixture),
    fixtureHash: hashFixture(fixture),
    projectileHash: hashFixture(fixture.projectileSpec),
    effectHash: hashFixture(fixture.effectSpecs)
  };
}

function buildVisualRegressionFixtures() {
  const fixtures = [
    buildVisualFixture({
      id: "default",
      label: "Default female elf archer",
      keys: [],
      runtime: { weaponMode: "ranged" }
    }),
    buildVisualFixture({
      id: "longbow-precision-ranger-stormcaller",
      label: "Longbow + Precision + Ranger path + Stormcaller",
      keys: ["longbow", "precision", "rangerPath", "shadowVeil", "venomCoating", "stormcaller"],
      runtime: { weaponMode: "ranged", swapBuffTimer: 0.8, shadowVeilTimer: 0.2, venomCooldownTimer: 0.4 },
      projectileActive: { fireArrow: true, poison: true }
    }),
    buildVisualFixture({
      id: "throwing-knives-ambush-rogue-living-shadow",
      label: "Throwing Knives + Ambush + Rogue path + Living Shadow",
      keys: ["throwingKnives", "ambush", "roguePath", "smokeBomb", "quarry", "livingShadow"],
      runtime: { weaponMode: "ranged", swapBuffTimer: 1, shadowVeilTimer: 0.6, quarryStacks: 2 },
      projectileActive: { stealth: true, marked: true }
    }),
    buildVisualFixture({
      id: "twin-daggers-bleed-assassin-death-chain",
      label: "Twin Daggers + Bleed + Assassin path + Death Chain",
      keys: ["twinDaggers", "bleed", "assassinPath", "relentless", "comboSurge", "deathChain"],
      runtime: { weaponMode: "melee", combo: 10 },
      projectileActive: { bleed: true, combo: true }
    }),
    buildVisualFixture({
      id: "rapier-pistol-predator-beast-master-apex",
      label: "Rapier/Pistol + Predator + Beast Master path + Apex Predator",
      keys: ["rapierPistol", "predator", "skirmisher", "beastMasterPath", "forager", "predatorsFeast", "apexPredator"],
      runtime: { weaponMode: "ranged", combo: 16, apexPredatorAnnounceTier: 3 },
      projectileActive: { combo: true }
    })
  ];
  const remoteProjectileFixture = {
    id: "remote-skills-fire-arrow-projectile",
    label: "Remote multiplayer-style ranger projectile",
    source: "skills fallback",
    projectileSpec: getRangerProjectileVisualSpec(makeRemoteSkillBuild(["longbow", "precision", "rangerPath", "stormcaller"]), {
      active: { fireArrow: true }
    }),
    effectSpec: getRangerEffectVisualSpec(makeRemoteSkillBuild(["longbow", "precision", "rangerPath", "stormcaller"]), "hit", {
      active: { fireArrow: true }
    })
  };
  remoteProjectileFixture.fixtureHash = hashFixture(remoteProjectileFixture);

  const defaultFixture = fixtures[0];
  for (const fixture of fixtures.slice(1)) {
    assert(fixture.fixtureHash !== defaultFixture.fixtureHash, `${fixture.id} fixture should differ from default`);
    assert(fixture.projectileHash !== defaultFixture.projectileHash, `${fixture.id} projectile fixture should differ from default`);
    assert(fixture.effectHash !== defaultFixture.effectHash, `${fixture.id} effect fixture should differ from default`);
    assert(fixture.projectileSpec.allowLingering === false, `${fixture.id} projectile fixture should disallow lingering artifacts`);
  }
  assert(remoteProjectileFixture.projectileSpec.allowLingering === false, "remote projectile fixture should disallow lingering artifacts");
  assert(
    remoteProjectileFixture.projectileSpec.family === "arrow" && remoteProjectileFixture.projectileSpec.impact === "stormFork",
    "remote projectile fixture should resolve remote skill fallback projectile styling"
  );
  return {
    generatedAt: new Date(0).toISOString(),
    schema: "ranger-visual-fixtures/v1",
    fixtures,
    multiplayerProjectileFixtures: [stableSort(remoteProjectileFixture)]
  };
}

function validateAndWriteVisualRegressionFixtures() {
  const output = buildVisualRegressionFixtures();
  mkdirSync(dirname(FIXTURE_OUTPUT_PATH), { recursive: true });
  writeFileSync(FIXTURE_OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  assert(output.fixtures.length === 5, `expected five ranger build fixtures, got ${output.fixtures.length}`);
  assert(output.multiplayerProjectileFixtures.length === 1, "expected one multiplayer projectile fixture");
}

validateDefaultSpec();
validateRangerStormcallerSpec();
validateRogueLivingShadowSpec();
validateAssassinDeathChainSpec();
validateBeastMasterApexSpec();
validateEntitySkillFallback();
validateWeaponModeSpecs();
validateShoulderAnchors();
validateWalkFramePose();
validateStatusEffectLayers();
validateThrowingKnifeReloadState();
validateThrowingKnifeMeleePresentation();
validateAndWriteVisualRegressionFixtures();

console.log("Ranger visual presentation validation passed.");
