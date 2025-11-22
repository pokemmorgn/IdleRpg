/**
 * SCRIPT DE TEST COMPLET DES QUÊTES
 * Usage :
 *   npx ts-node src/scripts/test_quest.ts
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
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// TYPES
// ============================================================

interface QuestListEntry {
    questId: string;
    name?: string;
    description?: string;
    rewards?: any;
}

interface QuestTestEntry {
    id: string;
    npc: string;
    type: "talk" | "kill" | "collect" | "explore";
    payload: any;
    count?: number;
}

// ============================================================
// QUÊTES
// ============================================================

const QUESTS_MAIN: QuestTestEntry[] = [
    { id: "main_01", npc: "npc_instructor", type: "talk", payload: { type: "talk", npcId: "npc_instructor" } },
    { id: "main_02", npc: "npc_instructor", type: "kill", payload: { type: "kill", enemyType: "wolf_basic" } },
    { id: "main_03", npc: "npc_instructor", type: "explore", payload: { type: "explore", locationId: "camp_east" } },
];

const QUESTS_SIDE: QuestTestEntry[] = [
    { id: "side_01", npc: "npc_gatherer", type: "collect", payload: { type: "collect", resourceId: "berry" }, count: 5 },
    { id: "side_02", npc: "npc_gatherer", type: "talk", payload: { type: "talk", npcId: "npc_old_lady" } },
    { id: "side_03", npc: "npc_farmer", type: "kill", payload: { type: "kill", enemyType: "rat" }, count: 3 },
];

// ============================================================
// TEST CHAÎNE DE QUÊTES
// ============================================================

async function testQuestChain(room: Colyseus.Room, quests: QuestTestEntry[]) {

    console.log("\n=====================================");
    console.log("🔥 DÉBUT DU TEST DE CHAÎNE DE QUÊTES");
    console.log("=====================================\n");

    let available: QuestListEntry[] = [];
    let completable: QuestListEntry[] = [];

    room.onMessage("npc_quests", msg => {
        available = msg.availableQuests;
        completable = msg.completableQuests;
        console.log("📜 QUÊTES →", msg);
    });

    room.onMessage("quest_accepted", msg => console.log("✔ ACCEPTÉE →", msg));
    room.onMessage("quest_update", msg => console.log("🔄 UPDATE →", msg));
    room.onMessage("quest_step_complete", msg => console.log("📝 STEP COMPLETE →", msg));
    room.onMessage("quest_ready_to_turn_in", msg => console.log("🏁 READY →", msg));
    room.onMessage("quest_complete", msg => console.log("🏆 COMPLETE →", msg));
    room.onMessage("quest_turned_in", msg => console.log("🎉 TURNED IN →", msg));
    room.onMessage("error", msg => console.error("❌ ERREUR SERVEUR →", msg));

    for (const q of quests) {

        console.log(`\n=== 🔵 TEST DE ${q.id} ===`);

        // 1) INTERACT WITH NPC
        room.send("npc_interact", { npcId: q.npc });
        await sleep(500);

        const found = available.find(x => x.questId === q.id);
        if (!found) {
            console.error(`❌ La quête ${q.id} n'est PAS disponible !`);
            return;
        }
        console.log(`✔ ${q.id} trouvée.`);

        // 2) ACCEPT
        room.send("npc_accept_quest", { npcId: q.npc, questId: q.id });
        await sleep(400);

        // 3) PROGESSION
        const count = q.count || 1;

        for (let i = 0; i < count; i++) {
            room.send("test_trigger_quest_objective", q.payload);
            await sleep(400);
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
        await sleep(400);

        console.log(`🎉 ${q.id} validée !`);
    }

    console.log("\n🎉🎉🎉 CHAÎNE TERMINEE AVEC SUCCÈS !\n");
}

// ============================================================
// MAIN
// ============================================================

(async () => {

    const register = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USERNAME, email: TEST_EMAIL, password: TEST_PASSWORD })
    });

    const loginReq = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD })
    });

    const login = await loginReq.json();
    const token = login.token;

    const seatReq = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: SERVER_ID, characterSlot: CHARACTER_SLOT })
    });

    const seat = await seatReq.json();

    const client = new Colyseus.Client(WS_URL);
    const room = await client.consumeSeatReservation(seat);

    console.log("🔌 CONNECTÉ AU SERVEUR !");

    await sleep(2000);

    console.log("\n🔥 TEST PRINCIPALES");
    await testQuestChain(room, QUESTS_MAIN);

    console.log("\n🔥 TEST SECONDAIRES");
    await testQuestChain(room, QUESTS_SIDE);

    console.log("🎉 FIN DU SCRIPT");
    process.exit(0);

})();
