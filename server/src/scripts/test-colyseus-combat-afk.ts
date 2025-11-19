import { Client } from "colyseus.js";
import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;

function httpRequest(method: string, path: string, body?: any, token?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const headers: any = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      { hostname: API_HOST, port: API_PORT, path, method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Invalid JSON: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function testColyseusAFK() {
  console.log("🚀 Démarrage du test Colyseus + Combat + AFK");

  // --------------------------
  // 1) REGISTER
  // --------------------------
  const username = "ws_test_" + Date.now();
  const registerRes = await httpRequest("POST", "/auth/register", {
    username,
    password: "password123"
  });

  const token = registerRes.token;
  console.log("🔑 Compte créé:", username);

  // --------------------------
  // 2) CREATE CHARACTER
  // --------------------------
  const createRes = await httpRequest(
    "POST",
    "/profile/s1",
    {
      characterSlot: 1,
      characterName: "WS_Tester",
      characterClass: "warrior",
      characterRace: "human_elion"
    },
    token
  );

  const profile = createRes.profile;
  console.log("👤 Personnage créé:", profile.characterName, "Lvl", profile.level);

  // --------------------------
  // 3) CONNECT TO WORLDROOM
  // --------------------------
  console.log("🌐 Connexion à Colyseus...");

  const colyseus = new Client("ws://localhost:2567");

  const room = await colyseus.joinOrCreate("world_s1", {
    token,
    serverId: "s1",
    characterSlot: 1
  });

  console.log("🟢 Connecté à la room :", room.roomId);

  // Ecoute des messages
  room.onMessage("*", (type, msg) => {
    console.log(`📩 WS[${type}]`, msg);
  });

  // Attendre message "welcome"
  room.onMessage("welcome", (msg) => {
    console.log("🎉 Bienvenue :", msg);
  });

  // --------------------------
  // 4) TEST COMBAT PASSIF
  // --------------------------
  console.log("⚔️ Attente du combat automatique (immobilité)...");
  console.log("➡️  Attends 10 secondes pour permettre au CombatManager de trouver un monstre...");

  await sleep(10000); // 10 sec

  console.log("⚔️ Combat auto détecté ? Vérifie logs au-dessus (combat_start, combat_damage...)");

  // --------------------------
  // 5) ACTIVER LE MODE AFK
  // --------------------------
  console.log("😴 Activation du mode AFK...");
  room.send("activate_afk_mode", {});

  console.log("⌛ Attente 15 secondes pendant que l'AFK accumule des stats...");
  await sleep(15000);

  // --------------------------
  // 6) DEMANDER LE RÉCAP AFK
  // --------------------------
  console.log("📊 Demande du récap AFK...");
  room.send("get_afk_summary", {});

  // Le serveur renverra `afk_summary_update`
  room.onMessage("afk_summary_update", (summary) => {
    console.log("\n===== 📌 RÉCAP AFK =====");
    console.log("   Monstres tués :", summary.monstersKilled);
    console.log("   XP gagnée     :", summary.xpGained);
    console.log("   Or gagné      :", summary.goldGained);
    console.log("   Morts         :", summary.deaths);
    console.log("   Durée (sec)   :", summary.totalTime);
    console.log("=========================\n");
  });

  // Attendre un peu pour recevoir le récap
  await sleep(5000);

  // --------------------------
  // 7) FIN
  // --------------------------
  console.log("🎉 Test terminé !");
  room.leave();
  process.exit(0);
}

testColyseusAFK().catch((err) => {
  console.error("❌ ERREUR TEST :", err);
  process.exit(1);
});
