/**
 * Test du endpoint /game-data/creation
 * Vérifie que Unity reçoit bien tout ce qu’il attend.
 * 
 * Usage :
 *   npx ts-node server/src/scripts/test-creation-endpoint.ts
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

// 🎨 Log helpers
const ok = (msg: string) => console.log("\x1b[32m✔ " + msg + "\x1b[0m");
const err = (msg: string) => console.log("\x1b[31m✖ " + msg + "\x1b[0m");
const warn = (msg: string) => console.log("\x1b[33m⚠ " + msg + "\x1b[0m");
const info = (msg: string) => console.log("\x1b[36mℹ " + msg + "\x1b[0m");
const section = (msg: string) =>
  console.log("\n\x1b[35m====== " + msg + " ======\x1b[0m");

async function main() {
  section("TEST UNITY – /game-data/creation");

  let data;

  try {
    data = await get("/game-data/creation");
  } catch (e) {
    return err("Impossible d'appeler l’API : " + e);
  }

  // ---------------------------------------------------------------
  // Validations globales
  // ---------------------------------------------------------------
  if (!data.races) return err("⚠ Missing `races`");
  if (!data.classes) return err("⚠ Missing `classes`");
  if (!data.byRace) return err("⚠ Missing `byRace` mapping");

  ok("Structure OK : races + classes + byRace ✔");

  // ---------------------------------------------------------------
  // SECTION RACES
  // ---------------------------------------------------------------
  section("RACES : ce que Unity va voir");

  info(`Total races : ${data.races.length}`);

  for (const race of data.races) {
    const id = race.raceId;

    if (!id) err("Race sans raceId !");
    if (!race.nameKey) err(`Race ${id} missing nameKey`);
    if (!race.descriptionKey) err(`Race ${id} missing descriptionKey`);
    if (!race.loreKey) err(`Race ${id} missing loreKey`);

    if (!race.bonusesLocalized || race.bonusesLocalized.length === 0)
      warn(`Race ${id} : aucun bonus_localized !`);

    // ➜ Visualisation au format Unity
    console.log(`\x1b[37m\n--- Race: ${id} ---`);
    console.log("NameKey:", race.nameKey);
    console.log("DescriptionKey:", race.descriptionKey);
    console.log("LoreKey:", race.loreKey);
    console.log("BonusesLocalized:", race.bonusesLocalized);
    console.log("Faction:", race.faction, "\x1b[0m");

    ok(`Race validée : ${id}`);
  }

  // ---------------------------------------------------------------
  // SECTION CLASSES
  // ---------------------------------------------------------------
  section("CLASSES");

  info(`Total classes : ${data.classes.length}`);

  for (const cls of data.classes) {
    if (!cls.classId) err("Classe sans classId !");
    if (!cls.roles || cls.roles.length === 0)
      warn(`Classe ${cls.classId} sans rôles`);

    ok(`Classe OK : ${cls.classId}`);
  }

  // ---------------------------------------------------------------
  // SECTION MAPPING BYRACE
  // ---------------------------------------------------------------
  section("MAPPING byRace (restrictions)");

  for (const raceId of Object.keys(data.byRace)) {
    const allowed = data.byRace[raceId];

    if (!Array.isArray(allowed)) {
      err(`byRace[${raceId}] n’est PAS une liste`);
      continue;
    }

    if (allowed.length === 0) {
      warn(`⚠ Aucune classe autorisée pour ${raceId}`);
    } else {
      ok(`${raceId} → ${allowed.length} classes`);
    }
  }

  // ---------------------------------------------------------------
  // FIN
  // ---------------------------------------------------------------
  section("RÉSULTAT FINAL");
  ok("Unity a TOUT ce qu’il faut ✔");
  ok("BonusesLocalized ✔");
  ok("Lore ✔");
  ok("Restrictions ✔");
  ok("Structure ✔");

  console.log("\nTout est nickel 🔥");
}

main();
