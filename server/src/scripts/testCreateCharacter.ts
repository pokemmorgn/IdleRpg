/**
 * TEST CREATION + COMBAT IdleRPG
 * Greg Edition ⭐
 */

import WebSocket from "ws";

// =========================
// CONFIG
// =========================
const API_URL = "http://localhost:3000";

const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

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
async function getCreationData(token: string) {
    const res = await fetch(`${API_URL}/game-data/creation`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();
    if (!res.ok) {
        console.error("❌ Erreur game-data/creation:", json);
        return null;
    }

    return json;
}

// =========================
// CHECK EXISTING PROFILE
// =========================
async function checkExistingProfile(token: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();
    if (!res.ok) return null;

    for (const p of json.profiles) {
        if (p.characterSlot === CHARACTER_SLOT) {
            return p;
        }
    }

    return null;
}

// =========================
// CREATE CHARACTER
// =========================
async function createCharacter(token: string, race: string, classId: string) {
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
// CONNECT TO COLYSEUS
// =========================
async function connectToColyseus(token: string, profileId: string) {
    return new Promise<WebSocket>((resolve) => {

        console.log("→ Connexion Colyseus…");

        const ws = new WebSocket(
            `ws://localhost:3000/world?token=${token}&serverId=${SERVER_ID}&characterSlot=${CHARACTER_SLOT}`
        );

        ws.on("open", () => console.log("🔌 WebSocket connecté !"));

        ws.on("message", raw => {

            // =============== FIX 1 : ignorer binaire ===============
            if (raw instanceof Buffer) {
                return; // Patch d'état → ignorer
            }

            let msg;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                console.log("⚠️ Message non-JSON, ignoré.");
                return;
            }

            // =============== FIX 2 : gérer welcome ===============
            if (msg.type === "welcome") {
                console.log("🌍 Monde chargé !");
                resolve(ws);
            }

            if (msg.type === "combat_log") {
                console.log("⚔️", msg.text);
            }
        });
    });
}

// =========================
// SPAWN PACK DE MONSTRES
// =========================
function spawnPack(ws: WebSocket) {
    console.log("🐗 Spawn pack de 4 monstres…");

    for (let i = 0; i < 4; i++) {
        ws.send(JSON.stringify({
            type: "spawn_test_monster",
            monsterId: `mob_${Date.now()}_${i}`,
            name: "Training Dummy",
            x: 105 + (i * 2),
            y: 0,
            z: 105 + (i * 2)
        }));
    }
}

// =========================
// AUTO-ATTACK
// =========================
function startAutoAttack(ws: WebSocket) {
    console.log("🔫 Auto-attack toutes les 2s…");

    setInterval(() => {
        ws.send(JSON.stringify({
            type: "queue_skill",
            skillId: "auto_attack"
        }));
    }, 2000);
}

// =========================
// MAIN
// =========================
(async () => {
    console.log("=== 🧪 TEST CREATE + COMBAT ===");

    const ok = await registerAccount();
    if (!ok) return;

    const token = await loginAccount();
    if (!token) return;

    let profile = await checkExistingProfile(token);

    if (!profile) {
        console.log("→ Pas de personnage, création…");
        const creation = await getCreationData(token);

        const race = creation.races[0].raceId;
        const classId = creation.byRace[race][0].classId;

        profile = await createCharacter(token, race, classId);
    } else {
        console.log("✔ Personnage existant trouvé :", profile.characterName);
    }

    const ws = await connectToColyseus(token, profile.profileId);

    // AUTO-SPAWN + COMBAT
    spawnPack(ws);
    startAutoAttack(ws);
})();
