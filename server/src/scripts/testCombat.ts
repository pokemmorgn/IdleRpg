/**
 * TEST COMBAT — IdleRPG
 * - Login API
 * - Connexion Colyseus (world_test)
 * - Spawn pack de 4 mobs
 * - Combat auto toutes les 2 secondes
 */

import WebSocket from "ws";

// ------------------------
// CONFIG
// ------------------------
const API_URL = "http://localhost:3000";
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;

const USERNAME = "combat_tester";
const PASSWORD = "Test123!";

// ------------------------
// LOGIN API
// ------------------------
async function login() {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: USERNAME,
            password: PASSWORD
        })
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Login failed:", json);
        process.exit(1);
    }

    console.log("✔ Login OK");
    return json.token;
}

// ------------------------
// CONNEXION COLYSEUS
// ------------------------
async function connectToWorld(token: string) {
    return new Promise<void>((resolve) => {
        const ws = new WebSocket(
            `ws://localhost:3000/world?token=${token}&serverId=${SERVER_ID}&characterSlot=${CHARACTER_SLOT}`
        );

        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
        });

        ws.on("message", (raw) => {
            const msg = JSON.parse(raw.toString());

            if (msg.type === "welcome") {
                console.log("🌍 Monde chargé !");
                console.log(`Bienvenue ${msg.stats.hp}/${msg.stats.maxHp}`);
                resolve();

                // Spawn automatique du pack
                spawnMobPack(ws);
                startAutoAttack(ws);
            }

            // Logs combat
            if (msg.type === "combat_log") {
                console.log("⚔️  Combat:", msg.text);
            }

            if (msg.type === "error") {
                console.log("❌ Error:", msg.message);
            }
        });
    });
}

// ------------------------
// SPAWN PACK 4 MONSTRES
// ------------------------
function spawnMobPack(ws: WebSocket) {
    console.log("🐗 Spawn d'un pack de 4 monstres…");

    const baseX = 105;
    const baseZ = 105;

    for (let i = 0; i < 4; i++) {
        ws.send(JSON.stringify({
            type: "spawn_test_monster",
            monsterId: `pack_${Date.now()}_${i}`,
            name: "Training Dummy",
            x: baseX + (i * 2),
            y: 0,
            z: baseZ + (i * 2)
        }));
    }
}

// ------------------------
// AUTO ATTACK LOOP
// ------------------------
function startAutoAttack(ws: WebSocket) {
    console.log("🔫 Auto-attaque activée (toutes les 2s)…");

    setInterval(() => {
        ws.send(JSON.stringify({
            type: "queue_skill",
            skillId: "auto_attack"
        }));
    }, 2000);
}

// ------------------------
// MAIN
// ------------------------
(async () => {
    console.log("=== 🧪 TEST COMBAT ===");

    const token = await login();
    await connectToWorld(token);
})();
