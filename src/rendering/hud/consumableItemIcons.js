const CONSUMABLE_ICON_SOURCES = {
  regenerationPotion: "./assets/images/items/regenerationPotion.png",
  speedPotion: "./assets/images/items/speedPotion.png",
  frostOil: "./assets/images/items/frostOil.png",
  fireOil: "./assets/images/items/fireOil.png",
  spikeGrowth: "./assets/images/items/spikeGrowth.png",
  shield: "./assets/images/items/shield.png",
  angelRing: "./assets/images/items/angelRing.png",
  monkeyPaw: "./assets/images/items/monkeyPaw.png"
};

const ICON_CACHE = new Map();

function isIconKey(key) {
  return Boolean(CONSUMABLE_ICON_SOURCES[key]);
}

function getIconRecord(key) {
  if (!isIconKey(key)) return null;
  if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  if (typeof Image !== "function") return null;

  const record = { image: new Image(), loaded: false, failed: false };
  record.image.addEventListener("load", () => {
    record.loaded = true;
  }, { once: true });
  record.image.addEventListener("error", () => {
    record.failed = true;
  }, { once: true });
  record.image.src = CONSUMABLE_ICON_SOURCES[key];
  ICON_CACHE.set(key, record);
  return record;
}

export function preloadConsumableItemIcons() {
  for (const key of Object.keys(CONSUMABLE_ICON_SOURCES)) getIconRecord(key);
}

export function getConsumableItemIconStatus(key) {
  if (!isIconKey(key)) return "missing";
  const record = getIconRecord(key);
  if (!record) return "missing";
  if (record.loaded) return "loaded";
  if (record.failed) return "failed";
  return "loading";
}

export function drawConsumableItemIcon(ctx, key, x, y, size, padding = 2) {
  const record = getIconRecord(key);
  if (!record || !record.loaded || record.failed) return false;

  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(record.image, x + padding, y + padding, size - padding * 2, size - padding * 2);
  ctx.imageSmoothingEnabled = previousSmoothing;
  return true;
}
