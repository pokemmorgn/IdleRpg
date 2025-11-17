/**
 * Script de test pour le système multi-personnages
 * Usage: npx ts-node src/scripts/test-multi-characters.ts
 */

import http from "http";
import { MAX_CHARACTERS_PER_SERVER } from "../config/character.config";

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
  data: (msg: string) => console.log(`${colors.magenta}📊 ${msg}${colors.reset}`),
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║      👥 TEST MULTI-PERSONNAGES SYSTEM - IdleRPG 👥        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info(`Max personnages par serveur: ${MAX_CHARACTERS_PER_SERVER}`);
  log.info("Démarrage des tests...\n");

  let token: string;
  let allTestsPassed = true;

  try {
    // ===== TEST 1: Créer un compte =====
    log.section("TEST 1: CRÉER UN COMPTE TEST");
    
    const username = `multichar_${Date.now()}`;
    log.info(`Création du compte: ${username}`);
    
    let res = await makeRequest("POST", "/auth/register", {
      username,
      password: "password123"
    });
    
    if (res.statusCode !== 200) {
      throw new Error(`Register failed: ${res.data.error}`);
    }
    
    token = res.data.token;
    log.success(`Compte créé: ${username}`);

    // ===== TEST 2: Vérifier qu'il n'y a pas de profil =====
    log.section("TEST 2: VÉRIFIER AUCUN PROFIL SUR S1");
    
    res = await makeRequest("GET", "/profile/s1", undefined, token);
    
    if (res.statusCode !== 200) {
      throw new Error("Failed to check profile");
    }
    
    if (res.data.exists === false && res.data.characterCount === 0) {
      log.success("Aucun profil sur s1 (attendu)");
      log.data(`Max personnages: ${res.data.maxCharacters}`);
    } else {
      log.error("Des profils existent déjà (inattendu)");
      allTestsPassed = false;
    }

    // ===== TEST 3: Créer le premier personnage =====
    log.section("TEST 3: CRÉER LE PREMIER PERSONNAGE");
    
    log.info("Création: Paladin Nain (slot auto)...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "TankDwarf",
      characterClass: "paladin",
      characterRace: "dwarf_rune"
      // Pas de characterSlot spécifié, doit prendre slot 1
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Premier personnage créé !");
      log.data(`Nom: ${res.data.profile.characterName}`);
      log.data(`Slot: ${res.data.profile.characterSlot}`);
      log.data(`Classe: ${res.data.profile.class}`);
      log.data(`Race: ${res.data.profile.race}`);
      log.data(`Personnages: ${res.data.characterCount}/${res.data.maxCharacters}`);
      
      if (res.data.profile.characterSlot !== 1) {
        log.error(`Slot incorrect: ${res.data.profile.characterSlot} (attendu: 1)`);
        allTestsPassed = false;
      }
    }

    await sleep(200);

    // ===== TEST 4: Créer le deuxième personnage =====
    log.section("TEST 4: CRÉER LE DEUXIÈME PERSONNAGE");
    
    log.info("Création: Mage Ailé (slot auto)...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "MagicWings",
      characterClass: "mage",
      characterRace: "winged_lunaris"
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Deuxième personnage créé !");
      log.data(`Nom: ${res.data.profile.characterName}`);
      log.data(`Slot: ${res.data.profile.characterSlot}`);
      log.data(`Personnages: ${res.data.characterCount}/${res.data.maxCharacters}`);
      
      if (res.data.profile.characterSlot !== 2) {
        log.error(`Slot incorrect: ${res.data.profile.characterSlot} (attendu: 2)`);
        allTestsPassed = false;
      }
    }

    await sleep(200);

    // ===== TEST 5: Créer avec slot spécifique =====
    log.section("TEST 5: CRÉER AVEC SLOT SPÉCIFIQUE (Slot 5)");
    
    log.info("Création: Voleur Varkyn (slot 5 manuel)...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "ShadowVarkyn",
      characterClass: "rogue",
      characterRace: "varkyns_beast",
      characterSlot: 5
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Personnage créé au slot 5 !");
      log.data(`Nom: ${res.data.profile.characterName}`);
      log.data(`Slot: ${res.data.profile.characterSlot}`);
      log.data(`Personnages: ${res.data.characterCount}/${res.data.maxCharacters}`);
      
      if (res.data.profile.characterSlot !== 5) {
        log.error(`Slot incorrect: ${res.data.profile.characterSlot} (attendu: 5)`);
        allTestsPassed = false;
      }
    }

    await sleep(200);

    // ===== TEST 6: Tenter de réutiliser un slot occupé =====
    log.section("TEST 6: TENTER DE RÉUTILISER LE SLOT 1");
    
    log.info("Tentative de créer un personnage au slot 1 (déjà occupé)...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "DuplicateSlot",
      characterClass: "priest",
      characterRace: "human_elion",
      characterSlot: 1
    }, token);
    
    if (res.statusCode === 400) {
      log.success("Slot occupé correctement rejeté");
      log.info(`Message: ${res.data.error}`);
      log.data(`Personnage existant: ${res.data.existingCharacter}`);
    } else if (res.statusCode === 201) {
      log.error("Slot occupé accepté (BUG)");
      allTestsPassed = false;
    }

    // ===== TEST 7: Lister tous les profils sur s1 =====
    log.section("TEST 7: LISTER TOUS LES PROFILS SUR S1");
    
    res = await makeRequest("GET", "/profile/s1", undefined, token);
    
    if (res.statusCode !== 200) {
      log.error("Échec récupération profils");
      allTestsPassed = false;
    } else {
      log.success(`${res.data.characterCount} personnages trouvés`);
      log.data(`Max: ${res.data.maxCharacters}`);
      
      if (res.data.characterCount !== 3) {
        log.error(`Nombre incorrect: ${res.data.characterCount} (attendu: 3)`);
        allTestsPassed = false;
      }
      
      console.log("\n  Personnages:");
      res.data.profiles.forEach((p: any) => {
        console.log(`    Slot ${p.characterSlot}: ${p.characterName} (Lv${p.level} ${p.class}/${p.race})`);
      });
    }

    // ===== TEST 8: Créer les 2 personnages restants =====
    log.section(`TEST 8: REMPLIR LES SLOTS RESTANTS (${MAX_CHARACTERS_PER_SERVER} max)`);
    
    const remainingSlots = [
      { slot: 3, name: "HunterSylph", class: "hunter", race: "sylphide_forest" },
      { slot: 4, name: "WarlockSelen", class: "warlock", race: "selenite_lunar" }
    ];
    
    for (const char of remainingSlots) {
      log.info(`Création: ${char.name} au slot ${char.slot}...`);
      
      res = await makeRequest("POST", "/profile/s1", {
        characterName: char.name,
        characterClass: char.class,
        characterRace: char.race,
        characterSlot: char.slot
      }, token);
      
      if (res.statusCode === 201) {
        log.success(`${char.name} créé au slot ${char.slot}`);
      } else {
        log.error(`Échec: ${res.data.error}`);
        allTestsPassed = false;
      }
      
      await sleep(200);
    }

    // ===== TEST 9: Vérifier qu'on a atteint la limite =====
    log.section("TEST 9: VÉRIFIER LA LIMITE ATTEINTE");
    
    res = await makeRequest("GET", "/profile/s1", undefined, token);
    
    if (res.data.characterCount === MAX_CHARACTERS_PER_SERVER) {
      log.success(`Limite atteinte: ${res.data.characterCount}/${res.data.maxCharacters} personnages`);
    } else {
      log.error(`Nombre incorrect: ${res.data.characterCount}/${res.data.maxCharacters}`);
      allTestsPassed = false;
    }

    // ===== TEST 10: Tenter de créer un 6ème personnage =====
    log.section("TEST 10: TENTER DE DÉPASSER LA LIMITE");
    
    log.info(`Tentative de créer un ${MAX_CHARACTERS_PER_SERVER + 1}ème personnage...`);
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "TooMany",
      characterClass: "priest",
      characterRace: "human_elion"
    }, token);
    
    if (res.statusCode === 400) {
      log.success("Limite correctement respectée");
      log.info(`Message: ${res.data.error}`);
      log.data(`Personnages actuels: ${res.data.currentCount}`);
    } else if (res.statusCode === 201) {
      log.error("Limite dépassée (BUG)");
      allTestsPassed = false;
    }

    // ===== TEST 11: Supprimer un personnage =====
    log.section("TEST 11: SUPPRIMER UN PERSONNAGE (Slot 3)");
    
    log.info("Suppression du personnage au slot 3...");
    
    res = await makeRequest("DELETE", "/profile/s1/3", undefined, token);
    
    if (res.statusCode !== 200) {
      log.error(`Échec suppression: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Personnage supprimé !");
      log.data(`Nom: ${res.data.characterName}`);
      log.data(`Slot: ${res.data.characterSlot}`);
    }

    await sleep(200);

    // ===== TEST 12: Vérifier qu'on peut recréer dans le slot libre =====
    log.section("TEST 12: RECRÉER DANS LE SLOT LIBÉRÉ");
    
    log.info("Création d'un nouveau personnage au slot 3...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "NewHunter",
      characterClass: "hunter",
      characterRace: "morhri_insect",
      characterSlot: 3
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Personnage recréé au slot 3 !");
      log.data(`Nom: ${res.data.profile.characterName}`);
      log.data(`Slot: ${res.data.profile.characterSlot}`);
    }

    // ===== TEST 13: Vérifier le compteur de serveur =====
    log.section("TEST 13: VÉRIFIER LE COMPTEUR DE SERVEUR");
    
    log.info("Vérification du nombre de comptes uniques sur s1...");
    
    res = await makeRequest("GET", "/servers/s1");
    
    if (res.statusCode !== 200) {
      log.error("Échec récupération serveur");
      allTestsPassed = false;
    } else {
      const currentPlayers = res.data.currentPlayers;
      log.data(`Comptes uniques sur s1: ${currentPlayers}`);
      
      if (currentPlayers === 1) {
        log.success("Compteur correct: 1 compte unique malgré 5 personnages");
      } else {
        log.error(`Compteur incorrect: ${currentPlayers} (attendu: 1)`);
        allTestsPassed = false;
      }
    }

    // ===== TEST 14: Créer un second compte =====
    log.section("TEST 14: CRÉER UN SECOND COMPTE SUR S1");
    
    const username2 = `multichar2_${Date.now()}`;
    log.info(`Création du compte: ${username2}`);
    
    res = await makeRequest("POST", "/auth/register", {
      username: username2,
      password: "password123"
    });
    
    const token2 = res.data.token;
    log.success(`Compte créé: ${username2}`);
    
    log.info("Création d'un personnage avec le 2ème compte...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "SecondAccount",
      characterClass: "paladin",
      characterRace: "ghrannite_stone"
    }, token2);
    
    if (res.statusCode === 201) {
      log.success("Personnage du 2ème compte créé !");
    }

    await sleep(500);

    // ===== TEST 15: Vérifier que le compteur a augmenté =====
    log.section("TEST 15: VÉRIFIER L'AUGMENTATION DU COMPTEUR");
    
    res = await makeRequest("GET", "/servers/s1");
    
    if (res.statusCode !== 200) {
      log.error("Échec récupération serveur");
      allTestsPassed = false;
    } else {
      const currentPlayers = res.data.currentPlayers;
      log.data(`Comptes uniques sur s1: ${currentPlayers}`);
      
      if (currentPlayers === 2) {
        log.success("Compteur correct: 2 comptes uniques");
      } else {
        log.error(`Compteur incorrect: ${currentPlayers} (attendu: 2)`);
        allTestsPassed = false;
      }
    }

    // ===== TEST 16: Lister tous les profils du premier compte =====
    log.section("TEST 16: LISTER TOUS LES PROFILS (Tous serveurs)");
    
    res = await makeRequest("GET", "/profile", undefined, token);
    
    if (res.statusCode !== 200) {
      log.error("Échec récupération profils");
      allTestsPassed = false;
    } else {
      log.success(`${res.data.totalCharacters} personnages au total`);
      
      console.log("\n  Personnages:");
      res.data.profiles.forEach((p: any) => {
        console.log(`    ${p.serverId} - Slot ${p.characterSlot}: ${p.characterName} (Lv${p.level} ${p.class})`);
      });
    }

    // ===== RÉSUMÉ FINAL =====
    log.section("RÉSUMÉ DES TESTS");
    
    if (allTestsPassed) {
      log.success("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !");
      console.log("");
      log.info(`✅ Système multi-personnages (${MAX_CHARACTERS_PER_SERVER} max)`);
      log.info("✅ Slots automatiques et manuels");
      log.info("✅ Validation des slots occupés");
      log.info("✅ Limite de personnages respectée");
      log.info("✅ Suppression et recréation");
      log.info("✅ Compteur basé sur comptes uniques");
      log.info("✅ Plusieurs comptes sur même serveur");
    } else {
      log.error("❌ CERTAINS TESTS ONT ÉCHOUÉ");
      log.warning("Consulte les logs ci-dessus pour identifier les problèmes");
    }

  } catch (error: any) {
    log.section("❌ ÉCHEC CRITIQUE");
    log.error("Un test critique a échoué");
    log.error(error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
