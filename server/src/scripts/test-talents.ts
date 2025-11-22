/**
 * TEST TALENT SYSTEM — Gain d'XP, Level-up, Apprentissage de Talent, Respec
 * Usage : npx ts-node server/src/scripts/test-talents.ts
 */

import * as Colyseus from "colyseus.js";
import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:3000";
const WS_URL = process.env.WS_URL || "ws://localhost:3000";

const TEST_USERNAME = "talent_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "talent_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TalentTester";
const CHARACTER_CLASS = "warrior"; // Important pour notre test
const CHARACTER_RACE = "human_elion";

const TALENT_TO_LEARN_ID = "warrior_fury_critical_strike";
const XP_AMOUNT_TO_LEVEL_UP = 1000; // Assez pour monter de niveau 1 à 2

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================================
// AUTH (inchangé)
// =====================================================================
async function register() {
    const r = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USERNAME, email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    const j = await r.json();
    if (j.error === "Username already taken") { console.log("ℹ Compte déjà existant"); return; }
    if (!r.ok) { console.error("❌ Erreur register:", j); return; }
    console.log("✔ Compte créé");
}

async function login(): Promise<string> {
    const r = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }) });
    const j = await r.json();
    if (!r.ok) throw new Error("Erreur login");
    console.log("✔ Connecté");
    return j.token;
}

async function getProfile(token: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) return null;
    return j.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) ?? null;
}

async function getCreationData(token: string) {
    const r = await fetch(`${API_URL}/game-data/creation`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) return null;
    return j;
}

async function createCharacter(token: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ characterSlot: CHARACTER_SLOT, characterName: CHARACTER_NAME, characterClass: CHARACTER_CLASS, characterRace: CHARACTER_RACE })
    });
    const j = await r.json();
    if (!r.ok) { console.error("❌ Erreur create:", j); return null; }
    console.log("✔ Personnage créé !");
    return j.profile;
}

async function reserveSeat(token: string) {
    const r = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: SERVER_ID, characterSlot: CHARACTER_SLOT })
    });
    const j = await r.json();
    if (!r.ok) throw new Error("Matchmaking failed");
    return j;
}

// =====================================================================
// UTILS (inchangé)
// =====================================================================
function diff(a: any, b: any) {
    if (!a || !b) return "Pas de données.";
    let changes: Record<string, { from: any, to: any }> = {};
    for (const k in b) { if (a[k] !== b[k]) { changes[k] = { from: a[k], to: b[k] }; } }
    return changes;
}

async function waitForMessage(room: Colyseus.Room, messageType: string, timeoutMs: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
        let hasResolved = false;

        const messageListener = (type: string, payload: any) => {
            if (type === messageType && !hasResolved) {
                hasResolved = true;
                clearTimeout(timeout); // Annuler le timeout
                room.off("message", messageListener); // Retirer l'écouteur correctement
                resolve(payload);
            }
        };

        // S'inscrire pour écouter TOUS les messages
        room.onMessage("*", messageListener);
        
        const timeout = setTimeout(() => {
            if (!hasResolved) {
                hasResolved = true;
                room.off("message", messageListener); // Retirer l'écouteur en cas de timeout
                reject(new Error(`Timeout en attente de ${messageType}`));
            }
        }, timeoutMs);
    });
}

// =====================================================================
// TEST TALENT SYSTEM
// =====================================================================
async function testTalentSystem(room: Colyseus.Room) {
    console.log("\n🔥 DÉBUT DU TEST SYSTÈME DE TALENTS\n");

    // --- ÉTAPE 1 : Attendre les stats initiales ---
    console.log("⏳ En attente des stats initiales...");
    const initialStats = await waitForMessage(room, "stats_update");
    console.log("📊 Stats initiales:", initialStats);
    console.log(`👉 Points de talent disponibles: ${initialStats.availableSkillPoints}`);

    // --- ÉTAPE 2 : Donner de l'XP pour monter d'un niveau ---
    console.log(`\n--- ÉTAPE 2 : Donner ${XP_AMOUNT_TO_LEVEL_UP} XP ---`);
    room.send("debug_give_xp", { amount: XP_AMOUNT_TO_LEVEL_UP });

    const levelUpMessage = await waitForMessage(room, "level_up");
    console.log("✅ Message de level-up reçu:", levelUpMessage);

    const statsAfterLevelUp = await waitForMessage(room, "stats_update");
    console.log("📊 Stats après level-up:", statsAfterLevelUp);
    console.log(`👉 Points de talent disponibles: ${statsAfterLevelUp.availableSkillPoints}`);
    console.log("📊 DIFF →", diff(initialStats, statsAfterLevelUp));

    // --- ÉTAPE 3 : Apprendre un talent ---
    console.log(`\n--- ÉTAPE 3 : Apprendre le talent ${TALENT_TO_LEARN_ID} ---`);
    room.send("talent_learn", { talentId: TALENT_TO_LEARN_ID });
    
    // Note: Le serveur n'envoie pas encore de message "talent_learned", on attend donc juste le changement de stats
    const statsAfterLearn = await waitForMessage(room, "stats_update");
    console.log("📊 Stats après apprentissage du talent:", statsAfterLearn);
    console.log(`👉 Points de talent disponibles: ${statsAfterLearn.availableSkillPoints}`);
    console.log("📊 DIFF →", diff(statsAfterLevelUp, statsAfterLearn));

    // --- ÉTAPE 4 : Reset des talents ---
    console.log(`\n--- ÉTAPE 4 : Reset des talents ---`);
    room.send("talent_reset");

    const statsAfterReset = await waitForMessage(room, "stats_update");
    console.log("📊 Stats après reset:", statsAfterReset);
    console.log(`👉 Points de talent disponibles: ${statsAfterReset.availableSkillPoints}`);
    console.log("📊 DIFF →", diff(statsAfterLearn, statsAfterReset));

    console.log("\n🎉 FIN DU TEST SYSTÈME DE TALENTS\n");
}

// =====================================================================
// MAIN
// =====================================================================
(async () => {
    try {
        await register();
        const token = await login();
        let profile = await getProfile(token);

        if (!profile) {
            const creation = await getCreationData(token);
            const race = creation.races[0].raceId;
            const classId = creation.byRace[race][0].classId;
            profile = await createCharacter(token);
        }

        const mm = await reserveSeat(token);
        const client = new Colyseus.Client(WS_URL);
        const room = await client.consumeSeatReservation(mm);

        console.log("🔌 CONNECTÉ AU SERVEUR !");
        await sleep(1000); // Petite pause pour être sûr que tout est prêt

        await testTalentSystem(room);

        process.exit(0);
    } catch (error) {
        console.error("❌ Erreur dans le script principal:", error);
        process.exit(1);
    }
})();
