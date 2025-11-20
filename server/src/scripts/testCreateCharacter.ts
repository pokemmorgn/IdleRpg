/**
 * Script de test : REGISTER → LOGIN → CREATION PERSONNAGE
 * utilise fetch natif Node18+ (aucune dépendance)
 */

const API_URL = "http://localhost:3000";

// === Compte de test ===
const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

// === Perso de test ===
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// Classe / Race compatibles
const CHARACTER_CLASS = "warrior";
const CHARACTER_RACE = "human";

// ============================================================
// REGISTER
// ============================================================
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

// ============================================================
// LOGIN
// ============================================================
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

// ============================================================
// CHECK PROFIL EXISTANT
// ============================================================
async function checkExistingProfile(token: string) {
    console.log(`→ Vérification du profil sur serveur "${SERVER_ID}"...`);

    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur getProfile:", json);
        return null;
    }

    for (const p of json.profiles) {
        if (p.characterSlot === CHARACTER_SLOT) {
            console.log("ℹ Un personnage existe déjà dans ce slot :");
            console.log(p);
            return p;
        }
    }

    return null;
}

// ============================================================
// CREATE PROFILE
// ============================================================
async function createCharacter(token: string) {
    console.log("→ Création du personnage...");

    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            characterSlot: CHARACTER_SLOT,
            characterName: CHARACTER_NAME,
            characterClass: CHARACTER_CLASS,
            characterRace: CHARACTER_RACE
        })
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur createProfile:", json);
        return null;
    }

    console.log("✔ Personnage créé avec succès !");
    console.log(json.profile);

    return json.profile;
}

// ============================================================
// MAIN
// ============================================================
(async () => {
    console.log("=== 🧪 TEST CREATION PERSONNAGE ===");

    const ok = await registerAccount();
    if (!ok) return;

    const token = await loginAccount();
    if (!token) return;

    const existing = await checkExistingProfile(token);

    if (existing) {
        console.log("✔ Aucun besoin de créer le personnage.");
        console.log("Personnage existant :", existing);
        return;
    }

    await createCharacter(token);

})();
