import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(source, needle, message) {
  assert.ok(source.includes(needle), message);
}

function main() {
  const scene = read("src/rendering/RendererRuntimeScene.js");
  const pendingScene = read("src/rendering/runtimeSceneDrawMethods.js");
  const classPanel = read("src/rendering/hud/classStatusPanel.js");
  const minimap = read("src/rendering/rendererEffectsPlayerMethods.js");
  const stats = read("src/rendering/hud/stats.js");
  const gameRuntime = read("src/game/GameRuntimeBase.js");
  const renderer = read("src/rendering/RendererRuntime.js");

  assertIncludes(scene, "const sidebarW = 0;", "desktop play area should no longer reserve sidebar width");
  assertIncludes(gameRuntime, "return this.canvas.width;", "gameplay camera width should use the full canvas");
  assert.ok(
    scene.indexOf("const minimapBottom = this.drawMinimap(game, layout);") <
      scene.indexOf("this.drawClassStatusPanel(game, layout, minimapBottom + this.sidebarPadding)"),
    "runtime draw order should stack the combined HUD below the minimap"
  );
  assert.ok(
    scene.indexOf("this.drawClassStatusPanel(game, layout, minimapBottom + this.sidebarPadding)") <
      scene.indexOf("this.drawExperienceBar(game, layout);"),
    "XP panel should render over the combined HUD when the group list reaches the bottom edge"
  );
  assert.ok(
    pendingScene.indexOf("const minimapBottom = this.drawMinimap(game, layout);") <
      pendingScene.indexOf("this.drawClassStatusPanel(game, layout, minimapBottom + this.sidebarPadding)"),
    "network pending draw order should stack the combined HUD below the minimap"
  );
  assertIncludes(renderer, "drawClassStatusPanel(game, layout, panelY)", "renderer wrapper should accept the class HUD anchor");
  assertIncludes(renderer, "drawClassStatusPanel(this, game, layout, panelY)", "renderer wrapper should forward the class HUD anchor");

  assertIncludes(minimap, "ctx.globalAlpha = 0.8;", "minimap should render at 80% opacity");
  assertIncludes(minimap, "layout.playW - miniW", "minimap should anchor to the right edge of the play canvas");
  assertIncludes(minimap, "return miniY + miniH + 6;", "combined HUD anchor should use the full minimap frame bottom");

  assertIncludes(classPanel, "drawAbilityCooldownWidget", "combined HUD should include the class skill widget");
  assertIncludes(classPanel, "drawAndroidSwapWidget", "combined HUD should include the Android swap widget");
  assertIncludes(classPanel, "const HUD_PANEL_ALPHA = 0.8;", "combined HUD panel opacity should match the minimap");
  assertIncludes(classPanel, "const PANEL_BOTTOM_PADDING = 32;", "combined HUD should reserve bottom padding for the full group list");
  assertIncludes(classPanel, "getPanelContentHeight", "combined HUD height should be derived from rendered content blocks");
  assertIncludes(classPanel, "const abilitySize = layout.isAndroid ? 42 : 36;", "desktop class skill widget should stay compact");
  assertIncludes(classPanel, "let contentY = rect.y + PANEL_CONTENT_TOP;", "class status content should avoid excessive header gap");
  assertIncludes(classPanel, "game.uiRects.shopButton = shopRect;", "combined HUD should own the shop button rect");
  assertIncludes(classPanel, "function formatHudGold", "combined HUD should compact large gold amounts");
  assertIncludes(classPanel, "goldAmount: game.gold || 0", "shop button should include the current gold amount");
  assertIncludes(classPanel, "ctx.arc(coinX, coinY, coinR", "shop button should draw a gold coin indicator");
  assertIncludes(classPanel, "game.uiRects.skillTreeButton = skillRect;", "combined HUD should own the skill tree button rect");
  assertIncludes(classPanel, "game.uiRects.statsButton = statsRect;", "combined HUD should own the stats button rect");
  assertIncludes(classPanel, "availableSkillPoints > 0", "skill tree button should react to unspent skill points");
  assertIncludes(classPanel, "Math.sin((game.time || 0) * 3)", "skill tree button should blink slowly while points are available");
  assertIncludes(classPanel, "drawEmbeddedGroupList", "combined HUD should include the multiplayer group list");
  assertIncludes(classPanel, "getConsumableStatusRows(rect.w) * 28", "consumable status area should reserve fixed icon space");
  assertIncludes(classPanel, "drawAndroidSwapWidget(renderer, game, game.uiRects.hudAbilityWidget)", "Android swap button rect should be populated from the combined HUD");
  assert.ok(!classPanel.includes("drawModeSwapButton"), "combined HUD should not draw a swap button");

  assert.ok(!stats.includes('["Pace",'), "stats overlay should not show pace after HUD cleanup");
  assert.ok(!stats.includes("Enemies ${game.enemies.length}"), "compact enemy counter should be removed");

  console.log(JSON.stringify({ inCanvasHud: "ok" }, null, 2));
}

main();
