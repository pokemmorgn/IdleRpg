/**
 * TEST COMPLET :
 * - Register
 * - Login
 * - Récup perso
 * - Connexion Colyseus
 * - Spawn 2 mobs
 * - Combat auto
 * - HUD dynamique
 */

import WebSocket from "ws";

// ===============================
// CONFIG
// ===============================
const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const USERNAME = "combat_tester";
const PASSWORD = "Test123!";
const EMAIL = "combat_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// ===============================
// HELPERS
// ===============================
function sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

function clean(raw: Buffer) {
    try {
        return raw.toString("utf8").replace(/\u0000/g, "");
    } catch {
        return "";
    }
}

// ===============================
// ACCOUNT SYSTEM
// ===============================
async function register() {
    console.log("→ Tentative d'inscription...");

    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: USERNAME,
            email: EMAIL,
            password: PASSWORD
        })
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

    console.error("❌ register:", json);
    return false;
}

async function login() {
    console.log("→ Connexion...");

    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: USERNAME,
            password: PASSWORD
        })
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ login:", json);
        return null;
    }

    console.log("✔ Connecté !");
    return json.token;
}

// ===============================
// PROFILE SYSTEM
// ===============================
async function getProfile(token: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ getProfile:", json);
        return null;
    }

    return json.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) || null;
}

async function getCreation(token: string) {
    const res = await fetch(`${API_URL}/game-data/creation`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const json = await res.json();

    if (!res.ok) {
        console.error("❌ creation:", json);
        return null;
    }

    return json;
}

async function createCharacter(token: string, race: string, classId: string) {
    console.log(`→ Création du personnage ${CHARACTER_NAME}...`);

    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            characterSlot: CHARACTER_SLOT,
            characterName: CHARACTER_NAME,
            characterClass: classId,
            characterRace: race
        })
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ create:", json);
        return null;
    }

    console.log("✔ Personnage créé !");
    return json.profile;
}

// ===============================
// MATCHMAKING
// ===============================
async function reserveSeat(token: string, characterSlot: number) {
    console.log("→ Matchmaking Colyseus…");

    const res = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            serverId: SERVER_ID,
            characterSlot
        })
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ matchmaking:", json);
        process.exit(1);
    }

    return json;
}

// ===============================
// HANDLE MESSAGES
// ===============================
interface MonsterHP {
    id: string;
    hp: number;
    max: number;
}
const monstersHUD: Record<string, MonsterHP> = {};
let playerHP = 0;
let playerMaxHP = 0;

function drawHUD() {
    console.clear();

    console.log("=== 🟩 COMBAT HUD LIVE ===");
    console.log(`🧍 Player: ${playerHP}/${playerMaxHP}\n`);

    console.log("=== 👹 Monsters ===");
    for (const m of Object.values(monstersHUD)) {
        console.log(` - ${m.id}: ${m.hp}/${m.max}`);
    }

    console.log("\n(Logs en temps réel ci-dessous…)\n");
}

function handleColyseusMessage(type: string, data: any) {
    switch (type) {
        case "welcome":
            playerHP = data.stats.hp;
            playerMaxHP = data.stats.maxHp;
            drawHUD();
            break;

        case "monster_spawned":
            monstersHUD[data.monsterId] = {
                id: data.monsterId,
                hp: data.maxHp,
                max: data.maxHp
            };
            drawHUD();
            break;

        case "monsterHit":
            if (monstersHUD[data.monsterId]) {
                monstersHUD[data.monsterId].hp = data.hpLeft;
            }
            console.log(`🟩 HIT → ${data.monsterName} (${data.damage} dmg)`);
            drawHUD();
            break;

        case "monsterKilled":
            delete monstersHUD[data.monsterId];
            console.log(`💀 Monster slain: ${data.monsterName}`);
            drawHUD();
            break;

        case "playerDamaged":
            playerHP = data.hpLeft;
            console.log(`🟥 Monster hit you for ${data.damage} dmg`);
            drawHUD();
            break;

        case "playerKilled":
            playerHP = 0;
            console.log(`💀 YOU DIED to ${data.monsterName}`);
            drawHUD();
            break;
    }
}

// ===============================
// CONNECT WS
// ===============================
async function connect(room: any, sessionId: string) {
    return new Promise<WebSocket>((resolve) => {
        console.log("→ Connexion WebSocket…");

        const url = `${WS_URL}/${room.roomId}?sessionId=${sessionId}`;
        const ws = new WebSocket(url);

        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
            resolve(ws);
        });

        ws.on("message", (raw: WebSocket.RawData) => {
            const msg = clean(raw as Buffer);

            if (!msg.startsWith("8")) return; // 8 = message
            try {
                const json = JSON.parse(msg.substring(1));
                handleColyseusMessage(json.type, json.data);
            } catch { }
        });
    });
}

// ===============================
// SPAWN MOBS
// ===============================
function spawn(ws: WebSocket) {
    console.log("→ Spawn de 2 mobs…");
    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: `mob_${Date.now()}`,
        name: "Wolf",
        x: 100, y: 0, z: 100
    }));
    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: `mob2_${Date.now()}`,
        name: "Wolf",
        x: 104, y: 0, z: 100
    }));
}

// ===============================
// MAIN
// ===============================
(async () => {
    console.log("=== 🧪 TEST CREATION PERSONNAGE ===");

    if (!await register()) return;

    const token = await login();
    if (!token) return;

    let profile = await getProfile(token);

    if (profile) {
        console.log("✔ Personnage :", profile.characterName);
    } else {
        const creation = await getCreation(token);
        const race = creation.races[0].raceId;
        const classId = creation.byRace[race][0].classId;
        profile = await createCharacter(token, race, classId);
    }

    // MATCHMAKING
    const match = await reserveSeat(token, CHARACTER_SLOT);
    const ws = await connect(match.room, match.sessionId);

    // COMBAT
    spawn(ws);
    console.log("→ Combat auto activé…");

})();
