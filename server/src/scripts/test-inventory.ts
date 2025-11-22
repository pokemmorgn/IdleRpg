/**
 * TEST INVENTORY — Ajout / Équipement / Utilisation / Container
 */

import * as Colyseus from "colyseus.js";
import fetch from "node-fetch";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "inv_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "inv_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "InvTester";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================================
// AUTH
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
        console.log("✔ Compte créé");
        return;
    }

    const j = await r.json();
    if (j.error === "Username already taken") {
        console.log("ℹ Compte déjà existant");
        return;
    }

    console.error("❌ Erreur register:", j);
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
    if (!r.ok) throw new Error("Erreur login");

    console.log("✔ Connecté");
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
        console.error("❌ Erreur create:", j);
        return null;
    }

    console.log("✔ Personnage créé !");
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
    if (!r.ok) throw new Error("Matchmaking failed");
    return j;
}


// =====================================================================
// INVENTORY TEST
// =====================================================================
const ALL_ITEMS = [
    // 12 équipements
    "eq_head", "eq_chest", "eq_legs", "eq_feet", "eq_hands",
    "eq_weapon", "eq_offhand",
    "eq_ring1", "eq_ring2",
    "eq_trinket1", "eq_trinket2",
    "eq_neck",

    // Items normaux
    "consum_hp_potion",
    "mat_iron_ore",
    "box_small_loot",
    "quest_relic_piece",
    "bag_upgrade_01",
    "shared_token",

    // Item personnel
    "personal_family_ring"
];

async function testInventory(room: Colyseus.Room) {
    console.log("\n=====================================");
    console.log("🔥 DÉBUT DU TEST INVENTAIRE");
    console.log("=====================================\n");

    // -------------------------------
    // 1) Ajouter tous les items
    // -------------------------------
    console.log("📦 Ajout de tous les items...");
    for (const it of ALL_ITEMS) {
        room.send("inv_add", { itemId: it, amount: 1 });
        console.log(`→ ajouté: ${it}`);
        await sleep(80);
    }

    await sleep(500);

    // -------------------------------
    // 2) Équiper les équipements
    // -------------------------------
    console.log("\n🛡 Test équipement auto...");
    const EQUIP_LIST = ALL_ITEMS.filter(i => i.startsWith("eq_"));

    let slot = 0;
    for (const equip of EQUIP_LIST) {
        room.send("inv_equip", { fromSlot: slot });
        console.log(`→ equip ${equip} depuis slot ${slot}`);
        slot++;
        await sleep(100);
    }

    await sleep(800);

    // -------------------------------
    // 3) Test potion
    // -------------------------------
    console.log("\n🧪 Utilisation d'une potion...");
    room.send("inv_use", { slot: 12 });
    await sleep(400);

    // -------------------------------
    // 4) Test lootbox
    // -------------------------------
    console.log("\n🎁 Ouverture d'une loot box...");
    room.send("inv_open", { slot: 14 });
    await sleep(500);

    // -------------------------------
    // 5) Test upgrade bag
    // -------------------------------
    console.log("\n👜 Upgrade du sac...");
    room.send("inv_upgrade_bag", { slot: 15 });
    await sleep(400);

    // -------------------------------
    // 6) Test split stack
    // -------------------------------
    console.log("\n📤 Split d'une pile...");
    room.send("inv_split", { from: 13, to: 5, amount: 1 });
    await sleep(300);

    // -------------------------------
    // 7) Test swap
    // -------------------------------
    console.log("\n🔄 Swap entre 13 et 6...");
    room.send("inv_swap", { from: 13, to: 6 });
    await sleep(300);

    console.log("\n🎉 FIN DU TEST INVENTAIRE !");
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

        console.log("🔌 CONNECTÉ AU SERVEUR !");

        room.onMessage("inventory_update", (msg) => {
            console.log("📦 INVENTORY UPDATE:", msg);
        });

        room.onMessage("item_used", (msg) => console.log("💊 ITEM USED:", msg));

        room.onMessage("welcome", () => console.log("👋 Welcome reçu."));

        // laisser les listeners s’enregistrer
        await sleep(800);

        await testInventory(room);

        process.exit(0);

    } catch (error) {
        console.error("❌ Erreur dans test-inventory:", error);
        process.exit(1);
    }
})();
