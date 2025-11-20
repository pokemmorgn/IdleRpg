/**
 * TEST COMPLET IdleRPG :
 * - Register + Login
 * - Création personnage si absent
 * - Connexion Colyseus
 * - Pack de 4 monstres
 * - Auto combat
 */

import WebSocket from "ws";

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
    return res.ok ? json : null;
}

// =========================
// Vérifier le profil existant
// =========================
async function checkExistingProfile(token: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();
    if (!res.ok) return null;

    return json.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) || null;
}

// =========================
// CREATE CHARACTER
// =========================
async function createCharacter(token: string, race: string, classId: string) {
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
    return res.ok ? json.profile : null;
}

// =========================
// CONNEXION COLYSEUS
// =========================
function connectToColyseus(token: string, profileId: string) {
    return new Promise<WebSocket>((resolve) => {
        const ws = new WebSocket(
            `ws://localhost:3000/world?token=${token}&serverId=${SERVER_ID}&characterSlot=${CHARACTER_SLOT}`
        );

        ws.on("open", () => console.log("🔌 WebSocket connecté !"));

        ws.on("message", raw => {
            const msg = JSON.parse(raw.toString());

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
// SPAWN PACK DE 4 MONSTRES
// =========================
function spawnMobPack(ws: WebSocket) {
    console.log("🐗 Spawn pack de 4 monstres…");

    for (let i = 0; i < 4; i++) {
        ws.send(JSON.stringify({
            type: "spawn_test_monster",
            monsterId: `pack_${Date.now()}_${i}`,
            name: "Training Dummy",
            x: 100 + (i * 2),
            y: 0,
            z: 100 + (i * 2)
        }));
    }
}

// =========================
// AUTO COMBAT
// =========================
function startAutoAttack(ws: WebSocket) {
    console.log("🔫 Auto-attaque toutes les 2 sec…");

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
    console.log("=== 🧪 TEST COMPLET IdleRPG ===");

    await registerAccount();
    const token = await loginAccount();
    if (!token) return;

    let profile = await checkExistingProfile(token);

    if (!profile) {
        console.log("→ Aucun perso existant. Création…");
        const creation = await getCreationData(token);
        const raceId = creation.races[0].raceId;
        const classId = creation.byRace[raceId][0].classId;

        profile = await createCharacter(token, raceId, classId);
        console.log("✔ Perso créé !");
    }

    console.log("→ Connexion Colyseus…");
    const ws = await connectToColyseus(token, profile.profileId);

    spawnMobPack(ws);
    startAutoAttack(ws);
})();
