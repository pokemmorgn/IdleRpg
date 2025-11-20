import WebSocket from "ws";
import axios from "axios";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:2567";
const SERVER_ID = "test";
const CHARACTER_SLOT = 1;

async function main() {
    console.log("=== 🧪 TEST COMBAT ONLINE (NO MOVE / NO SPAWN) ===");

    // 1️⃣ Login account
    console.log("→ Login...");
    const login = await axios.post(`${API_URL}/auth/login`, {
        email: "test@test.com",
        password: "test"
    });

    const token = login.data.token;
    console.log("✔ Token OK:", token.slice(0, 20) + "...");

    // 2️⃣ Connect WS (WorldRoom)
    console.log("→ Connexion WebSocket...");

    const ws = new WebSocket(
        `${WS_URL}/world?serverId=${SERVER_ID}&token=${token}&characterSlot=${CHARACTER_SLOT}`
    );

    ws.on("open", () => {
        console.log("🔌 WS CONNECTÉ !");
        console.log("👉 Le joueur est immobile. Le serveur doit gérer le combat auto.");
    });

    // 3️⃣ Affichage TOUTES les données reçues
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

    // 4️⃣ Laisse tourner 2 minutes
    setTimeout(() => {
        console.log("⏹ FIN DU TEST");
        ws.close();
    }, 120000);
}

main();
