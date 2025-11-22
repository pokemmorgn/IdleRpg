/**
 * SCRIPT DE TEST COMPLET DES QUÊTES
 * Usage :
 *   npx ts-node client-test-quests.ts
 */

import * as Colyseus from "colyseus.js";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "quest_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "quest_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "QuestTester";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// AUTH & CREATION COMPTE
// ============================================================
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

// ============================================================
// CHAÎNES DE QUÊTES À TESTER
// ============================================================

const QUESTS_MAIN = [
    { id: "main_01", npc: "npc_instructor", type: "talk", payload: { npcId: "npc_instructor" } },
    { id: "main_02", npc: "npc_instructor", type: "kill", payload: { enemyType: "wolf_basic" } },
    { id: "main_03", npc: "npc_instructor", type: "explore", payload: { locationId: "camp_east" } },
];

const QUESTS_SIDE = [
    { id: "side_01", npc: "npc_gatherer", type: "collect", payload: { resourceId: "berry" }, count: 5 },
    { id: "side_02", npc: "npc_gatherer", type: "talk", payload: { npcId: "npc_old_lady" } },
    { id: "side_03", npc: "npc_farmer", type: "kill", payload: { enemyType: "rat" }, count: 3 },
];

// ============================================================
// TEST COMPLET D'UNE CHAÎNE DE QUÊTES
// ============================================================

async function testQuestChain(room: Colyseus.Room, quests: any[]) {

    console.log("\n=====================================");
    console.log("🔥 DÉBUT DU TEST DE CHAÎNE DE QUÊTES");
    console.log("=====================================\n");

    let available = [];
    let completable = [];

    room.onMessage("npc_quests", msg => {
        available = msg.availableQuests;
        completable = msg.completableQuests;
        console.log("📜 QUÊTES →", msg);
    });

    room.onMessage("quest_accepted", msg => console.log("✔ ACCEPTÉE →", msg));
    room.onMessage("quest_update", msg => console.log("🔄 UPDATE →", msg));
    room.onMessage("quest_step_complete", msg => console.log("📝 STEP COMPLETE →", msg));
    room.onMessage("quest_complete", msg => console.log("🏁 QUEST COMPLETE →", msg));
    room.onMessage("quest_ready_to_turn_in", msg => console.log("🏁 READY TO TURN IN →", msg));
    room.onMessage("quest_turned_in", msg => console.log("🏆 QUEST TURNED IN →", msg));

    room.onMessage("error", msg => console.error("❌ ERREUR SERVEUR →", msg));

    for (const q of quests) {

        console.log(`\n=== 🔵 TEST DE ${q.id} ===`);

        // 1) NPC INTERACTION
        room.send("npc_interact", { npcId: q.npc });
        await sleep(500);

        const found = available.find(x => x.questId === q.id);
        if (!found) {
            console.error(`❌ La quête ${q.id} n'est PAS disponible !`);
            return;
        }
        console.log(`✔ ${q.id} trouvée.`);

        // 2) ACCEPT QUEST
        room.send("npc_accept_quest", { npcId: q.npc, questId: q.id });
        await sleep(500);

        // 3) PROGRESS OBJECTIVE
        const count = q.count || 1;
        for (let i = 0; i < count; i++) {
            room.send("test_trigger_quest_objective", q.payload);
            await sleep(300);
        }

        // 4) CHECK READY TO TURN IN
        room.send("npc_interact", { npcId: q.npc });
        await sleep(500);

        const ready = completable.find(x => x.questId === q.id);
        if (!ready) {
            console.error(`❌ La quête ${q.id} n'est PAS prête à être rendue !`);
            return;
        }
        console.log(`✔ ${q.id} prête à être rendue.`);

        // 5) TURN IN
        room.send("npc_turn_in_quest", { npcId: q.npc, questId: q.id });
        await sleep(500);

        console.log(`🎉 ${q.id} validée !`);
    }

    console.log("\n🎉🎉🎉 CHAÎNE TERMINEE AVEC SUCCÈS !\n");
}

// ============================================================
// MAIN
// ============================================================

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
    await sleep(1500);

    console.log("\n🔥 TEST CHAÎNE QUÊTES PRINCIPALES");
    await testQuestChain(room, QUESTS_MAIN);

    console.log("\n🔥 TEST CHAÎNE QUÊTES SECONDAIRES");
    await testQuestChain(room, QUESTS_SIDE);

    console.log("🎉 FIN DU SCRIPT");
    process.exit(0);

})();
