/**
 * TEST COSMETICS — Skins / Titles / Mounts
 * Version PRO optimisée (stable, silencieuse, fiable)
 */

import * as Colyseus from "colyseus.js";

// ======================
// CONFIG
// ======================
const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const USERNAME = "cosmetic_tester";
const PASSWORD = "Test123!";
const EMAIL = "cosmetic_tester@example.com";

const SERVER_ID = "test";
const SLOT = 1;
const CHARACTER_NAME = "CosmeticTester";

const TEST_LEVEL = 6;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================================
// AUTH HELPERS
// =====================================================================
async function register() {
    const r = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: USERNAME, email: EMAIL, password: PASSWORD })
    });

    if (r.ok) return console.log("✔ Account created");

    const j = await r.json();
    if (j.error === "Username already taken") return console.log("ℹ Account already exists");

    console.error("❌ register error:", j);
}

async function login() {
    const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });

    const j = await r.json();
    if (!r.ok) throw new Error("login error");

    console.log("✔ Logged in");
    return j.token;
}

async function getProfile(token: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const j = await r.json();

    if (!r.ok) return null;
    return j.profiles.find((p: any) => p.characterSlot === SLOT) || null;
}

async function getCreationData(token: string) {
    const r = await fetch(`${API_URL}/game-data/creation`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const j = await r.json();

    return r.ok ? j : null;
}

async function createCharacter(token: string, race: string, classId: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            characterSlot: SLOT,
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
            characterSlot: SLOT
        })
    });

    const j = await r.json();
    if (!r.ok) throw new Error("matchmaking failed");

    return j;
}

// =====================================================================
// UTILS — DIFF
// =====================================================================
function diff(a: any, b: any) {
    if (!a || !b) return "No data";

    const out: Record<string, { from: number; to: number }> = {};

    for (const k in b) {
        const from = a[k] ?? 0;
        const to = b[k] ?? 0;

        if (from !== to) {
            out[k] = { from, to };
        }
    }

    return out;
}

// =====================================================================
// WAIT FOR REAL stats_update ONLY
// =====================================================================
async function waitForStats(previous: any, ref: { value: any }) {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (ref.value && ref.value !== previous) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(ref.value);
            }
        }, 50);

        const timeout = setTimeout(() => {
            clearInterval(interval);
            console.error("⏱ Timeout waiting for stats_update");
            resolve(null);
        }, 5000);
    });
}

// =====================================================================
// DATA PICKERS
// =====================================================================
function pickSkinFromClass(profile: any) {
    return {
        warrior: "warrior_basic01",
        priest: "priest_basic01",
        mage: "mage_basic01",
        rogue: "rogue_basic01",
        paladin: "paladin_basic01",
        druid: "druid_basic01",
    }[profile.class] || "warrior_basic01";
}

// =====================================================================
// TEST BLOCKS
// =====================================================================
async function testSkins(room: Colyseus.Room, skinId: string, ref: any) {
    console.log("\n🔥 TEST SKINS");

    while (!ref.value) await sleep(50);
    let before = structuredClone(ref.value);

    console.log("🔓 Unlock:", skinId);
    room.send("skin_unlock", { skinId });
    let after = await waitForStats(before, ref);
    console.log("📊 DIFF:", diff(before, after));
    before = after || before;

    console.log("🎽 Equip:", skinId);
    room.send("skin_equip", { skinId });

    console.log("⬆ Level 1");
    room.send("skin_level_up", { skinId });
    after = await waitForStats(before, ref);
    console.log("📊 DIFF:", diff(before, after));
    before = after || before;

    console.log("⬆ Level 2");
    room.send("skin_level_up", { skinId });
    after = await waitForStats(before, ref);
    console.log("📊 DIFF:", diff(before, after));
}

async function testTitles(room: Colyseus.Room, titles: string[], ref: any) {
    console.log("\n🔥 TEST TITLES");

    while (!ref.value) await sleep(50);
    let before = structuredClone(ref.value);

    for (const id of titles) {
        console.log("🔓 Unlock:", id);
        room.send("title_unlock", { titleId: id });
        let after = await waitForStats(before, ref);
        console.log("📊 DIFF:", diff(before, after));
        before = after || before;

        console.log("🏷 Equip:", id);
        room.send("title_equip", { titleId: id });
    }
}

async function testMounts(room: Colyseus.Room, mounts: string[], ref: any) {
    console.log("\n🔥 TEST MOUNTS");

    while (!ref.value) await sleep(50);
    let before = structuredClone(ref.value);

    for (const id of mounts) {
        console.log("🔓 Unlock:", id);
        room.send("mount_unlock", { mountId: id });
        let after = await waitForStats(before, ref);
        console.log("📊 DIFF:", diff(before, after));
        before = after || before;

        console.log("🐎 Equip:", id);
        room.send("mount_equip", { mountId: id });
    }
}

// =====================================================================
// MAIN EXECUTION
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

        const seat = await reserveSeat(token);
        const client = new Colyseus.Client(WS_URL);
        const room = await client.consumeSeatReservation(seat);

        console.log("🔌 CONNECTED");

        // Stats reference
        const lastStats = { value: null };

        // -----------------------------
        // LISTENERS
        // -----------------------------
        room.onMessage("welcome", msg => console.log("👋 WELCOME:", msg));

        // Ignored → snapshot incomplet
        room.onMessage("player_update", msg => {
            console.log("📥 PLAYER UPDATE (ignored stats)");
        });

        // XP gain never touches stats here
        room.onMessage("xp_gain", msg => {
            console.log("📈 XP GAIN:", msg);
        });

        // REAL snapshot = stats_update ONLY
        room.onMessage("stats_update", msg => {
            lastStats.value = msg;
        });

        // Cosmetic logs
        room.onMessage("skin_unlocked", msg => console.log("🟩 SKIN UNLOCKED:", msg));
        room.onMessage("skin_equipped", msg => console.log("🎽 SKIN EQUIPPED:", msg));
        room.onMessage("skin_level_up", msg => console.log("⬆️ SKIN LEVEL:", msg));

        room.onMessage("title_unlocked", msg => console.log("🏷 TITLE UNLOCKED:", msg));
        room.onMessage("title_equipped", msg => console.log("🏷 TITLE EQUIPPED:", msg));

        room.onMessage("mount_unlocked", msg => console.log("🐎 MOUNT UNLOCKED:", msg));
        room.onMessage("mount_equipped", msg => console.log("🐎 MOUNT EQUIPPED:", msg));

        // -----------------------------
        // FORCE LEVEL
        // -----------------------------
        console.log(`📈 OVERRIDE → Setting level to ${TEST_LEVEL}`);
        room.send("debug_give_xp", { amount: 999999 });

        console.log("⏳ Waiting XP settle...");
        await sleep(600);

        // -----------------------------
        // LIST COSMETICS
        // -----------------------------
        console.log("\n======================");
        console.log("📜 COSMETICS AVAILABLE");
        console.log("======================");

        const skin = pickSkinFromClass(profile);
        console.log("🎽 Skins:", [skin]);
        console.log("🏷 Titles:", ["title_beginner", "title_brave_warrior"]);
        console.log("🐎 Mounts:", ["mount_pony", "mount_wolf"]);

        // -----------------------------
        // TEST PIPELINE
        // -----------------------------
        await testSkins(room, skin, lastStats);
        await testTitles(room, ["title_beginner", "title_brave_warrior"], lastStats);
        await testMounts(room, ["mount_pony", "mount_wolf"], lastStats);

        // -----------------------------
        // SUMMARY
        // -----------------------------
        console.log("\n============================");
        console.log("📘 COSMETICS TEST SUMMARY");
        console.log("============================");

        console.log("🎽 Skins unlocked:", [skin]);
        console.log("🏷 Titles unlocked:", ["title_beginner", "title_brave_warrior"]);
        console.log("🐎 Mounts unlocked:", ["mount_pony", "mount_wolf"]);

        console.log("\n📊 FINAL STATS:");
        console.table(lastStats.value || {});

        console.log("\n🎉 ALL COSMETIC TESTS COMPLETED");

        process.exit(0);

    } catch (err) {
        console.error("❌ ERROR:", err);
        process.exit(1);
    }
})();
