import { GameRuntimeSystems } from "../game/GameRuntimeSystems.js";
import { stepGame } from "../game/gameStep.js";

function createHeadlessCanvas(width, height) {
  return {
    width,
    height,
    getContext() {
      return null;
    }
  };
}

export class GameSim extends GameRuntimeSystems {
  constructor(options = {}) {
    const viewportWidth = Number.isFinite(options.viewportWidth) ? options.viewportWidth : 1280;
    const viewportHeight = Number.isFinite(options.viewportHeight) ? options.viewportHeight : 720;
    const canvas = createHeadlessCanvas(viewportWidth, viewportHeight);
    super(canvas, { ...options, headless: true });
  }

  tick(dt, controls = {}) {
    stepGame(this, dt, { processUi: false, ...controls });
  }
}
