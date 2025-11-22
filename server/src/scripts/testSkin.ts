/**
 * CLIENT DE TEST – SYSTÈME DE SKINS COMPLET
 */

import * as Colyseus from "colyseus.js";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "skin_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "skin_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "SkinTester";

// Ex: mettre "warrior_basic01" selon ta classe
const TEST_SKIN_ID = "warrior_basic01";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================================================
// AUTH
// ========================================================
async function register() {
  const r = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  });

  if (r.ok) {
    console.log("✔ Compte créé");
    return;
  }

  const j = await r.json();
  if (j.error === "Username already taken") {
    console.log("ℹ Compte déjà existant");
    return;
  }

  console.error("❌ Erreur register:", j);
}

async function login(): Promise<string> {
  const r = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    })
  });

  const j = await r.json();
  if (!r.ok) throw new Error("Erreur login");

  console.log("✔ Connecté");
  return j.token;
}

async function checkProfile(token: string) {
  const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const j = await r.json();
  if (!r.ok) return null;

  return j.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) ?? null;
}

async function getCreationData(token: string) {
  const r = await fetch(`${API_URL}/game-data/creation`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const j = await r.json();
  if (!r.ok) return null;

  return j;
}

async function createCharacter(token: string, race: string, classId: string) {
  const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      characterSlot: CHARACTER_SLOT,
      characterName: CHARACTER_NAME,
      characterClass: classId,
      characterRace: race
    })
  });

  const j = await r.json();
  if (!r.ok) {
    console.error("❌ Erreur create:", j);
    return null;
  }

  console.log("✔ Personnage créé!");
  return j.profile;
}

async function reserveSeat(token: string) {
  const r = await fetch(`${API_URL}/matchmaking/join-world`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      serverId: SERVER_ID,
      characterSlot: CHARACTER_SLOT
    })
  });

  const j = await r.json();
  if (!r.ok) throw new Error("Matchmaking failed");
  return j;
}

// ========================================================
// TEST SKINS
// ========================================================
async function testSkinSystem(room: Colyseus.Room) {

  console.log("\n🔥 DÉBUT DU TEST DU SYSTÈME DE SKINS\n");

  // ÉCOUTE DES MESSAGES
  room.onMessage("skin_unlocked", (msg) => {
    console.log("🟩 SKIN UNLOCKED →", msg);
  });

  room.onMessage("skin_equipped", (msg) => {
    console.log("🎽 SKIN EQUIPPED →", msg);
  });

  room.onMessage("skin_level_up", (msg) => {
    console.log("⬆️  SKIN LEVEL UP →", msg);
  });

  room.onMessage("skin_error", (msg) => {
    console.error("❌ SKIN ERROR →", msg);
  });

  room.onMessage("stats_update", (msg) => {
    console.log("📈 STATS UPDATE →", msg);
  });

  await sleep(1000);

  console.log("\n--- ÉTAPE 1 : UNLOCK ---");
  room.send("skin_unlock", { skinId: TEST_SKIN_ID });
  await sleep(1000);

  console.log("\n--- ÉTAPE 2 : EQUIP ---");
  room.send("skin_equip", { skinId: TEST_SKIN_ID });
  await sleep(1000);

  console.log("\n--- ÉTAPE 3 : LEVEL UP (1) ---");
  room.send("skin_level_up", { skinId: TEST_SKIN_ID });
  await sleep(1000);

  console.log("\n--- ÉTAPE 4 : LEVEL UP (2) ---");
  room.send("skin_level_up", { skinId: TEST_SKIN_ID });
  await sleep(1000);

  console.log("\n🎉 TEST SKINS TERMINÉ AVEC SUCCÈS SI AUCUNE ERREUR");
}

// ========================================================
// MAIN
// ========================================================
(async () => {

  await register();
  const token = await login();
  let profile = await checkProfile(token);

  if (!profile) {
    const creation = await getCreationData(token);
    const race = creation.races[0].raceId;
    const classId = creation.byRace[race][0].classId;
    profile = await createCharacter(token, race, classId);
  }

  const mm = await reserveSeat(token);
  const client = new Colyseus.Client(WS_URL);
  const room = await client.consumeSeatReservation(mm);

  console.log("🔌 CONNECTÉ AU SERVEUR !");
  await sleep(1500);

  await testSkinSystem(room);

  process.exit(0);
})();
