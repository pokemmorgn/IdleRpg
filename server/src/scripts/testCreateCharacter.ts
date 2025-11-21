/**
 * CLIENT DE TEST COMPLET – COMBAT + HUD + CREATION PERSONNAGE
 * 100% compatible protocole Colyseus.js
 */

import * as Colyseus from "colyseus.js";

// =====================
// CONSTANTES
// =====================
const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// =====================
// UTILS
// =====================
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// HUD ================================
let HUD_PLAYER_HP = 100;
let HUD_PLAYER_MAXHP = 100;

const HUD_MOBS: Record<string, { hp: number; maxHp: number }> = {};
let HUD_TARGET = "-";

function renderHUD() {
    console.clear();
    console.log("=========================================");
    console.log("        🟩 COMBAT HUD – IdleRPG           ");
    console.log("=========================================");

    console.log(`👤 Player: HP ${HUD_PLAYER_HP}/${HUD_PLAYER_MAXHP}`);
    console.log(`🎯 Target: ${HUD_TARGET}`);

    console.log("\n👹 MOBS :");
    if (Object.keys(HUD_MOBS).length === 0) {
        console.log("  Aucun monstre.");
    } else {
        for (const [id, mob] of Object.entries(HUD_MOBS)) {
            console.log(`  - ${id} = ${mob.hp}/${mob.maxHp}`);
        }
    }

    console.log("=========================================\n");
}

// =============================
// API WRAPPERS
// =============================
async function registerAccount(): Promise<boolean> {
    console.log("→ Tentative d'inscription...");

    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_USERNAME,
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        }),
    });

    const json = await res.json();

    if (res.ok) {
        console.log("✔ Compte créé !");
        return true;
    }

    if (json.error === "Username already taken") {
        console.log("ℹ Compte déjà existant, on continue.");
        return true;
    }

    console.error("❌ Erreur register:", json);
    return false;
}

async function loginAccount(): Promise<string | null> {
    console.log("→ Connexion...");

    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_USERNAME,
            password: TEST_PASSWORD,
        }),
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur login:", json);
        return null;
    }

    console.log("✔ Connecté !");
    return json.token;
}

async function checkExistingProfile(token: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (!res.ok) return null;

    return json.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) ?? null;
}

async function getCreationData(token: string) {
    const res = await fetch(`${API_URL}/game-data/creation`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (!res.ok) return null;

    return json;
}

async function createCharacter(token: string, race: string, classId: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            characterSlot: CHARACTER_SLOT,
            characterName: CHARACTER_NAME,
            characterClass: classId,
            characterRace: race,
        }),
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur createProfile:", json);
        return null;
    }

    console.log("✔ Personnage créé !");
    return json.profile;
}

// =============================
// MATCHMAKING
// =============================
async function reserveSeat(token: string, profile: any) {
    console.log("→ Matchmaking Colyseus…");

    const res = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            serverId: SERVER_ID,
            characterSlot: CHARACTER_SLOT,
        }),
    });

    const json = await res.json();

    if (!res.ok) {
        throw new Error("⚠ Matchmaking failed: " + JSON.stringify(json));
    }

    return json; // { room, sessionId }
}

// =============================
// SPAWN + COMBAT AUTO
// =============================
async function spawnTestMobs(room: Colyseus.Room) {
    console.log("→ Spawn de 2 mobs…");

    room.send("spawn_test_monster", {
        monsterId: "mob_01",
        name: "Dummy A",
        x: 0, y: 0, z: 1
    });
}

async function startCombat(room: Colyseus.Room) {
    console.log("→ Demande d'activation du combat auto envoyée…");
    room.send("start_auto_combat");
}

// =============================
// MAIN
// =============================
(async () => {
    console.log("=== 🧪 TEST CREATION PERSONNAGE ===");

    const ok = await registerAccount();
    if (!ok) return;

    const token = await loginAccount();
    if (!token) return;

    let profile = await checkExistingProfile(token);

    if (!profile) {
        const creation = await getCreationData(token);
        if (!creation) {
            console.error("Impossible de récupérer les données de création.");
            return;
        }
        const raceId = creation.races[0].raceId;
        const classId = creation.byRace[raceId][0].classId;
        profile = await createCharacter(token, raceId, classId);
    }

    console.log("✔ Personnage :", profile.characterName);

    const mm = await reserveSeat(token, profile);

    // ======================
    // 🔥 CONNEXION COLYSEUS
    // ======================
    const client = new Colyseus.Client(WS_URL);

    const room = await client.consumeSeatReservation(mm);

    console.log("🔌 WebSocket connecté !");

// =========================================================
// 🟢 AJOUTER ICI LE HANDLER DES combat_event
// =========================================================
room.onMessage("combat_event", (msg) => {
    console.log("📩 combat_event:", msg);

    switch (msg.event) {
        case "hit":
        case "crit":
            if (msg.target === "monster") {
                const id = msg.targetId;
                HUD_MOBS[id] = HUD_MOBS[id] || { hp: msg.maxHp, maxHp: msg.maxHp };
                HUD_MOBS[id].hp = msg.remainingHp;
                HUD_TARGET = id;
            }
            if (msg.target === "player") {
                HUD_PLAYER_HP = msg.remainingHp;
            }
            break;

        case "heal":
            HUD_PLAYER_HP = msg.hp;
            break;

        case "death":
            if (msg.entity === "monster") delete HUD_MOBS[msg.entityId];
            if (msg.entity === "player") HUD_PLAYER_HP = 0;
            break;

        case "hp_update":
            if (HUD_MOBS[msg.entityId]) {
                HUD_MOBS[msg.entityId].hp = msg.hp;
                HUD_MOBS[msg.entityId].maxHp = msg.maxHp;
            }
            break;

        case "target_change":
            HUD_TARGET = msg.targetId || "-";
            break;
    }

    renderHUD();
});
// =========================================================

    // On attend un peu
    await sleep(300);

    await spawnTestMobs(room);
    await sleep(300);
    await startCombat(room);

})();
