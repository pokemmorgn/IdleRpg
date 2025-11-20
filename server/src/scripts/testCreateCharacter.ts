/**
 * SCRIPT DE TEST : REGISTER → LOGIN → JOIN → WEBSOCKET → COMBAT AUTO + HUD
 * Compatible Node 18+ (fetch natif)
 * Zéro erreur TypeScript
 */

import WebSocket, { RawData } from "ws";

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

function rawToBuffer(raw: RawData): Buffer {
    if (raw instanceof Buffer) return raw;
    if (typeof raw === "string") return Buffer.from(raw);
    if (raw instanceof ArrayBuffer) return Buffer.from(new Uint8Array(raw));
    return Buffer.from(raw as Uint8Array);
}

// HUD ================================
let HUD_PLAYER_HP = 0;
let HUD_PLAYER_MAXHP = 0;

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

// =====================
// API WRAPPERS
// =====================

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
// WEBSOCKET
// =============================
async function connectWebSocket(room: any, sessionId: string) {
    console.log("→ Connexion WebSocket…");

    const ws = new WebSocket(`${WS_URL}/${room.name}/${room.roomId}?sessionId=${sessionId}`);

    return new Promise<WebSocket>((resolve, reject) => {
        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
            resolve(ws);
        });

        ws.on("error", reject);
    });
}

// =============================
// TRAITEMENT DES MESSAGES
// =============================
function handleIncomingMessage(buffer: Buffer) {
    // Colyseus = binary patch → on ignore
    // Nos events custom = JSON → on les traite
    if (buffer[0] !== 0x7B) return;

    let msg: any;
    try {
        msg = JSON.parse(buffer.toString());
    } catch {
        return;
    }

    handleJSONMessage(msg);
}

function handleJSONMessage(msg: any) {
    // ========== HANDLER COMBAT ==========
    if (msg.type === "monster_attack") {
        // Format serveur:
        // { type: "monster_attack", attackerId, damage, hpLeft }

        HUD_PLAYER_HP = msg.hpLeft;
        HUD_TARGET = msg.attackerId;

        console.log(`🟥 Le monstre ${msg.attackerId} t’inflige ${msg.damage} → HP ${msg.hpLeft}`);

        renderHUD();
        return;
    }

    if (msg.type === "player_hit") {
        // Format serveur:
        // { type: "player_hit", monsterId, damage, hpLeft }

        if (!HUD_MOBS[msg.monsterId]) {
            HUD_MOBS[msg.monsterId] = { hp: msg.hpLeft, maxHp: msg.hpLeft };
        } else {
            HUD_MOBS[msg.monsterId].hp = msg.hpLeft;
        }

        HUD_TARGET = msg.monsterId;

        console.log(`🟦 Tu frappes ${msg.monsterId} → ${msg.damage} dégâts (HP ${msg.hpLeft})`);

        renderHUD();
        return;
    }

    if (msg.type === "monster_dead") {
        console.log(`💀 Monstre ${msg.monsterId} tué !`);
        delete HUD_MOBS[msg.monsterId];
        renderHUD();
        return;
    }

    if (msg.type === "player_dead") {
        console.log(`💀 Tu es mort !`);
        HUD_PLAYER_HP = 0;
        renderHUD();
        return;
    }

    // Logs génériques
    if (msg.type === "combat_log") {
        console.log(`📘 Log: ${msg.message}`);
    }
}


// =============================
// SPAWN + COMBAT AUTO
// =============================
async function spawnTestMobs(ws: WebSocket) {
    console.log("→ Spawn de 2 mobs…");

    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: "mob_01",
        name: "Dummy A",
        x: 102, y: 0, z: 104
    }));

    await sleep(200);

    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: "mob_02",
        name: "Dummy B",
        x: 108, y: 0, z: 102
    }));
}

async function startCombat(ws: WebSocket) {
    console.log("→ Combat auto activé…");

    // Rien à envoyer : le WorldRoom lance tout seul l'auto-combat si proche.
}

// =============================
// MAIN SCRIPT
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
        const raceId = creation.races[0].raceId;
        const classId = creation.byRace[raceId][0].classId;
        profile = await createCharacter(token, raceId, classId);
    }

    console.log("✔ Personnage :", profile.characterName);

    const mm = await reserveSeat(token, profile);
    const ws = await connectWebSocket(mm.room, mm.sessionId);

    ws.on("message", (raw) => handleIncomingMessage(rawToBuffer(raw)));

    await sleep(300);

    await spawnTestMobs(ws);
    await startCombat(ws);

})();
