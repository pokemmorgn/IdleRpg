/**
 * ULTIMATE TEST — INVENTORY + STATS + EQUIP
 * Version Deluxe AAA pour Greg 😎🔥
 */

import * as Colyseus from "colyseus.js";
import colors from "colors/safe";

// ========================================================
// CONFIG
// ========================================================
const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:2567"; // 🔥 CORRECT
const SERVER_ID = "test";

const USERNAME = "inv_tester";
const PASSWORD = "Test123!";
const EMAIL = "inv_ultimate@example.com";
const SLOT = 1;
const NAME = "InvUltimate";

function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

// ========================================================
// 🔥 COLORS UTILS
// ========================================================
const ok = (t: string) => colors.green(`✔ ${t}`);
const info = (t: string) => colors.cyan(`ℹ ${t}`);
const warn = (t: string) => colors.yellow(`⚠ ${t}`);
const err = (t: string) => colors.red(`❌ ${t}`);
const step = (t: string) => colors.magenta(`\n=== ${t} ===`);

// ========================================================
// WRAPPER : SEND ASYNC
// ========================================================
function createSendAsync(room: Colyseus.Room, waitFor: any) {
    return async (type: string, payload?: any) => {
        room.send(type, payload || {});

        try {
            const msg = await waitFor(type + "_response"); // fallback
            return msg;
        } catch {
            return null;
        }
    };
}

// ========================================================
// MESSAGE QUEUE
// ========================================================
function createMessageQueue(room: Colyseus.Room) {

    const queues: Record<string, any[]> = {};

    function on(type: string, cb: (msg: any) => void) {
        if (!queues[type]) queues[type] = [];
        room.onMessage(type, msg => {
            queues[type].push(msg);
            cb(msg);
        });
    }

    function waitFor(type: string): Promise<any> {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (queues[type] && queues[type].length > 0) {
                    const m = queues[type].shift();
                    clearInterval(check);
                    resolve(m);
                }
            }, 30);
        });
    }

    return { on, waitFor };
}

// ========================================================
// AUTH HELPERS
// ========================================================
async function register() {
    const r = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: USERNAME, email: EMAIL, password: PASSWORD })
    });

    if (!r.ok) {
        const j = await r.json();
        if (j.error !== "Username already taken") {
            console.log(err("Échec register"), j);
        }
    } else {
        console.log(ok("Compte créé"));
    }
}

async function login(): Promise<string> {
    const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });

    const j = await r.json();
    return j.token;
}

async function getProfile(token: string) {
    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const j = await r.json();
    return j.profiles.find((p: any) => p.characterSlot === SLOT) || null;
}

async function createCharacter(token: string) {
    console.log(info("Création personnage..."));

    const creation = await (await fetch(`${API_URL}/game-data/creation`, {
        headers: { Authorization: `Bearer ${token}` }
    })).json();

    const race = creation.races[0].raceId;
    const classId = creation.byRace[race][0].classId;

    const r = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            characterSlot: SLOT,
            characterName: NAME,
            characterClass: classId,
            characterRace: race
        })
    });

    const j = await r.json();
    console.log(ok("Personnage créé"));
    return j.profile;
}

async function reserveSeat(token: string) {
    const r = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ serverId: SERVER_ID, characterSlot: SLOT })
    });

    return await r.json();
}

// ========================================================
// PRINT INVENTORY
// ========================================================
function printInventory(inv: any) {
    console.log(colors.bold("\n👜 INVENTAIRE :"));
    inv.slots.forEach((s: any, i: number) => {
        const txt = s.itemId
            ? `${colors.green(s.itemId)} x${s.amount}`
            : colors.gray("vide");
        console.log(`  [${i}] ${txt}`);
    });
}

// ========================================================
// PRINT DIFF STATS (vieux -> nouveau)
// ========================================================
function printStatDiff(before: any, after: any, title: string) {
    console.log(colors.bold(`\n📊 ${title}`));

    for (const key of Object.keys(after)) {
        if (typeof after[key] !== "number") continue;

        const oldVal = before[key] ?? 0;
        const newVal = after[key];
        const diff = newVal - oldVal;

        const diffTxt =
            diff > 0 ? colors.green(`(+${diff})`) :
            diff < 0 ? colors.red(`(${diff})`) :
            colors.gray("(=)");

        console.log(
            ` - ${key.padEnd(16)}: ${colors.yellow(oldVal)} → ${colors.cyan(newVal)} ${diffTxt}`
        );
    }
}

// ========================================================
// MAIN
// ========================================================
(async () => {
    console.log(step("AUTH"));
    await register();
    const token = await login();

    let profile = await getProfile(token);
    if (!profile) profile = await createCharacter(token);

    console.log(step("MATCHMAKING"));
    const mm = await reserveSeat(token);

    console.log(step("CONNEXION COLYSEUS"));
    const client = new Colyseus.Client(WS_URL);

    const room = await client.consumeSeatReservation(mm);
    console.log(ok("Connecté au serveur !"));

    const { on, waitFor } = createMessageQueue(room);

    const sendAsync = createSendAsync(room, waitFor);

    on("welcome", () => console.log(ok("WELCOME reçu")));
    on("inventory_update", msg => {
        console.log(info("inventory_update reçu"));
        printInventory(msg);
    });
    on("stats_update", msg => console.log(info("stats_update reçu")));

    await waitFor("welcome");

    await sleep(200);

    // --------------------------------------------------------
    // 1) STATS INITIALES
    // --------------------------------------------------------
    step("STATS — Login");
    room.send("stats_request");

    const stats0 = await waitFor("stats_update");
    console.log(colors.magenta("Stats initiales:"));
    console.log(stats0);

    // --------------------------------------------------------
    // 2) AJOUT ITEMS
    // --------------------------------------------------------
    step("AJOUT ITEMS");

    const ALL = [
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

    for (const id of ALL) {
        console.log(info(`→ add ${id}`));
        room.send("inv_add", { itemId: id, amount: 1 });
        await sleep(80);
    }

    // STATS après items
    room.send("stats_request");
    const stats1 = await waitFor("stats_update");

    printStatDiff(stats0, stats1, "Stats après ajout objets");

    // --------------------------------------------------------
    // 3) ÉQUIPER UN OBJET
    // --------------------------------------------------------
    step("ÉQUIPEMENT");

    console.log(info("Équipement slot 0"));
    room.send("inv_equip", { fromSlot: 0 });

    const stats2 = await waitFor("stats_update");
    printStatDiff(stats1, stats2, "Après équipement");

    // --------------------------------------------------------
    // 4) DÉSÉQUIPER
    // --------------------------------------------------------
    step("DÉSÉQUIPEMENT");

    room.send("inv_unequip", { equipSlot: "head" });
    const stats3 = await waitFor("stats_update");
    printStatDiff(stats2, stats3, "Après déséquipement");

    // --------------------------------------------------------
    // 5) LOOTBOX
    // --------------------------------------------------------
    step("LOOTBOX");

    room.send("inv_open", { slot: 5 });
    await sleep(300);

    // --------------------------------------------------------
    // FIN
    // --------------------------------------------------------
    console.log(colors.bold.green("\n🎉 FIN DU TEST ULTIMATE !"));
    process.exit(0);

})();
