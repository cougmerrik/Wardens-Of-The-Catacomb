import { applyEnemyDamage } from "../src/game/world/spawnCombat.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createGame() {
  const player = { id: "p1", x: 0, y: 0 };
  return {
    player,
    config: {
      enemy: {
        hpBarDuration: 1,
        mimicArrowResistance: 1,
        mimicFireVulnerability: 1
      }
    },
    isEnemyFriendlyToPlayer(enemy) {
      return !!enemy?.friendly;
    },
    getPlayerEntityById(ownerId) {
      return ownerId === player.id ? player : null;
    },
    getEnemyDefenseScale() {
      return 1;
    },
    getLifeLeechPercent() {
      return 0;
    },
    spawnFloatingText() {},
    recordDamageDealtByPlayerEntity() {
      throw new Error("friendly wolf damage should not be recorded as enemy damage");
    }
  };
}

function createFriendlyWolf() {
  return {
    type: "wolf",
    friendly: true,
    hp: 20,
    maxHp: 20,
    size: 20,
    x: 0,
    y: 0
  };
}

function main() {
  const playerOwnedWolf = createFriendlyWolf();
  applyEnemyDamage(createGame(), playerOwnedWolf, 5, "melee", "p1");
  assert(playerOwnedWolf.hp === 20, "player-owned damage should not hurt friendly wolves");

  const environmentalWolf = createFriendlyWolf();
  applyEnemyDamage(createGame(), environmentalWolf, 5, "acid", null);
  assert(environmentalWolf.hp === 15, "null-owner environmental damage should hurt friendly wolves");

  const hostileContactWolf = createFriendlyWolf();
  applyEnemyDamage(createGame(), hostileContactWolf, 5, "physical", null, { allowFriendlyPetDamage: true });
  assert(hostileContactWolf.hp === 15, "explicit hostile contact damage should hurt friendly wolves");

  console.log("Friendly wolf damage validation passed");
}

main();
