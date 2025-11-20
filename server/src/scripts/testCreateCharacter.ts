import WebSocket from "ws";

// ======================
// CONFIG
// ======================
const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:2567";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const USERNAME = "combat_tester";
const PASSWORD = "Test123!";
const EMAIL = "combat_tester@example.com";

// ======================
// UTILS
// ======================
async function post(url: string, data: any) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const json = await res.json();
    return { ok: res.ok, json };
}

// ======================
// MAIN
// ======================
async function main() {
    console.log("=== 🧪 TEST COMBAT ONLINE — IMMOBILE — NO SPAWN ===");

    // 1️⃣ Register (si compte déjà existant → ignore)
    console.log("→ Register...");
    const reg = await post(`${API_URL}/auth/register`, {
        username: USERNAME,
        email: EMAIL,
        password: PASSWORD
    });

    if (reg.ok) console.log("✔ Compte créé");
    else console.log("ℹ Compte existant (ok)");

    // 2️⃣ Login
    console.log("→ Login...");
    const login = await post(`${API_URL}/auth/login`, {
        username: USERNAME,
        password: PASSWORD
    });

    if (!login.ok) {
        console.error("❌ Login failed:", login.json);
        return;
    }

    const token = login.json.token;
    console.log("✔ Token OK");

    // 3️⃣ Connexion WebSocket
    console.log("→ Connexion WebSocket...");

    const ws = new WebSocket(
        `${WS_URL}/world?serverId=${SERVER_ID}&token=${token}&characterSlot=${CHARACTER_SLOT}`
    );

    ws.on("open", () => {
        console.log("🔌 WS CONNECTÉ !");
        console.log("👉 Le joueur NE BOUGE PAS. Le serveur doit déclencher le combat auto.");
    });

    ws.on("message", (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            console.log("📥 EVENT:", msg);
        } catch {
            console.log("📥 RAW:", raw.toString());
        }
    });

    ws.on("close", () => {
        console.log("❌ WS fermé");
        process.exit(0);
    });

    ws.on("error", (err) => {
        console.error("🔥 WS ERROR:", err);
    });

    // 4️⃣ Laisse tourner 2 min
    setTimeout(() => {
        console.log("⏹ FIN DU TEST");
        ws.close();
    }, 120000);
}

main();
