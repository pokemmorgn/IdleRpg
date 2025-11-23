/**
 * TEST CURRENCY SYSTEM — Secure Mode
 * Compatible avec SecurityVerifier (HMAC + timestamp + nonce)
 */

import * as Colyseus from "colyseus.js";
import crypto from "crypto";

// ======================
// CONFIG
// ======================
const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "currency_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "currency_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "CurrencyTester";

// La même clé que dans ton .env
const PX42_KEY = process.env.PX42_KEY || "DEV_TEST_KEY_CHANGE_THIS";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================================
// SECURITY PAYLOAD BUILDER (CLIENT-SIDE)
// =====================================================================
function createSecurePayload(data: any) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString("hex");

    const raw = JSON.stringify(data) + timestamp + nonce;

    const signature = crypto
        .createHmac("sha256", PX42_KEY)
        .update(raw)
        .digest("hex");

    return {
        data,
        timestamp,
        nonce,
        signature
    };
}

// =====================================================================
// AUTH HELPERS
// =====================================================================
async function register() {
    const r = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_USERNAME,
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        })
    });

    if (r.ok) return console.log("✔ Account created");

    const j = await r.json();
    if (j.error === "Username already taken")
        return console.log("ℹ Account already exists");

    console.error("❌ register error:", j);
}

async function login(): Promise<string> {
    const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_USERNAME,
            password: TEST_PASSWORD
        })
    });

    const j = await r.json();
    if (!r.ok) throw new Error("login failed");

    console.log("✔ Logged in");
    return j.token;
}

async function getProfile(token: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const j = await r.json();
    if (!r.ok) return null;
    return j.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) ?? null;
}

async function getCreationData(token: string) {
    const r = await fetch(`${API_URL}/game-data/creation`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    return r.json();
}

async function createCharacter(token: string, race: string, classId: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            characterSlot: CHARACTER_SLOT,
            characterName: CHARACTER_NAME,
            characterClass: classId,
            characterRace: race
        })
    });

    const j = await r.json();
    if (!r.ok) {
        console.error("❌ create error:", j);
        return null;
    }

    console.log("✔ Character created");
    return j.profile;
}

async function reserveSeat(token: string) {
    const r = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            serverId: SERVER_ID,
            characterSlot: CHARACTER_SLOT
        })
    });

    return r.json();
}

// =====================================================================
// UTILS
// =====================================================================
function diffCurrencies(before: any, after: any) {
    const out: any = {};
    for (const k of Object.keys(after)) {
        const oldV = before[k] ?? 0;
        const newV = after[k] ?? 0;
        if (oldV !== newV) out[k] = { from: oldV, to: newV };
    }
    return out;
}

// =====================================================================
// CURRENCY TEST SUITE (SECURE PAYLOADS)
// =====================================================================
async function testCurrencySystem(room: Colyseus.Room, lastCurrencyRef: any) {
    console.log("\n🔥 TEST CURRENCIES");

    // Wait initial sync
    while (!lastCurrencyRef.value) await sleep(20);

    let before = structuredClone(lastCurrencyRef.value);

    const ops = [
        { action: "add", type: "gold", amount: 100 },
        { action: "add", type: "diamonds", amount: 20 },
        { action: "add", type: "diamonds_bound", amount: 5 },

        { action: "remove", type: "gold", amount: 30 },
        { action: "remove", type: "diamonds", amount: 5 },

        { action: "set", type: "gold", amount: 777 }, // Should be blocked
        { action: "set", type: "diamonds_bound", amount: 42 }
    ];

    for (const op of ops) {
        console.log(`\n💰 ${op.action.toUpperCase()} → ${op.type} (${op.amount})`);

        const securePayload = createSecurePayload({
            action: op.action,
            type: op.type,
            amount: op.amount
        });

        room.send("currency", securePayload);

        await sleep(250);

        const after = structuredClone(lastCurrencyRef.value);
        console.log("📊 DIFF:", diffCurrencies(before, after));

        before = after;
    }
}

// =====================================================================
// MAIN
// =====================================================================
(async () => {
    try {
        await register();
        const token = await login();

        let profile = await getProfile(token);

        if (!profile) {
            const creation = await getCreationData(token);
            const race = creation.races[0].raceId;
            const classId = creation.byRace[race][0].classId;
            profile = await createCharacter(token, race, classId);
        }

        const mm = await reserveSeat(token);
        const client = new Colyseus.Client(WS_URL);
        const room = await client.consumeSeatReservation(mm);

        console.log("🔌 CONNECTED");

        let lastCurrencyRef: { value: any } = { value: null };

        // =========================
        // LISTENERS
        // =========================
        room.onMessage("welcome", msg => console.log("👋 WELCOME:", msg));

        room.onMessage("currency_full_update", msg => {
            console.log("📥 FULL CURRENCY SYNC:", msg.values);
            lastCurrencyRef.value = msg.values;
        });

        room.onMessage("currency_update", msg => {
            console.log("📥 CURRENCY UPDATE:", msg);
            lastCurrencyRef.value[msg.type] = msg.amount;
        });

        room.onMessage("currency_error", msg =>
            console.error("❌ CURRENCY ERROR:", msg)
        );

        // Debug XP boost
        console.log("📈 BOOST XP → Avoid locks");
        room.send("debug_give_xp", { amount: 99999 });
        await sleep(1000);

        await testCurrencySystem(room, lastCurrencyRef);

        console.log("\n============================");
        console.log("💰 CURRENCY TEST SUMMARY");
        console.log("============================");
        console.table(lastCurrencyRef.value);

        console.log("\n🎉 ALL CURRENCY TESTS COMPLETED");
        process.exit(0);

    } catch (e) {
        console.error("❌ ERROR:", e);
        process.exit(1);
    }
})();
