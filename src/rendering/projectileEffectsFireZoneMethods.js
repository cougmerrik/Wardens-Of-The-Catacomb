import { drawAngelRingBurst, drawForzareBurst } from "./consumableProcVisuals.js";
export const projectileEffectsFireZoneMethods = {
  drawFireZone(zone, cameraX, cameraY, time = 0) {
    const ctx = this.ctx;
    const x = zone.x - cameraX, y = zone.y - cameraY;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (zone.zoneType === "forzareBurst") return drawForzareBurst(ctx, zone, x, y, time);
    if (zone.zoneType === "angelRingBurst") return drawAngelRingBurst(ctx, zone, x, y);
    if (zone.zoneType === "cloudDaggers") {
      const radius = Number.isFinite(zone.radius) ? Math.max(8, zone.radius) : 48;
      const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 4;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const pulse = 0.94 + Math.sin(time * 8 + zone.x * 0.01) * 0.05;
      const haze = ctx.createRadialGradient(x, y, 2, x, y, radius * pulse);
      haze.addColorStop(0, `rgba(228, 232, 242, ${0.16 + lifeFrac * 0.12})`);
      haze.addColorStop(0.52, `rgba(86, 92, 112, ${0.16 + lifeFrac * 0.12})`);
      haze.addColorStop(1, `rgba(16, 20, 30, ${0.04 + lifeFrac * 0.05})`);
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = `rgba(238, 242, 250, ${0.62 * lifeFrac + 0.18})`;
      ctx.fillStyle = `rgba(170, 180, 204, ${0.45 * lifeFrac + 0.18})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const a = time * (2.5 + (i % 3) * 0.35) + (i / 9) * Math.PI * 2;
        const r = radius * (0.18 + (i % 4) * 0.16);
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a * 1.07) * r * 0.72;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(3, 2);
        ctx.lineTo(0, 7);
        ctx.lineTo(-3, 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(0, 8);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    if (zone.zoneType === "confusion") {
      const radius = Number.isFinite(zone.radius) ? Math.max(8, zone.radius) : 48;
      const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 4;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const pulse = 0.95 + Math.sin(time * 5 + zone.y * 0.01) * 0.06;
      const haze = ctx.createRadialGradient(x, y, 2, x, y, radius * pulse);
      haze.addColorStop(0, `rgba(224, 156, 255, ${0.2 + lifeFrac * 0.14})`);
      haze.addColorStop(0.48, `rgba(138, 58, 190, ${0.18 + lifeFrac * 0.16})`);
      haze.addColorStop(1, `rgba(40, 10, 66, ${0.05 + lifeFrac * 0.08})`);
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(231, 184, 255, ${0.35 * lifeFrac + 0.14})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = time * (1.1 + i * 0.12) + i * 1.25;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * radius * 0.18, y + Math.sin(a) * radius * 0.12, radius * (0.22 + i * 0.05), a, a + Math.PI * 1.15);
        ctx.stroke();
      }
      return;
    }
    if (zone.zoneType === "spiritGuardians") {
      const radius = Number.isFinite(zone.radius) ? Math.max(8, zone.radius) : 64;
      const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 4;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const pulse = 0.96 + Math.sin(time * 6 + zone.x * 0.01) * 0.05;
      const aura = ctx.createRadialGradient(x, y, 2, x, y, radius * pulse);
      aura.addColorStop(0, `rgba(206, 255, 218, ${0.1 + lifeFrac * 0.08})`);
      aura.addColorStop(0.5, `rgba(104, 222, 150, ${0.12 + lifeFrac * 0.1})`);
      aura.addColorStop(1, `rgba(18, 74, 42, ${0.03 + lifeFrac * 0.05})`);
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const a = time * (1.8 + i * 0.14) + (i / 5) * Math.PI * 2;
        const r = radius * (0.32 + (i % 2) * 0.18);
        const sx = x + Math.cos(a) * r;
        const sy = y + Math.sin(a) * r * 0.82;
        const bob = Math.sin(time * 4 + i * 1.7) * 2;
        const guardianAlpha = 0.42 * lifeFrac + 0.18;
        const wingAlpha = 0.3 * lifeFrac + 0.14;
        ctx.save();
        ctx.translate(sx, sy + bob);
        ctx.rotate(Math.sin(a + time * 0.8) * 0.18);
        ctx.scale(0.25, 0.25);
        ctx.fillStyle = `rgba(222, 255, 238, ${guardianAlpha})`;
        ctx.beginPath();
        ctx.moveTo(-2, -10);
        ctx.quadraticCurveTo(-9, -2, -6, 8);
        ctx.quadraticCurveTo(-3, 14, 0, 18);
        ctx.quadraticCurveTo(3, 14, 6, 8);
        ctx.quadraticCurveTo(9, -2, 2, -10);
        ctx.quadraticCurveTo(0, -12, -2, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(225, 255, 238, ${wingAlpha})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-4, -4); ctx.quadraticCurveTo(-17, -11, -20, 4);
        ctx.quadraticCurveTo(-11, 1, -5, 9);
        ctx.moveTo(4, -4); ctx.quadraticCurveTo(17, -11, 20, 4);
        ctx.quadraticCurveTo(11, 1, 5, 9);
        ctx.stroke();
        ctx.strokeStyle = `rgba(246, 255, 248, ${0.46 * lifeFrac + 0.18})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, -15, 5.5, 1.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(160, 244, 194, ${0.18 * lifeFrac + 0.08})`;
        ctx.beginPath();
        ctx.moveTo(-2, 8); ctx.quadraticCurveTo(-8, 17, -3, 23);
        ctx.moveTo(2, 8); ctx.quadraticCurveTo(8, 17, 3, 23);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    if (zone.zoneType === "ghostSiphon") {
      const tx = (Number.isFinite(zone.targetX) ? zone.targetX : zone.x) - cameraX;
      const ty = (Number.isFinite(zone.targetY) ? zone.targetY : zone.y) - cameraY;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / 0.35));
      const grad = ctx.createLinearGradient(x, y, tx, ty);
      grad.addColorStop(0, `rgba(180, 122, 255, ${0.18 * lifeFrac})`);
      grad.addColorStop(0.5, `rgba(156, 88, 255, ${0.72 * lifeFrac})`);
      grad.addColorStop(1, `rgba(231, 196, 255, ${0.2 * lifeFrac})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(tx, ty - 4);
      ctx.stroke();
      ctx.fillStyle = `rgba(190, 126, 255, ${0.22 * lifeFrac})`;
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const px = x + (tx - x) * t;
        const py = y + (ty - y) * t + Math.sin(time * 10 + i) * 3;
        ctx.beginPath();
        ctx.arc(px, py, 3.5 - t, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (zone.zoneType === "rangerSurge") {
      const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 0.18;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const radius = Number.isFinite(zone.radius) ? Math.max(0, zone.radius) : 0;
      ctx.save();
      ctx.globalAlpha = lifeFrac;
      ctx.strokeStyle = "rgba(154, 235, 214, 0.82)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius * (1.08 - lifeFrac * 0.2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(240, 255, 238, 0.55)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time * 1.2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * radius * 0.25, y + Math.sin(a) * radius * 0.25);
        ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (zone.zoneType === "smokeBomb") {
      const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 2.75;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const radius = Number.isFinite(zone.radius) ? Math.max(0, zone.radius) : 0;
      const pulse = 0.95 + Math.sin(time * 5 + zone.x * 0.01) * 0.04;
      const outer = ctx.createRadialGradient(x, y, 2, x, y, radius * pulse);
      outer.addColorStop(0, `rgba(186, 192, 190, ${0.24 * lifeFrac + 0.12})`);
      outer.addColorStop(0.52, `rgba(84, 92, 96, ${0.28 * lifeFrac + 0.12})`);
      outer.addColorStop(1, `rgba(28, 31, 34, ${0.08 * lifeFrac})`);
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(220, 226, 222, ${0.16 * lifeFrac + 0.08})`;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + time * (0.9 + i * 0.05);
        const r = radius * (0.18 + (i % 3) * 0.16);
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.72, 6.5, 3.2, a, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (zone.zoneType === "stormcallerFlash") {
      const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 0.18;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const radius = Number.isFinite(zone.radius) ? Math.max(8, zone.radius) : 18;
      ctx.save();
      ctx.globalAlpha = lifeFrac;
      ctx.strokeStyle = "rgba(218, 236, 255, 0.94)";
      ctx.lineWidth = 2.8;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + time * 2.5;
        const length = radius * (0.55 + (i % 2) * 0.28);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * length, y + Math.sin(a) * length);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(245, 252, 255, 0.75)";
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (zone.zoneType === "acid") {
      const lifeFrac = Math.max(0, Math.min(1, zone.life / 5));
      const pulse = 0.9 + Math.sin(time * 8 + zone.x * 0.02 + zone.y * 0.013) * 0.08;
      const outer = ctx.createRadialGradient(x, y, 2, x, y, zone.radius * pulse);
      outer.addColorStop(0, `rgba(172, 255, 106, ${0.28 * lifeFrac + 0.12})`);
      outer.addColorStop(0.55, `rgba(96, 214, 64, ${0.22 * lifeFrac + 0.08})`);
      outer.addColorStop(1, `rgba(43, 92, 25, ${0.08 * lifeFrac})`);
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, zone.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(205, 255, 155, ${0.16 * lifeFrac + 0.08})`;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + time * 1.5;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * zone.radius * 0.28, y + Math.sin(a) * zone.radius * 0.18, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (zone.zoneType === "bloodPool") {
      const lifeFrac = Math.max(0, Math.min(1, zone.life / (this.config.enemy?.golemFleshBallPoolDuration || 4.2)));
      const pulse = 0.92 + Math.sin(time * 6 + zone.x * 0.02 + zone.y * 0.013) * 0.05;
      const outer = ctx.createRadialGradient(x, y, 2, x, y, zone.radius * pulse);
      outer.addColorStop(0, `rgba(148, 24, 30, ${0.34 * lifeFrac + 0.16})`);
      outer.addColorStop(0.55, `rgba(116, 14, 18, ${0.24 * lifeFrac + 0.1})`);
      outer.addColorStop(1, `rgba(42, 6, 8, ${0.08 * lifeFrac})`);
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, zone.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(196, 76, 76, ${0.14 * lifeFrac + 0.08})`;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + time * 1.2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * zone.radius * 0.25, y + Math.sin(a) * zone.radius * 0.18, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (zone.zoneType === "sonyaFire") {
      const lifeFrac = Math.max(0, Math.min(1, zone.life / (this.config.enemy?.sonyaFirePatchDuration || 3.6)));
      const radius = Number.isFinite(zone.radius) ? Math.max(0, zone.radius) : 0;
      const pulse = 0.92 + Math.sin(time * 9 + zone.x * 0.03 + zone.y * 0.02) * 0.08;
      const outer = ctx.createRadialGradient(x, y, 2, x, y, radius * pulse);
      outer.addColorStop(0, `rgba(255, 235, 162, ${0.22 * lifeFrac + 0.12})`);
      outer.addColorStop(0.45, `rgba(255, 127, 59, ${0.24 * lifeFrac + 0.12})`);
      outer.addColorStop(1, `rgba(135, 28, 14, ${0.08 * lifeFrac})`);
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 207, 121, ${0.18 * lifeFrac + 0.08})`;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + time * 1.8;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * radius * 0.28, y + Math.sin(a) * radius * 0.18, 3.4, 1.5, a, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (zone.zoneType === "deathBolt") {
      const lifeFrac = Math.max(0, Math.min(1, zone.life / (this.config.deathBolt?.visualLife || 0.35)));
      const outer = ctx.createRadialGradient(x, y, 2, x, y, zone.radius);
      outer.addColorStop(0, `rgba(190, 255, 210, ${0.38 * lifeFrac})`);
      outer.addColorStop(0.5, `rgba(93, 220, 154, ${0.26 * lifeFrac})`);
      outer.addColorStop(1, `rgba(32, 76, 54, ${0.06 * lifeFrac})`);
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, zone.radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (zone.zoneType === "deathBurst") {
      const totalLife = this.config.deathBolt?.visualLife || 0.35;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const pulse = 0.9 + Math.sin(time * 14 + zone.x * 0.03 + zone.y * 0.02) * 0.09;
      const outer = ctx.createRadialGradient(x, y, 2, x, y, zone.radius * pulse);
      outer.addColorStop(0, `rgba(230, 176, 255, ${0.32 * lifeFrac + 0.18})`);
      outer.addColorStop(0.42, `rgba(112, 48, 158, ${0.28 * lifeFrac + 0.14})`);
      outer.addColorStop(1, `rgba(18, 6, 32, ${0.12 * lifeFrac})`);
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, zone.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(148, 78, 198, ${0.44 * lifeFrac - i * 0.08})`;
        ctx.lineWidth = 3 - i * 0.6;
        ctx.beginPath();
        ctx.arc(x, y, zone.radius * (0.46 + i * 0.18), time * (1.4 + i * 0.22), time * (1.4 + i * 0.22) + Math.PI * 1.35);
        ctx.stroke();
      }
      return;
    }
    if (zone.zoneType === "crusaderAura" || zone.zoneType === "warCircle") {
      const radius = Number.isFinite(zone.radius) ? Math.max(0, zone.radius) : 0;
      if (radius <= 0) return;
      const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 8;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const pulse = 0.95 + Math.sin(time * 5 + zone.x * 0.01 + zone.y * 0.008) * 0.04;
      const outer = ctx.createRadialGradient(x, y, 2, x, y, radius * pulse);
      const damageType = typeof zone.damageType === "string" ? zone.damageType : "holy";
      const palette = damageType === "arcane"
        ? ["rgba(206, 196, 255,", "rgba(132, 118, 255,", "rgba(38, 22, 76,"]
        : zone.doctrine === "berserker"
        ? ["rgba(255, 202, 196,", "rgba(216, 88, 74,", "rgba(94, 28, 22,"]
        : zone.doctrine === "gladiator"
        ? ["rgba(250, 225, 188,", "rgba(213, 171, 115,", "rgba(94, 66, 26,"]
        : ["rgba(255, 245, 188,", "rgba(245, 207, 111,", "rgba(125, 92, 26,"];
      outer.addColorStop(0, `${palette[0]} ${0.34 * lifeFrac + 0.14})`);
      outer.addColorStop(0.5, `${palette[1]} ${0.28 * lifeFrac + 0.14})`);
      outer.addColorStop(1, `${palette[2]} ${0.08 * lifeFrac})`);
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = damageType === "arcane"
        ? `rgba(218, 210, 255, ${0.55 * lifeFrac + 0.18})`
        : zone.doctrine === "berserker"
        ? `rgba(255, 190, 170, ${0.55 * lifeFrac + 0.18})`
        : zone.doctrine === "gladiator"
        ? `rgba(245, 221, 182, ${0.55 * lifeFrac + 0.18})`
        : `rgba(255, 239, 166, ${0.55 * lifeFrac + 0.18})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.96, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = damageType === "arcane"
        ? `rgba(235, 232, 255, ${0.7 * lifeFrac + 0.18})`
        : zone.doctrine === "berserker"
        ? `rgba(255, 220, 212, ${0.7 * lifeFrac + 0.18})`
        : zone.doctrine === "gladiator"
        ? `rgba(255, 241, 218, ${0.7 * lifeFrac + 0.18})`
        : `rgba(255, 248, 214, ${0.7 * lifeFrac + 0.18})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.22, y);
      ctx.lineTo(x + radius * 0.22, y);
      ctx.moveTo(x, y - radius * 0.22);
      ctx.lineTo(x, y + radius * 0.22);
      ctx.stroke();
      return;
    }
    if (zone.zoneType === "tempestAura") {
      const radius = Number.isFinite(zone.radius) ? Math.max(0, zone.radius) : 0;
      if (radius <= 0) return;
      const totalLife = Number.isFinite(zone.totalLife) && zone.totalLife > 0 ? zone.totalLife : 3;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / totalLife));
      const pulse = 0.94 + Math.sin(time * 8 + zone.x * 0.015 + zone.y * 0.01) * 0.08;
      const damageType = typeof zone.damageType === "string" ? zone.damageType : "physical";
      const outer = ctx.createRadialGradient(x, y, 2, x, y, radius * pulse);
      if (damageType === "arcane") {
        outer.addColorStop(0, `rgba(220, 214, 255, ${0.18 + lifeFrac * 0.18})`);
        outer.addColorStop(0.5, `rgba(121, 102, 255, ${0.18 + lifeFrac * 0.22})`);
        outer.addColorStop(1, `rgba(34, 18, 68, ${0.06 + lifeFrac * 0.08})`);
      } else if (damageType === "holy") {
        outer.addColorStop(0, `rgba(255, 244, 198, ${0.18 + lifeFrac * 0.18})`);
        outer.addColorStop(0.5, `rgba(245, 207, 111, ${0.18 + lifeFrac * 0.22})`);
        outer.addColorStop(1, `rgba(125, 92, 26, ${0.06 + lifeFrac * 0.08})`);
      } else if (zone.doctrine === "berserker") {
        outer.addColorStop(0, `rgba(255, 212, 198, ${0.18 + lifeFrac * 0.18})`);
        outer.addColorStop(0.5, `rgba(224, 96, 72, ${0.18 + lifeFrac * 0.22})`);
        outer.addColorStop(1, `rgba(92, 24, 18, ${0.06 + lifeFrac * 0.08})`);
      } else {
        outer.addColorStop(0, `rgba(247, 233, 204, ${0.18 + lifeFrac * 0.18})`);
        outer.addColorStop(0.5, `rgba(213, 171, 115, ${0.18 + lifeFrac * 0.22})`);
        outer.addColorStop(1, `rgba(87, 60, 24, ${0.06 + lifeFrac * 0.08})`);
      }
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = damageType === "arcane"
          ? `rgba(202, 194, 255, ${0.42 * lifeFrac - i * 0.08})`
          : damageType === "holy"
          ? `rgba(255, 240, 190, ${0.42 * lifeFrac - i * 0.08})`
          : zone.doctrine === "berserker"
          ? `rgba(255, 196, 176, ${0.42 * lifeFrac - i * 0.08})`
          : `rgba(246, 226, 188, ${0.42 * lifeFrac - i * 0.08})`;
        ctx.lineWidth = 3 - i * 0.6;
        ctx.beginPath();
        ctx.arc(x, y, radius * (0.45 + i * 0.17), time * (1.8 + i * 0.4), time * (1.8 + i * 0.4) + Math.PI * 1.1);
        ctx.stroke();
      }
      return;
    }
    if (zone.zoneType === "arcaneChain") {
      const tx = (Number.isFinite(zone.targetX) ? zone.targetX : zone.x) - cameraX;
      const ty = (Number.isFinite(zone.targetY) ? zone.targetY : zone.y) - cameraY;
      const lifeFrac = Math.max(0, Math.min(1, zone.life / (zone.totalLife || 0.18)));
      const grad = ctx.createLinearGradient(x, y, tx, ty);
      const lightning = zone.damageType === "lightning";
      grad.addColorStop(0, lightning ? `rgba(255, 231, 86, ${0.2 + lifeFrac * 0.25})` : `rgba(110, 92, 255, ${0.18 + lifeFrac * 0.22})`);
      grad.addColorStop(0.55, lightning ? `rgba(255, 250, 173, ${0.65 * lifeFrac})` : `rgba(171, 159, 255, ${0.6 * lifeFrac})`);
      grad.addColorStop(1, lightning ? `rgba(255, 255, 225, ${0.2 + lifeFrac * 0.14})` : `rgba(228, 223, 255, ${0.18 + lifeFrac * 0.12})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.lineTo(x + (tx - x) * 0.3, y + Math.sin(time * 24 + x * 0.06) * 5);
      ctx.lineTo(x + (tx - x) * 0.68, y + (ty - y) * 0.68 + Math.cos(time * 24 + y * 0.04) * 4);
      ctx.lineTo(tx, ty - 2);
      ctx.stroke();
      return;
    }
    if (zone.zoneType === "golemCollapseWarning") {
      const size = Number.isFinite(zone.size) ? zone.size : (zone.radius || 16) * 2;
      const lifeFrac = Number.isFinite(zone.strikeAt) && zone.strikeAt > 0 ? Math.max(0, Math.min(1, zone.life / zone.strikeAt)) : 1;
      ctx.fillStyle = `rgba(255, 145, 59, ${0.16 + (1 - lifeFrac) * 0.22})`;
      ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
      ctx.strokeStyle = `rgba(255, 197, 108, ${0.55 + (1 - lifeFrac) * 0.25})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - size * 0.5 + 1, y - size * 0.5 + 1, size - 2, size - 2);
      return;
    }
    if (zone.zoneType === "golemCollapseImpact") {
      const size = Number.isFinite(zone.size) ? zone.size : (zone.radius || 16) * 2;
      const outer = ctx.createRadialGradient(x, y, 2, x, y, size * 0.7);
      outer.addColorStop(0, "rgba(255, 222, 154, 0.45)");
      outer.addColorStop(0.5, "rgba(255, 138, 72, 0.28)");
      outer.addColorStop(1, "rgba(95, 68, 52, 0.06)");
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const lifeFrac = Math.max(0, Math.min(1, zone.life / this.config.fireArrow.lingerDuration));
    const radius = Number.isFinite(zone.radius) ? Math.max(0, zone.radius) : 0;
    if (radius <= 0) return;
    const pulse = 0.88 + Math.sin((time * 10 + zone.x * 0.02 + zone.y * 0.015)) * 0.09;
    const coreR = radius * 0.42 * pulse;
    const midR = radius * 0.72 * (0.96 + Math.sin(time * 7.8 + zone.y * 0.018) * 0.06);
    const edgeR = radius * (0.96 + Math.sin(time * 6.1 + zone.x * 0.013) * 0.05);

    const outer = ctx.createRadialGradient(x, y, coreR * 0.15, x, y, edgeR);
    outer.addColorStop(0, `rgba(255, 224, 140, ${0.26 * lifeFrac + 0.12})`);
    outer.addColorStop(0.45, `rgba(255, 138, 62, ${0.24 * lifeFrac + 0.1})`);
    outer.addColorStop(1, `rgba(138, 34, 18, ${0.12 * lifeFrac})`);
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(x, y, edgeR, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(x, y, 2, x, y, midR);
    core.addColorStop(0, `rgba(255, 243, 175, ${0.35 * lifeFrac + 0.16})`);
    core.addColorStop(0.55, `rgba(255, 167, 70, ${0.26 * lifeFrac + 0.12})`);
    core.addColorStop(1, `rgba(255, 96, 45, ${0.1 * lifeFrac})`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, midR, 0, Math.PI * 2);
    ctx.fill();

    const tongues = 9;
    ctx.fillStyle = `rgba(255, 188, 93, ${0.16 * lifeFrac + 0.06})`;
    for (let i = 0; i < tongues; i++) {
      const a = (i / tongues) * Math.PI * 2 + time * 1.7;
      const wobble = Math.sin(time * 8 + i * 1.9 + zone.x * 0.01) * 0.1;
      const r1 = radius * (0.58 + wobble);
      const r2 = radius * (0.88 + wobble * 0.5);
      const px = x + Math.cos(a) * r1;
      const py = y + Math.sin(a) * r1;
      const tx = x + Math.cos(a) * r2;
      const ty = y + Math.sin(a) * r2;
      ctx.beginPath();
      ctx.ellipse((px + tx) * 0.5, (py + ty) * 0.5, 3.8, 1.6, a, 0, Math.PI * 2);
      ctx.fill();
    }
  },

};
