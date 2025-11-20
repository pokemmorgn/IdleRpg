// =======================================
//   SCRIPT TEST CREATION + COMBAT
// =======================================
import WebSocket from "ws";
import fetch from "node-fetch";

const API_URL = "http://localhost:3000";

// === Compte test ===
const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

// Perso de test
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// =========================
// 1) REGISTER
// =========================
async function registerAccount(): Promise<boolean> {
    console.log("→ Tentative d'inscription...");

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

// =========================
// 2) LOGIN
// =========================
async function loginAccount(): Promise<string | null> {
    console.log("→ Connexion...");

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

// =========================
// 3) GET CREATION DATA
// =========================
async function getCreationData(token: string): Promise<any> {
    console.log("→ Récupération des races/classes...");

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

// =========================
// 4) Vérifier le profil existant
// =========================
async function checkExistingProfile(token: string): Promise<any | null> {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur getProfile:", json);
        return null;
    }

    return json.profiles.find((p: any) =>
        p.characterSlot === CHARACTER_SLOT
    ) ?? null;
}

// =========================
// 5) CREATE CHARACTER
// =========================
async function createCharacter(
    token: string,
    race: string,
    classId: string
): Promise<any | null> {

    console.log(`→ Création du personnage (${race}/${classId})...`);

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

// =================================================
// 🧩 UTILITAIRE : raw → Buffer (WS compatible)
// =================================================
function rawToBuffer(raw: WebSocket.RawData): Buffer {
    if (raw instanceof Buffer) return raw;
    if (typeof raw === "string") return Buffer.from(raw);
    if (raw instanceof ArrayBuffer) return Buffer.from(new Uint8Array(raw));
    return Buffer.from(raw as Uint8Array);
}

// =================================================
// 6) RESERVER UNE PLACE SUR WORLD TEST
// =================================================
async function reserveSeat(token: string) {
    console.log("→ Matchmaking Colyseus…");

    const res = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token,
            serverId: SERVER_ID,
            characterSlot: CHARACTER_SLOT
        })
    });

    const json = await res.json();

    if (!res.ok) {
        console.log("=== DEBUG MATCHMAKING RESPONSE ===");
        console.dir(json, { depth: null });
        throw new Error("⚠ Impossible de réserver une place : " + JSON.stringify(json));
    }

    return json;
}

// =================================================
// 7) CONNEXION WS
// =================================================
async function connectWebSocket(room: any, sessionId: string): Promise<WebSocket> {
    return new Promise((resolve) => {
        const wsURL = `ws://localhost:3000/${room.room.roomId}?sessionId=${sessionId}`;

        console.log("→ Connexion WebSocket…");

        const ws = new WebSocket(wsURL);

        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
            resolve(ws);
        });

        ws.on("message", (raw) => {
            const buf = rawToBuffer(raw);
            handleIncomingMessage(buf);
        });
    });
}

// =================================================
// 8) LOG (DEBUG COMBAT)
// =================================================
function handleIncomingMessage(buf: Buffer) {
    console.log("📩 Message Colyseus reçu");
    console.log("Hex:", buf.toString("hex").slice(0, 200), "...");
    console.log("");
}

// =================================================
// 9) SPAWN MONSTERS
// =================================================
function spawnMobs(ws: WebSocket) {
    console.log("→ Spawn de 2 mobs…");

    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: "mob1",
        name: "Goblin",
        x: 105,
        y: 0,
        z: 105
    }));

    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: "mob2",
        name: "Goblin",
        x: 110,
        y: 0,
        z: 110
    }));
}

// =================================================
// 10) LANCER COMBAT AUTO
// =================================================
function startCombatAI(ws: WebSocket) {
    console.log("→ Combat auto activé…");

    setInterval(() => {
        ws.send(JSON.stringify({
            type: "queue_skill",
            skillId: "autoattack"
        }));
    }, 1000);
}

// =================================================
// MAIN
// =================================================
(async () => {
    console.log("=== 🧪 TEST CREATION PERSONNAGE ===");

    const ok = await registerAccount();
    if (!ok) return;

    const token = await loginAccount();
    if (!token) return;

    // Vérifier si le perso existe
    let profile = await checkExistingProfile(token);
    if (profile) {
        console.log("✔ Personnage :", profile.characterName);
    } else {
        const creation = await getCreationData(token);
        if (!creation) return;

        const raceId = creation.races[0].raceId;
        const classId = creation.byRace[raceId][0].classId;

        profile = await createCharacter(token, raceId, classId);
    }

    // === MATCHMAKING ===
    const seat = await reserveSeat(token);

    // === WS CONNECT ===
    const ws = await connectWebSocket(seat, seat.sessionId);

    // === GAMEPLAY ===
    spawnMobs(ws);
    startCombatAI(ws);

})();
