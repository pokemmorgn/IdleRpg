/**
 * Script de test combat :
 * - Connexion au serveur Colyseus
 * - Récupération token via l'API Login
 * - Connexion room world_test
 * - Déplacement auto
 * - Spawn d’un Training Dummy
 * - Activation AFK pour simuler un vrai combat
 */

import WebSocket from "ws";
import fetch from "node-fetch";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000/world";

const USERNAME = "combat_tester";
const PASSWORD = "Test123!";
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;

async function login() {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Login fail:", json);
        process.exit(1);
    }

    console.log("✔ Login OK !");
    return json.token;
}

async function startTest() {
    const token = await login();

    console.log("→ Connexion WebSocket au world_test...");

    const ws = new WebSocket(
        `${WS_URL}?serverId=${SERVER_ID}&token=${token}&characterSlot=${CHARACTER_SLOT}`
    );

    ws.on("open", () => {
        console.log("🟢 WS connecté !");
    });

    ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.message && msg.message.includes("Bienvenue")) {
            console.log("🎉 Message du serveur :", msg.message);

            setTimeout(() => {
                console.log("→ Activation mode AFK...");
                ws.send(JSON.stringify(["activate_afk_mode", {}]));
            }, 800);

            setTimeout(() => {
                console.log("→ Spawn d’un Training Dummy...");
                ws.send(JSON.stringify([
                    "spawn_test_monster",
                    {
                        name: "Dummy",
                        monsterId: "dummy_" + Date.now(),
                        x: 105,
                        y: 0,
                        z: 105
                    }
                ]));
            }, 1500);

            setTimeout(() => {
                console.log("→ Déplacement vers la zone de combat...");
                ws.send(JSON.stringify(["player_move", { x: 105, y: 0, z: 105 }]));
            }, 2500);
        }

        // Logs combat
        if (msg.type === "combat_tick") {
            console.log(`⚔️ ${msg.attacker} → ${msg.target}: -${msg.damage} dmg`);
        }

        if (msg.type === "combat_start") {
            console.log(`🔥 Combat engagé contre ${msg.monsterName}`);
        }

        if (msg.type === "combat_end") {
            console.log(`🏆 Combat terminé : ${msg.result}`);
        }

        if (msg.type === "afk_gain") {
            console.log(`💰 AFK Rewards:`, msg);
        }
    });

    ws.on("close", () => {
        console.log("🔴 WS fermé.");
    });

    ws.on("error", (err) => {
        console.error("❌ WS error:", err);
    });
}

startTest();
