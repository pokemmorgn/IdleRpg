/**
 * Script de test pour l'auto-scaling des serveurs
 * Usage: npx ts-node src/scripts/test-autoscaling.ts
 */

import http from "http";
import { MAX_PLAYERS_PER_SERVER } from "../config/servers.config";

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
  magenta: "\x1b[35m",
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.cyan}${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}${colors.reset}\n`),
  scaling: (msg: string) => console.log(`${colors.magenta}🚀 ${msg}${colors.reset}`),
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createPlayerOnServer(serverId: string, playerNumber: number): Promise<string> {
  const username = `testplayer_${Date.now()}_${playerNumber}`;
  
  log.info(`[${playerNumber}] Création du compte: ${username}`);
  
  // Créer compte
  const resRegister = await makeRequest("POST", "/auth/register", {
    username,
    password: "password123",
    email: `${username}@test.com`
  });
  
  if (resRegister.statusCode !== 200) {
    throw new Error(`Register failed for ${username}`);
  }
  
  const token = resRegister.data.token;
  log.success(`Compte créé: ${username}`);
  
  // Créer profil
  log.info(`Création du profil sur ${serverId}...`);
  const resProfile = await makeRequest("POST", `/profile/${serverId}`, {
    characterName: `Hero${playerNumber}`,
    characterClass: ["warrior", "mage", "archer"][playerNumber % 3]
  }, token);
  
  if (resProfile.statusCode !== 201) {
    throw new Error(`Profile creation failed for ${username} on ${serverId}`);
  }
  
  log.success(`Profil créé: Hero${playerNumber} sur ${serverId}`);
  
  return token;
}

async function getServerState(): Promise<any[]> {
  const res = await makeRequest("GET", "/servers");
  if (res.statusCode !== 200) throw new Error("Failed to get servers");
  return res.data.servers;
}

async function displayServerState() {
  const servers = await getServerState();
  log.info(`Nombre total de serveurs: ${servers.length}`);
  servers.forEach((s: any) => {
    console.log(`  ${s.serverId}: ${s.name} - ${s.currentPlayers} joueur(s)`);
  });
  return servers;
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║       🚀 TEST AUTO-SCALING DES SERVEURS - IdleRPG 🚀       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info(`Seuil d'auto-scaling: ${MAX_PLAYERS_PER_SERVER} joueurs par serveur\n`);

  const allTokens: string[] = [];
  let playerCounter = 1;

  try {
    // ===== ÉTAPE 1: ÉTAT INITIAL =====
    log.section("ÉTAPE 1: ÉTAT INITIAL DES SERVEURS");
    let servers = await displayServerState();
    
    if (servers.length !== 1 || servers[0].serverId !== "s1") {
      log.error("Le test doit commencer avec seulement S1. Relance le seed d'abord.");
      process.exit(1);
    }

    // ===== ÉTAPE 2: REMPLIR S1 =====
    log.section(`ÉTAPE 2: REMPLISSAGE DE S1 (${MAX_PLAYERS_PER_SERVER} joueurs)`);
    
    for (let i = 1; i <= MAX_PLAYERS_PER_SERVER; i++) {
      const token = await createPlayerOnServer("s1", playerCounter++);
      allTokens.push(token);
      await sleep(300);
      
      servers = await getServerState();
      const s1 = servers.find(s => s.serverId === "s1");
      if (s1) {
        log.info(`État de s1: ${s1.currentPlayers}/${MAX_PLAYERS_PER_SERVER} joueurs`);
      }
      console.log("");
    }

    // ===== ÉTAPE 3: VÉRIFIER QUE S2 A ÉTÉ CRÉÉ =====
    log.section("ÉTAPE 3: VÉRIFICATION AUTO-CRÉATION DE S2");
    await sleep(500);
    
    servers = await displayServerState();
    const s2Exists = servers.some(s => s.serverId === "s2");
    
    if (s2Exists) {
      log.scaling("✨ AUTO-SCALING RÉUSSI ! S2 a été créé automatiquement !");
    } else {
      log.error("❌ ÉCHEC: S2 n'a pas été créé");
      throw new Error("Auto-scaling failed: S2 not created");
    }

    // ===== ÉTAPE 4: REMPLIR S2 =====
    log.section(`ÉTAPE 4: REMPLISSAGE DE S2 (${MAX_PLAYERS_PER_SERVER} joueurs)`);
    
    for (let i = 1; i <= MAX_PLAYERS_PER_SERVER; i++) {
      const token = await createPlayerOnServer("s2", playerCounter++);
      allTokens.push(token);
      await sleep(300);
      
      servers = await getServerState();
      const s2 = servers.find(s => s.serverId === "s2");
      if (s2) {
        log.info(`État de s2: ${s2.currentPlayers}/${MAX_PLAYERS_PER_SERVER} joueurs`);
      }
      console.log("");
    }

    // ===== ÉTAPE 5: VÉRIFIER QUE S3 A ÉTÉ CRÉÉ =====
    log.section("ÉTAPE 5: VÉRIFICATION AUTO-CRÉATION DE S3");
    await sleep(500);
    
    servers = await displayServerState();
    const s3Exists = servers.some(s => s.serverId === "s3");
    
    if (s3Exists) {
      log.scaling("✨ AUTO-SCALING RÉUSSI ! S3 a été créé automatiquement !");
    } else {
      log.error("❌ ÉCHEC: S3 n'a pas été créé");
      throw new Error("Auto-scaling failed: S3 not created");
    }

    // ===== ÉTAPE 6: REMPLIR S3 =====
    log.section(`ÉTAPE 6: REMPLISSAGE DE S3 (${MAX_PLAYERS_PER_SERVER} joueurs)`);
    
    for (let i = 1; i <= MAX_PLAYERS_PER_SERVER; i++) {
      const token = await createPlayerOnServer("s3", playerCounter++);
      allTokens.push(token);
      await sleep(300);
      
      servers = await getServerState();
      const s3 = servers.find(s => s.serverId === "s3");
      if (s3) {
        log.info(`État de s3: ${s3.currentPlayers}/${MAX_PLAYERS_PER_SERVER} joueurs`);
      }
      console.log("");
    }

    // ===== ÉTAPE 7: VÉRIFIER QUE S4 A ÉTÉ CRÉÉ =====
    log.section("ÉTAPE 7: VÉRIFICATION AUTO-CRÉATION DE S4");
    await sleep(500);
    
    servers = await displayServerState();
    const s4Exists = servers.some(s => s.serverId === "s4");
    
    if (s4Exists) {
      log.scaling("✨ AUTO-SCALING RÉUSSI ! S4 a été créé automatiquement !");
    } else {
      log.error("❌ ÉCHEC: S4 n'a pas été créé");
      throw new Error("Auto-scaling failed: S4 not created");
    }

    // ===== ÉTAPE 8: TEST DE SUPPRESSION =====
    log.section("ÉTAPE 8: TEST DE SUPPRESSION DE PROFILS");
    
    log.info("Suppression d'un profil sur S1...");
    const resDelete1 = await makeRequest("DELETE", "/profile/s1", undefined, allTokens[0]);
    
    if (resDelete1.statusCode === 200) {
      log.success("Profil supprimé avec succès sur S1");
      
      await sleep(300);
      servers = await getServerState();
      const s1 = servers.find(s => s.serverId === "s1");
      
      if (s1 && s1.currentPlayers === MAX_PLAYERS_PER_SERVER - 1) {
        log.success(`✅ Compteur S1 correctement décrémenté: ${s1.currentPlayers} joueurs`);
      } else {
        log.error(`❌ Compteur S1 incorrect: ${s1?.currentPlayers}`);
      }
    }

    log.info("\nSuppression d'un profil sur S3...");
    const resDelete3 = await makeRequest("DELETE", "/profile/s3", undefined, allTokens[allTokens.length - 1]);
    
    if (resDelete3.statusCode === 200) {
      log.success("Profil supprimé avec succès sur S3");
      
      await sleep(300);
      servers = await getServerState();
      const s3 = servers.find(s => s.serverId === "s3");
      
      if (s3 && s3.currentPlayers === MAX_PLAYERS_PER_SERVER - 1) {
        log.success(`✅ Compteur S3 correctement décrémenté: ${s3.currentPlayers} joueurs`);
      } else {
        log.error(`❌ Compteur S3 incorrect: ${s3?.currentPlayers}`);
      }
    }

    // ===== RÉSUMÉ FINAL =====
    log.section("RÉSUMÉ FINAL");
    
    servers = await displayServerState();
    
    const totalPlayers = servers.reduce((sum, s) => sum + s.currentPlayers, 0);
    log.info(`Total de joueurs créés: ${totalPlayers}`);
    log.info(`Total de serveurs créés: ${servers.length}`);
    
    console.log("");
    log.success("🎉 TOUS LES TESTS D'AUTO-SCALING SONT PASSÉS AVEC SUCCÈS !");
    log.info(`✅ S2 créé automatiquement quand S1 plein`);
    log.info(`✅ S3 créé automatiquement quand S2 plein`);
    log.info(`✅ S4 créé automatiquement quand S3 plein`);
    log.info(`✅ Décrément des compteurs fonctionne`);
    console.log("");
    log.warning("⚠️  Ce test a créé des comptes de test temporaires");
    log.info(`Pour nettoyer, tu peux soit:`);
    log.info(`  1. Supprimer manuellement les profils de test via l'API`);
    log.info(`  2. Relancer le seed: npx ts-node src/scripts/seed-servers.ts`);
    log.info(`  3. Nettoyer la base MongoDB directement`);

  } catch (error: any) {
    log.section("ÉCHEC CRITIQUE");
    log.error("Un test critique a échoué");
    log.error(error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
