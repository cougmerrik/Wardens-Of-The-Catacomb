import { Game } from "../src/Game.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function tileAt(game, x, y) {
  const tileSize = game.config.map.tile;
  const tx = Math.floor(x / tileSize);
  const ty = Math.floor(y / tileSize);
  return { tx, ty, value: game.map[ty]?.[tx] };
}

function nearWall(game, tx, ty) {
  return (
    game.map[ty - 1]?.[tx] === "#" ||
    game.map[ty + 1]?.[tx] === "#" ||
    game.map[ty]?.[tx - 1] === "#" ||
    game.map[ty]?.[tx + 1] === "#"
  );
}

function assertTorchPlacement(game) {
  const torches = game.lightSources || [];
  const cfg = game.config.lighting;
  assert(Array.isArray(torches), "lightSources should be an array");
  assert(torches.length > 0, "floor should place at least one torch");
  assert(torches.length <= cfg.maxTorches, `torch count ${torches.length} exceeded max ${cfg.maxTorches}`);

  const ids = new Set();
  const tileSize = game.config.map.tile;
  for (const torch of torches) {
    assert(torch.type === "torch", `expected torch type, got ${torch.type}`);
    assert(torch.variant === "brazier", `expected brazier presentation variant, got ${torch.variant}`);
    assert(typeof torch.id === "string" && torch.id, "torch should have stable id");
    assert(!ids.has(torch.id), `duplicate torch id ${torch.id}`);
    ids.add(torch.id);
    assert(torch.lit === true, "torch should default lit");
    assert(Number.isFinite(torch.litChangedAt), "brazier should track its authoritative visual state-change time");
    assert(torch.lightRadius === cfg.torchRadiusTiles * tileSize, "torch light radius should match config");
    assert(torch.snuffCooldown === 0, "torch snuff cooldown should default to zero");
    assert(torch.relightTimer === 0, "brazier relight timer should default to zero");
    const { tx, ty, value } = tileAt(game, torch.x, torch.y);
    assert(value !== "#" && value !== "D" && value !== "K" && value !== "P", `torch placed on invalid tile ${value}`);
    assert(game.isWalkableTile(tx, ty), `torch placed on non-walkable tile ${tx},${ty}`);
    assert(nearWall(game, tx, ty), `torch ${torch.id} was not near a wall`);
    assert(Math.hypot(torch.x - game.player.x, torch.y - game.player.y) >= tileSize * 6, "torch too close to player spawn");
    assert(Math.hypot(torch.x - game.door.x, torch.y - game.door.y) >= tileSize * 2.5, "torch too close to door");
    assert(Math.hypot(torch.x - game.pickup.x, torch.y - game.pickup.y) >= tileSize * 2.5, "torch too close to pickup");
  }
}

function main() {
  const game = new Game(null, { headless: true });
  assert(typeof game.placeTorches === "function", "placeTorches should be available on game");
  assertTorchPlacement(game);

  const firstIds = new Set(game.lightSources.map((torch) => torch.id));
  game.lightSources.push({ id: "sentinel", type: "torch", x: game.player.x, y: game.player.y, lit: true, lightRadius: 1 });
  game.advanceToNextFloor();
  assertTorchPlacement(game);
  assert(!game.lightSources.some((torch) => torch.id === "sentinel"), "floor advance should replace stale torches");
  assert(game.lightSources.every((torch) => !firstIds.has(torch.id) || torch.id.startsWith(`torch-${game.floor}-`)), "floor torch ids should reflect current floor");

  console.log("Lighting placement validation passed.");
}

main();
