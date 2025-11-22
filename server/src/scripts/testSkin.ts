// server/src/scripts/testSkin.ts
import { Client } from "colyseus.js";

// ----------------------------------------------------
// PARAMÈTRES À CONFIGURER
// ----------------------------------------------------
const SERVER_URL = "ws://localhost:2567";   // Mets ton IP/port si différent
const serverId = "test";                    // ton serverId
const characterSlot = 1;                    // slot du perso
const token = "TON_TOKEN_ICI";              // mets ton vrai token

const SKIN_ID = "warrior_basic01";          // skin à tester

// ----------------------------------------------------
// SCRIPT
// ----------------------------------------------------
async function main() {
  console.log("🟢 Connexion Colyseus…");

  const client = new Client(SERVER_URL);

  try {
    const room = await client.joinOrCreate("WorldRoom", {
      serverId,
      token,
      characterSlot
    });

    console.log("🎉 Connecté à la room !");
    console.log("➡️ SessionId:", room.sessionId);

    // ------------------------------------------------------------
    // Écoute des messages serveur
    // ------------------------------------------------------------
    room.onMessage("*", (type, data) => {
      console.log("📩 RECU:", type, data);
    });

    console.log("🟦 Unlock du skin…");
    room.send("skin_unlock", { skinId: SKIN_ID });

    await delay(1000);

    console.log("🟧 Equip du skin…");
    room.send("skin_equip", { skinId: SKIN_ID });

    await delay(1000);

    console.log("🟨 Level UP du skin…");
    room.send("skin_level_up", { skinId: SKIN_ID });

    await delay(2000);

    console.log("🏁 Test terminé !");
    room.leave();

  } catch (e) {
    console.error("❌ Erreur:", e);
  }
}

// ----------------------------------------------------
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------------------------------------------------
main();
