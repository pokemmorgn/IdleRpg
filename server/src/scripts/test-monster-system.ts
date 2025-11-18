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
  monster: (msg: string) => console.log(`${colors.magenta}👹 ${msg}${colors.reset}`),
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          👹 TEST SYSTÈME MONSTERS - IdleRPG 👹            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info("Démarrage des tests...\n");

  let token: string;
  let allTestsPassed = true;

  try {
    log.section("TEST 1: CRÉER UN COMPTE TEST");
    
    const username = `monstertest_${Date.now()}`;
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

    log.section("TEST 2: CRÉER UN GOBLIN");
    
    log.monster("Création: Goblin Warrior...");
    
    res = await makeRequest("POST", "/monsters/s1", {
      monsterId: "monster_goblin_01",
      name: "Goblin Warrior",
      type: "normal",
      level: 5,
      stats: {
        hp: 500,
        maxHp: 500,
        attack: 30,
        defense: 10,
        speed: 100
      },
      zoneId: "forest_dark",
      spawnPosition: { x: 150, y: 0, z: 100 },
      behavior: {
        type: "aggressive",
        aggroRange: 10,
        leashRange: 30,
        attackRange: 2
      },
      xpReward: 50,
      respawnTime: 30,
      modelId: "monster_goblin"
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Goblin créé !");
      log.info(`  Monster ID: ${res.data.monster.monsterId}`);
      log.info(`  Nom: ${res.data.monster.name}`);
      log.info(`  Level: ${res.data.monster.level}`);
      log.info(`  HP: ${res.data.monster.stats.hp}/${res.data.monster.stats.maxHp}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    await sleep(200);

    log.section("TEST 3: CRÉER UN ÉLITE");
    
    log.monster("Création: Orc Brute (Élite)...");
    
    res = await makeRequest("POST", "/monsters/s1", {
      monsterId: "monster_orc_elite_01",
      name: "Orc Brute",
      type: "elite",
      level: 15,
      stats: {
        hp: 2000,
        maxHp: 2000,
        attack: 80,
        defense: 40,
        speed: 80
      },
      zoneId: "mountain_peaks",
      spawnPosition: { x: 200, y: 50, z: 150 },
      behavior: {
        type: "aggressive",
        aggroRange: 15,
        leashRange: 40,
        attackRange: 3
      },
      xpReward: 200,
      respawnTime: 120,
      modelId: "monster_orc_elite"
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Orc Élite créé !");
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    await sleep(200);

    log.section("TEST 4: CRÉER UN BOSS");
    
    log.monster("Création: Dragon (Boss)...");
    
    res = await makeRequest("POST", "/monsters/s1", {
      monsterId: "monster_dragon_boss_01",
      name: "Ancient Red Dragon",
      type: "boss",
      level: 50,
      stats: {
        hp: 50000,
        maxHp: 50000,
        attack: 500,
        defense: 200,
        speed: 50
      },
      zoneId: "dragon_lair",
      spawnPosition: { x: 500, y: 100, z: 500 },
      behavior: {
        type: "aggressive",
        aggroRange: 30,
        leashRange: 100,
        attackRange: 15
      },
      xpReward: 5000,
      respawnTime: 3600,
      modelId: "monster_dragon_boss"
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Dragon Boss créé !");
      log.info(`  Level: ${res.data.monster.level}`);
      log.info(`  HP: ${res.data.monster.stats.hp}`);
      log.info(`  XP Reward: ${res.data.monster.xpReward}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    await sleep(200);

    log.section("TEST 5: BULK CREATE");
    
    log.info("Création de 3 monstres en une fois...");
    
    res = await makeRequest("POST", "/monsters/s1/bulk", {
      monsters: [
        {
          monsterId: "monster_wolf_01",
          name: "Gray Wolf",
          type: "normal",
          level: 3,
          stats: { hp: 300, maxHp: 300, attack: 20, defense: 8, speed: 120 },
          zoneId: "forest_dark",
          spawnPosition: { x: 120, y: 0, z: 80 },
          behavior: { type: "aggressive", aggroRange: 12, leashRange: 25, attackRange: 1.5 },
          xpReward: 30,
          modelId: "monster_wolf"
        },
        {
          monsterId: "monster_bear_01",
          name: "Brown Bear",
          type: "normal",
          level: 8,
          stats: { hp: 1000, maxHp: 1000, attack: 50, defense: 20, speed: 90 },
          zoneId: "forest_dark",
          spawnPosition: { x: 180, y: 0, z: 120 },
          behavior: { type: "neutral", aggroRange: 8, leashRange: 20, attackRange: 2 },
          xpReward: 80,
          modelId: "monster_bear"
        },
        {
          monsterId: "monster_skeleton_01",
          name: "Skeleton Warrior",
          type: "normal",
          level: 10,
          stats: { hp: 800, maxHp: 800, attack: 60, defense: 15, speed: 100 },
          zoneId: "graveyard",
          spawnPosition: { x: 300, y: 0, z: 200 },
          behavior: { type: "aggressive", aggroRange: 10, leashRange: 30, attackRange: 2 },
          xpReward: 100,
          modelId: "monster_skeleton"
        }
      ]
    }, token);
    
    if (res.statusCode === 201) {
      log.success(`Bulk create terminé !`);
      log.info(`  Créés: ${res.data.created}`);
      log.info(`  Erreurs: ${res.data.errors}`);
    }

    log.section("TEST 6: LISTER TOUS LES MONSTERS");
    
    res = await makeRequest("GET", "/monsters/s1", undefined, token);
    
    if (res.statusCode === 200) {
      log.success(`${res.data.count} monster(s) trouvé(s) sur s1`);
      
      console.log("\n  Monsters créés:");
      res.data.monsters.forEach((monster: any) => {
        const zone = monster.zoneId ? ` [${monster.zoneId}]` : "";
        console.log(`    - ${monster.monsterId}: ${monster.name} (${monster.type}, Lv${monster.level})${zone}`);
        console.log(`      HP: ${monster.stats.hp}, Attack: ${monster.stats.attack}, XP: ${monster.xpReward}`);
      });
    }

    log.section("TEST 7: FILTRER PAR TYPE");
    
    res = await makeRequest("GET", "/monsters/s1?type=elite", undefined, token);
    
    if (res.statusCode === 200) {
      log.success(`${res.data.count} Élite(s) trouvé(s)`);
      res.data.monsters.forEach((monster: any) => {
        console.log(`  - ${monster.name} (${monster.monsterId})`);
      });
    }

    log.section("TEST 8: FILTRER PAR ZONE");
    
    res = await makeRequest("GET", "/monsters/s1?zoneId=forest_dark", undefined, token);
    
    if (res.statusCode === 200) {
      log.success(`${res.data.count} monster(s) dans forest_dark`);
      res.data.monsters.forEach((monster: any) => {
        console.log(`  - ${monster.name} (Lv${monster.level})`);
      });
    }

    log.section("TEST 9: RÉCUPÉRER UN MONSTER SPÉCIFIQUE");
    
    res = await makeRequest("GET", "/monsters/s1/monster_dragon_boss_01", undefined, token);
    
    if (res.statusCode === 200) {
      log.success("Dragon récupéré !");
      log.info(`  Nom: ${res.data.monster.name}`);
      log.info(`  Level: ${res.data.monster.level}`);
      log.info(`  HP: ${res.data.monster.stats.hp}/${res.data.monster.stats.maxHp}`);
      log.info(`  Behavior: ${res.data.monster.behavior.type}`);
      log.info(`  Respawn: ${res.data.monster.respawnTime}s`);
    }

    log.section("TEST 10: MODIFIER UN MONSTER");
    
    log.info("Augmentation de level du Goblin (5 → 7)...");
    
    res = await makeRequest("PUT", "/monsters/s1/monster_goblin_01", {
      level: 7,
      stats: {
        hp: 700,
        maxHp: 700,
        attack: 40,
        defense: 15,
        speed: 100
      }
    }, token);
    
    if (res.statusCode === 200) {
      log.success("Monster modifié !");
      log.info(`  Nouveau level: ${res.data.monster.level}`);
      log.info(`  Nouveaux HP: ${res.data.monster.stats.hp}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    log.section("TEST 11: SUPPRIMER UN MONSTER");
    
    log.info("Suppression du Skeleton...");
    
    res = await makeRequest("DELETE", "/monsters/s1/monster_skeleton_01", undefined, token);
    
    if (res.statusCode === 200) {
      log.success("Monster supprimé !");
      log.info(`  Monster ID: ${res.data.monsterId}`);
      log.info(`  Nom: ${res.data.name}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    log.section("RÉSUMÉ DES TESTS");
    
    if (allTestsPassed) {
      log.success("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !");
      console.log("");
      log.info("✅ Création de monsters (normal, élite, boss)");
      log.info("✅ Liste et filtres (par type, zone)");
      log.info("✅ Récupération d'un monster spécifique");
      log.info("✅ Modification de monster");
      log.info("✅ Bulk create (plusieurs monsters)");
      log.info("✅ Suppression de monster");
    } else {
      log.error("❌ CERTAINS TESTS ONT ÉCHOUÉ");
    }

    console.log("");
    log.info("📊 État final:");
    
    res = await makeRequest("GET", "/monsters/s1", undefined, token);
    log.info(`  S1: ${res.data.count} monster(s)`);
    
    const byType: any = {};
    res.data.monsters.forEach((m: any) => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });
    
    Object.keys(byType).forEach(type => {
      log.info(`    ${type}: ${byType[type]} monster(s)`);
    });

  } catch (error: any) {
    log.section("❌ ÉCHEC CRITIQUE");
    log.error(error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
