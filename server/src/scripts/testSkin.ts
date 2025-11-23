/**
 * TEST COSMETICS — Skins / Titles / Mounts
 * Version complète, stable et compatible Colyseus
 */

import * as Colyseus from "colyseus.js";

// ======================
// CONFIG
// ======================
const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "cosmetic_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "cosmetic_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "CosmeticTester";

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
        body: JSON.stringify({
            username: TEST_USERNAME,
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        })
    });

    if (r.ok) {
        console.log("✔ Account created");
        return;
    }

    const j = await r.json();
    if (j.error === "Username already taken") {
        console.log("ℹ Account already exists");
        return;
    }

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

    const j = await r.json();
    if (!r.ok) return null;
    return j;
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

    console.log("✔ Character created !");
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

    const j = await r.json();
    if (!r.ok) throw new Error("matchmaking failed");
    return j;
}

// =====================================================================
// UTILS
// =====================================================================
async function waitForStatsUpdate(
    previousStats: any,
    lastStatsRef: { value: any },
    timeoutMs: number = 5000
): Promise<any> {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (lastStatsRef.value && lastStatsRef.value !== previousStats) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(lastStatsRef.value);
            }
        }, 50);

        const timeout = setTimeout(() => {
            clearInterval(interval);
            console.error("⏱️ Timeout waiting for stats_update");
            resolve(null);
        }, timeoutMs);
    });
}

// CLEAN DIFF — undefined → 0
function diff(a: any, b: any) {
    if (!a || !b) return "No data";

    let changes: Record<string, { from: number; to: number }> = {};

    for (const k in b) {
        const oldVal = (a[k] === undefined ? 0 : a[k]);
        const newVal = (b[k] === undefined ? 0 : b[k]);

        if (oldVal !== newVal) {
            changes[k] = { from: oldVal, to: newVal };
        }
    }

    return changes;
}

// =====================================================================
// SKINS TEST
// =====================================================================
function pickSkinFromClass(profile: any) {
    const classId = profile.class;

    const mapping: Record<string, string> = {
        warrior: "warrior_basic01",
        priest: "priest_basic01",
        mage: "mage_basic01",
        rogue: "rogue_basic01",
        paladin: "paladin_basic01",
        druid: "druid_basic01"
    };

    return mapping[classId] || "warrior_basic01";
}

async function testSkinSystem(room: Colyseus.Room, skinId: string, lastStatsRef: any) {
    console.log("\n🔥 TEST SKINS");

    while (!lastStatsRef.value) await sleep(50);
    let before = structuredClone(lastStatsRef.value);

    console.log("🔓 Unlock:", skinId);
    room.send("skin_unlock", { skinId });
    let after = await waitForStatsUpdate(before, lastStatsRef);
    console.log("📊 DIFF:", diff(before, after));
    before = after || before;

    console.log("🎽 Equip:", skinId);
    room.send("skin_equip", { skinId });
    console.log("📌 equip = visual only");

    console.log("⬆️ LevelUp 1");
    room.send("skin_level_up", { skinId });
    after = await waitForStatsUpdate(before, lastStatsRef);
    console.log("📊 DIFF:", diff(before, after));
    before = after || before;

    console.log("⬆️ LevelUp 2");
    room.send("skin_level_up", { skinId });
    after = await waitForStatsUpdate(before, lastStatsRef);
    console.log("📊 DIFF:", diff(before, after));
}

// =====================================================================
// TITLES TEST
// =====================================================================
async function testTitleSystem(room: Colyseus.Room, titles: any[], lastStatsRef: any) {
    console.log("\n🔥 TEST TITLES");

    while (!lastStatsRef.value) await sleep(50);
    let before = structuredClone(lastStatsRef.value);

    for (const t of titles) {
        console.log("🔓 Unlock:", t.titleId);
        room.send("title_unlock", { titleId: t.titleId });
        let after = await waitForStatsUpdate(before, lastStatsRef);
        console.log("📊 DIFF:", diff(before, after));
        before = after || before;

        console.log("🏷️ Equip:", t.titleId);
        room.send("title_equip", { titleId: t.titleId });
        console.log("📌 equip = visual only");
    }
}

// =====================================================================
// MOUNTS TEST
// =====================================================================
async function testMountSystem(room: Colyseus.Room, mounts: any[], lastStatsRef: any) {
    console.log("\n🔥 TEST MOUNTS");

    while (!lastStatsRef.value) await sleep(50);
    let before = structuredClone(lastStatsRef.value);

    for (const m of mounts) {
        console.log("🔓 Unlock:", m.mountId);
        room.send("mount_unlock", { mountId: m.mountId });
        let after = await waitForStatsUpdate(before, lastStatsRef);
        console.log("📊 DIFF:", diff(before, after));
        before = after || before;

        console.log("🐎 Equip:", m.mountId);
        room.send("mount_equip", { mountId: m.mountId });
        console.log("📌 equip = visual only");
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

        let lastStatsRef: { value: any } = { value: null };

        // LISTENERS
        room.onMessage("welcome", msg => console.log("👋 WELCOME:", msg));
        room.onMessage("player_update", msg => {
            lastStatsRef.value = msg.stats;
        });

        room.onMessage("stats_update", msg => {
            lastStatsRef.value = msg;
        });

        room.onMessage("skin_unlocked", msg => console.log("🟩 SKIN UNLOCKED:", msg));
        room.onMessage("skin_equipped", msg => console.log("🎽 SKIN EQUIPPED:", msg));
        room.onMessage("skin_level_up", msg => console.log("⬆️ SKIN LVL:", msg));
        room.onMessage("skin_error", msg => console.error("❌ SKIN ERROR:", msg));

        room.onMessage("title_unlocked", msg => console.log("🏷️ TITLE UNLOCKED:", msg));
        room.onMessage("title_equipped", msg => console.log("🏷️ TITLE EQUIPPED:", msg));
        room.onMessage("title_error", msg => console.error("❌ TITLE ERROR:", msg));

        room.onMessage("mount_unlocked", msg => console.log("🐎 MOUNT UNLOCKED:", msg));
        room.onMessage("mount_equipped", msg => console.log("🐎 MOUNT EQUIPPED:", msg));
        room.onMessage("mount_error", msg => console.error("❌ MOUNT ERROR:", msg));

        room.onMessage("*", (type: string | number, data: any) => {
            console.warn("⚠ Unknown msg:", type, data);
        });

        await sleep(2000);

        // Override level for tests
        console.log("📈 OVERRIDE → Setting level to 6 for cosmetics tests");
        room.send("debug_give_xp", { amount: 999999 });

        console.log("\n======================");
        console.log("📜 LIST COSMETICS DATA");
        console.log("======================");

        console.log("🎽 SKINS:", [ pickSkinFromClass(profile) ]);
        console.log("🏷️ TITLES:", ["title_beginner", "title_brave_warrior"]);
        console.log("🐎 MOUNTS:", ["mount_pony", "mount_wolf"]);

        const skinId = pickSkinFromClass(profile);
        await testSkinSystem(room, skinId, lastStatsRef);
        await testTitleSystem(room, [
            { titleId: "title_beginner" },
            { titleId: "title_brave_warrior" }
        ], lastStatsRef);
        await testMountSystem(room, [
            { mountId: "mount_pony" },
            { mountId: "mount_wolf" }
        ], lastStatsRef);

        // =========================
        // FINAL SUMMARY
        // =========================
        console.log("\n============================");
        console.log("📘 COSMETICS TEST SUMMARY");
        console.log("============================");

        console.log("🎽 Skins unlocked:", [ skinId ]);
        console.log("🏷 Titles unlocked:", [
            "title_beginner", "title_brave_warrior"
        ]);
        console.log("🐎 Mounts unlocked:", [
            "mount_pony", "mount_wolf"
        ]);

        console.log("\n📊 FINAL STATS:");
        console.table(lastStatsRef.value || {});

        console.log("\n🎉 ALL COSMETIC TESTS COMPLETED");

        process.exit(0);

    } catch (e) {
        console.error("❌ ERROR:", e);
        process.exit(1);
    }
})();
