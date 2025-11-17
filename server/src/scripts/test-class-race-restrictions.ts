/**
 * Script de test pour les restrictions classe/race
 * Usage: npx ts-node src/scripts/test-class-race-restrictions.ts
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
║    🛡️  TEST RESTRICTIONS CLASSE/RACE - IdleRPG 🛡️         ║
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
      throw new Error("Failed to get classes");
    }
    
    const classes = res.data.classes;
    log.success(`${classes.length} classes trouvées`);
    
    if (classes.length !== 6) {
      log.error(`Attendu 6 classes, trouvé ${classes.length}`);
      allTestsPassed = false;
    }
    
    log.data("Classes disponibles:");
    classes.forEach((cls: any) => {
      console.log(`  - ${cls.classId}: ${cls.nameKey} (${cls.roles.join(", ")})`);
    });

    // ===== TEST 2: Récupérer les classes autorisées pour Humain =====
    log.section("TEST 2: CLASSES AUTORISÉES POUR HUMAIN");
    
    res = await makeRequest("GET", "/game-data/allowed-classes/human_elion");
    
    if (res.statusCode !== 200) {
      log.error("Échec récupération classes autorisées");
      allTestsPassed = false;
    } else {
      const allowedClasses = res.data.allowedClasses;
      log.success(`${allowedClasses.length} classes autorisées pour Humain`);
      log.data(`Total des classes: ${res.data.totalClasses}`);
      
      console.log("\n  Classes autorisées:");
      allowedClasses.forEach((cls: any) => {
        console.log(`    ✓ ${cls.classId}`);
      });
      
      // Vérifier que Druide n'est PAS dans la liste
      const hasDruid = allowedClasses.some((cls: any) => cls.classId === "druid");
      
      if (hasDruid) {
        log.error("❌ Druide trouvé dans les classes autorisées (BUG)");
        allTestsPassed = false;
      } else {
        log.success("✓ Druide correctement exclu pour les Humains");
      }
      
      // Vérifier que les autres classes sont présentes
      const expectedClasses = ["priest", "mage", "paladin", "rogue", "warrior"];
      const hasAllExpected = expectedClasses.every(expected => 
        allowedClasses.some((cls: any) => cls.classId === expected)
      );
      
      if (hasAllExpected) {
        log.success("✓ Toutes les autres classes sont présentes");
      } else {
        log.error("❌ Certaines classes attendues sont manquantes");
        allTestsPassed = false;
      }
    }

    // ===== TEST 3: Récupérer les classes pour une autre race =====
    log.section("TEST 3: CLASSES AUTORISÉES POUR NAIN");
    
    res = await makeRequest("GET", "/game-data/allowed-classes/dwarf_rune");
    
    if (res.statusCode !== 200) {
      log.error("Échec récupération classes autorisées");
      allTestsPassed = false;
    } else {
      const allowedClasses = res.data.allowedClasses;
      log.success(`${allowedClasses.length} classes autorisées pour Nain`);
      
      console.log("\n  Classes autorisées:");
      allowedClasses.forEach((cls: any) => {
        console.log(`    ✓ ${cls.classId}`);
      });
      
      if (allowedClasses.length === 6) {
        log.success("✓ Nain peut jouer toutes les classes (pas de restrictions)");
      } else {
        log.warning(`⚠️  Nain a des restrictions (${allowedClasses.length}/6 classes)`);
      }
    }

    // ===== TEST 4: Créer un compte =====
    log.section("TEST 4: CRÉER UN COMPTE TEST");
    
    const username = `restriction_${Date.now()}`;
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

    // ===== TEST 5: Créer un Humain Guerrier (autorisé) =====
    log.section("TEST 5: CRÉER HUMAIN GUERRIER (AUTORISÉ)");
    
    log.info("Création: Guerrier Humain...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "HumanWarrior",
      characterClass: "warrior",
      characterRace: "human_elion"
    }, token);
    
    if (res.statusCode === 201) {
      log.success("✓ Humain Guerrier créé avec succès");
      log.data(`Nom: ${res.data.profile.characterName}`);
      log.data(`Classe: ${res.data.profile.class}`);
      log.data(`Race: ${res.data.profile.race}`);
    } else {
      log.error(`❌ Échec création: ${res.data.error}`);
      allTestsPassed = false;
    }

    await sleep(200);

    // ===== TEST 6: Tenter de créer un Humain Druide (interdit) =====
    log.section("TEST 6: CRÉER HUMAIN DRUIDE (INTERDIT)");
    
    log.info("Tentative: Druide Humain (devrait échouer)...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "HumanDruid",
      characterClass: "druid",
      characterRace: "human_elion",
      characterSlot: 2
    }, token);
    
    if (res.statusCode === 400) {
      log.success("✓ Combinaison interdite correctement rejetée");
      log.info(`Message: ${res.data.error}`);
      
      if (res.data.allowedClasses) {
        log.data("Classes autorisées pour Humain:");
        res.data.allowedClasses.forEach((cls: string) => {
          console.log(`    - ${cls}`);
        });
      }
    } else if (res.statusCode === 201) {
      log.error("❌ Combinaison interdite acceptée (BUG)");
      allTestsPassed = false;
    } else {
      log.warning(`⚠️  Code de retour inattendu: ${res.statusCode}`);
      allTestsPassed = false;
    }

    // ===== TEST 7: Créer un Nain Druide (autorisé) =====
    log.section("TEST 7: CRÉER NAIN DRUIDE (AUTORISÉ)");
    
    const username2 = `restriction2_${Date.now()}`;
    res = await makeRequest("POST", "/auth/register", {
      username: username2,
      password: "password123"
    });
    
    const token2 = res.data.token;
    
    log.info("Création: Druide Nain...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "DwarfDruid",
      characterClass: "druid",
      characterRace: "dwarf_rune"
    }, token2);
    
    if (res.statusCode === 201) {
      log.success("✓ Nain Druide créé avec succès");
      log.data(`Nom: ${res.data.profile.characterName}`);
      log.data(`Classe: ${res.data.profile.class}`);
      log.data(`Race: ${res.data.profile.race}`);
    } else {
      log.error(`❌ Échec création: ${res.data.error}`);
      allTestsPassed = false;
    }

    // ===== TEST 8: Tester toutes les combinaisons pour Humain =====
    log.section("TEST 8: TESTER TOUTES LES CLASSES POUR HUMAIN");
    
    const humanClasses = [
      { class: "priest", allowed: true },
      { class: "mage", allowed: true },
      { class: "paladin", allowed: true },
      { class: "rogue", allowed: true },
      { class: "warrior", allowed: true },
      { class: "druid", allowed: false }
    ];
    
    let humanTestsPassed = 0;
    
    for (const test of humanClasses) {
      const tempUsername = `temp_${Date.now()}_${test.class}`;
      const regRes = await makeRequest("POST", "/auth/register", {
        username: tempUsername,
        password: "password123"
      });
      
      const tempToken = regRes.data.token;
      
      res = await makeRequest("POST", "/profile/s1", {
        characterName: `Human${test.class}`,
        characterClass: test.class,
        characterRace: "human_elion"
      }, tempToken);
      
      const success = res.statusCode === 201;
      const expectedResult = test.allowed;
      
      if (success === expectedResult) {
        console.log(`  ✅ ${test.class}: ${expectedResult ? "Autorisé ✓" : "Interdit ✗"}`);
        humanTestsPassed++;
      } else {
        console.log(`  ❌ ${test.class}: ${success ? "Accepté" : "Rejeté"} (attendu: ${expectedResult ? "accepté" : "rejeté"})`);
        allTestsPassed = false;
      }
      
      await sleep(100);
    }
    
    if (humanTestsPassed === humanClasses.length) {
      log.success(`Toutes les restrictions Humain validées (${humanTestsPassed}/${humanClasses.length})`);
    } else {
      log.error(`Certaines restrictions ont échoué (${humanTestsPassed}/${humanClasses.length})`);
      allTestsPassed = false;
    }

    // ===== RÉSUMÉ FINAL =====
    log.section("RÉSUMÉ DES TESTS");
    
    if (allTestsPassed) {
      log.success("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !");
      console.log("");
      log.info("✅ Endpoint des classes autorisées");
      log.info("✅ Restrictions Humain (pas de Druide)");
      log.info("✅ Autres races sans restrictions");
      log.info("✅ Validation côté serveur");
      log.info("✅ Messages d'erreur avec classes autorisées");
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
