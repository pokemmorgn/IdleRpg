/**
 * CLIENT DE TEST – SYSTÈME DE QUÊTES COMPLET
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

// IDs des éléments de test (à créer dans votre base de données)
const TEST_NPC_ID = "npc_test_01"; // Un PNJ qui donne la quête
const TEST_QUEST_ID = "quest_test_01"; // Une quête avec un objectif "kill 1 test_wolf"
const TEST_ENEMY_TYPE = "test_wolf"; // L'ennemi à tuer pour la quête

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================================================
// AUTH + PROFIL (inchangé)
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
// TEST DU SYSTÈME DE QUÊTES
// ========================================================
async function testQuestSystem(room: Colyseus.Room) {

    console.log("\n🔥 DÉBUT DU TEST DU SYSTÈME DE QUÊTES\n");

    // Variables pour stocker l'état des quêtes reçu du serveur
    let availableQuests: any[] = [];
    let completableQuests: any[] = [];

    // 📌 écoute des events
    room.onMessage("dialogue_node", (msg) => {
        console.log("💬 DIALOGUE NODE →", msg);
    });
    room.onMessage("welcome", (message) => {
        console.log("📨 WELCOME →", message);
    });
    room.onMessage("npc_quests", (msg) => {
        console.log("📜 LISTE DES QUÊTES (NPC) →", msg);
        availableQuests = msg.availableQuests || [];
        completableQuests = msg.completableQuests || [];
    });

    room.onMessage("quest_accepted", (msg) => {
        console.log("✅ QUÊTE ACCEPTÉE →", msg);
    });

    room.onMessage("quest_update", (msg) => {
        console.log("🔄 PROGRESSION QUÊTE →", msg);
    });

    room.onMessage("quest_ready_to_turn_in", (msg) => {
        console.log("🏁 QUÊTE PRÊTE À ÊTRE RENDUE →", msg);
    });

    room.onMessage("quest_turned_in", (msg) => {
        console.log("🏆 QUÊTE RENDUE →", msg);
    });

    room.onMessage("xp_gained", (msg) => {
        console.log("⭐ XP GAGNÉ →", msg);
    });

    room.onMessage("error", (msg) => {
        console.error("❌ ERREUR SERVEUR →", msg);
    });

    await sleep(500);

    // --- ÉTAPE 1: Interaction initiale ---
    console.log("\n--- ÉTAPE 1: Interaction avec le PNJ ---");
    room.send("npc_interact", { npcId: TEST_NPC_ID });
    await sleep(1000);

    if (availableQuests.length === 0) {
        console.error("❌ Échec du test : Aucune quête disponible !");
        return;
    }
    console.log(`✔ ${availableQuests.length} quête(s) disponible(s).`);


    // --- ÉTAPE 2: Accepter la quête ---
    console.log("\n--- ÉTAPE 2: Acceptation de la quête ---");
    room.send("npc_accept_quest", { npcId: TEST_NPC_ID, questId: TEST_QUEST_ID });
    await sleep(1000);
    
    // On vérifie que la quête n'est plus disponible
    room.send("npc_interact", { npcId: TEST_NPC_ID });
    await sleep(1000);
    if (availableQuests.some(q => q.questId === TEST_QUEST_ID)) {
        console.error("❌ Échec du test : La quête acceptée est toujours dans la liste des disponibles !");
        return;
    }
    console.log("✔ La quête a bien disparu de la liste des disponibles.");


    // --- ÉTAPE 3: Progresser sur l'objectif ---
    console.log("\n--- ÉTAPE 3: Progression de l'objectif (simulation d'un kill) ---");
    room.send("test_trigger_quest_objective", { enemyType: TEST_ENEMY_TYPE });
    await sleep(1000);


    // --- ÉTAPE 4: Vérifier que la quête est "prête à être rendue" ---
    console.log("\n--- ÉTAPE 4: Vérification de l'état 'prêt à être rendu' ---");
    room.send("npc_interact", { npcId: TEST_NPC_ID });
    await sleep(1000);

    if (completableQuests.length === 0 || !completableQuests.some(q => q.questId === TEST_QUEST_ID)) {
        console.error("❌ Échec du test : La quête n'est pas dans la liste 'à rendre' !");
        return;
    }
    console.log("✔ La quête est bien dans la liste des quêtes à rendre.");


    // --- ÉTAPE 5: Rendre la quête ---
    console.log("\n--- ÉTAPE 5: Rendre la quête ---");
    room.send("npc_turn_in_quest", { npcId: TEST_NPC_ID, questId: TEST_QUEST_ID });
    await sleep(1000);


    // --- ÉTAPE 6: Vérification finale ---
    console.log("\n--- ÉTAPE 6: Vérification finale (la quête a disparu) ---");
    room.send("npc_interact", { npcId: TEST_NPC_ID });
    await sleep(1000);

    if (availableQuests.some(q => q.questId === TEST_QUEST_ID) || completableQuests.some(q => q.questId === TEST_QUEST_ID)) {
        console.error("❌ Échec du test : La quête rendue est toujours visible !");
        return;
    }

    console.log("\n🎉 SUCCÈS ! Le système de quêtes fonctionne correctement.");
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

    await testQuestSystem(room);

    process.exit(0); // Quitte le script proprement
})();
