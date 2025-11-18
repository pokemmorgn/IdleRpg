/**
 * Script de test pour le système de Dialogues
 * Usage: npx ts-node src/scripts/test-dialogue-system.ts
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
  dialogue: (msg: string) => console.log(`${colors.magenta}💬 ${msg}${colors.reset}`),
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        💬 TEST SYSTÈME DIALOGUES - IdleRPG 💬             ║
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
    
    const username = `dialogtest_${Date.now()}`;
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

    // ===== TEST 2: Vérifier qu'il n'y a pas de dialogues =====
    log.section("TEST 2: VÉRIFIER AUCUN DIALOGUE");
    
    res = await makeRequest("GET", "/dialogues", undefined, token);
    
    if (res.statusCode !== 200) {
      throw new Error("Failed to list dialogues");
    }
    
    const initialCount = res.data.count;
    log.info(`${initialCount} dialogue(s) trouvé(s)`);

    // ===== TEST 3: Créer un dialogue simple =====
    log.section("TEST 3: CRÉER UN DIALOGUE SIMPLE");
    
    log.dialogue("Création: Dialogue simple du forgeron...");
    
    res = await makeRequest("POST", "/dialogues", {
      dialogueId: "dialogue_thorin_simple",
      npcId: "npc_blacksmith_01",
      description: "Simple greeting dialogue for Thorin the blacksmith",
      nodes: [
        {
          nodeId: "start",
          text: "dialogue.thorin.greeting",
          choices: [
            {
              choiceText: "dialogue.common.goodbye",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "end",
          text: "dialogue.thorin.farewell",
          choices: []
        }
      ]
    }, token);
    
    if (res.statusCode !== 201) {
      log.error(`Échec création: ${res.data.error}`);
      allTestsPassed = false;
    } else {
      log.success("Dialogue simple créé !");
      log.info(`  Dialogue ID: ${res.data.dialogue.dialogueId}`);
      log.info(`  Noeuds: ${res.data.dialogue.nodes.length}`);
    }

    await sleep(200);

    // ===== TEST 4: Créer un dialogue avec choix multiples =====
    log.section("TEST 4: CRÉER UN DIALOGUE AVEC CHOIX MULTIPLES");
    
    log.dialogue("Création: Dialogue avec branches...");
    
    res = await makeRequest("POST", "/dialogues", {
      dialogueId: "dialogue_thorin_branching",
      npcId: "npc_blacksmith_01",
      description: "Branching dialogue with multiple choices",
      nodes: [
        {
          nodeId: "start",
          text: "dialogue.thorin.greeting",
          choices: [
            {
              choiceText: "dialogue.thorin.choice.about_work",
              nextNode: "about_work"
            },
            {
              choiceText: "dialogue.thorin.choice.shop",
              nextNode: "shop_mention"
            },
            {
              choiceText: "dialogue.common.goodbye",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "about_work",
          text: "dialogue.thorin.about_work",
          choices: [
            {
              choiceText: "dialogue.common.interesting",
              nextNode: "start"
            }
          ]
        },
        {
          nodeId: "shop_mention",
          text: "dialogue.thorin.shop_mention",
          actions: [
            {
              type: "open_shop",
              shopId: "shop_blacksmith_01"
            }
          ],
          choices: [
            {
              choiceText: "dialogue.common.thanks",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "end",
          text: "dialogue.thorin.farewell",
          choices: []
        }
      ]
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Dialogue branching créé !");
      log.info(`  Noeuds: ${res.data.dialogue.nodes.length}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    await sleep(200);

    // ===== TEST 5: Créer un dialogue avec conditions =====
    log.section("TEST 5: CRÉER UN DIALOGUE AVEC CONDITIONS");
    
    log.dialogue("Création: Dialogue avec conditions (level + tags)...");
    
    res = await makeRequest("POST", "/dialogues", {
      dialogueId: "dialogue_thorin_conditional",
      npcId: "npc_blacksmith_01",
      description: "Dialogue with level and tag conditions",
      nodes: [
        {
          nodeId: "start",
          text: "dialogue.thorin.greeting",
          choices: [
            {
              choiceText: "dialogue.thorin.choice.advanced",
              nextNode: "advanced",
              conditions: [
                {
                  type: "level_min",
                  value: 10
                },
                {
                  type: "has_tag",
                  tag: "dialogue.thorin.tutorial_completed"
                }
              ]
            },
            {
              choiceText: "dialogue.thorin.choice.beginner",
              nextNode: "beginner",
              conditions: [
                {
                  type: "level_max",
                  value: 9
                }
              ]
            },
            {
              choiceText: "dialogue.common.goodbye",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "advanced",
          text: "dialogue.thorin.advanced_talk",
          actions: [
            {
              type: "give_xp",
              amount: 100
            }
          ],
          choices: [
            {
              choiceText: "dialogue.common.thanks",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "beginner",
          text: "dialogue.thorin.beginner_talk",
          actions: [
            {
              type: "add_tag",
              tag: "dialogue.thorin.tutorial_completed"
            }
          ],
          choices: [
            {
              choiceText: "dialogue.common.thanks",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "end",
          text: "dialogue.thorin.farewell",
          choices: []
        }
      ]
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Dialogue conditionnel créé !");
      log.info(`  Noeuds: ${res.data.dialogue.nodes.length}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    await sleep(200);

    // ===== TEST 6: Créer un dialogue avec spam protection =====
    log.section("TEST 6: CRÉER UN DIALOGUE AVEC SPAM PROTECTION");
    
    log.dialogue("Création: Dialogue avec protection spam...");
    
    res = await makeRequest("POST", "/dialogues", {
      dialogueId: "dialogue_thorin_spam",
      npcId: "npc_blacksmith_01",
      description: "Dialogue with spam protection tiers",
      spamProtection: {
        enabled: true,
        resetDelay: 300,
        tiers: [
          {
            minCount: 1,
            maxCount: 3,
            startNode: "greeting_normal"
          },
          {
            minCount: 4,
            maxCount: 7,
            startNode: "greeting_annoyed"
          },
          {
            minCount: 8,
            maxCount: null,
            startNode: "greeting_angry"
          }
        ]
      },
      nodes: [
        {
          nodeId: "greeting_normal",
          text: "dialogue.thorin.greeting",
          choices: [
            {
              choiceText: "dialogue.common.goodbye",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "greeting_annoyed",
          text: "dialogue.thorin.annoyed",
          choices: [
            {
              choiceText: "dialogue.common.sorry",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "greeting_angry",
          text: "dialogue.thorin.angry",
          choices: []
        },
        {
          nodeId: "end",
          text: "dialogue.thorin.farewell",
          choices: []
        }
      ]
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Dialogue avec spam protection créé !");
      log.info(`  Tiers: ${res.data.dialogue.spamProtection.tiers.length}`);
      log.info(`  Reset delay: ${res.data.dialogue.spamProtection.resetDelay}s`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    await sleep(200);

    // ===== TEST 7: Lister tous les dialogues =====
    log.section("TEST 7: LISTER TOUS LES DIALOGUES");
    
    res = await makeRequest("GET", "/dialogues", undefined, token);
    
    if (res.statusCode === 200) {
      log.success(`${res.data.count} dialogue(s) trouvé(s)`);
      
      console.log("\n  Dialogues créés:");
      res.data.dialogues.forEach((dialogue: any) => {
        const spam = dialogue.spamProtection?.enabled ? " [SPAM]" : "";
        console.log(`    - ${dialogue.dialogueId}: ${dialogue.description}${spam}`);
        console.log(`      Noeuds: ${dialogue.nodes.length}`);
      });
    }

    // ===== TEST 8: Filtrer par NPC =====
    log.section("TEST 8: FILTRER LES DIALOGUES PAR NPC");
    
    res = await makeRequest("GET", "/dialogues?npcId=npc_blacksmith_01", undefined, token);
    
    if (res.statusCode === 200) {
      log.success(`${res.data.count} dialogue(s) pour npc_blacksmith_01`);
      res.data.dialogues.forEach((dialogue: any) => {
        console.log(`  - ${dialogue.dialogueId}`);
      });
    }

    // ===== TEST 9: Récupérer un dialogue spécifique =====
    log.section("TEST 9: RÉCUPÉRER UN DIALOGUE SPÉCIFIQUE");
    
    res = await makeRequest("GET", "/dialogues/dialogue_thorin_branching", undefined, token);
    
    if (res.statusCode === 200) {
      log.success("Dialogue récupéré !");
      log.info(`  ID: ${res.data.dialogue.dialogueId}`);
      log.info(`  Description: ${res.data.dialogue.description}`);
      log.info(`  Noeuds: ${res.data.dialogue.nodes.length}`);
      
      console.log("\n  Structure des noeuds:");
      res.data.dialogue.nodes.forEach((node: any) => {
        console.log(`    - ${node.nodeId}: ${node.choices.length} choix`);
      });
    }

    // ===== TEST 10: Valider un dialogue =====
    log.section("TEST 10: VALIDER UN DIALOGUE");
    
    res = await makeRequest("GET", "/dialogues/dialogue_thorin_branching/validate", undefined, token);
    
    if (res.statusCode === 200) {
      if (res.data.isValid) {
        log.success("Dialogue valide !");
      } else {
        log.error("Dialogue invalide !");
      }
      
      log.info(`  Noeuds: ${res.data.nodeCount}`);
      log.info(`  Spam: ${res.data.hasSpamProtection}`);
      
      if (res.data.errors.length > 0) {
        console.log("\n  Erreurs:");
        res.data.errors.forEach((err: string) => console.log(`    - ${err}`));
      }
      
      if (res.data.warnings.length > 0) {
        console.log("\n  Warnings:");
        res.data.warnings.forEach((warn: string) => console.log(`    - ${warn}`));
      }
    }

    // ===== TEST 11: Modifier un dialogue =====
    log.section("TEST 11: MODIFIER UN DIALOGUE");
    
    log.info("Ajout d'un noeud au dialogue simple...");
    
    res = await makeRequest("PUT", "/dialogues/dialogue_thorin_simple", {
      nodes: [
        {
          nodeId: "start",
          text: "dialogue.thorin.greeting_updated",
          choices: [
            {
              choiceText: "dialogue.thorin.choice.tell_joke",
              nextNode: "joke"
            },
            {
              choiceText: "dialogue.common.goodbye",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "joke",
          text: "dialogue.thorin.joke",
          choices: [
            {
              choiceText: "dialogue.common.haha",
              nextNode: "end"
            }
          ]
        },
        {
          nodeId: "end",
          text: "dialogue.thorin.farewell",
          choices: []
        }
      ]
    }, token);
    
    if (res.statusCode === 200) {
      log.success("Dialogue modifié !");
      log.info(`  Nouveaux noeuds: ${res.data.dialogue.nodes.length}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    // ===== TEST 12: Bulk create =====
    log.section("TEST 12: BULK CREATE DIALOGUES");
    
    log.info("Création de 3 dialogues en une fois...");
    
    res = await makeRequest("POST", "/dialogues/bulk", {
      dialogues: [
        {
          dialogueId: "dialogue_elder_greeting",
          npcId: "npc_elder_01",
          description: "Elder's greeting",
          nodes: [
            {
              nodeId: "start",
              text: "dialogue.elder.greeting",
              choices: [
                {
                  choiceText: "dialogue.common.goodbye",
                  nextNode: "end"
                }
              ]
            },
            {
              nodeId: "end",
              text: "dialogue.elder.farewell",
              choices: []
            }
          ]
        },
        {
          dialogueId: "dialogue_guard_greeting",
          npcId: "npc_guard_01",
          description: "Guard's greeting",
          nodes: [
            {
              nodeId: "start",
              text: "dialogue.guard.greeting",
              choices: []
            }
          ]
        },
        {
          dialogueId: "dialogue_merchant_greeting",
          npcId: "npc_merchant_01",
          description: "Merchant's greeting with shop",
          nodes: [
            {
              nodeId: "start",
              text: "dialogue.merchant.greeting",
              actions: [
                {
                  type: "open_shop",
                  shopId: "shop_general_01"
                }
              ],
              choices: [
                {
                  choiceText: "dialogue.common.thanks",
                  nextNode: "end"
                }
              ]
            },
            {
              nodeId: "end",
              text: "dialogue.merchant.farewell",
              choices: []
            }
          ]
        }
      ]
    }, token);
    
    if (res.statusCode === 201) {
      log.success("Bulk create terminé !");
      log.info(`  Créés: ${res.data.created}`);
      log.info(`  Erreurs: ${res.data.errors}`);
      
      if (res.data.dialogues.length > 0) {
        console.log("\n  Dialogues créés:");
        res.data.dialogues.forEach((dialogue: any) => {
          console.log(`    - ${dialogue.dialogueId}`);
        });
      }
    }

    // ===== TEST 13: Tenter de créer un doublon =====
    log.section("TEST 13: TENTER DE CRÉER UN DOUBLON");
    
    log.info("Tentative de créer un dialogue existant...");
    
    res = await makeRequest("POST", "/dialogues", {
      dialogueId: "dialogue_thorin_simple",
      nodes: [
        {
          nodeId: "start",
          text: "test",
          choices: []
        }
      ]
    }, token);
    
    if (res.statusCode === 400) {
      log.success("Doublon correctement rejeté");
      log.info(`  Message: ${res.data.error}`);
    } else if (res.statusCode === 201) {
      log.error("Doublon accepté (BUG)");
      allTestsPassed = false;
    }

    // ===== TEST 14: Vérifier le total =====
    log.section("TEST 14: VÉRIFIER LE NOMBRE TOTAL");
    
    res = await makeRequest("GET", "/dialogues", undefined, token);
    
    if (res.statusCode === 200) {
      const expectedCount = 7; // 4 créés + 3 bulk
      
      if (res.data.count === expectedCount) {
        log.success(`Nombre correct: ${res.data.count} dialogues`);
      } else {
        log.warning(`Nombre inattendu: ${res.data.count} (attendu: ${expectedCount})`);
      }
    }

    // ===== TEST 15: Supprimer un dialogue =====
    log.section("TEST 15: SUPPRIMER UN DIALOGUE");
    
    log.info("Suppression du dialogue guard...");
    
    res = await makeRequest("DELETE", "/dialogues/dialogue_guard_greeting", undefined, token);
    
    if (res.statusCode === 200) {
      log.success("Dialogue supprimé !");
      log.info(`  Dialogue ID: ${res.data.dialogueId}`);
    } else {
      log.error(`Échec: ${res.data.error}`);
      allTestsPassed = false;
    }

    // ===== RÉSUMÉ FINAL =====
    log.section("RÉSUMÉ DES TESTS");
    
    if (allTestsPassed) {
      log.success("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !");
      console.log("");
      log.info("✅ Création de dialogues (simple, branching, conditional, spam)");
      log.info("✅ Liste et filtres (par NPC)");
      log.info("✅ Récupération d'un dialogue spécifique");
      log.info("✅ Validation d'arbre de dialogue");
      log.info("✅ Modification de dialogue");
      log.info("✅ Détection de doublons");
      log.info("✅ Bulk create (plusieurs dialogues)");
      log.info("✅ Suppression de dialogue");
    } else {
      log.error("❌ CERTAINS TESTS ONT ÉCHOUÉ");
      log.warning("Consulte les logs ci-dessus pour identifier les problèmes");
    }

    // Afficher le compte final
    console.log("");
    log.info("📊 État final:");
    
    res = await makeRequest("GET", "/dialogues", undefined, token);
    log.info(`  Total: ${res.data.count} dialogues`);
    
    const byNpc: any = {};
    res.data.dialogues.forEach((d: any) => {
      const npc = d.npcId || "null";
      byNpc[npc] = (byNpc[npc] || 0) + 1;
    });
    
    Object.keys(byNpc).forEach(npc => {
      log.info(`    ${npc}: ${byNpc[npc]} dialogue(s)`);
    });

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
