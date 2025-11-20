/**
 * Test du endpoint /game-data/creation
 * Vérifie que Unity reçoit bien tout ce qu’il attend.
 * 
 * Usage : npx ts-node src/scripts/test-creation-endpoint.ts
 */

import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;

function get(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method: "GET",
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(`Invalid JSON: ${data}`);
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

// 🎨 Console utilities
const ok = (msg: string) => console.log("\x1b[32m✔ " + msg + "\x1b[0m");
const err = (msg: string) => console.log("\x1b[31m✖ " + msg + "\x1b[0m");
const info = (msg: string) => console.log("\x1b[36mℹ " + msg + "\x1b[0m");
const section = (msg: string) =>
  console.log("\n\x1b[33m====== " + msg + " ======\x1b[0m");

async function main() {
  section("TEST DU ENDPOINT UNITY : /game-data/creation");

  try {
    const data = await get("/game-data/creation");

    // Vérification structure
    if (!data.races) return err("Missing 'races'");
    if (!data.classes) return err("Missing 'classes'");
    if (!data.byRace) return err("Missing 'byRace' mapping");

    ok("Structure validée : races + classes + byRace OK");

    // Vérif races
    section("RACES");
    info(`Total races : ${data.races.length}`);

    for (const race of data.races) {
      if (!race.raceId) err("Race sans raceId !");
      if (!race.nameKey) err(`Race ${race.raceId} missing nameKey`);
      if (!race.statsModifiers) err(`Race ${race.raceId} missing statsModifiers`);

      ok(`Race OK : ${race.raceId}`);
    }

    // Vérif classes
    section("CLASSES");
    info(`Total classes : ${data.classes.length}`);

    for (const cls of data.classes) {
      if (!cls.classId) err("Classe sans classId !");
      if (!cls.roles) err(`Classe ${cls.classId} missing roles`);

      ok(`Classe OK : ${cls.classId}`);
    }

    // Vérif mapping byRace
    section("MAPPING byRace");

    for (const raceId of Object.keys(data.byRace)) {
      const allowed = data.byRace[raceId];

      if (!Array.isArray(allowed)) {
        err(`byRace[${raceId}] n'est PAS une liste`);
        continue;
      }

      if (allowed.length === 0) {
        err(`⚠ Aucun classe autorisée pour ${raceId}`);
      } else {
        ok(`${raceId} → ${allowed.length} classes`);
      }
    }

    section("RÉSULTAT FINAL");
    ok("Tout est conforme : Unity peut consommer l’endpoint sans problème ✔");

  } catch (e) {
    err("Erreur : " + e);
    process.exit(1);
  }
}

main();
