import WebSocket from "ws";

const API_URL = "http://localhost:3000";
const COLYSEUS_WS_URL = "ws://localhost:3000";

// === Compte test ===
const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

// === Perso test ===
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// ======================
// UTILS
// ======================
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// ======================
// REGISTER
// ======================
async function registerAccount(): Promise<boolean> {
    console.log("→ Tentative d'inscription…");

    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_USERNAME,
            email: TEST_EMAIL,
            password: TEST_PASSWORD
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

    console.error("❌ Erreur register:", json);
    return false;
}


// ======================
// LOGIN
// ======================
async function loginAccount(): Promise<string | null> {
    console.log("→ Connexion…");

    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_USERNAME,
            password: TEST_PASSWORD
        })
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur login:", json);
        return null;
    }

    console.log("✔ Connecté !");
    return json.token;
}


// ======================
// GET CREATION DATA
// ======================
async function getCreationData(token: string): Promise<any | null> {
    console.log("→ Récupération des races/classes…");

    const res = await fetch(`${API_URL}/game-data/creation`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur game-data/creation:", json);
        return null;
    }

    console.log("✔ Données de création reçues !");
    return json;
}


// ======================
// CHECK EXISTING PROFILE
// ======================
async function checkExistingProfile(token: string): Promise<any | null> {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur getProfile:", json);
        return null;
    }

    return json.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) ?? null;
}


// ======================
// CREATE CHARACTER
// ======================
async function createCharacter(token: string, race: string, classId: string): Promise<any | null> {
    console.log(`→ Création du personnage (${race}/${classId})…`);

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
        console.error("❌ Erreur createProfile:", json);
        return null;
    }

    console.log("✔ Personnage créé !");
    return json.profile;
}


// ======================
// MATCHMAKING
// ======================
async function reserveSeat(token: string, characterSlot: number): Promise<any> {
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
        throw new Error("⚠ Impossible de réserver une place : " + JSON.stringify(json));
    }

    return json;
}


// ======================
// ULTRA COMBAT LOGGER™
// ======================
function handleIncomingMessage(raw: Buffer) {
    // Ignore binary (schemas)
    if (raw[0] !== 0x7b) { // '{'
        return;
    }

    let msg: any;
    try {
        msg = JSON.parse(raw.toString());
    } catch {
        return;
    }

    const t = new Date().toLocaleTimeString();
    const type = msg.type || "unknown";

    console.log(`\n🟦 [${t}] EVENT → ${type}`);

    switch (type) {
        case "welcome":
            console.log(`🎉 Bienvenue ${msg.characterName} !`);
            break;

        case "enter_combat":
            console.log(`⚔️ ENTER COMBAT → contre ${msg.monsterId}`);
            break;

        case "leave_combat":
            console.log("🛑 LEAVE COMBAT");
            break;

        case "auto_attack":
            console.log(`🗡️ AUTO → ${msg.targetId} -${msg.damage} (HP: ${msg.hpLeft})`);
            break;

        case "monster_attack":
            console.log(`👹 MONSTER HIT → ${msg.attackerId} inflige ${msg.damage}`);
            break;

        case "damage":
            console.log(`💥 DAMAGE → ${msg.source} → ${msg.target} : ${msg.amount}`);
            break;

        case "monster_died":
            console.log(`💀 MONSTER DEAD → ${msg.monsterId}`);
            break;

        case "player_died":
            console.log(`☠️ PLAYER DEAD → ${msg.playerName}`);
            break;

        default:
            console.log("📩 MESSAGE:", msg);
    }
}


// ======================
// CONNECT WEBSOCKET
// ======================
async function connectWebSocket(room: any, sessionId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const wsUrl = `${COLYSEUS_WS_URL}/${room.roomId}?sessionId=${encodeURIComponent(sessionId)}`;

        console.log("→ Connexion WebSocket…");

        const ws = new WebSocket(wsUrl);

        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
            resolve(ws);
        });
        
        ws.on("message", (raw: WebSocket.RawData) =>
            handleIncomingMessage(Buffer.from(raw))
        );

        ws.on("error", reject);
    });
}


// ======================
// SPAWN MOBS
// ======================
function spawnMobs(ws: WebSocket) {
    for (let i = 0; i < 2; i++) {
        ws.send(JSON.stringify({
            type: "spawn_test_monster",
            monsterId: "dummy_" + i,
            x: 100 + i * 2,
            z: 100 + i * 2
        }));
    }
    console.log("→ Spawn de 2 mobs…");
}


// ======================
// COMBAT AI
// ======================
function startCombatAI(ws: WebSocket) {
    console.log("→ Combat auto activé…");

    setInterval(() => {
        ws.send(JSON.stringify({ type: "player_move", x: 100, y: 0, z: 100 }));
    }, 2000);
}


// ======================
// MAIN
// ======================
(async () => {
    console.log("=== 🧪 TEST COMBAT SERVEUR ===");

    const ok = await registerAccount();
    if (!ok) return;

    const token = await loginAccount();
    if (!token) return;

    let profile = await checkExistingProfile(token);
    if (!profile) {
        const creation = await getCreationData(token);
        const race = creation.races[0].raceId;
        const classId = creation.byRace[race][0].classId;
        profile = await createCharacter(token, race, classId);
    }

    console.log("✔ Personnage :", profile.characterName);

    // → Matchmaking
    console.log("→ Matchmaking Colyseus…");
    const { room, sessionId } = await reserveSeat(token, CHARACTER_SLOT);

    // → Connexion WebSocket
    const ws = await connectWebSocket(room, sessionId);

    // → Spawn et combat
    spawnMobs(ws);
    startCombatAI(ws);
})();
