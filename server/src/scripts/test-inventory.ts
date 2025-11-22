/**
 * TEST INVENTORY + STATS — Version propre & robuste (CORRIGÉE + TYPAGE)
 */

import * as Colyseus from "colyseus.js";

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "inv_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "inv_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "InvTester";

// Définition d'un type pour la structure des données de slot reçues du serveur
type SlotData = {
    itemId: string;
    amount: number;
};

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* ======================================================================
   QUEUE DE MESSAGES — Évite tout écrasement de listeners
======================================================================== */
function setupMessageQueue(room: Colyseus.Room) {
    const queues: Record<string, any[]> = {};

    function on(type: string, cb: (msg: any) => void) {
        if (!queues[type]) queues[type] = [];

        room.onMessage(type, (msg: any) => {
            queues[type].push(msg);
            cb(msg);
        });
    }

    function waitFor(type: string): Promise<any> {
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (queues[type] && queues[type].length > 0) {
                    const msg = queues[type].shift();
                    clearInterval(interval);
                    resolve(msg);
                }
            }, 50);
        });
    }

    return { on, waitFor };
}

/* ======================================================================
   AUTH HELPERS
======================================================================== */
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

    if (!r.ok) {
        const j = await r.json();
        if (j.error === "Username already taken") return;
    }
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
    return j.token;
}

async function getProfile(token: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const j = await r.json();
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

    return await r.json();
}

/* ======================================================================
   PRINT STATS — version queue-safe
======================================================================== */
async function printStats(waitFor: any, room: Colyseus.Room, label: string) {

    room.send("stats_request");
    const msg = await waitFor("stats_update");

    console.log(`\n📊 ${label}:`, msg);
}

/* ======================================================================
   MAIN - VERSION CORRIGÉE
======================================================================== */
(async () => {
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

    const { on, waitFor } = setupMessageQueue(room);

    // listeners permanents
    on("welcome", () => console.log("👋 WELCOME!"));
    on("inventory_update", msg => console.log("📦 INVENTORY:", msg));
    on("item_used", msg => console.log("🍾 ITEM USED:", msg));
    on("stats_update", msg => console.log("📈 STATS UPDATE:", msg));

    // Attendre welcome
    await waitFor("welcome");

    await sleep(200);
    await printStats(waitFor, room, "Stats au login");

    console.log("\n🔥 AJOUT + AUTO-ÉQUIPEMENT…");

    const EQUIP_ITEMS = [
        "eq_head", "eq_chest", "eq_legs", "eq_feet", "eq_hands",
        "eq_weapon", "eq_offhand",
        "eq_ring1", "eq_ring2",
        "eq_trinket1", "eq_trinket2",
        "eq_neck",
    ];

    // ==========================================================
    // BOUCLE CORRIGÉE
    // ==========================================================
    for (const itemToAdd of EQUIP_ITEMS) {
        console.log(`→ add ${itemToAdd}`);
        room.send("inv_add", { itemId: itemToAdd, amount: 1 });

        // ⬇️ NOUVELLE LOGIQUE ⬇️
        // 1. Attendre la mise à jour de l'inventaire.
        const inventoryMsg = await waitFor("inventory_update");
        
        // 2. On cast le message pour que TypeScript connaisse la structure de `slots`
        const inventoryData = inventoryMsg as { slots: SlotData[] };

        // 3. Trouver l'index du slot qui contient l'item que nous venons d'ajouter.
        //    On utilise le type SlotData pour le paramètre `s` de `findIndex`.
        const slotIndex = inventoryData.slots.findIndex((s: SlotData) => s.itemId === itemToAdd);
        
        // 4. Vérification de sécurité.
        if (slotIndex === -1) {
            console.error(`❌ ERREUR: L'item ${itemToAdd} n'a pas été trouvé dans l'inventaire après ajout !`);
            continue;
        }

        console.log(`   → equip ${itemToAdd} depuis slot ${slotIndex}`);
        room.send("inv_equip", { fromSlot: slotIndex });

        // 5. Attendre la mise à jour des stats.
        const newStats = await waitFor("stats_update");
        console.log(`📈 DIFF STATS (${itemToAdd}) :`);
        console.log(newStats);
    }

    console.log("\n🎉 TEST INVENTAIRE + AUTO-ÉQUIPEMENT TERMINÉ !");
    process.exit(0);
})();
