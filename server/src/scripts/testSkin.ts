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
// TEST SKINS
// =====================================================================
async function testSkinSystem(room: Colyseus.Room, skinId: string) {

    console.log("\n🔥 DÉBUT DU TEST SKINS\n");

    let lastStats: any = null;

    room.onMessage("stats_update", (msg) => {
        console.log("📈 STATS UPDATE →", msg);
        lastStats = msg;
    });

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

    await sleep(1000);

    console.log("🔍 Capture des stats AVANT");
    let before = structuredClone(lastStats);

    // ---------------------------------------------------------
    // 1) UNLOCK
    // ---------------------------------------------------------
    console.log("\n--- ÉTAPE 1 : UNLOCK ---");
    room.send("skin_unlock", { skinId });
    await sleep(800);

    let afterUnlock = structuredClone(lastStats);
    console.log("📊 DIFF →", diff(before, afterUnlock));

    // ---------------------------------------------------------
    // 2) EQUIP
    // ---------------------------------------------------------
    console.log("\n--- ÉTAPE 2 : EQUIP ---");
    room.send("skin_equip", { skinId });
    await sleep(800);

    let afterEquip = structuredClone(lastStats);
    console.log("📊 DIFF →", diff(afterUnlock, afterEquip));

    // ---------------------------------------------------------
    // 3) LEVEL 1
    // ---------------------------------------------------------
    console.log("\n--- ÉTAPE 3 : LEVEL UP (1) ---");
    room.send("skin_level_up", { skinId });
    await sleep(800);

    let afterL1 = structuredClone(lastStats);
    console.log("📊 DIFF →", diff(afterEquip, afterL1));

    // ---------------------------------------------------------
    // 4) LEVEL 2
    // ---------------------------------------------------------
    console.log("\n--- ÉTAPE 4 : LEVEL UP (2) ---");
    room.send("skin_level_up", { skinId });
    await sleep(800);

    let afterL2 = structuredClone(lastStats);
    console.log("📊 DIFF →", diff(afterL1, afterL2));

    console.log("\n🎉 FIN DU TEST SKINS\n");
}


// =====================================================================
// UTILS : DIFF ENTRE STATS
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
