/**
 * Test complet :
 * - Register
 * - Login
 * - Create Character
 * - Join Colyseus (matchmaking)
 * - Spawn 4 mobs
 * - Combat auto
 */

const API_URL = "http://localhost:3000";

// --- Test account ---
const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

// --- Character ---
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// =========================
// REGISTER
// =========================
async function registerAccount() {
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
// LOGIN
// =========================
async function loginAccount() {
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
// GET CREATION DATA
// =========================
async function getCreationData(token) {
    const res = await fetch(`${API_URL}/game-data/creation`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur creation data:", json);
        return null;
    }

    return json;
}

// =========================
// CHECK EXISTING PROFILE
// =========================
async function checkExistingProfile(token) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();

    if (!res.ok) return null;

    return json.profiles.find(p => p.characterSlot === CHARACTER_SLOT) ?? null;
}

// =========================
// CREATE CHARACTER
// =========================
async function createCharacter(token, race, classId) {
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

// =========================
// === JOIN COLOSEUS ===
// =========================
async function reserveSeat(token) {
    console.log("→ Matchmaking Colyseus…");

    const res = await fetch(`${API_URL}/matchmake/joinOrCreate/world`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token,
            serverId: SERVER_ID,
            characterSlot: CHARACTER_SLOT
        })
    });

    const json = await res.json();

    if (!res.ok || !json.room) {
        console.error("❌ Erreur matchmaking:", json);
        return null;
    }

    return json.room;
}

// =========================
// CONNECT WebSocket
// =========================
async function connectWebSocket(room) {
    return new Promise(resolve => {
        console.log("→ Connexion WebSocket…");

        const ws = new (require("ws"))(
            `${room.wsEndpoint}?sessionId=${room.sessionId}`
        );

        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
        });

        ws.on("message", raw => {
            if (raw instanceof Buffer) return; // ignore binary

            let msg;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                return;
            }

            if (msg.type === "welcome") {
                console.log("🌍 Bienvenue :", msg.message);
                resolve(ws);
            }

            if (msg.type === "combat_log") {
                console.log("⚔️", msg.text);
            }

            if (msg.type === "skill_damage") {
                console.log(`🔥 Sort ${msg.skillId} → ${msg.damage} dmg (mob HP ${msg.hpLeft})`);
            }

            if (msg.type === "auto_attack") {
                console.log(`👊 AA → ${msg.damage} dmg`);
            }
        });
    });
}

// =========================
// SPAWN 4 MOBS + COMBAT
// =========================
function spawnMobs(ws) {
    console.log("→ Spawn de 4 mobs...");

    const coords = [
        { x: 105, z: 105 },
        { x: 108, z: 105 },
        { x: 105, z: 108 },
        { x: 108, z: 108 },
    ];

    coords.forEach((pos, i) => {
        ws.send(JSON.stringify({
            type: "spawn_test_monster",
            monsterId: "mob_" + i,
            name: "Dummy " + i,
            x: pos.x,
            y: 0,
            z: pos.z
        }));
    });
}

// =========================
// AI LOOP
// =========================
function startCombatAI(ws) {
    console.log("→ Combat Auto lancé !");

    setInterval(() => {
        ws.send(JSON.stringify({ type: "queue_skill", skillId: "smite" }));
    }, 500);
}

// =========================
// MAIN
// =========================
(async () => {
    console.log("=== 🧪 TEST COMBAT ===");

    const ok = await registerAccount();
    if (!ok) return;

    const token = await loginAccount();
    if (!token) return;

    let profile = await checkExistingProfile(token);
    if (!profile) {
        const creation = await getCreationData(token);
        const race = creation.races[0].raceId;
        const cls = creation.byRace[race][0].classId;

        profile = await createCharacter(token, race, cls);
    }

    console.log("✔ Personnage :", profile.characterName);

    const room = await reserveSeat(token);
    if (!room) return;

    const ws = await connectWebSocket(room);

    spawnMobs(ws);
    startCombatAI(ws);
})();
