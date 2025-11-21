/**
 * CLIENT DE TEST – NPC / DIALOGUES / QUETES
 */

import * as Colyseus from "colyseus.js";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "npc_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "npc_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "NpcTester";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================================================
// AUTH + PROFIL
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
// NPC / QUEST TEST
// ========================================================
async function testNPCAndQuests(room: Colyseus.Room) {

    console.log("\n🔥 TEST NPC / DIALOGUE / QUETE\n");

    // 📌 Important : écoute des events envoyés par le serveur
    room.onMessage("dialogue_node", (msg) => {
        console.log("💬 DIALOGUE NODE →", msg);
    });

    room.onMessage("dialogue_end", (msg) => {
        console.log("🏁 FIN DU DIALOGUE →", msg);
    });

    room.onMessage("npc_quests", (msg) => {
        console.log("📘 NPC QUEST LIST →", msg);
    });

    room.onMessage("quest_update", (msg) => {
        console.log("🔄 QUEST PROGRESS →", msg);
    });

    room.onMessage("quest_step_complete", (msg) => {
        console.log("🎉 QUEST STEP COMPLETE →", msg);
    });

    room.onMessage("quest_complete", (msg) => {
        console.log("🏆 QUEST COMPLETE →", msg);
    });

    await sleep(500);

    // On choisit un NPC test (à mettre dans ta DB)
    const testNpcId = "npc_test_01";

    console.log("→ Interaction avec NPC…");
    room.send("npc_interact", { npcId: testNpcId });

    await sleep(1000);

    console.log("\n→ On accepte la quête test…");
    room.send("npc_accept_quest", {
        npcId: testNpcId,
        questId: "quest_test_01"
    });

    await sleep(1000);

    console.log("\n→ Simulation d’un KILL qui valide la quête…");
    room.send("simulate_monster_kill", {
        enemyType: "wolf",
        enemyRarity: "common",
        isBoss: false
    });

    await sleep(1000);

    console.log("\n→ Simulation talk pour valider éventuel objectif TALK…");
    room.send("simulate_talk", {
        npcId: testNpcId
    });
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

    console.log("🔌 CONNECTÉ AU SERVEUR DE JEU !");

    await testNPCAndQuests(room);

})();
