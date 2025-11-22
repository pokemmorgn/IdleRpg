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
// WAIT FOR REAL STATS UPDATE
// =====================================================================
async function waitForStatsUpdate(previousStats: any, lastStatsRef: { value: any }) {
    return new Promise(resolve => {
        const check = setInterval(() => {
            if (lastStatsRef.value && lastStatsRef.value !== previousStats) {
                clearInterval(check);
                resolve(lastStatsRef.value);
            }
        }, 50);
    });
}

// =====================================================================
// TEST SKINS
// =====================================================================
async function testSkinSystem(room: Colyseus.Room, skinId: string) {

    console.log("\n🔥 DÉBUT DU TEST SKINS\n");

    let lastStats = { value: null };

    // Listeners
    room.onMessage("stats_update", (msg) => {
        lastStats.value = msg;
        console.log("📈 STATS UPDATE:", msg);
    });

    room.onMessage("skin_unlocked", (msg) => console.log("🟩 SKIN UNLOCKED:", msg));
    room.onMessage("skin_equipped", (msg) => console.log("🎽 SKIN EQUIPPED:", msg));
    room.onMessage("skin_level_up", (msg) => console.log("⬆️  SKIN LEVEL UP:", msg));
    room.onMessage("skin_error", (msg) => console.error("❌ SKIN ERROR:", msg));

    // Attendre la première stats
    console.log("⏳ En attente des premières stats...");
    while (!lastStats.value) await sleep(200);

    console.log("\n🔍 STAT AVANT ACTIONS");
    let before = structuredClone(lastStats.value);

    // --- UNLOCK ---
    console.log("\n--- ÉTAPE 1 : UNLOCK ---");
    room.send("skin_unlock", { skinId });
    let afterUnlock = await waitForStatsUpdate(before, lastStats);
    console.log("📊 DIFF →", diff(before, afterUnlock));

    // --- EQUIP ---
    console.log("\n--- ÉTAPE 2 : EQUIP ---");
    before = afterUnlock;
    room.send("skin_equip", { skinId });
    let afterEquip = await waitForStatsUpdate(before, lastStats);
    console.log("📊 DIFF →", diff(before, afterEquip));

    // --- LEVEL 1 ---
    console.log("\n--- ÉTAPE 3 : LEVEL UP (1) ---");
    before = afterEquip;
    room.send("skin_level_up", { skinId });
    let afterL1 = await waitForStatsUpdate(before, lastStats);
    console.log("📊 DIFF →", diff(before, afterL1));

    // --- LEVEL 2 ---
    console.log("\n--- ÉTAPE 4 : LEVEL UP (2) ---");
    before = afterL1;
    room.send("skin_level_up", { skinId });
    let afterL2 = await waitForStatsUpdate(before, lastStats);
    console.log("📊 DIFF →", diff(before, afterL2));

    console.log("\n🎉 FIN DU TEST SKINS\n");
}

// =====================================================================
// DIFF UTILS
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
// MAIN
// =====================================================================
(async () => {

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

    await sleep(1500);

    const SKIN_ID = pickSkinFromClass(profile.class);
    console.log("🎽 SKIN CHOISI :", SKIN_ID);

    await testSkinSystem(room, SKIN_ID);

    process.exit(0);
})();
