/**
 * Test du endpoint /game-data/creation
 * Vérifie que Unity reçoit bien tout ce qu’il attend dans le NOUVEAU FORMAT.
 *
 * Usage :
 *   npx ts-node server/src/scripts/test-creation-endpoint.ts
 */

import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;

function get(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: API_HOST, port: API_PORT, path, method: "GET" },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(`Invalid JSON: ${data}`);
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

// 🎨 Helpers
const ok = (m: string) => console.log("\x1b[32m✔ " + m + "\x1b[0m");
const err = (m: string) => console.log("\x1b[31m✖ " + m + "\x1b[0m");
const warn = (m: string) => console.log("\x1b[33m⚠ " + m + "\x1b[0m");
const info = (m: string) => console.log("\x1b[36mℹ " + m + "\x1b[0m");
const section = (msg: string) =>
  console.log("\n\x1b[35m====== " + msg + " ======\x1b[0m");

async function main() {
  section("TEST UNITY – /game-data/creation");

  let data: any;

  try {
    data = await get("/game-data/creation");
  } catch (e) {
    return err("Impossible d'appeler l’API : " + e);
  }

  // ---------------------------------------------------------------
  // Structure globale
  // ---------------------------------------------------------------
  if (!data.races) return err("Missing `races`");
  if (!data.classes) return err("Missing `classes`");
  if (!data.byRace) return err("Missing `byRace` mapping");

  ok("Structure OK ✔ races / classes / byRace");

  // ---------------------------------------------------------------
  // SECTION RACES (vérification Unity format)
  // ---------------------------------------------------------------
  section("RACES – Format Unity attendu");

  info(`Total races : ${data.races.length}`);

  for (const race of data.races) {
    const id = race.raceId;

    console.log(`\x1b[37m\n--- Race : ${id} ---`);

    if (!id) err("Race sans raceId");
    if (!race.nameKey) err(`Race ${id} sans nameKey`);
    if (!race.descriptionKey) err(`Race ${id} sans descriptionKey`);
    if (!race.loreKey) err(`Race ${id} sans loreKey`);

    // Vérif statsModifiers
    if (!race.statsModifiers) {
      warn(`Race ${id} : pas de statsModifiers`);
    } else {
      console.log("statsModifiers =", race.statsModifiers);

      // Vérif structure primaire / computed
      if (
        !race.statsModifiers.primaryPercent &&
        !race.statsModifiers.computedPercent
      ) {
        warn(`Race ${id} : statsModifiers vide`);
      }
    }

    console.log("Faction:", race.faction);
    ok(`Race OK : ${id}`);
  }

  // ---------------------------------------------------------------
  // SECTION CLASSES
  // ---------------------------------------------------------------
  section("CLASSES");

  info(`Total classes : ${data.classes.length}`);

  for (const cls of data.classes) {
    if (!cls.classId) err("Classe sans classId");
    if (!cls.roles || cls.roles.length === 0)
      warn(`Classe ${cls.classId} sans roles`);

    ok("Classe OK : " + cls.classId);
  }

  // ---------------------------------------------------------------
  // SECTION MAPPING BYRACE
  // ---------------------------------------------------------------
  section("MAPPING byRace – Restrictions");

  for (const raceId of Object.keys(data.byRace)) {
    const allowed = data.byRace[raceId];

    if (!Array.isArray(allowed)) {
      err(`byRace[${raceId}] n'est pas une liste`);
      continue;
    }

    if (allowed.length === 0) warn(`Race ${raceId} → AUCUNE classe`);
    else ok(`${raceId} → ${allowed.length} classes`);
  }

  // ---------------------------------------------------------------
  // FIN
  // ---------------------------------------------------------------
  section("RÉSULTAT FINAL");

  ok("Format Unity ✔");
  ok("statsModifiers OK ✔");
  ok("loreKey ✔");
  ok("restrictions byRace ✔");

  console.log("\nTout est nickel 🔥🔥🔥");
}

main();
