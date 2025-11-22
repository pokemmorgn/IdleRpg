/**
 * TEST SKINS — Unlock / Equip / Level-Up (version stable & patchée)
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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================================
// AUTH
// =====================================================================
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

async function getProfile(token: string) {
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

    console.log("✔ Personnage créé !");
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

// =====================================================================
// SKIN PICK PAR CLASSE
// =====================================================================
function pickSkinFromClass(playerClass: string): string {
    const mapping: Record<string, string> = {
        "warrior": "warrior_basic01",
        "priest":  "priest_basic01",
        "mage":    "mage_basic01",
        "rogue":   "rogue_basic01",
        "paladin": "paladin_basic01",
        "druid":   "druid_basic01",
    };

    return mapping[playerClass] || "warrior_basic01";
}

// =====================================================================
// WAIT FOR REAL STATS UPDATE (TYPE SAFE!)
// =====================================================================
async function waitForStatsUpdate(
    previousStats: any,
    lastStatsRef: { value: any },
    timeoutMs: number = 5000
): Promise<any> {
    return new Promise((resolve, reject) => {
        const check = setInterval(() => {
            if (lastStatsRef.value && lastStatsRef.value !== previousStats) {
                clearInterval(check);
                clearTimeout(timeout);
                resolve(lastStatsRef.value);
            }
        }, 50);
        
        const timeout = setTimeout(() => {
            clearInterval(check);
            console.error("⏱️ Timeout en attente des stats_update");
            resolve(null); // Résoudre avec null en cas de timeout
        }, timeoutMs);
    });
}

// =====================================================================
// DIFF
// =====================================================================
function diff(a: any, b: any) {
    if (!a || !b) return "Pas de données.";
    let changes: Record<string, { from: any, to: any }> = {};
    for (const k in b) {
        if (a[k] !== b[k]) {
            changes[k] = { from: a[k], to: b[k] };
        }
    }
    return changes;
}

// =====================================================================
// TEST SKINS
// =====================================================================
async function testSkinSystem(room: Colyseus.Room, skinId: string, lastStatsRef: { value: any }) {
    console.log("\n🔥 DÉBUT DU TEST SKINS\n");

    console.log("⏳ En attente des premières stats...");
    while (!lastStatsRef.value) await sleep(100);

    let before: any = structuredClone(lastStatsRef.value);
    console.log("📊 Stats initiales:", before);

    // --- UNLOCK ---
    console.log("\n--- ÉTAPE 1 : UNLOCK ---");
    console.log(`📤 Envoi de skin_unlock pour ${skinId}`);
    room.send("skin_unlock", { skinId });
    let afterUnlock: any = await waitForStatsUpdate(before, lastStatsRef);
    if (afterUnlock) {
        console.log("📊 DIFF →", diff(before, afterUnlock));
    } else {
        console.log("❌ Pas de réponse pour skin_unlock");
    }

    // --- EQUIP ---
    before = afterUnlock || before;
    console.log("\n--- ÉTAPE 2 : EQUIP ---");
    console.log(`📤 Envoi de skin_equip pour ${skinId}`);
    room.send("skin_equip", { skinId });
    let afterEquip: any = await waitForStatsUpdate(before, lastStatsRef);
    if (afterEquip) {
        console.log("📊 DIFF →", diff(before, afterEquip));
    } else {
        console.log("❌ Pas de réponse pour skin_equip");
    }

    // --- LEVEL 1 ---
    before = afterEquip || before;
    console.log("\n--- ÉTAPE 3 : LEVEL UP (1) ---");
    console.log(`📤 Envoi de skin_level_up pour ${skinId}`);
    room.send("skin_level_up", { skinId });
    let afterL1: any = await waitForStatsUpdate(before, lastStatsRef);
    if (afterL1) {
        console.log("📊 DIFF →", diff(before, afterL1));
    } else {
        console.log("❌ Pas de réponse pour skin_level_up (1)");
    }

    // --- LEVEL 2 ---
    before = afterL1 || before;
    console.log("\n--- ÉTAPE 4 : LEVEL UP (2) ---");
    console.log(`📤 Envoi de skin_level_up pour ${skinId}`);
    room.send("skin_level_up", { skinId });
    let afterL2: any = await waitForStatsUpdate(before, lastStatsRef);
    if (afterL2) {
        console.log("📊 DIFF →", diff(before, afterL2));
    } else {
        console.log("❌ Pas de réponse pour skin_level_up (2)");
    }

    console.log("\n🎉 FIN DU TEST SKINS\n");
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
            profile = await createCharacter(token, race, classId);
        }

        const mm = await reserveSeat(token);
        const client = new Colyseus.Client(WS_URL);
        const room = await client.consumeSeatReservation(mm);

        console.log("🔌 CONNECTÉ AU SERVEUR !");

        // Référence partagée pour les stats
        let lastStatsRef: { value: any } = { value: null };

        // Enregistrement des écouteurs de messages immédiatement après la connexion
        console.log("📡 Enregistrement des écouteurs de messages...");
        
        room.onMessage("stats_update", (msg) => {
            console.log("📈 STATS UPDATE REÇU:", msg);
            lastStatsRef.value = msg;
        });

        room.onMessage("skin_unlocked", (msg) => console.log("🟩 SKIN UNLOCKED:", msg));
        room.onMessage("skin_equipped", (msg) => console.log("🎽 SKIN EQUIPPED:", msg));
        room.onMessage("skin_level_up", (msg) => console.log("⬆️  SKIN LEVEL UP:", msg));
        room.onMessage("skin_error", (msg) => console.error("❌ SKIN ERROR:", msg));
        room.onMessage("welcome", (msg) => console.log("👋 WELCOME:", msg));

        // Attendre un peu pour s'assurer que les écouteurs sont bien enregistrés
        console.log("⏳ Attente de l'initialisation...");
        await sleep(2000);

        const SKIN_ID = pickSkinFromClass(profile.class);
        console.log("🎽 SKIN CHOISI :", SKIN_ID);

        await testSkinSystem(room, SKIN_ID, lastStatsRef);

        process.exit(0);
    } catch (error) {
        console.error("❌ Erreur dans le script principal:", error);
        process.exit(1);
    }
})();
