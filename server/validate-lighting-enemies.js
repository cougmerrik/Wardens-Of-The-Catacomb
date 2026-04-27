import { Game } from "../src/Game.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const game = new Game(null, { headless: true });
  const tile = game.config.map.tile;
  const ghost = { id: "ghost-light", type: "ghost", x: game.player.x + tile, y: game.player.y, hp: 10 };
  const skeleton = { id: "plain-skeleton", type: "skeleton", x: game.player.x + tile * 2, y: game.player.y, hp: 10 };
  const custom = { id: "custom-light", type: "mummy", x: game.player.x + tile * 3, y: game.player.y, hp: 10, lightRadius: tile * 2.25 };
  const deadGhost = { id: "dead-ghost", type: "ghost", x: game.player.x + tile * 4, y: game.player.y, hp: 0 };

  assert(game.getEnemyLightRadius(ghost) === 0, "ghosts should not emit world light by default");
  assert(game.getEnemyLightRadius(skeleton) === 0, "non-glowing enemy should not emit light");
  assert(game.getEnemyLightRadius(custom) === tile * 2.25, "explicit enemy lightRadius should be honored");
  assert(game.getEnemyLightRadius(deadGhost) === 0, "dead ghosts should not emit light");

  game.enemies = [ghost, skeleton, custom, deadGhost];
  game.lightSources = [];
  const sources = game.getActiveLightSources().filter((source) => source.sourceType === "enemy");
  assert(!sources.some((source) => source.id === "ghost-light"), "active lights should exclude default ghost sprite glow");
  assert(sources.some((source) => source.id === "custom-light" && source.entityType === "mummy"), "active lights should include explicit enemy light override");
  assert(!sources.some((source) => source.id === "plain-skeleton"), "active lights should exclude non-glowing enemies");
  assert(!sources.some((source) => source.id === "dead-ghost"), "active lights should exclude dead glowing enemies");

  game.config.lighting.enabled = false;
  assert(game.getEnemyLightRadius(ghost) === 0, "disabled lighting should suppress enemy radius");
  assert(game.getActiveLightSources().length === 0, "disabled lighting should suppress active sources");

  console.log("Lighting enemy validation passed.");
}

main();
