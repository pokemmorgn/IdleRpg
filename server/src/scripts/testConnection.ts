/**
 * Script de test : Connexion au backend
 * - Register (si compte inexistant)
 * - Login
 * - Affichage du token JWT
 *
 * AUCUNE dépendance externe (axios inutile)
 * Fonctionne avec ts-node
 */

// =============================
// CONFIG
// =============================
const API_URL = "http://localhost:3000"; // adapte si besoin

const TEST_EMAIL = "test_combat@example.com";
const TEST_PASSWORD = "Test123!";

async function register() {
    console.log("→ Tentative de création de compte...");

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            })
        });

        if (res.ok) {
            console.log("✔ Compte créé !");
            return true;
        }

        const data = await res.json();

        // Si compte déjà existant, c’est normal
        if (res.status === 400 && data.message?.includes("exists")) {
            console.log("ℹ Compte déjà existant, on continue.");
            return true;
        }

        console.error("❌ Erreur register:", data);
        return false;

    } catch (err) {
        console.error("❌ ERREUR réseau register:", err);
        return false;
    }
}

async function login(): Promise<string | null> {
    console.log("→ Connexion...");

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            })
        });

        if (!res.ok) {
            const data = await res.json();
            console.error("❌ Erreur login:", data);
            return null;
        }

        const json = await res.json();
        const token = json.token;

        console.log("✔ Connecté !");
        console.log("🔑 TOKEN =", token);

        return token;

    } catch (err) {
        console.error("❌ ERREUR réseau login:", err);
        return null;
    }
}

async function main() {
    console.log("=== 🧪 TEST API : REGISTER + LOGIN ===");

    const ok = await register();
    if (!ok) return;

    const token = await login();
    if (!token) return;

    console.log("🎉 Test de connexion terminé.");
}

// Lancer le script
main();
