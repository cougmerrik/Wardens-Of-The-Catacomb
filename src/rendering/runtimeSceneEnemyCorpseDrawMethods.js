const CORPSE_PALETTES = {
  goblin: ["#24381f", "#6f8f45", "#3f2918"],
  armor: ["#3d4244", "#8b8f86", "#596066"],
  mimic: ["#5b3b24", "#9a6a3e", "#2b1f17"],
  mummy: ["#6b6044", "#b8aa7d", "#d9cfab"],
  prisoner: ["#3d3430", "#8a6a55", "#544136"],
  rat_archer: ["#4a3120", "#8a643f", "#2d2018"],
  skeleton: ["#d8d0b8", "#8f8773", "#4a453c"],
  skeleton_warrior: ["#d8d0b8", "#8f8773", "#5c646a"],
  shardling: ["#6f3f3b", "#c08477", "#342938"],
  wolf: ["#3a342e", "#7d7367", "#24201c"],
  flaming_sphere: ["#743025", "#d9823b", "#3f1813"],
  minotaur: ["#55382a", "#9a6a4a", "#2f241f"],
  golem: ["#5f6972", "#a3adb5", "#3d454c"],
  necromancer: ["#322944", "#8f72b6", "#1f1b2a"],
  sonya: ["#332d4a", "#907ed4", "#242139"],
  leprechaun: ["#2b4a2f", "#d0a646", "#1f2d1f"]
};

export const runtimeSceneEnemyCorpseDrawMethods = {
  drawEnemyCorpse(enemy, screenX, screenY, time = 0) {
    const ctx = this.ctx;
    const size = Math.max(16, enemy?.size || 24);
    const half = size * 0.5;
    const bossScale = enemy?.isBoss || enemy?.isFloorBoss ? 1.22 : 1;
    const duration = enemy?.isBoss || enemy?.isFloorBoss ? 18 : 12;
    const fade = Math.max(0.34, Math.min(1, (Number.isFinite(enemy?.corpseTimer) ? enemy.corpseTimer : duration) / duration));
    if (enemy?.type === "ghost") {
      this.drawGhost(enemy, screenX, screenY, size, time);
      return;
    }

    const [dark, mid, detail] = CORPSE_PALETTES[enemy?.type] || ["#3e3b34", "#837b68", "#27251f"];
    const twitch = Math.sin(time * 2 + (enemy?.x || 0) * 0.05) * 0.5;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(screenX, screenY);
    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.beginPath();
    ctx.ellipse(0, half * 0.58, half * 1.08 * bossScale, half * 0.34 * bossScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(0, half * 0.42, half * 0.82 * bossScale, half * 0.28 * bossScale, -0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mid;
    ctx.fillRect(-half * 0.54 * bossScale, half * 0.2, half * 1.08 * bossScale, Math.max(3, half * 0.24 * bossScale));
    ctx.fillStyle = detail;
    ctx.fillRect(-half * 0.72 * bossScale, half * 0.43, half * 0.54 * bossScale, Math.max(2, half * 0.14 * bossScale));
    ctx.fillRect(half * 0.18 * bossScale, half * 0.39, half * 0.58 * bossScale, Math.max(2, half * 0.14 * bossScale));

    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.ellipse(-half * 0.34 * bossScale, half * 0.08 + twitch, half * 0.28 * bossScale, half * 0.2 * bossScale, -0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = detail;
    ctx.fillRect(-half * 0.06 * bossScale, half * 0.18, Math.max(2, half * 0.12 * bossScale), Math.max(2, half * 0.36 * bossScale));
    ctx.restore();
  }
};
