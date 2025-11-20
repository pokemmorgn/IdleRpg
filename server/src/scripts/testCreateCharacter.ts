/**
 * SCRIPT DE TEST : REGISTER → LOGIN → JOIN → WEBSOCKET → COMBAT AUTO + HUD
 * Compatible Node 18+ (fetch natif)
 * Corrigé pour fonctionner avec le CombatManager unifié et le format de messages WebSocket.
 */

import WebSocket, { RawData } from "ws";

// =====================
// CONSTANTES
// =====================
const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

const TEST_USERNAME = "combat_tester";
const TEST_PASSWORD = "Test123!";
const TEST_EMAIL = "combat_tester@example.com";

const SERVER_ID = "test";
const CHARACTER_SLOT = 1;
const CHARACTER_NAME = "TestCharacter";

// =====================
// UTILS
// =====================
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// HUD ================================
let HUD_PLAYER_HP = 100; // Valeur par défaut
let HUD_PLAYER_MAXHP = 100; // Valeur par défaut

const HUD_MOBS: Record<string, { hp: number; maxHp: number }> = {};
let HUD_TARGET = "-";

function renderHUD() {
    console.clear();
    console.log("=========================================");
    console.log("        🟩 COMBAT HUD – IdleRPG           ");
    console.log("=========================================");

    console.log(`👤 Player: HP ${HUD_PLAYER_HP}/${HUD_PLAYER_MAXHP}`);
    console.log(`🎯 Target: ${HUD_TARGET}`);

    console.log("\n👹 MOBS :");
    if (Object.keys(HUD_MOBS).length === 0) {
        console.log("  Aucun monstre.");
    } else {
        for (const [id, mob] of Object.entries(HUD_MOBS)) {
            console.log(`  - ${id} = ${mob.hp}/${mob.maxHp}`);
        }
    }

    console.log("=========================================\n");
}

// =============================
// API WRAPPERS (inchangés)
// =============================
async function registerAccount(): Promise<boolean> {
    console.log("→ Tentative d'inscription...");

    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_USERNAME,
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        }),
    });

    const json = await res.json();

    if (res.ok) {
        console.log("✔ Compte créé !");
        return true;
    }

    if (json.error === "Username already taken") {
        console.log("ℹ Compte déjà existant, on continue.");
        return true;
    }

    console.error("❌ Erreur register:", json);
    return false;
}

async function loginAccount(): Promise<string | null> {
    console.log("→ Connexion...");

    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_USERNAME,
            password: TEST_PASSWORD,
        }),
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur login:", json);
        return null;
    }

    console.log("✔ Connecté !");
    return json.token;
}

async function checkExistingProfile(token: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (!res.ok) return null;

    return json.profiles.find((p: any) => p.characterSlot === CHARACTER_SLOT) ?? null;
}

async function getCreationData(token: string) {
    const res = await fetch(`${API_URL}/game-data/creation`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (!res.ok) return null;

    return json;
}

async function createCharacter(token: string, race: string, classId: string) {
    const res = await fetch(`${API_URL}/profile/${SERVER_ID}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            characterSlot: CHARACTER_SLOT,
            characterName: CHARACTER_NAME,
            characterClass: classId,
            characterRace: race,
        }),
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Erreur createProfile:", json);
        return null;
    }

    console.log("✔ Personnage créé !");
    return json.profile;
}

// =============================
// MATCHMAKING (inchangé)
// =============================
async function reserveSeat(token: string, profile: any) {
    console.log("→ Matchmaking Colyseus…");

    const res = await fetch(`${API_URL}/matchmaking/join-world`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            serverId: SERVER_ID,
            characterSlot: CHARACTER_SLOT,
        }),
    });

    const json = await res.json();

    if (!res.ok) {
        throw new Error("⚠ Matchmaking failed: " + JSON.stringify(json));
    }

    return json; // { room, sessionId }
}

// =============================
// WEBSOCKET (inchangé)
// =============================
async function connectWebSocket(room: any, sessionId: string) {
    console.log("→ Connexion WebSocket…");

    const ws = new WebSocket(`${WS_URL}/${room.name}/${room.roomId}?sessionId=${sessionId}`);

    return new Promise<WebSocket>((resolve, reject) => {
        ws.on("open", () => {
            console.log("🔌 WebSocket connecté !");
            resolve(ws);
        });

        ws.on("error", reject);
    });
}

// =============================
// 🔥 PARSER COLYSEUS CORRIGÉ (v2)
// =============================
function handleIncomingMessage(raw: RawData) {
    let text = "";

    if (typeof raw === "string") {
        text = raw;
    } else if (raw instanceof Buffer) {
        text = raw.toString();
    } else {
        console.log("ℹ️ Message WebSocket de type non géré :", typeof raw);
        return;
    }

    // Gestion du format "eventName\0{json}" (votre format original)
    const sep = text.indexOf("\0");
    if (sep !== -1) {
        const eventName = text.substring(0, sep);
        const jsonStr = text.substring(sep + 1);

        let payload;
        try {
            payload = JSON.parse(jsonStr);
        } catch (e) {
            console.error("❌ Erreur de parsing JSON après le séparateur \\0:", e);
            console.error("   JSON string:", jsonStr);
            return;
        }

        handleCustomEvent(eventName, payload);
        return;
    }

    // Si pas de séparateur \0, on tente de parser comme du JSON direct
    try {
        const data = JSON.parse(text);
        
        // Format tableau [type, payload] ?
        if (Array.isArray(data) && data.length >= 2) {
            const eventName = data[0];
            const payload = data[1];
            handleCustomEvent(eventName, payload);
            return;
        }
        
        // Format objet { type: "...", data: {...} } ?
        if (data && typeof data === 'object' && data.type) {
            handleCustomEvent(data.type, data.data);
            return;
        }
        
        // Format objet direct avec une propriété 'event' ?
        if (data && typeof data === 'object' && data.event) {
            handleCustomEvent("combat_event", data);
            return;
        }
        
        console.log("ℹ️ Message JSON non reconnu :", data);
    } catch (e) {
        console.error("❌ Erreur de parsing JSON direct:", e);
        console.error("   Texte brut:", text);
    }
}

// =============================
// HANDLER DES EVENTS CUSTOM CORRIGÉ
// =============================
function handleCustomEvent(event: string, data: any) {

    // --- GESTION DES ÉVÉNEMENTS UNIFIÉS DE COMBAT ---
    if (event === "combat_event") {
        // Cas : Monstre attaque le Joueur
        if (data.event === "hit" && data.source === "monster" && data.target === "player") {
            HUD_PLAYER_HP = data.remainingHp;
            HUD_TARGET = data.sourceId;

            console.log(`🟥 Le monstre ${data.sourceId} t'inflige ${data.damage} → HP ${data.remainingHp}`);
            renderHUD();
            return;
        }

        // Cas : Joueur attaque le Monstre
        if (data.event === "hit" && data.source === "player" && data.target === "monster") {
            const mobId = data.targetId;
            if (!HUD_MOBS[mobId]) {
                // Si le monstre n'est pas dans notre HUD, on l'ajoute avec une estimation de ses PV max
                HUD_MOBS[mobId] = { hp: data.remainingHp, maxHp: data.remainingHp + data.damage };
            } else {
                HUD_MOBS[mobId].hp = data.remainingHp;
            }

            HUD_TARGET = mobId;
            console.log(`🟦 Tu frappes ${mobId} → ${data.damage} dégâts`);
            renderHUD();
            return;
        }

        // Cas : Monstre meurt
        if (data.event === "death" && data.entity === "monster") {
            delete HUD_MOBS[data.entityId];
            if (HUD_TARGET === data.entityId) {
                HUD_TARGET = "-"; // On réinitialise la cible si c'était celle-ci
            }
            console.log(`💀 Monstre ${data.entityId} tué !`);
            renderHUD();
            return;
        }

        // Cas : Joueur meurt
        if (data.event === "death" && data.entity === "player") {
            HUD_PLAYER_HP = 0;
            console.log(`☠️ Vous êtes mort !`);
            renderHUD();
            return;
        }
    }
    
    // --- GESTION DES AUTRES ÉVÉNEMENTS ---
    if (event === "welcome") {
        console.log("✅ Message de bienvenue reçu du serveur.");
        renderHUD();
    }
}

// =============================
// SPAWN + COMBAT AUTO
// =============================
async function spawnTestMobs(ws: WebSocket) {
    console.log("→ Spawn de 2 mobs…");

    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: "mob_01",
        name: "Dummy A",
        x: 0, y: 0, z: 1
    }));

    ws.send(JSON.stringify({
        type: "spawn_test_monster",
        monsterId: "mob_02",
        name: "Dummy B",
        x: 0, y: 0, z: 2
    }));
}

async function startCombat(ws: WebSocket) {
    console.log("→ Demande d'activation du combat auto envoyée…");
    ws.send(JSON.stringify({
        type: "start_auto_combat"
    }));
}

// =============================
// MAIN
// =============================
(async () => {
    console.log("=== 🧪 TEST CREATION PERSONNAGE ===");

    const ok = await registerAccount();
    if (!ok) return;

    const token = await loginAccount();
    if (!token) return;

    let profile = await checkExistingProfile(token);

    if (!profile) {
        const creation = await getCreationData(token);
        if (!creation) {
            console.error("Impossible de récupérer les données de création.");
            return;
        }
        const raceId = creation.races[0].raceId;
        const classId = creation.byRace[raceId][0].classId;
        profile = await createCharacter(token, raceId, classId);
    }

    if (!profile) {
        console.error("Impossible de créer ou charger le profil.");
        return;
    }
    
    console.log("✔ Personnage :", profile.characterName);

    const mm = await reserveSeat(token, profile);
    const ws = await connectWebSocket(mm.room, mm.sessionId);

    ws.on("message", (raw) => handleIncomingMessage(raw));

    // Attendre un peu que la connexion soit stable et que le "welcome" soit arrivé
    await sleep(500);

    await spawnTestMobs(ws);
    
    // Attendre que les monstres soient "spawnés" côté serveur avant de lancer le combat
    await sleep(500);
    
    await startCombat(ws);

})();
