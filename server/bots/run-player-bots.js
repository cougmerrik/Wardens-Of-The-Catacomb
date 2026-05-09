import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { BotClient } from "./BotClient.js";

const CLASSES = ["archer", "fighter", "necromancer"];

function createSeededRandom(seedText) {
  let seed = 0;
  const text = String(seedText || "wardens-bots");
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function parseArgs(argv) {
  const options = {
    url: process.env.BOT_SERVER_URL || "ws://127.0.0.1:8090",
    room: process.env.BOT_ROOM_ID || "bot-room",
    bots: Number.parseInt(process.env.BOT_COUNT || "2", 10),
    duration: Number.parseInt(process.env.BOT_DURATION || "60", 10),
    classType: process.env.BOT_CLASS || "random",
    namePrefix: process.env.BOT_NAME_PREFIX || "Bot",
    staggerMs: Number.parseInt(process.env.BOT_STAGGER_MS || "350", 10),
    seed: process.env.BOT_SEED || `${Date.now()}`,
    logLevel: process.env.BOT_LOG_LEVEL || "info"
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--url" && next) options.url = next, i++;
    else if (arg === "--room" && next) options.room = next, i++;
    else if (arg === "--bots" && next) options.bots = Number.parseInt(next, 10), i++;
    else if (arg === "--duration" && next) options.duration = Number.parseInt(next, 10), i++;
    else if (arg === "--class" && next) options.classType = next, i++;
    else if (arg === "--name-prefix" && next) options.namePrefix = next, i++;
    else if (arg === "--stagger-ms" && next) options.staggerMs = Number.parseInt(next, 10), i++;
    else if (arg === "--seed" && next) options.seed = next, i++;
    else if (arg === "--log-level" && next) options.logLevel = next, i++;
    else if (arg === "--help" || arg === "-h") options.help = true;
  }
  options.bots = Number.isFinite(options.bots) ? Math.max(1, Math.min(6, Math.floor(options.bots))) : 2;
  options.duration = Number.isFinite(options.duration) ? Math.max(1, Math.floor(options.duration)) : 60;
  options.staggerMs = Number.isFinite(options.staggerMs) ? Math.max(0, Math.floor(options.staggerMs)) : 350;
  if (!CLASSES.includes(options.classType)) options.classType = "random";
  return options;
}

function printHelp() {
  console.log(`Usage:
  node server/bots/run-player-bots.js --url ws://127.0.0.1:8090 --room test --bots 4 --duration 120

Options:
  --url <ws-or-wss-url>       Target network server.
  --room <room-id>            Room id to join.
  --bots <count>              Bot count, capped at the server room limit of 6.
  --duration <seconds>        Run duration before closing bots.
  --class <class|random>      archer, fighter, necromancer, or random.
  --name-prefix <prefix>      Bot handle prefix.
  --stagger-ms <ms>           Delay between bot joins.
  --seed <seed>               Deterministic seed for class and movement choices.
  --log-level <level>         silent or info.`);
}

function chooseClass(option, random) {
  if (CLASSES.includes(option)) return option;
  return CLASSES[Math.floor(random() * CLASSES.length) % CLASSES.length];
}

export async function runBots(options = {}) {
  const config = {
    ...parseArgs([]),
    ...options
  };
  const random = createSeededRandom(config.seed);
  const logsEnabled = config.logLevel !== "silent";
  const logger = logsEnabled ? (line) => console.log(line) : null;
  const bots = [];
  const stopAtMs = Date.now() + config.duration * 1000;

  for (let i = 0; i < config.bots; i++) {
    const classType = chooseClass(config.classType, random);
    const botRandom = createSeededRandom(`${config.seed}:${i}:${classType}`);
    const bot = new BotClient({
      url: config.url,
      roomId: config.room,
      name: `${config.namePrefix}-${i + 1}`,
      classType,
      random: botRandom,
      logger
    });
    bots.push(bot);
    bot.connect();
    if (config.staggerMs > 0 && i < config.bots - 1) await delay(config.staggerMs);
  }

  let interrupted = false;
  const stop = () => {
    interrupted = true;
    for (const bot of bots) bot.close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    while (!interrupted && Date.now() < stopAtMs) await delay(250);
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    for (const bot of bots) bot.close();
  }

  const metrics = bots.map((bot) => ({ ...bot.metrics }));
  return {
    url: config.url,
    room: config.room,
    duration: config.duration,
    bots: metrics,
    totals: {
      joined: metrics.filter((bot) => bot.joined).length,
      readied: metrics.filter((bot) => bot.readied).length,
      started: metrics.filter((bot) => bot.started).length,
      snapshots: metrics.reduce((sum, bot) => sum + bot.snapshots, 0),
      inputsSent: metrics.reduce((sum, bot) => sum + bot.inputsSent, 0),
      primaryInputsSent: metrics.reduce((sum, bot) => sum + bot.primaryInputsSent, 0),
      errors: metrics.reduce((sum, bot) => sum + bot.errors.length, 0),
      deaths: metrics.filter((bot) => bot.deathObserved).length
    }
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const result = await runBots(options);
  console.log(JSON.stringify(result, null, 2));
  if (result.totals.joined < options.bots || result.totals.started < options.bots) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
  });
}
