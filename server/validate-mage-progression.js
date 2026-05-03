import { Game } from "../src/Game.js";
import { stepGame } from "../src/game/gameStep.js";
import { getActiveLightSources } from "../src/game/world/lighting.js";
import { getMageAttackLabel, getMageEfficiencyState } from "../src/rendering/hud/mageHudState.js";
import {
  canSpendNecromancerNode,
  getMageSelectedCantrip,
  getMageSelectedPath,
  getMageSelectedSpell,
  getMageSelectedTier5Count
} from "../src/game/necromancerTalentTree.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeMage() {
  const game = new Game(null, { headless: true, classType: "necromancer" });
  game.level = 12;
  game.skillPoints = 7;
  game.player.id = "mage";
  game.player.classType = "necromancer";
  game.necromancerRuntime.mana = 7;
  game.input = game.input || { mouse: {} };
  game.input.mouse = game.input.mouse || {};
  return game;
}

function spend(game, key) {
  assert(canSpendNecromancerNode(game, key), `expected ${key} to be spendable`);
  assert(game.spendSkillPoint(key), `spendSkillPoint failed for ${key}`);
}

function validateTreeGates() {
  const game = makeMage();
  assert(!canSpendNecromancerNode(game, "fireballSpell"), "spell should require cantrip");
  spend(game, "fireBoltCantrip");
  assert(getMageSelectedCantrip(game) === "fireBoltCantrip", "cantrip was not selected");
  spend(game, "fireballSpell");
  assert(getMageSelectedSpell(game) === "fireballSpell", "spell was not selected");
  spend(game, "rapidCasting");
  spend(game, "wizardPath");
  assert(getMageSelectedPath(game) === "wizardPath", "path was not selected");
  spend(game, "arcaneClarity");
  spend(game, "deepReserves");
  spend(game, "lich");
  assert(getMageSelectedTier5Count(game) === 2, "Tier 5 count should be exactly two");
  assert(!canSpendNecromancerNode(game, "archmage"), "second capstone should be blocked");
}

function validateManaAndMode() {
  const game = makeMage();
  spend(game, "fireBoltCantrip");
  spend(game, "fireballSpell");
  spend(game, "rapidCasting");
  const startMana = game.necromancerRuntime.mana;
  assert(game.toggleMageMode(), "Mage Q mode toggle failed");
  assert(game.necromancerRuntime.activeMode === "spell", "Mage did not enter spell mode");
  game.input.mouse.worldX = game.player.x + 120;
  game.input.mouse.worldY = game.player.y;
  game.fire(1, 0);
  assert(game.necromancerRuntime.mana === startMana - 2, "spell did not spend 2 mana");
  assert(game.bullets.some((bullet) => bullet.projectileType === "mage_fireball"), "fireball projectile not created");
}

function validateCantripManaSlowdown() {
  const game = makeMage();
  game.necromancerRuntime.mana = 0;
  game.necromancerRuntime.manaRegenPauseTimer = 1;
  game.tickActivePlayerEntities(0.5);
  assert(game.necromancerRuntime.mana > 0, "cantrip regen slow should still regenerate mana");
  assert(game.necromancerRuntime.mana < 0.25, "cantrip regen slow should reduce regen by roughly 66%");
}

function validateArcaneMissileCone() {
  const game = makeMage();
  spend(game, "arcaneMissileCantrip");
  game.enemies.push({ id: "side-target", type: "goblin", x: game.player.x, y: game.player.y + 90, size: 18, hp: 20, maxHp: 20 });
  game.fire(1, 0);
  const missiles = game.bullets.filter((bullet) => bullet.projectileType === "mage_arcaneMissile");
  assert(missiles.length === 2, "Arcane Missile should fire two bolts");
  const missile = missiles[0];
  assert(Math.abs(missile.homingConeCos - Math.cos(Math.PI / 6)) < 0.0001, "Arcane Missile should use a 30-degree homing cone");
  stepGame(game, 1 / 60, { processUi: false });
  assert(Math.abs(missile.vy / missile.vx) < 0.15, "Arcane Missile should not home to targets outside its aim cone");
}

function validateChromaticOrbPiercing() {
  const game = makeMage();
  const y = game.player.y;
  const x = game.player.x + 20;
  game.bullets.push({
    x,
    y,
    vx: 600,
    vy: 0,
    angle: 0,
    life: 1,
    size: 32,
    damage: 4,
    projectileType: "mage_chromaticOrb",
    damageType: "fire",
    ownerId: game.player.id,
    pierce: true,
    useSegmentHit: true,
    hitTargets: new Set()
  });
  const first = { id: "pierce-a", type: "goblin", x: x + 6, y, size: 20, hp: 20, maxHp: 20 };
  const second = { id: "pierce-b", type: "goblin", x: x + 16, y, size: 20, hp: 20, maxHp: 20 };
  game.enemies.push(first, second);
  stepGame(game, 1 / 60, { processUi: false });
  assert(first.hp < 20 && second.hp < 20, "Chromatic Orb should damage every enemy it pierces through");
}

function validateSpiritGuardiansSpell() {
  const game = makeMage();
  spend(game, "arcaneMissileCantrip");
  spend(game, "invisibilitySpell");
  const enemy = { id: "guardian-target", type: "goblin", x: game.player.x + 30, y: game.player.y, size: 20, hp: 20, maxHp: 20 };
  game.enemies.push(enemy);
  game.castMageSpiritGuardians(1, 0, 1, 1, 0);
  assert(game.necromancerRuntime.invisibilityTimer > 0, "Spirit Guardians should briefly trigger invisibility");
  assert(game.fireZones.some((zone) => zone.zoneType === "spiritGuardians" && zone.followOwner), "Spirit Guardians should create a following offensive aura");
  stepGame(game, 0.3, { processUi: false });
  assert(enemy.hp < 20 && enemy.lastMageStatus === "necrotic", "Spirit Guardians should damage enemies and trigger Mage on-hit effects");
}

function validateGreenFlameBladeReachAndLeech() {
  const game = makeMage();
  spend(game, "greenFlameBladeCantrip");
  game.player.health = game.player.maxHealth - 10;
  const tile = game.config.map.tile;
  const enemy = { id: "gfb-target", type: "goblin", x: game.player.x + tile * 1.6, y: game.player.y, size: 20, hp: 30, maxHp: 30 };
  const crate = { id: "gfb-crate", type: "crate", x: game.player.x + tile * 1.25, y: game.player.y, size: 20, hp: 1 };
  game.enemies.push(enemy);
  game.breakables.push(crate);
  game.fire(1, 0);
  assert(enemy.hp < 30, "Green-Flame Blade should hit beyond 1.5 tiles");
  assert(crate.hp <= 0, "Green-Flame Blade should destroy breakables in its cleave");
  assert(game.player.fireCooldown >= 0.57, "Green-Flame Blade cooldown should be 20% slower than the previous 0.48s baseline");
  assert(game.player.health > game.player.maxHealth - 10, "Green-Flame Blade should leech health from damage dealt");
  const swing = game.meleeSwings.find((candidate) => candidate.style === "greenFlameBlade");
  assert(swing && swing.range >= tile * 1.7, "Green-Flame Blade swing should render as a longer reach attack");
  assert(swing.arc < Math.PI * 0.55, "Green-Flame Blade cleave arc should be narrowed");
}

function validateShockChainLighting() {
  const game = makeMage();
  const tile = game.config.map.tile;
  const source = { id: "shock-a", type: "goblin", x: game.player.x + tile, y: game.player.y, size: 20, hp: 20, maxHp: 20 };
  const target = { id: "shock-b", type: "goblin", x: game.player.x + tile * 1.7, y: game.player.y, size: 20, hp: 20, maxHp: 20 };
  game.enemies.push(source, target);
  game.bullets.push({
    x: source.x,
    y: source.y,
    vx: 0,
    vy: 0,
    angle: 0,
    life: 1,
    size: 6,
    damage: 4,
    projectileType: "mage_shock",
    damageType: "lightning",
    ownerId: game.player.id,
    chainCount: 1,
    hitTargets: new Set()
  });
  stepGame(game, 1 / 60, { processUi: false });
  const chain = game.fireZones.find((zone) => zone.zoneType === "arcaneChain" && zone.damageType === "lightning");
  assert(chain && chain.lightRadius > 0 && chain.lightIntensity > 0, "Shock chain jump should create a small light source");
  assert(getActiveLightSources(game).some((source) => source.entityType === "arcaneChain" && source.radius > 0), "Shock chain light should be exposed to lighting");
}

function validateMageHudState() {
  const game = makeMage();
  spend(game, "frostShardCantrip");
  spend(game, "confusionSpell");
  game.necromancerRuntime.mana = 7;
  assert(getMageAttackLabel(game) === "Frost Shard", "Mage HUD should show selected cantrip name");
  assert(getMageEfficiencyState(game).tier === "high", "Mage HUD should show high efficiency at high mana");
  game.necromancerRuntime.mana = 3.5;
  assert(getMageEfficiencyState(game).tier === "mid", "Mage HUD should show normal efficiency at mid mana");
  game.necromancerRuntime.mana = 2;
  assert(getMageEfficiencyState(game).tier === "low", "Mage HUD should show low efficiency at low mana");
  assert(game.toggleMageMode(), "Mage Q mode toggle failed for HUD state");
  assert(getMageAttackLabel(game) === "Confusion", "Mage HUD should show selected spell name in spell mode");
}

function validateConfusionPersistsAfterLeavingField() {
  const game = makeMage();
  spend(game, "fireBoltCantrip");
  spend(game, "confusionSpell");
  const enemy = { id: "confused-target", type: "goblin", x: game.player.x + 70, y: game.player.y, size: 20, speed: 80, hp: 20, maxHp: 20 };
  game.enemies.push(enemy);
  game.input.mouse.worldX = enemy.x;
  game.input.mouse.worldY = enemy.y;
  game.castMageConfusion(1, 0, 1, 1, 0);
  assert(enemy.confusionTimer >= 2.9, "Confusion should apply a 3 second debuff on initial hit");
  assert(enemy.confusionImmunityTimer >= 9.9, "Confusion should add a 10 second re-affliction immunity");
  const firstTimer = enemy.confusionTimer;
  game.castMageConfusion(1, 0, 1, 1, 0);
  assert(enemy.confusionTimer === firstTimer, "Confusion should not refresh during immunity");
  enemy.x = game.player.x + 320;
  stepGame(game, 1, { processUi: false });
  assert(enemy.confusionTimer > 1.8, "Confusion should remain after enemy leaves the field");
}

function validateCasterEffectHooks() {
  const game = makeMage();
  spend(game, "fireBoltCantrip");
  spend(game, "fireballSpell");
  spend(game, "rapidCasting");
  spend(game, "enchanterPath");
  spend(game, "arcanePresence");
  spend(game, "deepReserves");
  const zone = { x: game.player.x, y: game.player.y, radius: 40, life: 1, zoneType: "cloudDaggers", ownerId: game.player.id };
  game.fireZones.push(zone);
  assert(game.getMageManaRegen() > 1, "Arcane Presence should increase mana regeneration in owned magical effects");
  assert(game.getDefenseFlatReduction() >= 1, "Arcane Presence should grant flat damage reduction in owned magical effects");

  const goblin = { id: "influence-target", type: "goblin", x: game.player.x + 30, y: game.player.y, size: 20, hp: 20, maxHp: 20 };
  game.enemies.push(goblin);
  game.applyMageInfluence(goblin);
  game.applyMageInfluence(goblin);
  game.applyMageInfluence(goblin);
  assert(game.isEnemyFriendlyToPlayer(goblin), "Enchanter Influence should temporarily charm non-undead enemies");
  goblin.tempMageCharmTimer = 0.01;
  stepGame(game, 1 / 30, { processUi: false });
  assert(!game.isEnemyFriendlyToPlayer(goblin), "Temporary Enchanter charm should revert when it expires");

  const weakened = { damageMin: 10, damageMax: 10, weakenedTimer: 2 };
  assert(game.getEnemyContactDamageRange(weakened).max < 10, "Weakened enemies should deal reduced contact damage");

  game.necromancerRuntime.classSkillCooldownTimer = 0;
  game.activateMageBlink(1, 0, { decoy: true });
  const decoy = game.enemies.find((enemy) => enemy.type === "mage_decoy" && game.isEnemyFriendlyToPlayer(enemy));
  assert(decoy, "Enchanter Blink decoy should create a targetable friendly decoy");
  assert(!decoy.tempMageCharmTimer, "Mirage decoy should persist until killed");
  game.enemies.push({ id: "mirage-target", type: "goblin", x: decoy.x + 80, y: decoy.y, size: 20, hp: 20, maxHp: 20 });
  stepGame(game, 0.4, { processUi: false });
  assert(game.bullets.some((bullet) => bullet.projectileType === "mage_fireBolt" && bullet.ownerId === game.player.id), "Mirage decoy should cast Fire Bolt");
}

function validateFlamingSphereAndBattlemageHooks() {
  const game = makeMage();
  spend(game, "fireBoltCantrip");
  spend(game, "flamingSphereSpell");
  spend(game, "battleCaster");
  spend(game, "wizardPath");
  spend(game, "arcaneClarity");
  spend(game, "deepReserves");
  spend(game, "battlemage");
  game.input.mouse.worldX = game.player.x + 60;
  game.input.mouse.worldY = game.player.y;
  game.castMageFlamingSphere(1, 0, 1, 1, 0);
  const sphere = game.enemies.find((enemy) => enemy.type === "flaming_sphere");
  assert(sphere && sphere.lightIntensity === 0.2 && sphere.lightRadius > 0, "Flaming Sphere should create a low-power light source");
  const target = { id: "sphere-target", type: "goblin", x: sphere.x + 16, y: sphere.y, size: 20, hp: 20, maxHp: 20 };
  game.enemies.push(target);
  stepGame(game, 0.3, { processUi: false });
  assert(target.hp < 20 && target.burningTimer > 0, "Flaming Sphere should deal fire damage and apply Burning");

  const close = { id: "close-cantrip", type: "goblin", x: game.player.x + 30, y: game.player.y, size: 20, hp: 20, maxHp: 20 };
  game.enemies.push(close);
  game.bullets.push({
    x: close.x,
    y: close.y,
    vx: 0,
    vy: 0,
    angle: 0,
    life: 1,
    size: 6,
    damage: 4,
    projectileType: "mage_fireBolt",
    damageType: "fire",
    ownerId: game.player.id,
    mageCantrip: "fireBoltCantrip",
    hitTargets: new Set()
  });
  stepGame(game, 1 / 60, { processUi: false });
  assert(close.hp < 16.5, "Battlemage should add bonus damage to close cantrip hits");
}

function validateRunicRefractionHook() {
  const game = makeMage();
  const x = game.player.x + 40;
  const y = game.player.y;
  const enemy = { id: "refraction-target", type: "goblin", x, y, size: 20, hp: 20, maxHp: 20 };
  game.enemies.push(enemy);
  game.bullets.push({
    x,
    y,
    vx: 430,
    vy: 0,
    angle: 0,
    life: 1,
    size: 9,
    damage: 6,
    projectileType: "mage_chromaticOrb",
    damageType: "fire",
    ownerId: game.player.id,
    pierce: true,
    runicRefraction: true,
    hitTargets: new Set()
  });
  stepGame(game, 1 / 60, { processUi: false });
  const refractions = game.bullets.filter((bullet) => bullet.projectileType === "mage_chromaticOrb" && bullet.wildSplitClone);
  assert(refractions.length === 2, "Runic Refraction should split Chromatic Orb into two smaller orbs on first hit");
}

function validateWildMagicHooks() {
  const game = makeMage();
  spend(game, "fireBoltCantrip");
  spend(game, "fireballSpell");
  spend(game, "rapidCasting");
  spend(game, "sorcererPath");
  game.necromancerRuntime.chaosSurgeTimer = 1;
  const originalRandom = Math.random;
  try {
    Math.random = () => 7 / 15;
    const effect = game.triggerMageWildMagic("fireballSpell");
    assert(effect === "Blue", "Wild Magic deterministic roll should trigger Blue");
    assert(game.necromancerRuntime.blueTimer > 0, "Wild Magic Blue should set a visible runtime timer");
    let calls = 0;
    Math.random = () => (calls++ === 0 ? 9 / 15 : 0.1);
    const mimicEffect = game.triggerMageWildMagic("fireballSpell");
    assert(mimicEffect === "Mimic", "Wild Magic deterministic roll should trigger Mimic");
    assert(game.necromancerRuntime.mimicTimer > 0, "Wild Magic Mimic should set mimic form timer");
  } finally {
    Math.random = originalRandom;
  }
}

function validateNecroticBeamCharm() {
  const game = makeMage();
  spend(game, "necroticBeamCantrip");
  const skeleton = { id: "beam-skeleton", type: "skeleton", x: game.player.x + 80, y: game.player.y, size: 18, hp: 20, maxHp: 20 };
  game.enemies.push(skeleton);
  assert(game.getNecromancerCharmDuration() <= 1.3, "Necrotic Beam base charm duration should be fast");
  for (let i = 0; i < 90; i++) {
    stepGame(game, 1 / 60, {
      processUi: false,
      firePrimaryHeld: true,
      hasAim: true,
      aimX: skeleton.x,
      aimY: skeleton.y
    });
  }
  assert(game.isEnemyFriendlyToPlayer(skeleton), "Necrotic Beam should charm undead targets");
  assert(skeleton.tempMageCharmTimer > 0, "Base Necrotic Beam charm should be temporary outside Necromancer path");
  const bossSkeleton = { id: "beam-boss", type: "skeleton", x: game.player.x + 120, y: game.player.y, size: 24, hp: 40, maxHp: 40, isBoss: true };
  game.enemies.push(bossSkeleton);
  assert(!game.markUndeadAsControlled(bossSkeleton), "Boss creatures should not be charmed by undead control abilities");
}

function validateFrostShardSplinter() {
  const game = makeMage();
  const x = game.player.x + 40;
  const y = game.player.y;
  const enemy = { id: "frost-target", type: "goblin", x, y, size: 20, hp: 20, maxHp: 20 };
  game.enemies.push(enemy);
  game.bullets.push({
    x,
    y,
    vx: 250,
    vy: 0,
    angle: 0,
    life: 1,
    size: 7,
    damage: 6,
    projectileType: "mage_frostShard",
    damageType: "cold",
    ownerId: game.player.id,
    slowDuration: 5,
    knockback: 24,
    hitTargets: new Set()
  });
  stepGame(game, 1 / 60, { processUi: false });
  const splinters = game.bullets.filter((bullet) => bullet.projectileType === "mage_frostShard" && bullet.frostShardSplinter);
  assert(splinters.length === 2, "Frost Shard should splinter into exactly two shards on hit");
}

function validateRunesAndLichSouls() {
  const game = makeMage();
  spend(game, "fireBoltCantrip");
  spend(game, "fireballSpell");
  spend(game, "rapidCasting");
  spend(game, "necromancerPath");
  spend(game, "arcaneClarity");
  spend(game, "deepReserves");
  spend(game, "lich");
  game.fire(1, 0);
  assert(game.necromancerRuntime.runes === 0, "runes should not build without Runic Mastery");
  game.necromancerRuntime.souls = [];
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.05;
    const enemy = { id: "dummy", type: "goblin", x: game.player.x + 40, y: game.player.y, size: 20, hp: 1, maxHp: 1, lastDamageOwnerId: game.player.id };
    game.enemies.push(enemy);
    game.applyEnemyDamage(enemy, 5, "fire", game.player.id);
    stepGame(game, 1 / 60, { processUi: false });
    assert(game.necromancerRuntime.souls.length >= 1, "Lich kill did not create a Soul when 10% drop chance succeeds");
    const healthBefore = game.player.health = game.player.maxHealth - 10;
    const soul = game.necromancerRuntime.souls[0];
    soul.x = game.player.x;
    soul.y = game.player.y;
    stepGame(game, 1 / 60, { processUi: false });
    assert(game.player.health > healthBefore, "Lich Soul should heal only after being collected");
  } finally {
    Math.random = originalRandom;
  }
}

function validateNecromancerRaisesNonUndead() {
  const game = makeMage();
  spend(game, "fireBoltCantrip");
  spend(game, "fireballSpell");
  spend(game, "rapidCasting");
  spend(game, "necromancerPath");
  const enemy = { id: "raise-target", type: "goblin", x: game.player.x + 40, y: game.player.y, size: 20, hp: 1, maxHp: 1, lastDamageOwnerId: game.player.id };
  game.enemies.push(enemy);
  game.applyEnemyDamage(enemy, 5, "death", game.player.id);
  stepGame(game, 1 / 60, { processUi: false });
  const raised = game.enemies.find((candidate) => candidate && candidate.type === "goblin" && candidate.raisedUndeadCopy && game.isEnemyFriendlyToPlayer(candidate));
  assert(raised, "Necromancer should raise non-undead kills as controlled undead copies");
  assert(game.necromancerRuntime.necroRaiseCooldownTimer > 1.9, "Necromancer raise-on-kill should use a 2 second internal cooldown");
  game.necromancerRuntime.necroRaiseCooldownTimer = 0;
  const boss = { id: "raise-boss", type: "goblin", x: game.player.x + 80, y: game.player.y, size: 28, hp: 1, maxHp: 30, isBoss: true, lastDamageOwnerId: game.player.id };
  game.enemies.push(boss);
  game.applyEnemyDamage(boss, 50, "death", game.player.id);
  stepGame(game, 1 / 60, { processUi: false });
  const raisedBoss = game.enemies.find((candidate) => candidate && candidate.id !== boss.id && candidate.raisedUndeadCopy && candidate.x === boss.x && candidate.y === boss.y);
  assert(!raisedBoss, "Boss creatures should not be raised by Necromancer kill conversion");
}

function main() {
  validateTreeGates();
  validateManaAndMode();
  validateCantripManaSlowdown();
  validateArcaneMissileCone();
  validateChromaticOrbPiercing();
  validateSpiritGuardiansSpell();
  validateGreenFlameBladeReachAndLeech();
  validateShockChainLighting();
  validateMageHudState();
  validateConfusionPersistsAfterLeavingField();
  validateCasterEffectHooks();
  validateRunicRefractionHook();
  validateFlamingSphereAndBattlemageHooks();
  validateWildMagicHooks();
  validateNecroticBeamCharm();
  validateFrostShardSplinter();
  validateRunesAndLichSouls();
  validateNecromancerRaisesNonUndead();
  console.log(JSON.stringify({ ok: true, checks: ["tree-gates", "mana-mode", "cantrip-mana-slow", "arcane-missile-cone", "chromatic-orb-pierce", "spirit-guardians", "green-flame-blade-reach-leech", "shock-chain-lighting", "mage-hud-state", "confusion-persist", "caster-effect-hooks", "mirage-decoy", "flaming-sphere", "battlemage-close-cantrip", "runic-refraction", "wild-magic-hooks", "necrotic-beam-charm", "frost-shard-splinter", "lich-souls", "necromancer-raise"] }, null, 2));
}

main();
