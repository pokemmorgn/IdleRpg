/**
 * Test du système de bonus raciaux
 * Usage : npx ts-node src/scripts/test-race-bonus-system.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

import { ALL_RACES, getRaceById } from "../config/races.config";
import { ALL_CLASSES } from "../config/classes.config";

import { PlayerStatsCalculator } from "../colyseus/managers/stats/PlayerStatsCalculator";
import ClassStatsModel, { IClassStats } from "../models/ClassStats";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

// ======================================================
// LOGGING
// ======================================================

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
    level: 1,
    attackSpeed: 2.5,
  } as any;
}

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
    log.err("Aucune classe trouvée dans la base ! Impossible de tester.");
    process.exit(1);
  }

  const mageStats = classStats.find((c) => c.class === "mage");
  if (!mageStats) {
    log.err("Stats de la classe 'mage' introuvables.");
    process.exit(1);
  }

  log.ok("Classe 'mage' chargée pour les tests.");

  // ======================================================
  // TEST DE CHAQUE RACE
  // ======================================================

  log.section("Test des bonus raciaux");

  for (const race of ALL_RACES) {
    log.info(`Test race : ${race.raceId}`);

    const mockPlayer = createMockPlayer(race.raceId);

    // Sans bonus
    const baseStats = PlayerStatsCalculator.compute(mockPlayer, mageStats);

    // Avec bonus
    const bonusRace = getRaceById(race.raceId);
    const finalStats = PlayerStatsCalculator.compute(mockPlayer, mageStats);

    // Détection des changements
    const diffs: string[] = [];

    for (const key of Object.keys(baseStats)) {
      const k = key as keyof typeof baseStats;
      const before = baseStats[k];
      const after = finalStats[k];

      if (before !== after) {
        diffs.push(`${key}: ${before} → ${after}`);
      }
    }

    if (diffs.length === 0) {
      log.warning(`Aucun bonus détecté pour ${race.raceId}`);
    } else {
      log.ok(`Bonus appliqués pour ${race.raceId}:`);
      for (const d of diffs) {
        console.log("   - " + d);
      }
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
