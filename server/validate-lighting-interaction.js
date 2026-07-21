import { Game } from "../src/Game.js";
import { stepGame } from "../src/game/gameStep.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeTorch(game, overrides = {}) {
  return {
    id: "test-torch",
    type: "torch",
    x: game.player.x,
    y: game.player.y,
    size: 16,
    lit: false,
    lightRadius: game.config.lighting.torchRadiusTiles * game.config.map.tile,
    snuffCooldown: 0,
    ...overrides
  };
}

function main() {
  const game = new Game(null, { headless: true });
  assert(typeof game.updateLightingInteractions === "function", "updateLightingInteractions should be available on game");
  const mummy = game.spawnMummy(game.player.x, game.player.y);
  assert(mummy.snuffsTorches === true, "mummies should be torch snuffers");

  const unlitTorch = makeTorch(game);
  game.lightSources = [unlitTorch];
  stepGame(game, 0.016, { processUi: false });
  assert(unlitTorch.lit === true, "player contact should relight an unlit torch");
  assert(game.floatingTexts.some((text) => text.text === "Relit"), "relighting should spawn floating feedback");

  const litTorch = makeTorch(game, { id: "lit-torch", lit: true, snuffCooldown: 0 });
  game.lightSources = [litTorch];
  game.player.lanternFuel = 0.1;
  const fuelBeforeCollect = game.player.lanternFuel;
  const textCountBefore = game.floatingTexts.length;
  stepGame(game, 0.1, { processUi: false });
  assert(game.lightSources.some((torch) => torch.id === "lit-torch"), "collected brazier should remain in place");
  assert(litTorch.lit === false, "collected brazier should become unlit");
  assert(litTorch.relightTimer === game.config.lighting.brazierRelightSeconds, "collected brazier should start its relight timer");
  assert(Math.abs(game.player.lanternFuel - (fuelBeforeCollect + 0.2 - game.config.lighting.lanternFuelDecayPerSecond * 0.1)) < 0.001, "collecting a lit torch should add 20% lantern fuel before decay");
  assert(game.floatingTexts.length > textCountBefore && game.floatingTexts.some((text) => String(text.text).startsWith("Lantern")), "collecting a lit torch should spawn lantern feedback");

  game.player.x += game.config.map.tile * 4;
  stepGame(game, 29.9, { processUi: false });
  assert(litTorch.lit === false && litTorch.relightTimer > 0, "collected brazier should remain unlit before 30 seconds");
  stepGame(game, 0.11, { processUi: false });
  assert(litTorch.lit === true && litTorch.relightTimer === 0, "collected brazier should automatically relight after 30 seconds");
  game.player.x = litTorch.x;

  const fullTorch = makeTorch(game, { id: "full-fuel-torch", lit: true, snuffCooldown: 0 });
  game.lightSources = [fullTorch];
  game.player.lanternFuel = 0.95;
  stepGame(game, 0.1, { processUi: false });
  assert(game.player.lanternFuel <= 1, "collecting torch fuel should stay bounded to 100%");

  const farTorch = makeTorch(game, {
    id: "far-torch",
    x: game.player.x + game.config.map.tile * 4,
    lit: false
  });
  game.lightSources = [farTorch];
  stepGame(game, 0.016, { processUi: false });
  assert(farTorch.lit === false, "distant unlit torch should stay unlit");

  const snuffedTorch = makeTorch(game, { id: "snuffed-torch", lit: true, snuffCooldown: 0 });
  game.lightSources = [snuffedTorch];
  game.enemies = [{ type: "mummy", x: snuffedTorch.x, y: snuffedTorch.y, size: 24, hp: 10, snuffsTorches: true }];
  const snuffTextCountBefore = game.floatingTexts.length;
  stepGame(game, 0.016, { processUi: false });
  assert(snuffedTorch.lit === false, "snuffer enemy contact should turn a lit torch off");
  assert(snuffedTorch.snuffCooldown > 0, "snuffed torch should receive cooldown");
  assert(game.floatingTexts.length > snuffTextCountBefore && game.floatingTexts.some((text) => text.text === "Snuffed"), "snuffing should spawn floating feedback");

  game.enemies = [];
  stepGame(game, 0.016, { processUi: false });
  assert(snuffedTorch.lit === true, "player should be able to relight a snuffed torch afterward");

  snuffedTorch.snuffCooldown = 0.5;
  game.enemies = [{ type: "mummy", x: snuffedTorch.x, y: snuffedTorch.y, size: 24, hp: 10, snuffsTorches: true }];
  stepGame(game, 0.016, { processUi: false });
  assert(snuffedTorch.lit === true, "snuff cooldown should prevent immediate re-snuff flicker");

  console.log("Lighting interaction validation passed.");
}

main();
