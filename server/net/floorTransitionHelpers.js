function isSpawnFarEnough(spawn, usedSpawns, minDistance) {
  return usedSpawns.every((used) => Math.hypot(spawn.x - used.x, spawn.y - used.y) >= minDistance);
}

export function findRandomFloorSpawn(sim, usedSpawns = []) {
  if (!sim?.map?.length || !sim.map[0]?.length) return { x: sim?.player?.x || 0, y: sim?.player?.y || 0 };
  const tile = sim.config?.map?.tile || 32;
  const radius = Math.max(4, (sim.player?.size || tile * 0.6) * 0.5);
  const minDistance = tile * 8;
  for (const distanceScale of [1, 0.5, 0]) {
    for (let i = 0; i < 160; i++) {
      const tx = 1 + Math.floor(Math.random() * Math.max(1, sim.map[0].length - 2));
      const ty = 1 + Math.floor(Math.random() * Math.max(1, sim.map.length - 2));
      const x = tx * tile + tile * 0.5;
      const y = ty * tile + tile * 0.5;
      if (typeof sim.isPositionWalkable === "function" && !sim.isPositionWalkable(x, y, radius, true)) continue;
      if (typeof sim.isWalkableTile === "function" && !sim.isWalkableTile(tx, ty)) continue;
      const spawn = { x, y };
      if (distanceScale > 0 && !isSpawnFarEnough(spawn, usedSpawns, minDistance * distanceScale)) continue;
      return spawn;
    }
  }
  return typeof sim.findNearestSafePoint === "function"
    ? sim.findNearestSafePoint(sim.player?.x || 0, sim.player?.y || 0, 16, radius)
    : { x: sim.player?.x || 0, y: sim.player?.y || 0 };
}

export function placeActivePlayersAtRandomFloorSpawns(room) {
  if (!room?.sim) return false;
  room.syncPrimaryActivePlayerFromSim?.();
  const usedSpawns = [];
  for (const client of room.clients.values()) {
    const state = client.id === room.pauseOwnerId
      ? room.syncPrimaryActivePlayerFromSim()
      : room.activePlayers.get(client.id);
    if (!state) continue;
    const alive = state.alive !== false && (state.health || 0) > 0;
    if (!alive) continue;
    const spawn = findRandomFloorSpawn(room.sim, usedSpawns);
    usedSpawns.push(spawn);
    state.x = spawn.x;
    state.y = spawn.y;
    state.moving = false;
    state.hitCooldown = 0;
    state.hpBarTimer = 0;
    state.spectateTargetId = "";
    if (client.id === room.pauseOwnerId) {
      room.syncSimPrimaryPlayerState();
      room.syncPrimaryActivePlayerFromSim();
    }
  }
  return usedSpawns.length > 0;
}

export function createRandomActivePlayerStates(room) {
  if (!room?.sim) return false;
  room.activePlayers.clear();
  const usedSpawns = [];
  for (const client of room.clients.values()) {
    const spawn = findRandomFloorSpawn(room.sim, usedSpawns);
    usedSpawns.push(spawn);
    room.activePlayers.set(client.id, room.createActivePlayerState(client, spawn));
  }
  room.syncSimPrimaryPlayerState();
  room.syncPrimaryActivePlayerFromSim();
  return true;
}
