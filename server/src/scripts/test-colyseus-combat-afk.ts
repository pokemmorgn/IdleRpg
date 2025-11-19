/**
 * TEST Combat Auto + AFK via Colyseus
 * Usage: npx ts-node src/scripts/test-colyseus-combat-afk.ts
 */

import { Client } from "colyseus.js";
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

    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({
              statusCode: res.statusCode || 500,
              data: JSON.parse(data),
            });
          } catch {
            reject(new Error(`Parse error: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const log = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  reset: "\x1b[0m",

  ok(msg: string) {
    console.log(`${this.green}✓ ${msg}${this.reset}`);
  },
  info(msg: string) {
    console.log(`${this.blue}ℹ️  ${msg}${this.reset}`);
  },
  error(msg: string) {
    console.log(`${this.red}❌ ${msg}${this.reset}`);
  },
  section(title: string) {
    console.log(`\n${this.cyan}${"=".repeat(70)}\n${title}\n${"=".repeat(70)}${this.reset}`);
  },
};

async function runTest() {
  log.section("TEST COLYSEUS - COMBAT + AFK");

  let token: string;
  let profile: any;
  let client: Client;

  // Position du dummy
  const dummyId = "dummy_" + Date.now();
  const dummyX = 100;
  const dummyY = 0;
  const dummyZ = 100;

  try {
    // 1) Création compte
    log.section("1. Création du compte");

    const username = "afktest_" + Date.now();
    const res1 = await makeRequest("POST", "/auth/register", {
      username,
      password: "password123",
    });

    token = res1.data.token;
    log.ok("Compte créé");
    log.info("Token: " + token.substring(0, 25) + "...");

    // 2) Création personnage
    log.section("2. Création du personnage");

    const res2 = await makeRequest(
      "POST",
      "/profile/s1",
      {
        characterName: "AFKTester_" + Date.now(),
        characterClass: "warrior",
        characterRace: "human_elion",
        characterSlot: 1,
      },
      token
    );

    console.log("DEBUG /profile/s1 RESPONSE:", res2.data);

    if (!res2.data.success || !res2.data.profile)
      throw new Error("Profile creation failed: " + res2.data.error);

    profile = res2.data.profile;

    log.ok("Personnage créé");
    log.info(`Slot = ${profile.characterSlot}`);

    // 3) Connexion WS
    log.section("3. Connexion WebSocket");

    client = new Client(`ws://${API_HOST}:${API_PORT}`);

    const room = await client.joinOrCreate("world", {
      token,
      serverId: "s1",
      characterSlot: profile.characterSlot,
    });

    log.ok(`Connecté à la room ${room.roomId}`);
    log.info(`Session = ${room.sessionId}`);

    // --- SPAWN DU DUMMY ---
    await room.send("spawn_test_monster", {
      monsterId: dummyId,
      name: "Training Dummy",
      x: dummyX,
      y: dummyY,
      z: dummyZ,
    });
    log.info("Commande spawn envoyée au serveur");

    // --- TP du joueur sur le dummy ---
    room.send("player_move", {
      x: dummyX + 0.5,
      y: dummyY,
      z: dummyZ + 0.5,
    });
    log.info("Joueur téléporté pile sur le dummy");

    // HANDLERS WEBSOCKET
    log.section("4. Écoute des messages combat/AFK");

    room.onMessage("*", (type, message) => {
      console.log(`🟣 DEBUG WS MESSAGE type="${type}"\n`, message);
    });

    room.onMessage("combat_start", (msg: any) => {
      log.info(`⚔️  Combat start contre ${msg.monsterId ?? "UnknownMonster"}`);
    });

    room.onMessage("combat_damage", (msg: any) => {
      log.info(`💥 Dégâts: ${msg.attackerId ?? "?"} → ${msg.defenderId ?? "?"}: ${msg.damage}`);
    });

    room.onMessage("combat_death", (msg: any) => {
      const type = msg.isPlayer ? "Joueur" : "Monstre";
      log.info(`☠️ Mort: ${type} ${msg.entityId}`);
    });

    room.onMessage("afk_summary_claimed", (data: any) => {
      log.info(
        `📦 Résumé réclamé: +${data.xpGained ?? 0} XP, +${data.goldGained ?? 0} gold`
      );
    });

    room.onMessage("afk_summary_update", (summary: any) => {
      log.info(
        `📊 AFK Update: kills=${summary.monstersKilled}, xp=${summary.xpGained}, gold=${summary.goldGained}`
      );
    });

    // 5) Déclencher combat
    log.section("5. Déclenchement combat");

    room.send("player_move", { x: dummyX, y: dummyY, z: dummyZ });
    log.info("Position envoyée: près du dummy");

    await wait(1500);

    // 6) Activer AFK
    log.section("6. Activation AFK");

    room.send("activate_afk_mode", {});
    log.ok("AFK envoyé");

    await wait(5000);

    // 7) Claim résumé AFK
    log.section("7. Claim résumé AFK");
    room.send("claim_afk_summary", {});
    await wait(1500);

    // 8) Quitter
    log.section("8. Déconnexion");
    await room.leave();
    log.ok("Déconnecté");
  } catch (err: any) {
    log.error("ERREUR: " + err.message);
    console.error(err);
    process.exit(1);
  }
}

runTest();
