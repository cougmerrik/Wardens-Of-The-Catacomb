const TRAIL_LIFE = 12;
const TRAIL_LIMIT = 260;
const TRAIL_EMIT_INTERVAL = 0.1;

export function updateOwlTrail(owl, dt) {
  if (!Array.isArray(owl.trail)) owl.trail = [];
  if (owl.state !== "slain" && owl.state !== "portal") {
    owl.trailEmitAcc = (owl.trailEmitAcc || 0) + dt;
    while (owl.trailEmitAcc >= TRAIL_EMIT_INTERVAL) {
      owl.trailEmitAcc -= TRAIL_EMIT_INTERVAL;
      for (let i = 0; i < 2; i++) {
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
  owl.trail = owl.trail.filter((mote) => mote.life > 0).slice(-TRAIL_LIMIT);
}
