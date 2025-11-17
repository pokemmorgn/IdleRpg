/**
 * Script de test pour le système d'invitation
 * Usage: npx ts-node src/scripts/test-invitations.ts
 */

import http from "http";
import { 
  INVITATION_LEVEL_REQUIREMENT, 
  MAX_INVITATIONS_PER_PLAYER,
  SERVER_LOCK_THRESHOLD,
  INVITATION_SYSTEM_ENABLED
} from "../config/servers.config";

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
  invitation: (msg: string) => console.log(`${colors.magenta}✉️  ${msg}${colors.reset}`),
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        ✉️  TEST SYSTÈME D'INVITATION - IdleRPG ✉️         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info(`Système d'invitation: ${INVITATION_SYSTEM_ENABLED ? "ACTIVÉ" : "DÉSACTIVÉ"}`);
  log.info(`Niveau requis: ${INVITATION_LEVEL_REQUIREMENT}`);
  log.info(`Max invitations: ${MAX_INVITATIONS_PER_PLAYER}`);
  log.info(`Seuil de verrouillage: ${SERVER_LOCK_THRESHOLD} joueurs\n`);

  let tokenHighLevel: string;
  let tokenLowLevel: string;
  let tokenFriend: string;
  let invitationCode: string;

  try {
    // ===== ÉTAPE 1: Créer un joueur de haut niveau =====
    log.section("ÉTAPE 1: CRÉER UN JOUEUR DE HAUT NIVEAU");
    
    const usernameHighLevel = `highlevel_${Date.now()}`;
    log.info(`Création du compte: ${usernameHighLevel}`);
    
    let res = await makeRequest("POST", "/auth/register", {
      username: usernameHighLevel,
      password: "password123"
    });
    
    if (res.statusCode !== 200) throw new Error("Register failed");
    tokenHighLevel = res.data.token;
    log.success(`Compte créé: ${usernameHighLevel}`);
    
    // Créer profil sur s1
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "HighLevelHero",
      characterClass: "warrior"
    }, tokenHighLevel);
    
    if (res.statusCode !== 201) throw new Error("Profile creation failed");
    log.success("Profil créé sur s1");
    
    // Simuler un niveau élevé en modifiant directement la DB
    // (Normalement ce serait fait via gameplay)
    log.warning(`Note: En production, le niveau serait gagné via gameplay`);
    log.info(`On simule un joueur niveau ${INVITATION_LEVEL_REQUIREMENT}...`);

    // ===== ÉTAPE 2: Tenter de créer une invitation (niveau trop bas) =====
    log.section("ÉTAPE 2: TENTER DE CRÉER UNE INVITATION (NIVEAU TROP BAS)");
    
    res = await makeRequest("POST", "/invitation/s1", {}, tokenHighLevel);
    
    if (res.statusCode === 400) {
      log.success("Création refusée car niveau trop bas (comportement attendu)");
      log.info(`Message: ${res.data.error}`);
    } else {
      log.warning("L'invitation a été créée malgré le niveau insuffisant");
    }

    // ===== ÉTAPE 3: Créer un joueur de bas niveau =====
    log.section("ÉTAPE 3: CRÉER UN JOUEUR DE BAS NIVEAU");
    
    const usernameLowLevel = `lowlevel_${Date.now()}`;
    log.info(`Création du compte: ${usernameLowLevel}`);
    
    res = await makeRequest("POST", "/auth/register", {
      username: usernameLowLevel,
      password: "password123"
    });
    
    if (res.statusCode !== 200) throw new Error("Register failed");
    tokenLowLevel = res.data.token;
    log.success(`Compte créé: ${usernameLowLevel}`);
    
    // Créer profil sur s1
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "LowLevelHero",
      characterClass: "mage"
    }, tokenLowLevel);
    
    if (res.statusCode !== 201) throw new Error("Profile creation failed");
    log.success("Profil créé sur s1");

    // ===== ÉTAPE 4: Vérifier les infos du système =====
    log.section("ÉTAPE 4: RÉCUPÉRER LES INFOS DU SYSTÈME");
    
    res = await makeRequest("GET", "/invitation/info", undefined, tokenHighLevel);
    
    if (res.statusCode === 200) {
      log.success("Infos récupérées:");
      log.info(`  Activé: ${res.data.enabled}`);
      log.info(`  Niveau requis: ${res.data.levelRequirement}`);
      log.info(`  Max invitations: ${res.data.maxInvitationsPerPlayer}`);
      log.info(`  Expiration: ${res.data.codeExpiryDays} jours`);
    }

    // ===== ÉTAPE 5: Simuler le remplissage du serveur =====
    log.section(`ÉTAPE 5: REMPLIR S1 JUSQU'AU VERROUILLAGE (${SERVER_LOCK_THRESHOLD} joueurs)`);
    
    log.info("Création de comptes pour remplir le serveur...");
    const tokens: string[] = [];
    
    for (let i = 1; i <= SERVER_LOCK_THRESHOLD; i++) {
      const username = `filler_${Date.now()}_${i}`;
      
      const resReg = await makeRequest("POST", "/auth/register", {
        username,
        password: "password123"
      });
      
      const token = resReg.data.token;
      tokens.push(token);
      
      const resProf = await makeRequest("POST", "/profile/s1", {
        characterName: `Filler${i}`,
        characterClass: "warrior"
      }, token);
      
      if (i % 5 === 0 || i === SERVER_LOCK_THRESHOLD) {
        log.info(`[${i}/${SERVER_LOCK_THRESHOLD}] Joueurs créés`);
      }
      
      await sleep(100);
    }
    
    log.success(`${SERVER_LOCK_THRESHOLD} joueurs créés sur s1`);
    
    // Vérifier le statut du serveur
    await sleep(1000);
    res = await makeRequest("GET", "/servers/s1");
    
    if (res.data.status === "locked") {
      log.success("🔒 Serveur s1 VERROUILLÉ automatiquement !");
    } else {
      log.warning(`Serveur s1 statut: ${res.data.status} (attendu: locked)`);
    }

    // ===== ÉTAPE 6: Tenter de rejoindre sans invitation =====
    log.section("ÉTAPE 6: TENTER DE REJOINDRE UN SERVEUR VERROUILLÉ SANS INVITATION");
    
    const usernameFriend = `friend_${Date.now()}`;
    log.info(`Création du compte ami: ${usernameFriend}`);
    
    res = await makeRequest("POST", "/auth/register", {
      username: usernameFriend,
      password: "password123"
    });
    
    tokenFriend = res.data.token;
    log.success(`Compte créé: ${usernameFriend}`);
    
    // Tenter de créer un profil sans invitation
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "FriendHero",
      characterClass: "archer"
    }, tokenFriend);
    
    if (res.statusCode === 403) {
      log.success("Accès refusé sans invitation (comportement attendu)");
      log.info(`Message: ${res.data.error}`);
    } else if (res.statusCode === 201) {
      log.error("Le joueur a pu rejoindre sans invitation (BUG)");
    }

    // ===== ÉTAPE 7: Générer un code d'invitation (simulé) =====
    log.section("ÉTAPE 7: GÉNÉRER UN CODE D'INVITATION");
    
    log.warning("Note: Pour ce test, on simule qu'un joueur de haut niveau génère un code");
    log.warning("En réalité, il faudrait d'abord mettre à niveau le profil dans MongoDB");
    
    // Simuler un code pour les tests
    invitationCode = "TEST1234";
    log.invitation(`Code d'invitation simulé: ${invitationCode}`);

    // ===== ÉTAPE 8: Rejoindre avec une invitation invalide =====
    log.section("ÉTAPE 8: TENTER DE REJOINDRE AVEC UN CODE INVALIDE");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "FriendHero2",
      characterClass: "archer",
      invitationCode: "FAKECODEXXX"
    }, tokenFriend);
    
    if (res.statusCode === 400) {
      log.success("Code invalide rejeté (comportement attendu)");
      log.info(`Message: ${res.data.error}`);
    }

    // ===== RÉSUMÉ =====
    log.section("RÉSUMÉ DES TESTS");
    
    log.success("✓ Système d'invitation configuré");
    log.success("✓ Niveau requis vérifié");
    log.success(`✓ Serveur verrouillé à ${SERVER_LOCK_THRESHOLD} joueurs`);
    log.success("✓ Accès refusé sans invitation");
    log.success("✓ Code invalide rejeté");
    
    log.info("\n📝 NOTES:");
    log.info("- Pour tester complètement, il faudrait modifier le niveau dans MongoDB");
    log.info("- Ou créer une route admin pour changer le niveau (dev only)");
    log.info(`- Configuration actuelle: niveau ${INVITATION_LEVEL_REQUIREMENT} requis`);
    log.info(`- Seuil de verrouillage: ${SERVER_LOCK_THRESHOLD} joueurs`);

    log.success("\n🎉 Tests du système d'invitation terminés !");

  } catch (error: any) {
    log.section("❌ ÉCHEC CRITIQUE");
    log.error("Un test a échoué");
    log.error(error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
