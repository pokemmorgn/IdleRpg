/**
 * Script de test pour le système de serveurs et profils
 * Usage: npx ts-node src/scripts/test-servers.ts
 */

import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;

interface HttpResponse {
  statusCode: number;
  data: any;
}

function makeRequest(method: string, path: string, body?: any, token?: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const headers: any = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request({
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode || 500, data: JSON.parse(data) });
        } catch (err) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

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
  section: (msg: string) => console.log(`\n${colors.cyan}${"=".repeat(50)}\n${msg}\n${"=".repeat(50)}${colors.reset}\n`),
};

async function runAllTests() {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║       🌍 TEST SERVERS & PROFILES - IdleRPG 🌍     ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info(`Démarrage des tests...\n`);

  try {
    // Test 1: Créer compte
    log.section("TEST 1: CREATE ACCOUNT");
    const username = `testplayer_${Date.now()}`;
    log.info(`Création du compte: ${username}`);
    const res1 = await makeRequest("POST", "/auth/register", { 
      username, 
      password: "password123",
      email: `${username}@test.com`
    });
    if (res1.statusCode !== 200) throw new Error(`Register failed: ${res1.data.error}`);
    const token = res1.data.token;
    log.success(`Compte créé: ${username}`);
    log.info(`Token: ${token.substring(0, 20)}...`);

    // Test 2: Lister serveurs
    log.section("TEST 2: LIST SERVERS");
    log.info("Récupération de la liste des serveurs...");
    const res2 = await makeRequest("GET", "/servers");
    if (res2.statusCode !== 200) throw new Error("List servers failed");
    const servers = res2.data.servers;
    log.success(`${servers.length} serveurs trouvés`);
    
    const serversByRegion: any = {};
    for (const server of servers) {
      if (!serversByRegion[server.region]) serversByRegion[server.region] = [];
      serversByRegion[server.region].push(server);
    }
    for (const [region, srvs] of Object.entries(serversByRegion) as any) {
      console.log(`\n  ${colors.yellow}${region}:${colors.reset}`);
      for (const s of srvs) {
        console.log(`    - ${s.serverId}: ${s.name} (${s.status})`);
      }
    }

    if (servers.length === 0) {
      log.error("Aucun serveur trouvé !");
      log.error("Lance d'abord: npx ts-node src/scripts/seed-servers.ts");
      process.exit(1);
    }

    // Test 3: Vérifier serveur
    log.section(`TEST 3: GET SERVER ${servers[0].serverId}`);
    log.info(`Récupération des infos du serveur ${servers[0].serverId}...`);
    const res3 = await makeRequest("GET", `/servers/${servers[0].serverId}`);
    if (res3.statusCode !== 200) throw new Error("Get server failed");
    log.success("Serveur trouvé !");
    log.info(`Nom: ${res3.data.name}`);
    log.info(`Région: ${res3.data.region}`);
    log.info(`Status: ${res3.data.status}`);
    log.info(`Joueurs: ${res3.data.currentPlayers}/${res3.data.capacity}`);

    // Test 4: Pas de profil
    log.section(`TEST 4: CHECK NO PROFILE ON ${servers[0].serverId}`);
    log.info(`Vérification du profil sur ${servers[0].serverId}...`);
    const res4 = await makeRequest("GET", `/profile/${servers[0].serverId}`, undefined, token);
    if (res4.statusCode !== 200) throw new Error("Get profile failed");
    if (res4.data.exists) throw new Error("Should have no profile");
    log.success("Aucun profil (comme attendu)");

    // Test 5: Créer profil
    log.section(`TEST 5: CREATE PROFILE ON ${servers[0].serverId}`);
    log.info(`Création du personnage "TestWarrior" sur ${servers[0].serverId}...`);
    const res5 = await makeRequest("POST", `/profile/${servers[0].serverId}`, {
      characterName: "TestWarrior",
      characterClass: "warrior"
    }, token);
    if (res5.statusCode !== 201) throw new Error(`Create profile failed: ${res5.data.error}`);
    log.success("Profil créé !");
    log.info(`Personnage: ${res5.data.profile.characterName}`);
    log.info(`Classe: ${res5.data.profile.class}`);
    log.info(`Level: ${res5.data.profile.level}`);
    log.info(`Gold: ${res5.data.profile.gold}`);

    // Test 6: Récupérer profil
    log.section(`TEST 6: GET PROFILE ON ${servers[0].serverId}`);
    log.info(`Récupération du profil sur ${servers[0].serverId}...`);
    const res6 = await makeRequest("GET", `/profile/${servers[0].serverId}`, undefined, token);
    if (res6.statusCode !== 200) throw new Error("Get profile failed");
    if (!res6.data.exists) throw new Error("Profile should exist");
    log.success("Profil récupéré !");
    log.info(`Personnage: ${res6.data.profile.characterName}`);
    log.info(`Level: ${res6.data.profile.level}`);

    // Test 7: Second profil
    if (servers.length > 1) {
      log.section(`TEST 7: CREATE SECOND PROFILE ON ${servers[1].serverId}`);
      log.info(`Création du personnage "TestMage" sur ${servers[1].serverId}...`);
      const res7 = await makeRequest("POST", `/profile/${servers[1].serverId}`, {
        characterName: "TestMage",
        characterClass: "mage"
      }, token);
      if (res7.statusCode !== 201) throw new Error(`Second profile failed: ${res7.data.error}`);
      log.success("Second profil créé !");
      log.info(`Personnage: ${res7.data.profile.characterName}`);
      log.info(`Classe: ${res7.data.profile.class}`);
    }

    // Test 8: Lister profils
    log.section("TEST 8: LIST ALL PROFILES");
    log.info("Récupération de tous les profils...");
    const res8 = await makeRequest("GET", "/profile", undefined, token);
    if (res8.statusCode !== 200) throw new Error("List profiles failed");
    log.success(`${res8.data.profiles.length} profil(s) trouvé(s)`);
    res8.data.profiles.forEach((p: any) => {
      console.log(`  - ${p.serverId}: ${p.characterName} (Lv${p.level} ${p.class})`);
    });

    // Test 9: Doublon
    log.section("TEST 9: DUPLICATE PROFILE (doit échouer)");
    log.info("Tentative de création d'un doublon...");
    const res9 = await makeRequest("POST", `/profile/${servers[0].serverId}`, {
      characterName: "Duplicate",
      characterClass: "archer"
    }, token);
    if (res9.statusCode === 400) {
      log.success("Le serveur a bien rejeté le doublon");
      log.info(`Message: ${res9.data.error}`);
    } else if (res9.statusCode === 201) {
      log.error("Le serveur a accepté un doublon (BUG)");
    }

    log.section("RÉSUMÉ");
    log.success("Tous les tests sont passés ! 🎉");
    log.info(`Compte test: ${username}`);

  } catch (error: any) {
    log.section("ÉCHEC CRITIQUE");
    log.error("Un test critique a échoué");
    log.error(error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests();
}
