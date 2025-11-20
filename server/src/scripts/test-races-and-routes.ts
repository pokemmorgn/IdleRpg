/**
 * Test complet Races + Classes + Route /game-data/creation
 * Usage :
 *   npx ts-node src/scripts/test-races-and-routes.ts
 */

import http from "http";
import {
  ALL_RACES,
  getRaceById
} from "../config/races.config";

import {
  ALL_CLASSES,
  getAllowedClassesForRace
} from "../config/classes.config";

const API_HOST = "localhost";
const API_PORT = 3000;

// ===============================
// HTTP GET helper
// ===============================
function get(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path,
        method: "GET"
      },
      res => {
        let data = "";
        res.on("data", d => (data += d));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch {
            reject("Invalid JSON: " + data);
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

// ===============================
// Console helpers
// ===============================
const ok = (msg: string) => console.log("\x1b[32m✔ " + msg + "\x1b[0m");
const err = (msg: string) => console.log("\x1b[31m✖ " + msg + "\x1b[0m");
const info = (msg: string) => console.log("\x1b[36mℹ " + msg + "\x1b[0m");
const section = (msg: string) =>
  console.log("\n\x1b[33m====== " + msg + " ======\x1b[0m");

// ===============================
// MAIN TEST
// ===============================
async function main() {
  section("TEST LOCAL – CONTENU DES RACES (ce que Unity doit voir)");

  for (const race of ALL_RACES) {
    console.log(`\n--- Race: ${race.raceId} ---`);
    console.log("NameKey:", race.nameKey);
    console.log("DescriptionKey:", race.descriptionKey);
    console.log("LoreKey:", race.loreKey);
    console.log("Faction:", race.faction);

    if (!race.bonusesLocalized || race.bonusesLocalized.length === 0) {
      err(`⚠ Aucun bonus_localized pour ${race.raceId}`);
    } else {
      ok("BonusesLocalized:");
      console.log(" ", race.bonusesLocalized);
    }

    // Vérif classes autorisées
    const allowed = getAllowedClassesForRace(race.raceId);
    if (allowed.length === 0) {
      err(`⚠ Aucune classe autorisée pour ${race.raceId}`);
    } else {
      ok(`Classes autorisées (${allowed.length}):`);
      console.log(" ", allowed.map(c => c.classId));
    }
  }

  // =============================
  // TEST DU ENDPOINT /game-data/creation
  // =============================
  section("TEST DU ENDPOINT API /game-data/creation");

  try {
    const result = await get("/game-data/creation");

    if (!result.races) return err("Missing 'races'");
    if (!result.classes) return err("Missing 'classes'");
    if (!result.byRace) return err("Missing 'byRace'");

    ok("Structure OK : races + classes + byRace");

    info(`Races : ${result.races.length}`);
    info(`Classes : ${result.classes.length}`);

    // Vérif bonusesLocalized dans les races reçues par l’API
    for (const race of result.races) {
      if (!race.bonusesLocalized) {
        err(`🚨 API : Race ${race.raceId} sans bonusesLocalized !`);
      }
    }

    ok("API renvoie bien bonusesLocalized ✔");
  } catch (e) {
    err("Erreur API : " + e);
  }

  section("FIN DU TEST");
}

main();
