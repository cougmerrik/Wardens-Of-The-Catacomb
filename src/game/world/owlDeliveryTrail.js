const TRAIL_LIFE = 6;
const TRAIL_LIMIT = 90;
const TRAIL_EMIT_INTERVAL = 0.16;
const WAIT_TRAIL_LIMIT = 12;
const WAIT_TRAIL_EMIT_INTERVAL = 1.25;

export function updateOwlTrail(owl, dt) {
  if (!Array.isArray(owl.trail)) owl.trail = [];
  if (owl.state !== "slain" && owl.state !== "portal") {
    const waiting = owl.state === "waiting";
    const emitInterval = waiting ? WAIT_TRAIL_EMIT_INTERVAL : TRAIL_EMIT_INTERVAL;
    const motesPerEmit = 1;
    owl.trailEmitAcc = (owl.trailEmitAcc || 0) + dt;
    while (owl.trailEmitAcc >= emitInterval) {
      owl.trailEmitAcc -= emitInterval;
      for (let i = 0; i < motesPerEmit; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = 3 + Math.random() * 9;
        const life = TRAIL_LIFE * (0.82 + Math.random() * 0.22);
        owl.trail.push({
          x: owl.displayX + Math.cos(angle) * offset,
          y: owl.displayY + Math.sin(angle) * offset,
          vx: (Math.random() - 0.5) * 4.5,
          vy: -1 - Math.random() * 5.5,
          radius: 0.55 + Math.random() * 1.25,
          sparkle: Math.random() < 0.26,
          phase: Math.random() * Math.PI * 2,
          life,
          maxLife: life
        });
      }
    }
  }
  for (const mote of owl.trail) {
    mote.life -= dt;
    mote.x += (mote.vx || 0) * dt;
    mote.y += (mote.vy || 0) * dt;
  }
  const limit = owl.state === "waiting" ? WAIT_TRAIL_LIMIT : TRAIL_LIMIT;
  owl.trail = owl.trail.filter((mote) => mote.life > 0).slice(-limit);
}
