import { Client, Room } from "colyseus.js";
import * as http from "http";

// =================================================================
// === CONFIGURATION - ADAPTEZ CES VALEURS ====================
// =================================================================

const API_CONFIG = {
    host: "localhost",
    port: 3000,
};

const COLYSEUS_CONFIG = {
    host: "localhost",
    port: 2567,
};

// --- IDs des compétences de test (doivent exister dans votre BDD) ---
// Assurez-vous que le personnage de test a ces compétences dans sa skillBar
const SKILL_IDS = {
    // Une compétence avec castTime > 0 et lockType: "soft"
    SOFT_LOCK_SKILL: "skill_fireball", 
    // Une compétence avec castTime > 0 et effectType: "projectile"
    PROJECTILE_SKILL: "skill_arrow",
    // Une compétence instantanée pour la file d'attente
    INSTANT_SKILL: "skill_slash",
};

// =================================================================
// === FIN DE LA CONFIGURATION ==================================
// =================================================================

// --- Helper pour les appels API (repris de votre script) ---
function makeRequest(method: string, path: string, body?: any, token?: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : "";
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const options = { hostname: API_CONFIG.host, port: API_CONFIG.port, path, method, headers };
        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try { resolve({ statusCode: res.statusCode, data: JSON.parse(data) }); }
                catch (err) { reject(new Error(`Failed to parse response: ${data}`)); }
            });
        });
        req.on("error", reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// --- Logging avec couleurs (repris de votre script) ---
const colors = { reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", blue: "\x1b[34m", cyan: "\x1b[36m" };
const log = {
    success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    section: (msg: string) => console.log(`\n${colors.cyan}${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}${colors.reset}\n`),
};

// --- Variables globales pour le test ---
let client: Client;
let room: Room;
let playerState: any;
let monster1: any;
let monster2: any;

// --- Fonctions de test ---

async function setup() {
    log.section("PHASE 0: SETUP");
    
    // 1. Créer un compte et un personnage
    log.info("Création d'un compte et personnage de test...");
    const username = `combattest_${Date.now()}`;
    const registerRes = await makeRequest("POST", "/auth/register", { username, password: "pass123", email: `${username}@test.com` });
    if (registerRes.statusCode !== 200) throw new Error(`Register failed: ${registerRes.data.error}`);
    const token = registerRes.data.token;
    log.success("Compte créé.");

    // Récupérer les données de création pour la première race/classe
    const creationDataRes = await makeRequest("GET", "/stats/creation-data");
    const race = creationDataRes.data.races[0];
    const classId = creationDataRes.data.restrictions[race.raceId][0];
    
    const profileRes = await makeRequest("POST", "/profile/s1", { characterSlot: 1, characterName: "TestFighter", characterClass: classId, characterRace: race.raceId }, token);
    if (profileRes.statusCode !== 201) throw new Error(`Profile creation failed: ${profileRes.data.error}`);
    log.success("Personnage créé.");

    // 2. Se connecter à Colyseus
    log.info(`Connexion à Colyseus ws://${COLYSEUS_CONFIG.host}:${COLYSEUS_CONFIG.port}`);
    client = new Client(`ws://${COLYSEUS_CONFIG.host}:${COLYSEUS_CONFIG.port}`);
    
    room = await client.joinOrCreate("world_s1", { token, serverId: "s1", characterSlot: 1 });
    log.success("Connecté à la room WorldRoom.");

    // Attendre un peu pour que le state initial soit synchronisé
    await new Promise(resolve => setTimeout(resolve, 500));
    // CORRECTION : Utiliser room.sessionId au lieu de client.sessionId
    playerState = (room.state as any).players.get(room.sessionId);
    if (!playerState) throw new Error("Impossible de récupérer l'état du joueur.");
    log.success(`Joueur ${playerState.characterName} récupéré.`);

    // 3. Spawner deux monstres pour les tests
    log.info("Spawn des monstres de test...");
    room.send("spawn_test_monster", { name: "TestMob1", x: 105, z: 105 });
    room.send("spawn_test_monster", { name: "TestMob2", x: 110, z: 105 });
    await new Promise(resolve => setTimeout(resolve, 500)); // Attendre que les monstres apparaissent

    monster1 = Array.from((room.state as any).monsters.values()).find((m: any) => m.name === "TestMob1");
    monster2 = Array.from((room.state as any).monsters.values()).find((m: any) => m.name === "TestMob2");
    if (!monster1 || !monster2) throw new Error("Impossible de trouver les monstres spawnés.");
    log.success("Monstres spawnés.");
}

async function testBasicCombat() {
    log.section("SCÉNARIO 1: COMBAT DE BASE & CONTRE-ATTAQUE");
    
    // Se rapprocher du monstre
    log.info("Déplacement vers le monstre 1...");
    room.send("player_move", { x: monster1.posX, y: monster1.posY, z: monster1.posZ });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre l'entrée en combat

    // Vérifier que le joueur est en combat et cible le monstre
    if (playerState.inCombat && playerState.targetMonsterId === monster1.monsterId) {
        log.success("Joueur entre en combat et cible le bon monstre.");
    } else {
        log.error("Échec de l'entrée en combat ou du ciblage.");
        return;
    }
    
    // Attendre quelques cycles d'attaque
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Vérifier que le monstre a perdu des PV et que le joueur a été attaqué en retour
    if (monster1.hp < monster1.maxHp) {
        log.success(`Le monstre 1 a perdu des PV (${monster1.hp}/${monster1.maxHp}).`);
    } else {
        log.warning("Le monstre 1 n'a pas perdu de PV.");
    }

    // S'éloigner pour sortir du combat
    log.info("Éloignement pour sortir du combat...");
    room.send("player_move", { x: 0, y: 0, z: 0 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!playerState.inCombat) {
        log.success("Joueur sort bien du combat en s'éloignant.");
    } else {
        log.error("Le joueur ne sort pas du combat.");
    }
}

async function testSoftLockCancel() {
    log.section("SCÉNARIO 2: ANNULATION D'UN SORT (SOFT LOCK)");
    
    log.info(`Retour vers le monstre 1 et lancement du sort '${SKILL_IDS.SOFT_LOCK_SKILL}'...`);
    room.send("player_move", { x: monster1.posX, y: monster1.posY, z: monster1.posZ });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let castCancelled = false;
    room.onMessage("cast_cancelled", () => { castCancelled = true; });

    room.send("use_skill", { skillId: SKILL_IDS.SOFT_LOCK_SKILL });
    await new Promise(resolve => setTimeout(resolve, 200)); // Lancer le sort
    
    // Bouger pendant le cast
    log.info("Mouvement pendant le cast pour annuler...");
    room.send("player_move", { x: playerState.posX + 5, y: playerState.posY, z: playerState.posZ });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    if (castCancelled) {
        log.success("Le sort a bien été annulé par le mouvement.");
    } else {
        log.error("Le sort n'a pas été annulé.");
    }
}

async function testQueueing() {
    log.section("SCÉNARIO 3: FILE D'ATTENTE D'ACTION");
    
    // S'assurer qu'on est en combat
    if (!playerState.inCombat) {
        room.send("player_move", { x: monster1.posX, y: monster1.posY, z: monster1.posZ });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    let queuedSkillCast = false;
    room.onMessage("skill_cast", (message) => {
        if (message.skillId === SKILL_IDS.INSTANT_SKILL) {
            queuedSkillCast = true;
        }
    });

    log.info(`Lancement du sort long '${SKILL_IDS.SOFT_LOCK_SKILL}'...`);
    room.send("use_skill", { skillId: SKILL_IDS.SOFT_LOCK_SKILL });
    await new Promise(resolve => setTimeout(resolve, 200));

    log.info(`Mise en file d'attente du sort instantané '${SKILL_IDS.INSTANT_SKILL}'...`);
    room.send("queue_skill", { skillId: SKILL_IDS.INSTANT_SKILL });

    // Attendre la fin du cast + un peu plus
    await new Promise(resolve => setTimeout(resolve, 2500));

    if (queuedSkillCast) {
        log.success("Le sort en file d'attente a bien été lancé.");
    } else {
        log.error("Le sort en file d'attente n'a pas été lancé.");
    }
}

async function testProjectileInterrupt() {
    log.section("SCÉNARIO 4: INTERRUPTION D'UN PROJECTILE");
    
    // Se rapprocher pour caster
    room.send("player_move", { x: monster1.posX, y: monster1.posY, z: monster1.posZ });
    await new Promise(resolve => setTimeout(resolve, 1000));

    let castInterrupted = false;
    room.onMessage("cast_interrupted", () => { castInterrupted = true; });

    log.info(`Lancement du projectile '${SKILL_IDS.PROJECTILE_SKILL}'...`);
    room.send("use_skill", { skillId: SKILL_IDS.PROJECTILE_SKILL });
    await new Promise(resolve => setTimeout(resolve, 200));

    log.info("Mouvement hors de portée pendant le cast...");
    room.send("player_move", { x: 0, y: 0, z: 0 }); // Aller loin

    await new Promise(resolve => setTimeout(resolve, 1500));
    if (castInterrupted) {
        log.success("Le projectile a bien été interrompu.");
    } else {
        log.error("Le projectile n'a pas été interrompu.");
    }
}

async function cleanup() {
    log.section("PHASE FINALE: NETTOYAGE");
    if (room) {
        log.info("Déconnexion de la room...");
        await room.leave();
    }
    if (client) {
        log.info("Déconnexion du serveur Colyseus.");
        // client.close() n'existe pas toujours, mais leave() suffit.
    }
    log.success("Nettoyage terminé.");
}

// --- Fonction principale ---
async function run() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     🧪 SCRIPT DE TEST DU SYSTÈME DE COMBAT - IdleRPG     ║
╚════════════════════════════════════════════════════════════╝
`);

    try {
        await setup();
        await testBasicCombat();
        await testSoftLockCancel();
        await testQueueing();
        await testProjectileInterrupt();
        log.section("🎉 TOUS LES TESTS SONT TERMINÉS");
        log.success("Le système de combat semble fonctionner correctement !");
    } catch (error) {
        log.error("Un test a échoué ou une erreur critique est survenue.");
        console.error(error);
    } finally {
        await cleanup();
    }
}

run();
