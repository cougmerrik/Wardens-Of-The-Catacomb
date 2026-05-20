import assert from "node:assert/strict";
import { rendererEffectsPlayerMethods } from "../src/rendering/rendererEffectsPlayerMethods.js";

function createContextRecorder() {
  const calls = [];
  return {
    calls,
    set fillStyle(value) {
      calls.push({ op: "fillStyle", value });
    },
    set strokeStyle(value) {
      calls.push({ op: "strokeStyle", value });
    },
    set lineWidth(value) {
      calls.push({ op: "lineWidth", value });
    },
    fillRect(x, y, w, h) {
      calls.push({ op: "fillRect", x, y, w, h });
    },
    strokeRect(x, y, w, h) {
      calls.push({ op: "strokeRect", x, y, w, h });
    },
    beginPath() {
      calls.push({ op: "beginPath" });
    },
    moveTo(x, y) {
      calls.push({ op: "moveTo", x, y });
    },
    lineTo(x, y) {
      calls.push({ op: "lineTo", x, y });
    },
    stroke() {
      calls.push({ op: "stroke" });
    }
  };
}

function drawHealthBar(player) {
  const ctx = createContextRecorder();
  const renderer = {
    ctx,
    getPlayerTempHp: rendererEffectsPlayerMethods.getPlayerTempHp,
    drawPlayerHealthBar: rendererEffectsPlayerMethods.drawPlayerHealthBar
  };
  renderer.drawPlayerHealthBar({
    player,
    shouldShowPlayerHealthBar: () => true
  }, 0, 0);
  return ctx.calls;
}

function validateNoTempHpUsesCompactFullBar() {
  const calls = drawHealthBar({ x: 100, y: 100, health: 100, maxHealth: 100 });
  const fillRects = calls.filter((call) => call.op === "fillRect");
  const strokeRects = calls.filter((call) => call.op === "strokeRect");
  assert.equal(strokeRects[0].w, 28, "normal health bar stroke width should be 29px outer minus one pixel");
  assert.equal(strokeRects[0].h, 3, "normal health bar stroke height should be 4px outer minus one pixel");
  assert.ok(fillRects.some((call) => call.w === 29 && call.h === 4), "normal health background should use reduced 29x4 dimensions");
  assert.ok(fillRects.some((call) => call.w === 29 && call.h === 4), "full normal health should fill the entire compact bar");
  assert.ok(!fillRects.some((call) => call.x >= 100 && call.w > 0 && call.w < 10 && call.h === 4), "no-temp state should not draw a reserved temp-HP extension");
  assert.ok(!calls.some((call) => call.op === "lineTo"), "no-temp state should not draw a temp-HP divider");
  return { fillRects: fillRects.length, strokeRects: strokeRects.length };
}

function validateTempHpExtendsBarOnlyWhenPresent() {
  const calls = drawHealthBar({
    x: 100,
    y: 100,
    health: 100,
    maxHealth: 100,
    warriorRuntime: { tempHp: 20 }
  });
  const fillRects = calls.filter((call) => call.op === "fillRect");
  const strokeRects = calls.filter((call) => call.op === "strokeRect");
  assert.equal(strokeRects[0].w, 34, "temp-HP state should extend the compact bar by the temp segment");
  assert.ok(fillRects.some((call) => call.w === 6 && call.h === 4), "temp-HP state should draw a reserved temp extension");
  assert.ok(fillRects.some((call) => call.w > 5 && call.w < 6 && call.h === 4), "temp-HP state should fill the temp segment");
  assert.ok(calls.some((call) => call.op === "lineTo"), "temp-HP state should draw a divider");
  return { fillRects: fillRects.length, strokeRects: strokeRects.length };
}

const results = {
  noTempHp: validateNoTempHpUsesCompactFullBar(),
  withTempHp: validateTempHpExtendsBarOnlyWhenPresent()
};

console.log(JSON.stringify(results, null, 2));
