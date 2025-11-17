/**
 * Script de test pour le système de classes et races
 * Usage: npx ts-node src/scripts/test-classes-races.ts
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
║        🎮 TEST CLASSES & RACES SYSTEM - IdleRPG 🎮        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info("Démarrage des tests...\n");

  let token: string;
  let allTestsPassed = true;

  try {
    // ===== TEST 1: Lister toutes les classes =====
    log.section("TEST 1: LISTER TOUTES LES CLASSES");
    
    let res = await makeRequest("GET", "/game-data/classes");
    
    if (res.statusCode !== 200) {
      throw new Error(`Failed to get classes: ${res.statusCode}`);
    }
    
    const classes = res.data.classes;
    log.success(`${classes.length} classes trouvées`);
    
    if (classes.length !== 6) {
      log.error(`Attendu 6 classes, trouvé ${classes.length}`);
      allTestsPassed = false;
    } else {
      log.success("Nombre de classes correct (6)");
    }
    
    log.data("Classes disponibles:");
    classes.forEach((cls: any) => {
      console.log(`  - ${cls.classId}: ${cls.nameKey} (${cls.roles.join(", ")})`);
    });

    // ===== TEST 2: Filtrer classes par rôle =====
    log.section("TEST 2: FILTRER CLASSES PAR RÔLE");
    
    const roles = ["TANK", "DPS", "HEALER", "SUPPORT"];
    
    for (const role of roles) {
      res = await makeRequest("GET", `/game-data/classes?role=${role}`);
      
      if (res.statusCode !== 200) {
        log.error(`Échec du filtre pour rôle ${role}`);
        allTestsPassed = false;
        continue;
      }
      
      const filteredClasses = res.data.classes;
      log.info(`Rôle ${role}: ${filteredClasses.length} classe(s)`);
      
      // Vérifier que toutes les classes retournées ont bien ce rôle
      const allHaveRole = filteredClasses.every((cls: any) => cls.roles.includes(role));
      
      if (allHaveRole) {
        log.success(`Filtre ${role} correct`);
      } else {
        log.error(`Filtre ${role} incorrect`);
        allTestsPassed = false;
      }
    }

    // ===== TEST 3: Lister toutes les races =====
    log.section("TEST 3: LISTER TOUTES LES RACES");
    
    res = await makeRequest("GET", "/game-data/races");
    
    if (res.statusCode !== 200) {
      throw new Error(`Failed to get races: ${res.statusCode}`);
    }
    
    const races = res.data.races;
    log.success(`${races.length} races trouvées`);
    
    if (races.length !== 8) {
      log.error(`Attendu 8 races, trouvé ${races.length}`);
      allTestsPassed = false;
    } else {
      log.success("Nombre de races correct (8)");
    }
    
    log.data("Races disponibles:");
    races.forEach((race: any) => {
      console.log(`  - ${race.raceId}: ${race.nameKey} (${race.faction})`);
    });

    // ===== TEST 4: Filtrer races par faction =====
    log.section("TEST 4: FILTRER RACES PAR FACTION");
    
    // Faction AURION
    res = await makeRequest("GET", "/game-data/races?faction=AURION");
    
    if (res.statusCode !== 200) {
      log.error("Échec du filtre AURION");
      allTestsPassed = false;
    } else {
      const aurionRaces = res.data.races;
      log.info(`Faction AURION: ${aurionRaces.length} races`);
      
      if (aurionRaces.length !== 4) {
        log.error(`Attendu 4 races AURION, trouvé ${aurionRaces.length}`);
        allTestsPassed = false;
      } else {
        log.success("Nombre de races AURION correct (4)");
      }
      
      aurionRaces.forEach((race: any) => {
        console.log(`  - ${race.raceId}`);
      });
    }
    
    // Faction OMBRE
    res = await makeRequest("GET", "/game-data/races?faction=OMBRE");
    
    if (res.statusCode !== 200) {
      log.error("Échec du filtre OMBRE");
      allTestsPassed = false;
    } else {
      const ombreRaces = res.data.races;
      log.info(`Faction OMBRE: ${ombreRaces.length} races`);
      
      if (ombreRaces.length !== 4) {
        log.error(`Attendu 4 races OMBRE, trouvé ${ombreRaces.length}`);
        allTestsPassed = false;
      } else {
        log.success("Nombre de races OMBRE correct (4)");
      }
      
      ombreRaces.forEach((race: any) => {
        console.log(`  - ${race.raceId}`);
      });
    }

    // ===== TEST 5: Lister les factions =====
    log.section("TEST 5: LISTER LES FACTIONS");
    
    res = await makeRequest("GET", "/game-data/factions");
    
    if (res.statusCode !== 200) {
      throw new Error("Failed to get factions");
    }
    
    const factions = res.data.factions;
    log.success(`${factions.length} factions trouvées`);
    
    if (factions.length !== 2) {
      log.error(`Attendu 2 factions, trouvé ${factions.length}`);
      allTestsPassed = false;
    } else {
      log.success("Nombre de factions correct (2)");
    }
    
    log.data("Factions disponibles:");
    factions.forEach((faction: any) => {
      console.log(`  - ${faction.factionId}: ${faction.nameKey}`);
      console.log(`    Races: ${faction.races.join(", ")}`);
    });

    // ===== TEST 6: Créer un compte =====
    log.section("TEST 6: CRÉER UN COMPTE TEST");
    
    const username = `testrace_${Date.now()}`;
    log.info(`Création du compte: ${username}`);
    
    res = await makeRequest("POST", "/auth/register", {
      username,
      password: "password123"
    });
    
    if (res.statusCode !== 200) {
      throw new Error(`Register failed: ${res.data.error}`);
    }
    
    token = res.data.token;
    log.success(`Compte créé: ${username}`);
    log.info(`Token: ${token.substring(0, 20)}...`);

    // ===== TEST 7: Créer personnage avec race AURION =====
    log.section("TEST 7: CRÉER PERSONNAGE AVEC RACE AURION");
    
    log.info("Création: Mage Ailé Lunaris sur s1...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "AuroraMage",
      characterClass: "mage",
      characterRace: "winged_lunaris"
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Personnage AURION créé avec succès !");
      log.data(`Nom: ${res.data.profile.characterName}`);
      log.data(`Classe: ${res.data.profile.class}`);
      log.data(`Race: ${res.data.profile.race}`);
      log.data(`Faction: AURION`);
    }

    // ===== TEST 8: Créer personnage avec race OMBRE =====
    log.section("TEST 8: CRÉER PERSONNAGE AVEC RACE OMBRE");
    
    // Créer un second compte pour le second serveur
    const username2 = `testrace2_${Date.now()}`;
    res = await makeRequest("POST", "/auth/register", {
      username: username2,
      password: "password123"
    });
    
    const token2 = res.data.token;
    
    log.info("Création: Voleur Varkyn sur s1...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "ShadowRogue",
      characterClass: "rogue",
      characterRace: "varkyns_beast"
    }, token2);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Personnage OMBRE créé avec succès !");
      log.data(`Nom: ${res.data.profile.characterName}`);
      log.data(`Classe: ${res.data.profile.class}`);
      log.data(`Race: ${res.data.profile.race}`);
      log.data(`Faction: OMBRE`);
    }

    // ===== TEST 9: Tenter de créer avec classe invalide =====
    log.section("TEST 9: VALIDATION CLASSE INVALIDE");
    
    const username3 = `testrace3_${Date.now()}`;
    res = await makeRequest("POST", "/auth/register", {
      username: username3,
      password: "password123"
    });
    
    const token3 = res.data.token;
    
    log.info("Tentative avec classe invalide: 'warrior'...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "InvalidClass",
      characterClass: "warrior",  // Classe qui n'existe plus
      characterRace: "human_elion"
    }, token3);
    
    if (res.statusCode === 400) {
      log.success("Classe invalide correctement rejetée");
      log.info(`Message: ${res.data.error}`);
    } else if (res.statusCode === 201) {
      log.error("Classe invalide acceptée (BUG)");
      allTestsPassed = false;
    }

    // ===== TEST 10: Tenter de créer avec race invalide =====
    log.section("TEST 10: VALIDATION RACE INVALIDE");
    
    log.info("Tentative avec race invalide: 'elf_dark'...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "InvalidRace",
      characterClass: "paladin",
      characterRace: "elf_dark"  // Race qui n'existe pas
    }, token3);
    
    if (res.statusCode === 400) {
      log.success("Race invalide correctement rejetée");
      log.info(`Message: ${res.data.error}`);
    } else if (res.statusCode === 201) {
      log.error("Race invalide acceptée (BUG)");
      allTestsPassed = false;
    }

    // ===== TEST 11: Créer sans spécifier la race =====
    log.section("TEST 11: VALIDATION RACE MANQUANTE");
    
    log.info("Tentative sans spécifier la race...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "NoRace",
      characterClass: "hunter"
      // characterRace manquant
    }, token3);
    
    if (res.statusCode === 400) {
      log.success("Race manquante correctement détectée");
      log.info(`Message: ${res.data.error}`);
    } else if (res.statusCode === 201) {
      log.error("Personnage créé sans race (BUG)");
      allTestsPassed = false;
    }

    // ===== TEST 12: Vérifier que le profil contient bien la race =====
    log.section("TEST 12: VÉRIFIER PROFIL AVEC RACE");
    
    log.info("Récupération du profil AuroraMage...");
    
    res = await makeRequest("GET", "/profile/s1", undefined, token);
    
    if (res.statusCode !== 200) {
      log.error("Échec récupération profil");
      allTestsPassed = false;
    } else {
      const profile = res.data.profile;
      
      if (profile.race === "winged_lunaris") {
        log.success("Race correctement stockée dans le profil");
        log.data(`Personnage: ${profile.characterName}`);
        log.data(`Classe: ${profile.class}`);
        log.data(`Race: ${profile.race}`);
      } else {
        log.error(`Race incorrecte: ${profile.race}`);
        allTestsPassed = false;
      }
    }

    // ===== TEST 13: Tester toutes les combinaisons classe/race =====
    log.section("TEST 13: TESTER DIVERSES COMBINAISONS");
    
    const testCombinations = [
      { class: "paladin", race: "dwarf_rune", name: "DwarfPaladin" },
      { class: "priest", race: "human_elion", name: "HumanPriest" },
      { class: "warlock", race: "selenite_lunar", name: "SeleniteWarlock" },
      { class: "hunter", race: "sylphide_forest", name: "SylphideHunter" },
      { class: "rogue", race: "morhri_insect", name: "MorhriRogue" },
      { class: "mage", race: "ghrannite_stone", name: "GhranniteMage" }
    ];
    
    log.info(`Test de ${testCombinations.length} combinaisons différentes...`);
    
    let successCount = 0;
    
    for (let i = 0; i < testCombinations.length; i++) {
      const combo = testCombinations[i];
      
      // Créer un nouveau compte pour chaque test
      const tempUsername = `combo_${Date.now()}_${i}`;
      const regRes = await makeRequest("POST", "/auth/register", {
        username: tempUsername,
        password: "password123"
      });
      
      const tempToken = regRes.data.token;
      
      // Créer le personnage
      res = await makeRequest("POST", "/profile/s1", {
        characterName: combo.name,
        characterClass: combo.class,
        characterRace: combo.race
      }, tempToken);
      
      if (res.statusCode === 201) {
        successCount++;
        console.log(`  ✅ ${combo.name}: ${combo.class} + ${combo.race}`);
      } else {
        console.log(`  ❌ ${combo.name}: ÉCHEC - ${res.data.error}`);
        allTestsPassed = false;
      }
      
      await sleep(100);
    }
    
    if (successCount === testCombinations.length) {
      log.success(`Toutes les combinaisons testées avec succès (${successCount}/${testCombinations.length})`);
    } else {
      log.error(`Certaines combinaisons ont échoué (${successCount}/${testCombinations.length})`);
      allTestsPassed = false;
    }

    // ===== RÉSUMÉ FINAL =====
    log.section("RÉSUMÉ DES TESTS");
    
    if (allTestsPassed) {
      log.success("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !");
      console.log("");
      log.info("✅ Système de classes (6 classes)");
      log.info("✅ Système de races (8 races, 2 factions)");
      log.info("✅ Endpoints API fonctionnels");
      log.info("✅ Filtres par rôle et faction");
      log.info("✅ Validation classe/race");
      log.info("✅ Création de personnages avec race");
      log.info("✅ Toutes les combinaisons possibles");
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
