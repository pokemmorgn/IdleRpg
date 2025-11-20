/**
 * Script de test pour la création de personnage (Race + Classe)
 * Usage: npx ts-node src/scripts/test-character-creation.ts
 */

import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;

interface HttpResponse {
  statusCode: number;
  data: any;
}

/**
 * Helper HTTP natif
 */
function makeRequest(method: string, path: string, body?: any, token?: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";

    const headers: any = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode || 500,
            data: parsed,
          });
        } catch (err) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (postData) req.write(postData);
    req.end();
  });
}

// ===== Colors =====

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.cyan}${"=".repeat(50)}\n${msg}\n${"=".repeat(50)}${colors.reset}\n`),
};

// ====== TESTS ======

/**
 * GET /stats/creation-data
 */
async function testCreationData() {
  log.section("TEST 1: GET /stats/creation-data");

  const response = await makeRequest("GET", "/stats/creation-data");

  if (response.statusCode !== 200) {
    log.error(`Erreur: ${response.data.error}`);
    return null;
  }

  log.success("Données de création récupérées !");
  return response.data;
}

/**
 * Crée un compte test et renvoie le token
 */
async function registerTestAccount() {
  log.section("TEST 2: REGISTER TEST ACCOUNT");

  const username = "character_test_" + Date.now();
  const password = "pass123";

  const response = await makeRequest("POST", "/auth/register", {
    username,
    password,
    email: `${username}@test.com`,
  });

  if (response.statusCode !== 200) {
    log.error("Impossible de créer un utilisateur test");
    throw new Error(response.data.error);
  }

  log.success("Compte test créé !");
  return {
    token: response.data.token,
    playerId: response.data.playerId,
  };
}

/**
 * POST /profile/:serverId
 */
async function testCharacterCreation(token: string, raceId: string, classId: string) {
  log.section("TEST 3: CHARACTER CREATION");

  const response = await makeRequest(
    "POST",
    "/profile/eu-1", // serveur de test
    {
      characterSlot: 1,
      characterName: "TestHero_" + Math.floor(Math.random() * 9999),
      characterClass: classId,
      characterRace: raceId,
    },
    token
  );

  if (response.statusCode !== 201) {
    log.error(`Erreur création: ${response.data.error}`);
    return null;
  }

  log.success("Personnage créé !");
  return response.data.profile;
}

/**
 * Récupère le profil pour vérification
 */
async function fetchProfiles(token: string) {
  log.section("TEST 4: GET /profile/eu-1");

  const response = await makeRequest("GET", "/profile/eu-1", undefined, token);

  if (response.statusCode !== 200) {
    log.error("Impossible de récupérer les profils");
    throw new Error(response.data.error);
  }

  log.success("Profils récupérés !");
  return response.data.profiles;
}

/**
 * MAIN
 */
async function run() {
  console.log(`
╔══════════════════════════════════════════════╗
║     🧪 TEST CHARACTER CREATION - IdleRPG     ║
╚══════════════════════════════════════════════╝
`);

  // 1) Récupération races + classes
  const creationData = await testCreationData();
  if (!creationData) return;

  const race = creationData.races[0];
  const allowedClasses = creationData.restrictions[race.raceId] || creationData.classes.map((c:any)=>c.classId);
  const classId = allowedClasses[0];

  log.info(`Race test: ${race.raceId}`);
  log.info(`Classe test: ${classId}`);

  // 2) Création compte test
  const { token } = await registerTestAccount();

  // 3) Création du personnage
  const profile = await testCharacterCreation(token, race.raceId, classId);
  if (!profile) return;

  log.info("Stats initiales:");
  console.log(profile.computedStats);

  // 4) Vérification des profils
  await fetchProfiles(token);

  log.section("🎉 FIN DU TEST");
  log.success("Tout est OK, création de personnage fonctionnelle !");
}

run().catch((err) => {
  log.error("Erreur critique:");
  console.error(err);
});
