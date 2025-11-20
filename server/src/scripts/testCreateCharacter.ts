/**
 * Test global :
 * - Register/Login
 * - Récupération perso
 * - Création si pas existant
 * - Matchmaking Colyseus
 * - Connexion WebSocket
 * - Spawn 2 mobs
 * - Combat automatique
 */

import WebSocket from "ws";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

// === Compte test ===
const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

// Perso test
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// -------------------------------------------------------------
// REGISTER
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// LOGIN
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Récupérer races/classes
// -------------------------------------------------------------
async function getCreationData(token: string) {
    const res = await fetch(`${API_URL}/game-data/creation`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();
    if (!res.ok) return null;

    return json;
}

// -------------------------------------------------------------
// Vérifier profil existant
// -------------------------------------------------------------
async function checkExistingProfile(token: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();
    if (!res.ok) return null;

    return json.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) ?? null;
}

// -------------------------------------------------------------
// Créer perso
// -------------------------------------------------------------
async function createCharacter(
    token: string,
    race: string,
    classId: string
) {
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

// -------------------------------------------------------------
// MATCHMAKING
// -------------------------------------------------------------
async function reserveSeat(token: string): Promise<{ room: any; sessionId: string }> {
    const res = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            serverId: SERVER_ID,
            characterSlot: CHARACTER_SLOT
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error("⚠ Impossible de réserver une place : " + JSON.stringify(json));

    return json;
}

// -------------------------------------------------------------
// Connexion WebSocket Colyseus
// -------------------------------------------------------------
async function connectWebSocket(room: any, sessionId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(
            `${WS_URL}/${room.name}/${room.roomId}?sessionId=${sessionId}`
        );

        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
            resolve(ws);
        });

        ws.on("error", (err) => reject(err));
    });
}

// -------------------------------------------------------------
// Spawn Mobs
// -------------------------------------------------------------
function spawnMobs(ws: WebSocket) {
    console.log("→ Spawn de 2 mobs…");

    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: "mob1",
        x: 110, y: 0, z: 110
    }));

    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: "mob2",
        x: 112, y: 0, z: 112
    }));
}

// -------------------------------------------------------------
// Combat AI
// -------------------------------------------------------------
function startCombatAI(ws: WebSocket) {
    console.log("→ Combat auto activé…");

    setInterval(() => {
        ws.send(JSON.stringify({ type: "queue_skill", skillId: "basic_attack" }));
    }, 1500);
}

// -------------------------------------------------------------
// MAIN
// -------------------------------------------------------------
(async () => {
    console.log("=== 🧪 TEST CREATION PERSONNAGE ===");

    if (!(await registerAccount())) return;

    const token = await loginAccount();
    if (!token) return;

    let profile = await checkExistingProfile(token);

    if (!profile) {
        const creation = await getCreationData(token);
        if (!creation) return;

        const raceId = creation.races[0].raceId;
        const classId = creation.byRace[raceId][0].classId;

        profile = await createCharacter(token, raceId, classId);
        if (!profile) return;
    }

    console.log("✔ Personnage :", profile.characterName);

    // MATCHMAKING
    console.log("→ Matchmaking Colyseus…");
    const { room, sessionId } = await reserveSeat(token);

    console.log("→ Connexion WebSocket…");
    const ws = await connectWebSocket(room, sessionId);

    // LISTEN SERVER MESSAGES
ws.on("message", (raw) => {
    // → Tente de convertir en string
    let text = raw.toString();

    // → Si ça ressemble à du JSON, on le parse
    if (text.startsWith("{") || text.startsWith("[")) {
        try {
            const msg = JSON.parse(text);

            // Filtrage intelligent : on affiche que ce qui nous intéresse
            if (msg.type === "damage") {
                console.log(`⚔️  DMG: ${msg.source} → ${msg.target}: ${msg.amount}`);
            } 
            else if (msg.type === "combat_start") {
                console.log(`🔥 Combat contre ${msg.monsterName} !`);
            }
            else if (msg.type === "combat_end") {
                console.log(`🏁 Combat terminé : ${msg.result}`);
            }
            else if (msg.type === "welcome") {
                console.log("👋 WELCOME:", msg.message);
            }
            else {
                console.log("📨 JSON:", msg);
            }

        } catch (e) {
            // JSON invalide = probablement du binaire → on ignore
        }
    }

    // Sinon = Schema binaire → on ignore
});


    // Spawn mobs + auto-combat
    spawnMobs(ws);
    startCombatAI(ws);
})();
