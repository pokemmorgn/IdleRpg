/**
 * TEST INVENTORY — Add / Remove / Swap / Equip / Use / Open / Bag Upgrade / Personal
 */

import * as Colyseus from "colyseus.js";

// Node 18+ → fetch disponible nativement
// Aucun import node-fetch

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

    return await r.json();
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
// MAIN TEST
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

        console.log("🔌 CONNECTÉ AU SERVEUR DE JEU !");
        console.log("⏳ Préparation du test inventaire…");

        // Écouteurs messages inventaire
        room.onMessage("inventory_update", (msg) => {
            console.log("📦 INVENTORY UPDATE:", msg);
        });

        room.onMessage("item_used", (msg) => {
            console.log("🍾 ITEM USED:", msg);
        });

        room.onMessage("welcome", (msg) =>
            console.log("👋 WELCOME:", msg)
        );

        await sleep(2000);

        console.log("\n===============================");
        console.log("🔥 DÉBUT DU TEST INVENTAIRE");
        console.log("===============================\n");

        // ============================================================
        // 1) AJOUTER TOUS LES ITEMS SEEDÉS
        // ============================================================
        const ALL_ITEMS = [
            "eq_head", "eq_chest", "eq_legs", "eq_feet", "eq_hands",
            "eq_weapon", "eq_offhand",
            "eq_ring1", "eq_ring2",
            "eq_trinket1", "eq_trinket2",
            "eq_neck",

            "consum_hp_potion",
            "mat_iron_ore",
            "box_small_loot",
            "quest_relic_piece",
            "bag_upgrade_01",
            "shared_token",
            "personal_family_ring"
        ];

        console.log("📥 AJOUT DES ITEMS…");

        for (const item of ALL_ITEMS) {
            console.log(`→ Ajout ${item}`);
            room.send("inv_add", { itemId: item, amount: 1 });
            await sleep(200);
        }

        await sleep(1000);

        // ============================================================
        // 2) TEST OUVERTURE LOOTBOX
        // ============================================================
        console.log("\n🎁 OUVERTURE LOOTBOX");

        room.send("inv_open", { slot: 5 }); // à adapter selon l'ordre
        await sleep(1000);

        // ============================================================
        // 3) TEST CONSOMMABLE
        // ============================================================
        console.log("\n🍺 UTILISATION CONSOMMABLE");

        room.send("inv_use", { slot: 6 });
        await sleep(800);

        // ============================================================
        // 4) TEST EQUIP
        // ============================================================
        console.log("\n🛡️ TEST ÉQUIPEMENT");

        room.send("inv_equip", { fromSlot: 0 });
        await sleep(800);

        // ============================================================
        // 5) TEST UNEQUIP
        // ============================================================
        console.log("\n🔧 TEST DÉSÉQUIPEMENT (slot head)");

        room.send("inv_unequip", { equipSlot: "head" });
        await sleep(800);

        // ============================================================
        // 6) TEST BAG UPGRADE
        // ============================================================
        console.log("\n🎒 TEST UPGRADE DE SAC");

        room.send("inv_upgrade_bag", { slot: 7 });
        await sleep(800);

        // ============================================================
        // 7) TEST ITEM PERSONNEL
        // ============================================================
        console.log("\n💍 TEST ITEM PERSONNEL");

        room.send("inv_add_personal", { itemId: "personal_family_ring" });
        await sleep(800);

        console.log("\n🎉 FIN DU TEST INVENTAIRE !");
        process.exit(0);

    } catch (error) {
        console.error("❌ Erreur test-inventory:", error);
        process.exit(1);
    }
})();
