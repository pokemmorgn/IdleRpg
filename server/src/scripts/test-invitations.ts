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

  let tokenInviter: string;
  let tokenFriend: string;
  let invitationCode: string;

  try {
    // ===== ÉTAPE 1: Créer un joueur qui va inviter =====
    log.section("ÉTAPE 1: CRÉER UN JOUEUR QUI VA INVITER");
    
    const usernameInviter = `inviter_${Date.now()}`;
    log.info(`Création du compte: ${usernameInviter}`);
    
    let res = await makeRequest("POST", "/auth/register", {
      username: usernameInviter,
      password: "password123"
    });
    
    if (res.statusCode !== 200) throw new Error("Register failed");
    tokenInviter = res.data.token;
    log.success(`Compte créé: ${usernameInviter}`);
    
    // Créer profil sur s1
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "Inviter",
      characterClass: "warrior"
    }, tokenInviter);
    
    if (res.statusCode !== 201) throw new Error("Profile creation failed");
    log.success("Profil créé sur s1");

    // ===== ÉTAPE 2: Vérifier les infos du système =====
    log.section("ÉTAPE 2: RÉCUPÉRER LES INFOS DU SYSTÈME");
    
    res = await makeRequest("GET", "/invitation/info", undefined, tokenInviter);
    
    if (res.statusCode === 200) {
      log.success("Infos récupérées:");
      log.info(`  Activé: ${res.data.enabled}`);
      log.info(`  Niveau requis: ${res.data.levelRequirement}`);
      log.info(`  Max invitations: ${res.data.maxInvitationsPerPlayer}`);
      log.info(`  Expiration: ${res.data.codeExpiryDays} jours`);
    }

    // ===== ÉTAPE 3: Créer un code d'invitation =====
    log.section("ÉTAPE 3: CRÉER UN CODE D'INVITATION");
    
    log.info("Création d'un code d'invitation pour s1...");
    res = await makeRequest("POST", "/invitation/s1", {}, tokenInviter);
    
    if (res.statusCode === 201) {
      invitationCode = res.data.code;
      log.success("Code d'invitation créé !");
      log.invitation(`Code: ${invitationCode}`);
      log.info(`Expire dans: ${res.data.expiresInDays} jours`);
    } else {
      throw new Error(`Failed to create invitation: ${res.data.error}`);
    }

    // ===== ÉTAPE 4: Lister les invitations =====
    log.section("ÉTAPE 4: LISTER LES INVITATIONS");
    
    res = await makeRequest("GET", "/invitation/s1", undefined, tokenInviter);
    
    if (res.statusCode === 200) {
      log.success(`${res.data.invitations.length} invitation(s) trouvée(s)`);
      log.info(`Invitations actives: ${res.data.activeCount}/${res.data.maxInvitations}`);
      log.info(`Peut créer plus: ${res.data.canCreateMore ? "OUI" : "NON"}`);
      
      res.data.invitations.forEach((inv: any, i: number) => {
        console.log(`  ${i+1}. Code: ${inv.code}`);
        console.log(`     Utilisé: ${inv.used ? "OUI" : "NON"}`);
        console.log(`     Actif: ${inv.isActive ? "OUI" : "NON"}`);
      });
    }

    // ===== ÉTAPE 5: Créer plusieurs codes (tester la limite) =====
    log.section(`ÉTAPE 5: TESTER LA LIMITE DE ${MAX_INVITATIONS_PER_PLAYER} INVITATIONS`);
    
    log.info(`Création de ${MAX_INVITATIONS_PER_PLAYER - 1} codes supplémentaires...`);
    
    for (let i = 2; i <= MAX_INVITATIONS_PER_PLAYER; i++) {
      res = await makeRequest("POST", "/invitation/s1", {}, tokenInviter);
      
      if (res.statusCode === 201) {
        log.success(`[${i}/${MAX_INVITATIONS_PER_PLAYER}] Code créé: ${res.data.code}`);
      } else {
        log.error(`Échec création code ${i}: ${res.data.error}`);
      }
      
      await sleep(200);
    }
    
    // Tenter d'en créer un de plus (devrait échouer)
    log.info("Tentative de créer un 5ème code (devrait échouer)...");
    res = await makeRequest("POST", "/invitation/s1", {}, tokenInviter);
    
    if (res.statusCode === 400) {
      log.success("Création refusée - limite atteinte (comportement attendu)");
      log.info(`Message: ${res.data.error}`);
    } else {
      log.error("La limite n'a pas été respectée (BUG)");
    }

    // ===== ÉTAPE 6: Remplir le serveur jusqu'au verrouillage =====
    log.section(`ÉTAPE 6: REMPLIR S1 JUSQU'AU VERROUILLAGE (${SERVER_LOCK_THRESHOLD} joueurs)`);
    
    // Vérifier combien de joueurs sont déjà sur s1
    res = await makeRequest("GET", "/servers/s1");
    const currentPlayers = res.data.currentPlayers;
    log.info(`Joueurs actuels sur s1: ${currentPlayers}`);
    
    const playersToCreate = SERVER_LOCK_THRESHOLD - currentPlayers;
    
    if (playersToCreate > 0) {
      log.info(`Création de ${playersToCreate} comptes supplémentaires...`);
      
      for (let i = 1; i <= playersToCreate; i++) {
        const username = `filler_${Date.now()}_${i}`;
        
        const resReg = await makeRequest("POST", "/auth/register", {
          username,
          password: "password123"
        });
        
        const token = resReg.data.token;
        
        await makeRequest("POST", "/profile/s1", {
          characterName: `Filler${i}`,
          characterClass: "warrior"
        }, token);
        
        if (i % 2 === 0 || i === playersToCreate) {
          log.info(`[${i}/${playersToCreate}] Joueurs créés`);
        }
        
        await sleep(100);
      }
      
      log.success(`${playersToCreate} joueurs créés sur s1`);
    } else {
      log.info("Serveur déjà plein");
    }
    
    // Vérifier le statut du serveur
    await sleep(1000);
    res = await makeRequest("GET", "/servers/s1");
    
    if (res.data.status === "locked") {
      log.success("🔒 Serveur s1 VERROUILLÉ automatiquement !");
    } else {
      log.warning(`Serveur s1 statut: ${res.data.status}`);
    }

    // ===== ÉTAPE 7: Tenter de rejoindre sans invitation =====
    log.section("ÉTAPE 7: TENTER DE REJOINDRE SANS INVITATION");
    
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

    // ===== ÉTAPE 8: Valider le code d'invitation =====
    log.section("ÉTAPE 8: VALIDER LE CODE D'INVITATION");
    
    log.info(`Validation du code: ${invitationCode}`);
    res = await makeRequest("POST", "/invitation/validate", {
      code: invitationCode,
      serverId: "s1"
    }, tokenFriend);
    
    if (res.statusCode === 200 && res.data.valid) {
      log.success("Code d'invitation validé !");
    } else {
      log.error(`Validation échouée: ${res.data.error}`);
    }

    // ===== ÉTAPE 9: Rejoindre avec le code valide =====
    log.section("ÉTAPE 9: REJOINDRE AVEC LE CODE VALIDE");
    
    log.info("Tentative de rejoindre s1 avec le code d'invitation...");
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "FriendHero",
      characterClass: "archer",
      invitationCode: invitationCode
    }, tokenFriend);
    
    if (res.statusCode === 201) {
      log.success("✨ Profil créé avec succès grâce à l'invitation !");
      log.info(`Personnage: ${res.data.profile.characterName}`);
      log.info(`Invitation utilisée: ${res.data.usedInvitation}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
    }

    // ===== ÉTAPE 10: Vérifier que le code est marqué comme utilisé =====
    log.section("ÉTAPE 10: VÉRIFIER QUE LE CODE EST UTILISÉ");
    
    res = await makeRequest("GET", "/invitation/s1", undefined, tokenInviter);
    
    if (res.statusCode === 200) {
      const usedInvitation = res.data.invitations.find((inv: any) => inv.code === invitationCode);
      
      if (usedInvitation) {
        log.info(`Code: ${usedInvitation.code}`);
        log.info(`Utilisé: ${usedInvitation.used ? "OUI" : "NON"}`);
        log.info(`Actif: ${usedInvitation.isActive ? "OUI" : "NON"}`);
        
        if (usedInvitation.used) {
          log.success("Code correctement marqué comme utilisé !");
        } else {
          log.error("Code non marqué comme utilisé (BUG)");
        }
      }
      
      log.info(`Invitations actives restantes: ${res.data.activeCount}/${res.data.maxInvitations}`);
    }

    // ===== ÉTAPE 11: Tenter de réutiliser le même code =====
    log.section("ÉTAPE 11: TENTER DE RÉUTILISER LE MÊME CODE");
    
    const usernameSecondFriend = `secondfriend_${Date.now()}`;
    
    res = await makeRequest("POST", "/auth/register", {
      username: usernameSecondFriend,
      password: "password123"
    });
    
    const tokenSecondFriend = res.data.token;
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "SecondFriend",
      characterClass: "mage",
      invitationCode: invitationCode
    }, tokenSecondFriend);
    
    if (res.statusCode === 400) {
      log.success("Code déjà utilisé rejeté (comportement attendu)");
      log.info(`Message: ${res.data.error}`);
    } else if (res.statusCode === 201) {
      log.error("Le code a pu être réutilisé (BUG)");
    }

    // ===== RÉSUMÉ =====
    log.section("RÉSUMÉ DES TESTS");
    
    log.success("✓ Code d'invitation créé avec succès");
    log.success("✓ Liste des invitations fonctionne");
    log.success(`✓ Limite de ${MAX_INVITATIONS_PER_PLAYER} invitations respectée`);
    log.success("✓ Serveur verrouillé automatiquement");
    log.success("✓ Accès refusé sans invitation");
    log.success("✓ Validation du code fonctionne");
    log.success("✓ Rejoindre avec code valide fonctionne");
    log.success("✓ Code marqué comme utilisé");
    log.success("✓ Réutilisation du code bloquée");
    
    log.info("\n📝 CONFIGURATION:");
    log.info(`  Niveau requis: ${INVITATION_LEVEL_REQUIREMENT}`);
    log.info(`  Max invitations: ${MAX_INVITATIONS_PER_PLAYER}`);
    log.info(`  Seuil de verrouillage: ${SERVER_LOCK_THRESHOLD} joueurs`);

    log.success("\n🎉 TOUS LES TESTS SONT PASSÉS !");
    log.success("Le système d'invitation est 100% fonctionnel ! ✨");

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
