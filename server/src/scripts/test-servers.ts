import { Client } from "colyseus.js";

const SERVER_URL = "ws://localhost:2567"; // mets l'adresse que tu utilises
const SERVER_ID = "s1";
const TOKEN = "TON_TOKEN_ICI"; // mets ton vrai token sinon auth échoue
const CHARACTER_SLOT = 1;

// ========== STATS DU TEST ==========
let combats = 0;
let kills = 0;
let totalDamage = 0;
let attacks = 0;

// Durée du test : 5 minutes
const TEST_DURATION = 300 * 1000;

// Interval d’affichage : 5s
const DISPLAY_INTERVAL = 5000;

(async () => {
    console.log("🟦 Lancement du script de FARM 5 minutes…");

    const client = new Client(SERVER_URL);

    // Connexion à la room world
    console.log("🔌 Connexion au serveur…");

    const room = await client.joinOrCreate<any>(
        `world_${SERVER_ID}`,
        {
            token: TOKEN,
            serverId: SERVER_ID,
            characterSlot: CHARACTER_SLOT
        }
    );

    console.log("🟢 Connecté au serveur !");
    console.log("➡ Session:", room.sessionId);

    // ========== LISTENERS ==========
    room.onMessage("*", (type: string, data: any) => {
        // Debug minimal
        if (type === "combat_start") {
            combats++;
        }
        if (type === "combat_hit") {
            attacks++;
            totalDamage += (data.damage || 0);
        }
        if (type === "combat_kill") {
            kills++;
        }

        // HP update
        if (type === "player_hp_update") {
            // nothing special, HP read at tick below
        }
    });

    // ========== Auto Move (facultatif) ==========
    // Téléporte le joueur dans une zone où il y a des loups
    room.send("player_move", {
        x: 100,
        y: 0,
        z: 100
    });

    console.log("📍 Le joueur est placé dans la zone de farm");

    // ========== Boucle de test ==========
    let elapsed = 0;
    const startTime = Date.now();

    const displayLoop = setInterval(() => {
        elapsed = Math.floor((Date.now() - startTime) / 1000);

        const state = room.state;
        const player = state.players.get(room.sessionId);

        console.log(`
───────────────────────────────────────────────
⏱ Temps: ${elapsed}s / 300s
❤️ HP: ${player.hp}/${player.maxHp}
🔋 Ressource: ${player.resource}/${player.maxResource}
🎯 Cible: ${player.targetMonsterId || "Aucune"}
⚔️ Combats: ${combats}
💥 Attaques: ${attacks}
💀 Kills: ${kills}
🔥 Dégâts totaux: ${totalDamage}
───────────────────────────────────────────────
        `);

    }, DISPLAY_INTERVAL);

    // ========== Timer principal ==========
    setTimeout(async () => {
        clearInterval(displayLoop);

        console.log(`
======================================================
🏁 FIN DU TEST DE FARM (5 minutes)
======================================================
❤️ HP final: ${room.state.players.get(room.sessionId).hp}
⚔️ Combats lancés: ${combats}
💥 Attaques: ${attacks}
💀 Kills: ${kills}
🔥 Dégâts totaux: ${totalDamage}
======================================================
`);

        await room.leave();
        process.exit(0);
    }, TEST_DURATION);

})();
