export const ACTIVE_CONSUMABLE_SLOT_CAP = 5;
export const PASSIVE_CONSUMABLE_SLOT_CAP = 3;
export const ACTIVE_CONSUMABLE_COOLDOWN = 2;

export const CONSUMABLE_DEFS = {
  timeHook: {
    key: "timeHook",
    name: "Time Hook",
    type: "Active",
    rarity: "Legendary",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 4,
    price: 450,
    maxStack: 2,
    maxInventory: 1,
    effect: "Slow all enemies for 8s; bosses are slowed less"
  },
  mirage: {
    key: "mirage",
    name: "Mirage",
    type: "Active",
    rarity: "Rare",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 3,
    price: 220,
    maxStack: 2,
    maxInventory: 2,
    effect: "Create a decoy with 20% of your max health that draws enemy aggro for 4s"
  },
  blinkDust: {
    key: "blinkDust",
    name: "Blink Dust",
    type: "Active",
    rarity: "Rare",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 2,
    price: 180,
    maxStack: 2,
    maxInventory: 2,
    effect: "Teleport to a random nearby room within 20 tiles"
  },
  warBanner: {
    key: "warBanner",
    name: "War Banner",
    type: "Active",
    rarity: "Legendary",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 4,
    price: 320,
    maxStack: 1,
    maxInventory: 1,
    effect: "Place a banner for 10s that heals allies and boosts attack speed"
  },
  bloodwine: {
    key: "bloodwine",
    name: "Bloodwine",
    type: "Active",
    rarity: "Rare",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 2,
    price: 190,
    maxStack: 2,
    maxInventory: 2,
    effect: "For 8s, heal for 20% of primary attack damage dealt"
  },
  potionOfSkill: {
    key: "potionOfSkill",
    name: "Potion of Skill",
    type: "Active",
    rarity: "Rare",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 3,
    price: 220,
    maxStack: 2,
    maxInventory: 1,
    effect: "Refresh your class special and reduce its cooldown by 50% for 10s"
  },
  blessedStones: {
    key: "blessedStones",
    name: "Blessed Stones",
    type: "Active",
    rarity: "Rare",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 2,
    price: 160,
    maxStack: 2,
    maxInventory: 1,
    effect: "Multiplayer only. Heal the lowest-health ally within 5 tiles for 25% max health"
  },
  stonebloodBeads: {
    key: "stonebloodBeads",
    name: "Stoneblood Beads",
    type: "Active",
    rarity: "Common",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 2,
    price: 140,
    maxStack: 2,
    maxInventory: 2,
    effect: "Gain 4 charges for 12s; each charge reduces the next hit by 6 damage"
  },
  regenerationPotion: {
    key: "regenerationPotion",
    name: "Regeneration Potion",
    type: "Active",
    rarity: "Common",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 1,
    price: 100,
    maxStack: 3,
    maxInventory: 2,
    effect: "The player regenerates 20% of health over 5s"
  },
  speedPotion: {
    key: "speedPotion",
    name: "Speed Potion",
    type: "Active",
    rarity: "Common",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 1,
    price: 100,
    maxStack: 3,
    maxInventory: 2,
    effect: "The player gains +20% movement speed for 10s"
  },
  frostOil: {
    key: "frostOil",
    name: "Frost Oil",
    type: "Active",
    rarity: "Common",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 1,
    price: 50,
    maxStack: 3,
    maxInventory: 2,
    effect: "For the next 10s, attacks deal +2 cold damage and enemies struck are slowed by 15% for 3s"
  },
  fireOil: {
    key: "fireOil",
    name: "Fire Oil",
    type: "Active",
    rarity: "Common",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 1,
    price: 50,
    maxStack: 3,
    maxInventory: 2,
    effect: "For the next 10s, attacks deal +2 fire damage and enemies struck burn for 2s"
  },
  spikeGrowth: {
    key: "spikeGrowth",
    name: "Spike Growth",
    type: "Active",
    rarity: "Common",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 1,
    price: 50,
    maxStack: 3,
    maxInventory: 2,
    effect: "For 10s after activation, enemies that attack the player take +3 retaliatory damage"
  },
  shield: {
    key: "shield",
    name: "Shield",
    type: "Active",
    rarity: "Common",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 1,
    price: 100,
    maxStack: 2,
    maxInventory: 2,
    effect: "Gain temporary HP equal to 10% of max health"
  },
  mirrorShard: {
    key: "mirrorShard",
    name: "Mirror Shard",
    type: "Passive",
    rarity: "Rare",
    triggerCondition: "When the player is hit by a projectile",
    cooldown: "8s",
    unlockFloor: 3,
    price: 260,
    maxStack: 2,
    maxInventory: 1,
    effect: "Reflect the projectile and reduce its damage by 50%"
  },
  soulBattery: {
    key: "soulBattery",
    name: "Soul Battery",
    type: "Passive",
    rarity: "Rare",
    triggerCondition: "On killing an enemy with a primary attack",
    cooldown: "3s",
    unlockFloor: 3,
    price: 240,
    maxStack: 1,
    maxInventory: 1,
    effect: "Restore 1% max health and gain 1% temporary HP on primary-kill trigger"
  },
  frostWard: {
    key: "frostWard",
    name: "Frost Ward",
    type: "Passive",
    rarity: "Rare",
    triggerCondition: "After standing still for 5s, on the next hit",
    cooldown: "Default",
    unlockFloor: 3,
    price: 220,
    maxStack: 1,
    maxInventory: 1,
    effect: "Arm a frost ward that prevents 80% of the next hit and chills nearby enemies"
  },
  thornMail: {
    key: "thornMail",
    name: "Thorn Mail",
    type: "Passive",
    rarity: "Common",
    triggerCondition: "When a nearby enemy hits the player",
    cooldown: "3s",
    unlockFloor: 2,
    price: 130,
    maxStack: 1,
    maxInventory: 1,
    effect: "Retaliate against the attacker and briefly slow it"
  },
  angelRing: {
    key: "angelRing",
    name: "Angel Ring",
    type: "Passive",
    rarity: "Rare",
    triggerCondition: "When the player would hit 0 HP",
    cooldown: "Default",
    unlockFloor: 1,
    price: 2000,
    maxStack: 1,
    maxInventory: 1,
    effect: "Heal the player for 20% HP immediately"
  },
  monkeyPaw: {
    key: "monkeyPaw",
    name: "Monkey Paw",
    type: "Passive",
    rarity: "Legendary",
    triggerCondition: "On moving to the next floor",
    cooldown: "Default",
    unlockFloor: 1,
    price: 1000,
    maxStack: 1,
    maxInventory: 1,
    effect: "Remove all consumables, fully heal the player, and immediately grant a level"
  },
  amnesiaTalisman: {
    key: "amnesiaTalisman",
    name: "Amnesia Talisman",
    type: "Passive",
    rarity: "Rare",
    triggerCondition: "On moving to the next floor",
    cooldown: "Default",
    unlockFloor: 2,
    price: 260,
    maxStack: 1,
    maxInventory: 1,
    effect: "Reset all spent skills and talents whenever you change floors"
  },
  elvenBoots: {
    key: "elvenBoots",
    name: "Elven Boots",
    type: "Passive",
    rarity: "Rare",
    triggerCondition: "Passive while owned",
    cooldown: "Default",
    unlockFloor: 2,
    price: 180,
    maxStack: 1,
    maxInventory: 1,
    effect: "Ignore movement slow from rough terrain like sewer water and skeletal bones"
  },
  povertyCharm: {
    key: "povertyCharm",
    name: "Poverty Charm",
    type: "Passive",
    rarity: "Rare",
    triggerCondition: "On gold pickup while owned",
    cooldown: "Default",
    unlockFloor: 2,
    price: 120,
    maxStack: 1,
    maxInventory: 1,
    effect: "Halve gold gain, boost healing potion pickups by 20%, and break above 500 gold"
  },
  mimicEgg: {
    key: "mimicEgg",
    name: "Mimic Egg",
    type: "Active",
    rarity: "Legendary",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 4,
    price: 380,
    maxStack: 1,
    maxInventory: 1,
    effect: "Hatch a friendly mimic that consumes loose gold and persists across floors"
  },
  guardianBell: {
    key: "guardianBell",
    name: "Guardian Bell",
    type: "Active",
    rarity: "Rare",
    triggerCondition: "N/A",
    cooldown: "Default",
    unlockFloor: 3,
    price: 220,
    maxStack: 2,
    maxInventory: 1,
    effect: "Multiplayer only. Redirect 35% of a nearby ally's damage to yourself for 6s"
  }
};

export function getConsumableDefinition(key) {
  return CONSUMABLE_DEFS[key] || null;
}

export function getConsumableCatalog() {
  return Object.values(CONSUMABLE_DEFS);
}

export function createConsumableEffectState() {
  return {
    bloodwine: { timer: 0 },
    potionOfSkill: { timer: 0 },
    stonebloodBeads: { timer: 0, charges: 0, maxCharges: 0 },
    guardianBell: { timer: 0 },
    frostWard: { stationaryTimer: 0, ready: 0 },
    regenerationPotion: { timer: 0, total: 0, healPool: 0 },
    speedPotion: { timer: 0 },
    frostOil: { timer: 0 },
    fireOil: { timer: 0 },
    spikeGrowth: { timer: 0 }
  };
}

export function createConsumableInventoryState() {
  return {
    activeSlots: [],
    passiveSlots: [],
    sharedCooldown: 0,
    message: "",
    messageTimer: 0,
    effects: createConsumableEffectState()
  };
}

export function cloneConsumableSlots(slots) {
  return (Array.isArray(slots) ? slots : []).map((slot) => ({
    key: slot?.key || "",
    count: Number.isFinite(slot?.count) ? Math.max(0, Math.floor(slot.count)) : 0,
    cooldownRemaining: Number.isFinite(slot?.cooldownRemaining) ? Math.max(0, slot.cooldownRemaining) : 0
  })).filter((slot) => slot.key && slot.count > 0);
}

export function cloneConsumableInventoryState(source) {
  const next = createConsumableInventoryState();
  next.activeSlots = cloneConsumableSlots(source?.activeSlots);
  next.passiveSlots = cloneConsumableSlots(source?.passiveSlots);
  next.sharedCooldown = Number.isFinite(source?.sharedCooldown) ? Math.max(0, source.sharedCooldown) : 0;
  next.message = typeof source?.message === "string" ? source.message : "";
  next.messageTimer = Number.isFinite(source?.messageTimer) ? Math.max(0, source.messageTimer) : 0;
  next.effects = createConsumableEffectState();
  const effectKeys = Object.keys(next.effects);
  for (const key of effectKeys) {
    const src = source?.effects?.[key];
    const dst = next.effects[key];
    for (const field of Object.keys(dst)) {
      dst[field] = Number.isFinite(src?.[field]) ? Math.max(0, src[field]) : 0;
    }
  }
  return next;
}

export function createConsumableShopEntry(key, stock) {
  return {
    key,
    stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0
  };
}

function getEligibleConsumables(floor, rarity, excludeKeys = new Set()) {
  return getConsumableCatalog().filter((item) =>
    item.rarity === rarity &&
    item.unlockFloor <= floor &&
    !excludeKeys.has(item.key)
  );
}

function rollRarity() {
  const rareUpgrade = Math.random() < 0.2;
  if (!rareUpgrade) return "Common";
  const legendaryUpgrade = Math.random() < 0.2;
  return legendaryUpgrade ? "Legendary" : "Rare";
}

function chooseUniqueConsumable(floor, desiredRarity, chosenKeys) {
  const fallbackOrder =
    desiredRarity === "Legendary"
      ? ["Legendary", "Rare", "Common"]
      : desiredRarity === "Rare"
      ? ["Rare", "Common"]
      : ["Common"];
  for (const rarity of fallbackOrder) {
    const pool = getEligibleConsumables(floor, rarity, chosenKeys);
    if (pool.length <= 0) continue;
    return pool[Math.floor(Math.random() * pool.length)] || null;
  }
  const anyRemaining = getConsumableCatalog().filter((item) => item.unlockFloor <= floor && !chosenKeys.has(item.key));
  if (anyRemaining.length <= 0) return null;
  return anyRemaining[Math.floor(Math.random() * anyRemaining.length)] || null;
}

export function rollConsumableShopStock(floor, entryCount = 5) {
  const chosenKeys = new Set();
  const stock = [];
  const attempts = Math.max(entryCount * 4, 12);
  for (let i = 0; i < attempts && stock.length < entryCount; i++) {
    const desired = rollRarity();
    const item = chooseUniqueConsumable(floor, desired, chosenKeys);
    if (!item) break;
    chosenKeys.add(item.key);
    stock.push(createConsumableShopEntry(item.key, item.maxInventory));
  }
  return stock;
}

export function getConsumablePriceForFloor(def, floor) {
  const base = Number.isFinite(def?.price) ? def.price : 0;
  const scale = 1 + Math.max(0, floor - 1) * 0.15;
  return Math.max(1, Math.floor(base * scale));
}
