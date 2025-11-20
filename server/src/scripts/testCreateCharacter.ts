/**
 * Test complet création + login + connexion Colyseus
 */

import WebSocket from "ws"; // important pour avoir les types

const API_URL = "http://localhost:3000";

// --- Test account ---
const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

// --- Character ---
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// Types simples
interface CreationData {
    races: { raceId: string }[];
    byRace: Record<string, { classId: string }[]>;
}

interface Profile {
    profileId: string;
    characterName: string;
    characterSlot: number;
}

interface MatchmakingRoom {
    sessionId: string;
    wsEndpoint: string;
}

// =========================
// REGISTER
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
// LOGIN
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
    return json.token as string;
}

// =========================
// GET CREATION DATA
// =========================
async function getCreationData(token: string): Promise<CreationData | null> {
    const res = await fetch(`${API_URL}/game-data/creation`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur creation data:", json);
        return null;
    }

    return json as CreationData;
}

// =========================
// CHECK EXISTING PROFILE
// =========================
async function checkExistingProfile(token: string): Promise<Profile | null> {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();

    if (!res.ok || !json.profiles) return null;

    const found = json.profiles.find(
        (p: Profile) => p.characterSlot === CHARACTER_SLOT
    );

    return found ?? null;
}

// =========================
// CREATE CHARACTER
// =========================
async function createCharacter(
    token: string,
    race: string,
    classId: string
): Promise<Profile | null> {
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
    return json.profile as Profile;
}

// =========================
// RESERVE SEAT
// =========================
async function reserveSeat(token: string): Promise<MatchmakingRoom | null> {
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

    return json.room as MatchmakingRoom;
}

// =========================
// CONNECT WEBSOCKET
// =========================
async function connectWebSocket(room: MatchmakingRoom): Promise<WebSocket> {
    return new Promise(resolve => {
        console.log("→ Connexion WebSocket…");

        const ws = new WebSocket(
            `${room.wsEndpoint}?sessionId=${room.sessionId}`
        );

        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
        });

        ws.on("message", (raw: Buffer | string) => {
            if (raw instanceof Buffer) return;

            try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "welcome") {
                    console.log("🌍 Bienvenue :", msg.message);
                    resolve(ws);
                }
            } catch {
                return;
            }
        });
    });
}

// =========================
// MAIN
// =========================
(async () => {
    console.log("=== 🧪 TEST CREATION PERSONNAGE ===");

    const ok = await registerAccount();
    if (!ok) return;

    const token = await loginAccount();
    if (!token) return;

    let profile = await checkExistingProfile(token);
    if (!profile) {
        const creation = await getCreationData(token);
        if (!creation) return;

        const race = creation.races[0].raceId;
        const classId = creation.byRace[race][0].classId;

        profile = await createCharacter(token, race, classId);
    }

    console.log("✔ Personnage :", profile?.characterName);

    const room = await reserveSeat(token);
    if (!room) return;

    await connectWebSocket(room);
})();
