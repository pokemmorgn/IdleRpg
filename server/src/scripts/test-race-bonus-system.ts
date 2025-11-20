/**
 * Script de test complet du système racial :
 * - Vérifie la route /stats/creation-data
 * - Vérifie l'application des bonus raciaux (internes)
 * 
 * Usage: npx ts-node src/scripts/test-race-bonus-system.ts
 */

import http from "http";
import { ALL_RACES, getRaceById } from "../config/races.config";
import { PlayerStatsCalculator } from "../colyseus/managers/stats/PlayerStatsCalculator";
import { getClassById } from "../config/classes.config";
import { PlayerState } from "../colyseus/schema/PlayerState";

const API_HOST = "localhost";
const API_PORT = 3000;

/* ==========================================================================
    HELPERS COLORS
========================================================================== */
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
    console.log("\n" + colors.cyan + "==== " + msg + " ====" + colors.reset),
};

/* ==========================================================================
    HTTP REQUEST HELPER
========================================================================== */
function request(path: string, method = "GET"): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(
            new Error("Réponse non JSON: " + data.substring(0, 200))
          );
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

/* ==========================================================================
    TEST 1: ROUTE /stats/creation-data
========================================================================== */
async function testCreationData() {
  log.section("TEST HTTP: /stats/creation-data");

  try {
    const json = await request("/stats/creation-data");

    if (!json.races || !Array.isArray(json.races))
      throw new Error("races manquant");

    if (!json.classes || !Array.isArray(json.classes))
      throw new Error("classes manquant");

    if (!json.restrictions)
      throw new Error("restrictions manquant");

    log.ok("Route accessible ✔");

    // Vérifier présence des bonus raciaux
    for (const race of json.races) {
      if (!race.statsModifiers) continue;

      const hasPrimary = !!race.statsModifiers.primaryPercent;
      const hasComputed = !!race.statsModifiers.computedPercent;

      if (!hasPrimary && !hasComputed) {
        log.err(`Race ${race.raceId} n'a aucun bonus (OK si voulu)`);        
      } else {
        log.ok(`Race ${race.raceId} → bonuses détectés`);
      }
    }

    return true;
  } catch (e: any) {
    log.err("Erreur: " + e.message);
    return false;
  }
}

/* ==========================================================================
    TEST 2 : CALCUL COMPLET DES BONUS RACIAUX
========================================================================== */
async function testInternalRaceBonuses() {
  log.section("TEST CALCUL INTERNE DES BONUS RACIAUX");

  // Classe de test (Mage) — peu importe
  const testClass = getClassById("mage");

  if (!testClass) {
    log.err("Classe mage introuvable");
    return false;
  }

  for (const race of ALL_RACES) {
    log.info(`Race test: ${race.raceId}`);

    // Fake PlayerState minimal
    const player: any = {
      level: 1,
      race: race.raceId,
      attackSpeed: 2.5,
      classId: "mage",
    };

    // Fake classStats simplifiés
    const fakeClassStats: any = {
      resourceType: "mana",
      baseMoveSpeed: 5,
      baseStats: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        endurance: 10,
        spirit: 10,
      },
      statsPerLevel: {
        strength: 1,
        agility: 1,
        intelligence: 1,
        endurance: 1,
        spirit: 1,
      },
    };

    // Stats sans bonus
    const noRaceStats = PlayerStatsCalculator.compute(
      { ...player, race: "human_elion" },
      fakeClassStats
    );

    // Stats avec race réelle
    const raceStats = PlayerStatsCalculator.compute(player, fakeClassStats);

    // Comparer les bonus réellement appliqués
    const diffs: string[] = [];

    for (const key of Object.keys(raceStats)) {
      if (typeof (raceStats as any)[key] !== "number") continue;

      const base = (noRaceStats as any)[key];
      const val = (raceStats as any)[key];

      if (val !== base) {
        diffs.push(`- ${key}: ${base} → ${val}  (${((val / base - 1) * 100).toFixed(1)}%)`);
      }
    }

    if (diffs.length === 0) {
      log.warning(`Aucun bonus détecté pour ${race.raceId}`);
    } else {
      log.ok(`Bonus appliqués pour ${race.raceId}:`);
      diffs.forEach((d) => console.log("   " + d));
    }
  }

  return true;
}

/* ==========================================================================
    RUN ALL TESTS
========================================================================== */
async function run() {
  log.section("Lancement des tests raciaux");

  const httpOK = await testCreationData();
  if (!httpOK) return log.err("❌ Test HTTP échoué");

  const calcOK = await testInternalRaceBonuses();
  if (!calcOK) return log.err("❌ Test interne échoué");

  log.section("FIN DES TESTS");
  log.ok("🎉 Tous les tests ont été exécutés !");
}

run();
