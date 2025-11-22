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

// CORRIGÉ: On force la classe pour qu'elle corresponde à notre talent de test
const FORCED_CHARACTER_CLASS = "priest";
const FORCED_CHARACTER_RACE = "human_elion"; // On suppose que c'est une race valide pour le guerrier

const TALENT_TO_LEARN_ID = "priest_holy_smite";
const XP_AMOUNT_TO_LEVEL_UP = 1000;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================================
// AUTH (inchangé)
// =====================================================================
async function register() {
    const r = await fetch(`${API_URL}/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
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

async function createCharacter(token: string, race: string, classId: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ characterSlot: CHARACTER_SLOT, characterName: CHARACTER_NAME, characterClass: classId, characterRace: race })
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
        let resolved = false;
        const messageListener = (type: string | number, payload: any) => {
            if (type === messageType && !resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(payload);
            }
        };
        room.onMessage("*", messageListener);
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
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

    // --- ÉTAPE 1 : Demander les stats initiales ---
    console.log("⏳ Demande des stats initiales au serveur...");
    const initialStats = await waitForMessage(room, "stats_update");
    console.log("📊 Stats initiales:", initialStats);
    console.log(`👉 Points de talent disponibles: ${initialStats.availableSkillPoints}`);

    // --- ÉTAPE 2 : Donner de l'XP pour monter d'un niveau ---
    console.log(`\n--- ÉTAPE 2 : Donner ${XP_AMOUNT_TO_LEVEL_UP} XP ---`);
    room.send("debug_give_xp", { amount: XP_AMOUNT_TO_LEVEL_UP });

    const levelUpMessage = await waitForMessage(room, "level_up");
    console.log("✅ Message de level-up reçu:", levelUpMessage);

    // CORRIGÉ: On utilise les stats incluses dans le message level_up
    const statsAfterLevelUp = levelUpMessage.stats;
    console.log("📊 Stats après level-up:", statsAfterLevelUp);
    console.log(`👉 Points de talent disponibles: ${statsAfterLevelUp.availableSkillPoints}`);
    console.log("📊 DIFF →", diff(initialStats, statsAfterLevelUp));

    // --- ÉTAPE 3 : Apprendre un talent ---
    console.log(`\n--- ÉTAPE 3 : Apprendre le talent ${TALENT_TO_LEARN_ID} ---`);
    room.send("talent_learn", { talentId: TALENT_TO_LEARN_ID });
    
    // Ici, on attend bien un stats_update, car l'apprentissage de talent ne renvoie pas de message dédié
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
// MAIN (CORRIGÉ)
// =====================================================================
(async () => {
    try {
        await register();
        const token = await login();
        let profile = await getProfile(token);

        if (!profile) {
            // CORRIGÉ: On force la race et la classe pour notre test
            const race = FORCED_CHARACTER_RACE;
            const classId = FORCED_CHARACTER_CLASS;
            profile = await createCharacter(token, race, classId);
        } else {
            // Si le personnage existe déjà mais n'est pas un guerrier, le test échouera.
            // On peut choisir de le recréer ou d'arrêter le test. Pour l'instant, on continue.
            console.warn(`⚠️ Le personnage existant est un ${profile.class}. Le test pourrait échouer si ce n'est pas un ${FORCED_CHARACTER_CLASS}.`);
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
