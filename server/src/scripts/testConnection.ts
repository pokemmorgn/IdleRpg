/**
 * Script de test : REGISTER + LOGIN
 * utilise fetch natif Node18+ (aucune dépendance)
 */

const API_URL = "http://localhost:3000";

// Compte de test
const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

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

    // Gestion cas "username déjà pris"
    if (json.error === "Username already taken") {
        console.log("ℹ Compte déjà existant, on continue.");
        return true;
    }

    console.error("❌ Erreur register:", json);
    return false;
}

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

    return json;
}

// Lance tout
(async () => {
    console.log("=== 🧪 TEST REGISTER + LOGIN ===");

    const ok = await registerAccount();
    if (!ok) return;

    const login = await loginAccount();
    if (!login) return;

    console.log("🎉 Test API OK !");
})();
