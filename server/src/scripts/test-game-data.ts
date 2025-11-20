/**
 * TEST DES ROUTES GAME-DATA
 * Usage : npx ts-node server/src/scripts/test-game-data.ts
 */

import http from "http";

// Adresse de ton API
const BASE_URL = "http://localhost:3000";

// ====================================================================
// UTILITAIRE POUR REQUÊTES HTTP (sans axios)
// ====================================================================
function httpGet(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.get(BASE_URL + path, (res) => {
      let data = "";

      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject("Erreur parsing JSON : " + err);
        }
      });
    });

    req.on("error", (err) => reject(err));
  });
}

// ====================================================================
// LOGGING COLORÉ
// ====================================================================
const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};
const log = {
  ok: (msg: string) => console.log(c.green + "✔ " + msg + c.reset),
  err: (msg: string) => console.log(c.red + "✖ " + msg + c.reset),
  info: (msg: string) => console.log(c.cyan + "ℹ " + msg + c.reset),
  section: (msg: string) =>
    console.log("\n" + c.yellow + "====== " + msg + " ======" + c.reset),
};

// ====================================================================
// TESTER UNE ROUTE
// ====================================================================
async function testRoute(name: string, path: string) {
  log.section(name);

  try {
    const res = await httpGet(path);

    log.ok(`Route OK : ${path}`);
    console.log(JSON.stringify(res, null, 2).slice(0, 800)); // affichage limité
    return res;
  } catch (err) {
    log.err(`Échec pour ${path}`);
    console.error(err);
  }
}

// ====================================================================
// SCRIPT PRINCIPAL
// ====================================================================
async function main() {
  log.section("TEST GAME DATA API");

  // 1) LISTE DES CLASSES
  const classes = await testRoute("Classes complètes", "/game-data/classes");

  // 2) FILTRAGE PAR RÔLE
  await testRoute("Classes (rôle = DPS)", "/game-data/classes?role=DPS");

  // 3) LISTE DES RACES
  const races = await testRoute("Toutes les races", "/game-data/races");

  // 4) FILTRAGE PAR FACTION
  await testRoute("Races (faction = AURION)", "/game-data/races?faction=AURION");

  // 5) FACTIONS AVEC LISTE DE RACES
  await testRoute("Factions", "/game-data/factions");

  // 6) CLASSES AUTORISÉES PAR RACE
  if (races?.races?.length > 0) {
    const sampleRace = races.races[0].raceId;
    await testRoute(
      `Classes autorisées pour ${sampleRace}`,
      `/game-data/allowed-classes/${sampleRace}`
    );
  }

  log.section("FIN DU TEST");
}

main().catch((err) => {
  log.err("Erreur fatale : " + err);
});
