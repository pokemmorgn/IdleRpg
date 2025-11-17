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

  const tokens: string[] = [];
  const usernames: string[] = [];

  try {
    // 1. Vérifier les serveurs initiaux
    log.section("ÉTAPE 1: ÉTAT INITIAL DES SERVEURS");
    let res = await makeRequest("GET", "/servers");
    if (res.statusCode !== 200) throw new Error("Failed to get servers");
    
    log.info(`Serveurs existants: ${res.data.servers.length}`);
    res.data.servers.forEach((s: any) => {
      console.log(`  - ${s.serverId}: ${s.name} (${s.currentPlayers} joueurs)`);
    });

    // 2. Créer des comptes et profils jusqu'à déclencher l'auto-scaling
    log.section(`ÉTAPE 2: CRÉATION DE ${MAX_PLAYERS_PER_SERVER} PROFILS SUR S1`);
    
    for (let i = 1; i <= MAX_PLAYERS_PER_SERVER; i++) {
      const username = `testplayer_${Date.now()}_${i}`;
      usernames.push(username);
      
      log.info(`[${i}/${MAX_PLAYERS_PER_SERVER}] Création du compte: ${username}`);
      
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
      tokens.push(token);
      log.success(`Compte créé: ${username}`);
      
      // Créer profil sur s1
      log.info(`Création du profil sur s1...`);
      const resProfile = await makeRequest("POST", "/profile/s1", {
        characterName: `Hero${i}`,
        characterClass: "warrior"
      }, token);
      
      if (resProfile.statusCode !== 201) {
        throw new Error(`Profile creation failed for ${username}`);
      }
      
      log.success(`Profil créé: Hero${i}`);
      
      // Attendre un peu pour voir les logs du serveur
      await sleep(500);
      
      // Vérifier l'état des serveurs après chaque création
      const resServers = await makeRequest("GET", "/servers");
      const s1 = resServers.data.servers.find((s: any) => s.serverId === "s1");
      
      if (s1) {
        log.info(`État de s1: ${s1.currentPlayers}/${MAX_PLAYERS_PER_SERVER} joueurs`);
      }
      
      console.log("");
    }

    // 3. Vérifier qu'un nouveau serveur a été créé
    log.section("ÉTAPE 3: VÉRIFICATION DE L'AUTO-SCALING");
    
    await sleep(1000);
    
    res = await makeRequest("GET", "/servers");
    if (res.statusCode !== 200) throw new Error("Failed to get servers");
    
    log.info(`Nombre total de serveurs: ${res.data.servers.length}`);
    
    res.data.servers.forEach((s: any) => {
      const emoji = s.serverId === "s3" ? "🆕 " : "";
      console.log(`  ${emoji}${s.serverId}: ${s.name} (${s.currentPlayers} joueurs)`);
    });
    
    const s3Exists = res.data.servers.some((s: any) => s.serverId === "s3");
    
    if (s3Exists) {
      log.scaling("AUTO-SCALING DÉCLENCHÉ ! S3 a été créé automatiquement !");
    } else {
      log.error("S3 n'a pas été créé (bug dans l'auto-scaling)");
    }

    // 4. Créer un profil sur le nouveau serveur
    if (s3Exists) {
      log.section("ÉTAPE 4: TEST DU NOUVEAU SERVEUR S3");
      
      const username = `testplayer_${Date.now()}_s3`;
      log.info(`Création d'un compte pour tester s3: ${username}`);
      
      const resRegister = await makeRequest("POST", "/auth/register", {
        username,
        password: "password123"
      });
      
      const token = resRegister.data.token;
      
      const resProfile = await makeRequest("POST", "/profile/s3", {
        characterName: "HeroS3",
        characterClass: "mage"
      }, token);
      
      if (resProfile.statusCode === 201) {
        log.success("Profil créé avec succès sur le nouveau serveur S3 !");
      } else {
        log.error("Impossible de créer un profil sur S3");
      }
    }

    // 5. Test de suppression (décrémente le compteur)
    log.section("ÉTAPE 5: TEST DE SUPPRESSION DE PROFIL");
    
    if (tokens.length > 0) {
      log.info("Suppression du premier profil créé...");
      
      const resDelete = await makeRequest("DELETE", "/profile/s1", undefined, tokens[0]);
      
      if (resDelete.statusCode === 200) {
        log.success("Profil supprimé avec succès");
        
        await sleep(500);
        
        // Vérifier le compteur
        const resServers = await makeRequest("GET", "/servers");
        const s1 = resServers.data.servers.find((s: any) => s.serverId === "s1");
        
        if (s1) {
          log.info(`État de s1 après suppression: ${s1.currentPlayers} joueurs`);
          
          if (s1.currentPlayers === MAX_PLAYERS_PER_SERVER - 1) {
            log.success("Compteur correctement décrémenté !");
          } else {
            log.error(`Compteur incorrect: ${s1.currentPlayers} (attendu: ${MAX_PLAYERS_PER_SERVER - 1})`);
          }
        }
      }
    }

    // Résumé final
    log.section("RÉSUMÉ FINAL");
    
    res = await makeRequest("GET", "/servers");
    log.info(`Nombre total de serveurs: ${res.data.servers.length}`);
    log.info("État de tous les serveurs:");
    
    res.data.servers.forEach((s: any) => {
      console.log(`  ${s.serverId}: ${s.currentPlayers} joueur(s)`);
    });

    log.success("\n🎉 Tous les tests d'auto-scaling sont terminés !");
    log.info(`Seuil configuré: ${MAX_PLAYERS_PER_SERVER} joueurs`);
    log.info("Pour changer ce seuil, modifie MAX_PLAYERS_PER_SERVER dans servers.config.ts");

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
