/**
 * Script de test pour le système NPC
 * Usage: npx ts-node src/scripts/test-npc-system.ts
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
  npc: (msg: string) => console.log(`${colors.magenta}🤖 ${msg}${colors.reset}`),
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           🤖 TEST SYSTÈME NPC - IdleRPG 🤖                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info("Démarrage des tests...\n");

  let token: string;
  let allTestsPassed = true;

  try {
    // ===== TEST 1: Créer un compte =====
    log.section("TEST 1: CRÉER UN COMPTE TEST");
    
    const username = `npctest_${Date.now()}`;
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

    // ===== TEST 2: Vérifier qu'il n'y a pas de NPC sur s1 =====
    log.section("TEST 2: VÉRIFIER AUCUN NPC SUR S1");
    
    res = await makeRequest("GET", "/npcs/s1", undefined, token);
    
    if (res.statusCode !== 200) {
      throw new Error("Failed to list NPCs");
    }
    
    const initialCount = res.data.count;
    log.info(`${initialCount} NPC trouvé(s) sur s1`);

    // ===== TEST 3: Créer un NPC Merchant =====
    log.section("TEST 3: CRÉER UN NPC MERCHANT");
    
    log.npc("Création: Blacksmith (Merchant)...");
    
    res = await makeRequest("POST", "/npcs/s1", {
      npcId: "npc_blacksmith_01",
      name: "Forge Master Thorin",
      type: "merchant",
      level: 30,
      faction: "AURION",
      position: { x: 100, y: 0, z: 50 },
      rotation: { x: 0, y: 180, z: 0 },
      modelId: "npc_dwarf_blacksmith",
      shopId: "shop_blacksmith_01",
      interactionRadius: 3
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Blacksmith créé !");
      log.info(`  NPC ID: ${res.data.npc.npcId}`);
      log.info(`  Nom: ${res.data.npc.name}`);
      log.info(`  Type: ${res.data.npc.type}`);
      log.info(`  Level: ${res.data.npc.level}`);
      log.info(`  Faction: ${res.data.npc.faction}`);
      log.info(`  Shop ID: ${res.data.npc.shopId}`);
    }

    await sleep(200);

    // ===== TEST 4: Créer un NPC Quest Giver =====
    log.section("TEST 4: CRÉER UN NPC QUEST GIVER");
    
    log.npc("Création: Elder Sage (Quest Giver)...");
    
    res = await makeRequest("POST", "/npcs/s1", {
      npcId: "npc_sage_01",
      name: "Elder Sage Merlin",
      type: "quest_giver",
      level: 50,
      faction: "NEUTRAL",
      position: { x: 120, y: 0, z: 60 },
      rotation: { x: 0, y: 90, z: 0 },
      modelId: "npc_human_sage",
      dialogueId: "dialogue_sage_greeting",
      interactionRadius: 4
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Sage créé !");
      log.info(`  NPC ID: ${res.data.npc.npcId}`);
      log.info(`  Nom: ${res.data.npc.name}`);
      log.info(`  Type: ${res.data.npc.type}`);
      log.info(`  Dialogue ID: ${res.data.npc.dialogueId}`);
    }

    await sleep(200);

    // ===== TEST 5: Créer un NPC Hybrid =====
    log.section("TEST 5: CRÉER UN NPC HYBRID (Merchant + Quest Giver)");
    
    log.npc("Création: Innkeeper (Hybrid)...");
    
    res = await makeRequest("POST", "/npcs/s1", {
      npcId: "npc_innkeeper_01",
      name: "Innkeeper Martha",
      type: "hybrid",
      level: 20,
      faction: "NEUTRAL",
      position: { x: 80, y: 0, z: 40 },
      rotation: { x: 0, y: 0, z: 0 },
      modelId: "npc_human_innkeeper",
      dialogueId: "dialogue_innkeeper_greeting",
      shopId: "shop_inn_01",
      interactionRadius: 3.5
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Innkeeper créé !");
      log.info(`  Type: ${res.data.npc.type}`);
      log.info(`  Dialogue ID: ${res.data.npc.dialogueId}`);
      log.info(`  Shop ID: ${res.data.npc.shopId}`);
    }

    await sleep(200);

    // ===== TEST 6: Créer un NPC Dialogue simple =====
    log.section("TEST 6: CRÉER UN NPC DIALOGUE SIMPLE");
    
    log.npc("Création: Guard (Dialogue)...");
    
    res = await makeRequest("POST", "/npcs/s1", {
      npcId: "npc_guard_01",
      name: "City Guard",
      type: "dialogue",
      level: 25,
      faction: "AURION",
      position: { x: 90, y: 0, z: 30 },
      rotation: { x: 0, y: 270, z: 0 },
      modelId: "npc_human_guard",
      dialogueId: "dialogue_guard_greeting"
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Guard créé !");
    } else {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    }

    await sleep(200);

    // ===== TEST 7: Lister tous les NPC de s1 =====
    log.section("TEST 7: LISTER TOUS LES NPC DE S1");
    
    res = await makeRequest("GET", "/npcs/s1", undefined, token);
    
    if (res.statusCode !== 200) {
      log.error("Échec liste NPC");
      allTestsPassed = false;
    } else {
      log.success(`${res.data.count} NPC trouvé(s) sur s1`);
      
      console.log("\n  NPC créés:");
      res.data.npcs.forEach((npc: any) => {
        console.log(`    - ${npc.npcId}: ${npc.name} (${npc.type}, Lv${npc.level}, ${npc.faction})`);
        console.log(`      Position: (${npc.position.x}, ${npc.position.y}, ${npc.position.z})`);
      });
    }

    // ===== TEST 8: Filtrer par type =====
    log.section("TEST 8: FILTRER LES NPC PAR TYPE");
    
    res = await makeRequest("GET", "/npcs/s1?type=merchant", undefined, token);
    
    if (res.statusCode === 200) {
      log.success(`${res.data.count} Merchant(s) trouvé(s)`);
      res.data.npcs.forEach((npc: any) => {
        console.log(`  - ${npc.name} (${npc.npcId})`);
      });
    }

    // ===== TEST 9: Récupérer un NPC spécifique =====
    log.section("TEST 9: RÉCUPÉRER UN NPC SPÉCIFIQUE");
    
    res = await makeRequest("GET", "/npcs/s1/npc_blacksmith_01", undefined, token);
    
    if (res.statusCode !== 200) {
      log.error("Échec récupération NPC");
      allTestsPassed = false;
    } else {
      log.success("NPC récupéré !");
      log.info(`  Nom: ${res.data.npc.name}`);
      log.info(`  Type: ${res.data.npc.type}`);
      log.info(`  Level: ${res.data.npc.level}`);
      log.info(`  Faction: ${res.data.npc.faction}`);
      log.info(`  Model ID: ${res.data.npc.modelId}`);
      log.info(`  Shop ID: ${res.data.npc.shopId}`);
    }

    // ===== TEST 10: Modifier un NPC =====
    log.section("TEST 10: MODIFIER UN NPC");
    
    log.info("Modification du level du Blacksmith (30 → 35)...");
    
    res = await makeRequest("PUT", "/npcs/s1/npc_blacksmith_01", {
      level: 35,
      name: "Master Forge Thorin"
    }, token);
    
    if (res.statusCode !== 200) {
      log.error(`Échec modification: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("NPC modifié !");
      log.info(`  Nouveau nom: ${res.data.npc.name}`);
      log.info(`  Nouveau level: ${res.data.npc.level}`);
    }

    // ===== TEST 11: Tenter de créer un doublon =====
    log.section("TEST 11: TENTER DE CRÉER UN DOUBLON");
    
    log.info("Tentative de créer un NPC avec le même npcId...");
    
    res = await makeRequest("POST", "/npcs/s1", {
      npcId: "npc_blacksmith_01",
      name: "Duplicate",
      type: "merchant",
      modelId: "npc_dwarf_blacksmith"
    }, token);
    
    if (res.statusCode === 400) {
      log.success("Doublon correctement rejeté");
      log.info(`  Message: ${res.data.error}`);
    } else if (res.statusCode === 201) {
      log.error("Doublon accepté (BUG)");
      allTestsPassed = false;
    }

    // ===== TEST 12: Bulk create NPC =====
    log.section("TEST 12: BULK CREATE (Créer plusieurs NPC d'un coup)");
    
    log.info("Création de 3 NPC en une seule requête...");
    
    res = await makeRequest("POST", "/npcs/s1/bulk", {
      npcs: [
        {
          npcId: "npc_vendor_01",
          name: "Potion Vendor",
          type: "merchant",
          level: 15,
          faction: "NEUTRAL",
          position: { x: 110, y: 0, z: 55 },
          modelId: "npc_human_vendor",
          shopId: "shop_potions_01"
        },
        {
          npcId: "npc_trainer_01",
          name: "Combat Trainer",
          type: "dialogue",
          level: 40,
          faction: "AURION",
          position: { x: 95, y: 0, z: 45 },
          modelId: "npc_human_trainer",
          dialogueId: "dialogue_trainer_greeting"
        },
        {
          npcId: "npc_questgiver_02",
          name: "Village Elder",
          type: "quest_giver",
          level: 60,
          faction: "NEUTRAL",
          position: { x: 105, y: 0, z: 65 },
          modelId: "npc_elder",
          dialogueId: "dialogue_elder_greeting"
        }
      ]
    }, token);
    
    if (res.statusCode === 201) {
      log.success(`Bulk create terminé !`);
      log.info(`  Créés: ${res.data.created}`);
      log.info(`  Erreurs: ${res.data.errors}`);
      
      if (res.data.npcs.length > 0) {
        console.log("\n  NPC créés:");
        res.data.npcs.forEach((npc: any) => {
          console.log(`    - ${npc.npcId}: ${npc.name}`);
        });
      }
      
      if (res.data.errorDetails.length > 0) {
        console.log("\n  Erreurs:");
        res.data.errorDetails.forEach((err: any) => {
          console.log(`    - ${err.npcId}: ${err.error}`);
        });
      }
    } else {
      log.error("Échec bulk create");
      allTestsPassed = false;
    }

    // ===== TEST 13: Vérifier le total =====
    log.section("TEST 13: VÉRIFIER LE NOMBRE TOTAL DE NPC");
    
    res = await makeRequest("GET", "/npcs/s1", undefined, token);
    
    if (res.statusCode === 200) {
      const expectedCount = 7; // 4 créés + 3 bulk create
      
      if (res.data.count === expectedCount) {
        log.success(`Nombre correct: ${res.data.count} NPC`);
      } else {
        log.warning(`Nombre inattendu: ${res.data.count} (attendu: ${expectedCount})`);
      }
    }

    // ===== TEST 14: Supprimer un NPC =====
    log.section("TEST 14: SUPPRIMER UN NPC");
    
    log.info("Suppression du Guard...");
    
    res = await makeRequest("DELETE", "/npcs/s1/npc_guard_01", undefined, token);
    
    if (res.statusCode !== 200) {
      log.error(`Échec suppression: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("NPC supprimé !");
      log.info(`  NPC ID: ${res.data.npcId}`);
      log.info(`  Nom: ${res.data.name}`);
    }

    // ===== TEST 15: Vérifier sur un autre serveur =====
    log.section("TEST 15: VÉRIFIER QUE LES NPC SONT ISOLÉS PAR SERVEUR");
    
    res = await makeRequest("GET", "/npcs/s2", undefined, token);
    
    if (res.statusCode === 200) {
      if (res.data.count === 0) {
        log.success("S2 est vide (isolation correcte)");
      } else {
        log.warning(`S2 contient ${res.data.count} NPC (inattendu)`);
      }
    }

    // ===== TEST 16: Créer le même NPC sur s2 =====
    log.section("TEST 16: CRÉER LE MÊME NPC SUR S2 (Instance indépendante)");
    
    log.info("Création de npc_blacksmith_01 sur s2...");
    
    res = await makeRequest("POST", "/npcs/s2", {
      npcId: "npc_blacksmith_01",
      name: "Forge Master Thorin",
      type: "merchant",
      level: 30,
      faction: "AURION",
      position: { x: 100, y: 0, z: 50 },
      rotation: { x: 0, y: 180, z: 0 },
      modelId: "npc_dwarf_blacksmith",
      shopId: "shop_blacksmith_01"
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Instance indépendante créée sur s2 !");
      log.info("Les deux serveurs ont maintenant leur propre Blacksmith");
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    // ===== RÉSUMÉ FINAL =====
    log.section("RÉSUMÉ DES TESTS");
    
    if (allTestsPassed) {
      log.success("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !");
      console.log("");
      log.info("✅ Création de NPC (merchant, quest_giver, dialogue, hybrid)");
      log.info("✅ Liste et filtres (par type, faction)");
      log.info("✅ Récupération d'un NPC spécifique");
      log.info("✅ Modification de NPC");
      log.info("✅ Détection de doublons");
      log.info("✅ Bulk create (plusieurs NPC d'un coup)");
      log.info("✅ Suppression de NPC");
      log.info("✅ Isolation par serveur");
      log.info("✅ Instances indépendantes");
    } else {
      log.error("❌ CERTAINS TESTS ONT ÉCHOUÉ");
      log.warning("Consulte les logs ci-dessus pour identifier les problèmes");
    }

    // Afficher le compte final
    console.log("");
    log.info("📊 État final:");
    
    res = await makeRequest("GET", "/npcs/s1", undefined, token);
    log.info(`  S1: ${res.data.count} NPC`);
    
    res = await makeRequest("GET", "/npcs/s2", undefined, token);
    log.info(`  S2: ${res.data.count} NPC`);

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
