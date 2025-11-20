/**
 * Test du système de bonus raciaux
 * Usage : npx ts-node src/scripts/test-race-bonus-system.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

import { ALL_RACES, getRaceById } from "../config/races.config";
import { PlayerStatsCalculator } from "../colyseus/managers/stats/PlayerStatsCalculator";
import ClassStatsModel, { IClassStats } from "../models/ClassStats";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  ok: (msg: string) => console.log(colors.green + "✔ " + msg + colors.reset),
  err: (msg: string) => console.log(colors.red + "✖ " + msg + colors.reset),
  info: (msg: string) => console.log(colors.blue + "ℹ " + msg + colors.reset),
  section: (msg: string) =>
    console.log("\n" + colors.cyan + "====== " + msg + " ======" + colors.reset),
  warning: (msg: string) =>
    console.log(colors.yellow + "⚠ " + msg + colors.reset),
};

// ======================================================
// PLAYER MOCK
// ======================================================

function createMockPlayer(raceId: string) {
  return {
    race: raceId,
    level: 20, // IMPORTANT : éviter les arrondis → bonus visibles
    attackSpeed: 2.5,
  } as any;
}

// Race neutre : aucun bonus
const NEUTRAL_RACE_ID = "human_elion"; // met une race SANS bonus si tu veux

// ======================================================
// MAIN
// ======================================================

async function main() {
  log.section("Connexion MongoDB");

  await mongoose.connect(MONGO_URI);
  log.ok("MongoDB connecté.");

  log.section("Chargement Classes Stats");

  const classStats: IClassStats[] = await ClassStatsModel.find({});
  if (classStats.length === 0) {
    log.err("Aucune classe trouvée dans la base !");
    process.exit(1);
  }

  const mageStats = classStats.find((c) => c.class === "mage");
  if (!mageStats) {
    log.err("Stats de 'mage' introuvables");
    process.exit(1);
  }

  log.ok("Classe 'mage' chargée.");

  log.section("Test des bonus raciaux");

  for (const race of ALL_RACES) {
    log.info(`Race : ${race.raceId}`);

    const mockPlayer = createMockPlayer(race.raceId);
    const neutralPlayer = createMockPlayer(NEUTRAL_RACE_ID);

    const baseStats = PlayerStatsCalculator.compute(neutralPlayer, mageStats);
    const finalStats = PlayerStatsCalculator.compute(mockPlayer, mageStats);

    const diffs: string[] = [];

    for (const key of Object.keys(baseStats)) {
      const before = baseStats[key as keyof typeof baseStats];
      const after = finalStats[key as keyof typeof finalStats];

      if (before !== after) {
        diffs.push(`${key}: ${before} → ${after}`);
      }
    }

    if (!diffs.length) {
      log.warning(`Aucun bonus détecté pour ${race.raceId}`);
    } else {
      log.ok(`Bonus détectés pour ${race.raceId}:`);
      diffs.forEach((d) => console.log("   - " + d));
    }
  }

  log.section("Fin du test");
  await mongoose.disconnect();
  log.ok("MongoDB déconnecté.");
}

main().catch((err) => {
  log.err("Erreur critique : " + err);
  process.exit(1);
});
