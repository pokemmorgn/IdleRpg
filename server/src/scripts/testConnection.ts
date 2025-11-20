/**
 * Script de test : Connexion au backend
 * - Register (si compte inexistant)
 * - Login
 * - Affiche le token JWT
 */

import axios from "axios";

// === CONFIG ===
const API_URL = "http://localhost:3000"; // adapte si nécessaire
const TEST_EMAIL = "test_combat@example.com";
const TEST_PASSWORD = "Test123!";

async function main() {
    console.log("=== 🧪 TEST CONNEXION ===");

    // 1. Essayer REGISTER (si existe déjà → on ignore l'erreur)
    try {
        console.log("→ Tentative d'inscription...");
        await axios.post(`${API_URL}/auth/register`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        console.log("✔ Compte créé !");
    } catch (err: any) {
        if (err.response?.status === 400) {
            console.log("ℹ Compte déjà existant, on continue.");
        } else {
            console.error("❌ Erreur lors du register:", err.response?.data || err.message);
            return;
        }
    }

    // 2. LOGIN
    console.log("→ Connexion...");
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        const token = res.data.token;
        console.log("✔ Connecté !");
        console.log("🔑 TOKEN =", token);

        return token;

    } catch (err: any) {
        console.error("❌ Erreur login:", err.response?.data || err.message);
        return null;
    }
}

// Lancer le script
main();
