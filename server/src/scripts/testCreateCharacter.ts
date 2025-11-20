import WebSocket from "ws";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

// === Compte test ===
const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// =========================
// Helpers
// =========================
async function api(path: string, method = "GET", body: any = null, token: string | null = null) {
    const res = await fetch(API_URL + path, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : null
    });

    return res.json();
}

// =========================
// REGISTER
// =========================
async function registerAccount() {
    console.log("→ Tentative d'inscription...");

    const json = await api("/auth/register", "POST", {
        username: TEST_USERNAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });

    if (json.error === "Username already taken") {
        console.log("ℹ Compte déjà existant, on continue.");
        return;
    }

    console.log("✔ Compte créé !");
}

// =========================
// LOGIN
// =========================
async function loginAccount(): Promise<string> {
    console.log("→ Connexion...");

    const json = await api("/auth/login", "POST", {
        username: TEST_USERNAME,
        password: TEST_PASSWORD
    });

    if (json.token) {
        console.log("✔ Connecté !");
        return json.token;
    }

    throw new Error("Login failed");
}

// =========================
// Check existing profile
// =========================
async function checkExistingProfile(token: string) {
    const json = await api(`/profile/${SERVER_ID}`, "GET", null, token);

    return json.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) || null;
}

// =========================
// Create character
// =========================
async function createCharacter(token: string, race: string, classId: string) {
    const json = await api(`/profile/${SERVER_ID}`, "POST", {
        characterSlot: CHARACTER_SLOT,
        characterName: CHARACTER_NAME,
        characterClass: classId,
        characterRace: race
    }, token);

    return json.profile;
}

// =========================
// Matchmaking
// =========================
async function reserveSeat(token: string) {
    const json = await api(`/matchmaking/join-world`, "POST", {
        token,
        serverId: SERVER_ID,
        characterSlot: CHARACTER_SLOT
    });

    if (!json.sessionId || !json.room?.roomId) {
        console.log("BAD MATCHMAKING RESPONSE:", json);
        throw new Error("Bad matchmaking response");
    }

    return {
        roomId: json.room.roomId,
        sessionId: json.sessionId
    };
}

// =========================
// Connect WebSocket
// =========================
async function connectWebSocket(roomId: string, sessionId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const url = `${WS_URL}/${roomId}?sessionId=${sessionId}`;
        console.log("WS URL =", url);

        const ws = new WebSocket(url);

        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
            resolve(ws);
        });

        ws.on("error", (err) => {
            console.error("WS error:", err);
            reject(err);
        });

        ws.on("message", (raw) => {
            if (!(raw instanceof Buffer)) return;
            console.log("📩 Raw message:", raw.length, "bytes");
        });
    });
}

// =========================
// MAIN
// =========================
(async () => {
    console.log("=== 🧪 TEST CREATION PERSONNAGE ===");

    await registerAccount();
    const token = await loginAccount();

    let profile = await checkExistingProfile(token);

    if (profile) {
        console.log("✔ Personnage :", profile.characterName);
    } else {
        // Get races + classes
        const creation = await api("/game-data/creation", "GET", null, token);
        const raceId = creation.races[0].raceId;
        const classId = creation.byRace[raceId][0].classId;

        profile = await createCharacter(token, raceId, classId);
        console.log("✔ Personnage créé :", profile.characterName);
    }

    console.log("→ Matchmaking Colyseus…");
    const seat = await reserveSeat(token);

    console.log("→ Connexion WebSocket…");
    const ws = await connectWebSocket(seat.roomId, seat.sessionId);

    console.log("→ Spawn de 2 mobs…");
    ws.send(JSON.stringify({ type: "spawn_test_monster" }));
    ws.send(JSON.stringify({ type: "spawn_test_monster" }));

    console.log("→ Combat auto activé…");
    ws.send(JSON.stringify({ type: "activate_afk_mode" }));
})();
