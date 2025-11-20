import { Client } from "colyseus.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configuration du test
 */
const SERVER_ENDPOINT = "ws://localhost:3000";  // ← adapte si besoin
const SERVER_ID = "s1";                        // ton server logique
const TOKEN = process.env.TEST_TOKEN || "";    // mets un token valide
const CHARACTER_SLOT = 1;                      // slot de test

async function runTest() {
  console.log("🚀 Démarrage du script de test Colyseus...");

  if (!TOKEN) {
    console.error("❌ Aucun token présent. Mets TEST_TOKEN dans .env");
    process.exit(1);
  }

  // Connexion au serveur Colyseus
  const client = new Client(SERVER_ENDPOINT);

  try {
    console.log("🔌 Connexion au serveur...");

    const room = await client.joinOrCreate("world", {
      token: TOKEN,
      serverId: SERVER_ID,
      characterSlot: CHARACTER_SLOT
    });

   console.log("🟢 Connecté à la room:", room.name);

    // Listener générique
    room.onMessage("*", (type, message) => {
      console.log(`📩 Message reçu [${type}] :`, message);
    });

    // Listener pour messages ciblés
    room.onMessage("welcome", (msg) => {
      console.log("👋 Message de bienvenue:", msg);
    });

    // Listener error
    room.onError((code, message) => {
      console.error("❌ Erreur du serveur:", code, message);
    });

    // Listener fermeture
    room.onLeave(() => {
      console.log("❌ Déconnecté du serveur");
    });

    // Attendre 1s avant les tests
    await delay(1000);

    // =============================
    //  🔥 TESTS AUTOMATIQUES
    // =============================

    console.log("\n==============================");
    console.log("🧪 Lancement des tests");
    console.log("==============================\n");

    // 1) Tester mouvement
    console.log("➡️  Test : mouvement joueur");
    room.send("player_move", { x: 101, y: 0, z: 101 });
    await delay(500);

    // 2) Activer AFK
    console.log("💤 Test : activation AFK");
    room.send("activate_afk_mode", {});
    await delay(1000);

    // 3) Récupération du summary AFK
    console.log("📊 Test : summary AFK");
    room.send("get_afk_summary", {});
    await delay(1000);

    // 4) Spawn 3 monstres
    console.log("👹 Test : spawn monstres");
    for (let i = 0; i < 3; i++) {
      room.send("spawn_test_monster", {
        name: "TestDummy_" + i,
        x: 105 + i,
        y: 0,
        z: 105 + i
      });
      await delay(300);
    }

    await delay(2000);

    // 5) Désactiver AFK
    console.log("🟢 Désactivation AFK");
    room.send("deactivate_afk_mode", {});
    await delay(1000);

    // 6) Re-tester mouvement
    console.log("➡️  Re-test mouvement");
    room.send("player_move", { x: 150, y: 0, z: 150 });

    // 7) Claim du recap AFK
    console.log("🎁 Test : claim summary");
    room.send("claim_afk_summary", {});

    // FIN
    console.log("\n🎉 Test terminé ! Le script reste connecté.\n");

  } catch (err: any) {
    console.error("❌ Erreur dans le script:", err.message);
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTest();
