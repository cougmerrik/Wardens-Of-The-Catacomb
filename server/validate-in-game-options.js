import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(source, needle, message) {
  assert.ok(source.includes(needle), message);
}

function assertNotIncludes(source, needle, message) {
  assert.ok(!source.includes(needle), message);
}

function main() {
  const gameJs = read("game.js");
  const startup = read("src/bootstrap/gameStartupRuntime.js");
  const gameBase = read("src/game/GameRuntimeBase.js");
  const gameState = read("src/game/runtimeBaseStateInit.js");
  const world = read("src/game/world/uiEconomy.js");
  const networkUi = read("src/net/sessionInteraction.js");
  const networkServer = read("server/net/clientMessageHandler.js");
  const classPanel = read("src/rendering/hud/classStatusPanel.js");
  const pauseOverlay = read("src/rendering/hud/top.js");
  const input = read("src/InputController.js");
  const music = read("src/audio/MusicController.js");
  const css = read("style.css");
  const pkg = read("package.json");

  assertIncludes(gameJs, "function syncOptionsControls()", "options controls should be synchronized through one shared helper");
  assertIncludes(gameJs, "syncMenuVolumeControl();", "shared options sync should include master volume");
  assertIncludes(gameJs, "syncVoiceChatControls();", "shared options sync should include voice chat");
  assertIncludes(gameJs, "syncDisableAdsControl();", "shared options sync should include ads");
  assertIncludes(gameJs, "syncGameplayTipsControl();", "shared options sync should include gameplay tips");
  assertIncludes(gameJs, "function showOptionsScreen({ inGame = false } = {})", "options screen should support in-game mode");
  assertIncludes(gameJs, "showOptionsScreen({ inGame: true })", "games should open the reused options panel from gameplay");
  assertIncludes(gameJs, "function closeInGameOptions", "in-game options should close back to gameplay");
  assertIncludes(gameJs, "currentGame.optionsOpen = true;", "gameplay should know when options are open");
  assertIncludes(gameJs, "currentGame.togglePause(true)", "single-player in-game options should pause through runtime pause logic");
  assertIncludes(gameJs, "if (inGameOptionsOpen) closeInGameOptions();", "options Back button should resume gameplay when opened in-game");
  assertIncludes(css, ".layout.is-in-game-options .menu-shell", "in-game options panel should overlay the canvas");

  assertIncludes(startup, "onOpenOptions = null", "local startup should accept an in-game options callback");
  assertIncludes(startup, "onOpenOptions,", "local Game construction should pass the options callback");
  assertIncludes(gameBase, "this.onOpenOptions", "runtime should store the in-game options callback");
  assertIncludes(gameBase, "!this.optionsOpen", "runtime active state should block while options are open");
  assertIncludes(gameState, "game.optionsOpen = false;", "runtime state should initialize optionsOpen");

  assertIncludes(pauseOverlay, "game.uiRects.optionsButton = optionsRect;", "top HUD should publish an options button rect");
  assertIncludes(pauseOverlay, 'drawTopHudButton(ctx, optionsRect, "Options"', "top HUD should draw an Options button");
  assertIncludes(pauseOverlay, "game.uiRects.statsButton = statsRect;", "top HUD should publish a stats button rect");
  assertIncludes(classPanel, "game.uiRects.pauseButton = pauseRect;", "HUD should publish a pause button rect");
  assertIncludes(classPanel, "disabled: pauseDisabled", "HUD pause button should support a disabled multiplayer state");
  assertIncludes(classPanel, "localPlayerId !== pauseOwnerId", "HUD pause button should grey out for non-pause-owner clients");
  assertIncludes(classPanel, "const groupRows = remoteCount;", "HUD group list should render every teammate row");
  assertIncludes(classPanel, "const DESKTOP_BASE_PANEL_H = 230;", "HUD backing panel should reserve enough height before teammate rows");
  assertIncludes(classPanel, 'const prefix = isRoomOwner ? "★ " : "";', "group rows should mark the room owner inline");
  assertIncludes(classPanel, "const barY = y + 6;", "group rows should use compact one-line health bars");
  assertIncludes(classPanel, 'drawHudButton(ctx, pauseRect, game.paused ? "Resume" : "Pause"', "HUD should draw a Pause/Resume button");
  assertIncludes(pauseOverlay, "game.uiRects.pauseOverlayResume = rect;", "pause overlay should publish a resume button rect");
  assertIncludes(pauseOverlay, "const disabled = !!(game?.networkEnabled", "pause overlay resume should support disabled multiplayer state");
  assertIncludes(pauseOverlay, 'ctx.fillText("Resume"', "pause overlay should draw a Resume button");
  assertNotIncludes(pauseOverlay, "Press Esc to resume", "pause overlay should not reference Esc");
  assertNotIncludes(pauseOverlay, "Use Pause to resume", "pause overlay should use the Resume button instead of instructional text");
  assertIncludes(input, '"optionsButton"', "input controller should treat options button as interactive UI");
  assertIncludes(input, '"pauseButton"', "input controller should treat pause button as interactive UI");
  assertIncludes(input, '"pauseOverlayResume"', "input controller should treat pause overlay resume as interactive UI");

  assertIncludes(world, "export function togglePause", "local UI should expose shared pause toggle logic");
  assertIncludes(world, "game.onOpenOptions(game)", "local HUD options button should open in-game options");
  assertIncludes(world, "togglePause(game);", "local HUD pause button should toggle pause");
  assertIncludes(world, "game.uiRects.pauseOverlayResume", "local pause overlay resume should route through UI clicks");
  assertNotIncludes(world, 'consumeKeyQueued("escape")', "local gameplay should not use Esc as a pause keybind");

  assertIncludes(networkUi, "!!game?.optionsOpen", "network input collection should block gameplay while options are open");
  assertIncludes(networkUi, "game.onOpenOptions(game)", "network HUD options button should open in-game options");
  assertIncludes(networkUi, "const canToggleNetworkPause = !isActiveMultiplayer || isPauseOwner;", "network pause clicks should be gated by pause authority");
  assertIncludes(networkUi, 'netClient.sendAction({ kind: "togglePause" })', "network HUD pause button should use an explicit pause action");
  assertNotIncludes(networkUi, "toggleLocalPause", "non-owner network clients should not locally fake pause toggles");
  assertIncludes(networkUi, "game.uiRects.pauseOverlayResume", "network pause overlay resume should route through UI actions");
  assertNotIncludes(networkUi, 'consumeKeyQueued("escape")', "network gameplay should not use Esc as a pause keybind");
  assertIncludes(networkServer, 'kind === "togglePause"', "server should handle explicit pause actions");
  assertNotIncludes(networkServer, 'kind === "escape"', "server should not expose the old escape pause action");

  assertNotIncludes(music, "handleMuteToggle", "music controller should not register an M mute key handler");
  assertNotIncludes(music, 'event.key.toLowerCase() !== "m"', "music controller should not bind M to mute");
  assertIncludes(music, 'event.key.toLowerCase() === "escape"', "music unlock should ignore Esc");
  assertIncludes(pkg, '"validate:in-game-options"', "package scripts should expose the in-game options validator");

  console.log(JSON.stringify({ inGameOptions: "ok" }, null, 2));
}

main();
