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
    console.log("🔑 TOKEN =", json.token);
    console.log("🧑 PLAYER =", json.playerId);

    return json.token;
}

// =========================
// GET CREATION DATA
// =========================
async function getCreationData(token: string) {
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
// Vérifier le profil existant
// =========================
async function checkExistingProfile(token: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur getProfile:", json);
        return null;
    }

    for (const p of json.profiles) {
        if (p.characterSlot === CHARACTER_SLOT) {
            console.log("ℹ Personnage existant:");
            console.log(p);
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
    console.log(json.profile);

    return json.profile;
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

    const existing = await checkExistingProfile(token);
    if (existing) {
        console.log("✔ Aucun besoin de créer : perso déjà existant.");
        return;
    }

    // Récupération des races/classes valides
    const creation = await getCreationData(token);
    if (!creation) return;

    // Choix automatique d'une race
    const raceId = creation.races[0].id;

    // Choix d'une classe autorisée pour cette race
    const classId =
        creation.allowedClasses[raceId][0];

    console.log(`→ Race choisie : ${raceId}`);
    console.log(`→ Classe choisie : ${classId}`);

    await createCharacter(token, raceId, classId);

})();
