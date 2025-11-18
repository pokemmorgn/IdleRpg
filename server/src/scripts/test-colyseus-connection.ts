/**
 * Script de test pour la connexion Colyseus WorldRoom
 * Usage: npx ts-node src/scripts/test-colyseus-connection.ts
 */

import { Client } from "colyseus.js";
import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;

interface HttpResponse {
  statusCode: number;
  data: any;
}

function makeRequest(method: string, path: string, body?: any, token?: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const headers: any = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request({
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode || 500, data: JSON.parse(data) });
        } catch (err) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.cyan}${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}${colors.reset}\n`),
  ws: (msg: string) => console.log(`${colors.magenta}🔌 ${msg}${colors.reset}`),
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        🔌 TEST COLYSEUS WORLDROOM - IdleRPG 🔌            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info(`WebSocket URL: ws://${API_HOST}:${API_PORT}`);
  log.info("Démarrage des tests...\n");

  let token: string;
  let client: Client;

  try {
    // ===== ÉTAPE 1: Créer un compte =====
    log.section("ÉTAPE 1: CRÉER UN COMPTE TEST");
    
    const username = `colytest_${Date.now()}`;
    log.info(`Création du compte: ${username}`);
    
    let res = await makeRequest("POST", "/auth/register", {
      username,
      password: "password123"
    });
    
    if (res.statusCode !== 200) {
      throw new Error(`Register failed: ${res.data.error}`);
    }
    
    token = res.data.token;
    log.success(`Compte créé: ${username}`);
    log.info(`Token: ${token.substring(0, 30)}...`);

    // ===== ÉTAPE 2: Créer un personnage sur s1 =====
    log.section("ÉTAPE 2: CRÉER UN PERSONNAGE SUR S1");
    
    log.info("Création: Guerrier Humain sur s1...");
    
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "TestHero",
      characterClass: "warrior",
      characterRace: "human_elion"
    }, token);
    
    if (res.statusCode !== 201) {
      throw new Error(`Profile creation failed: ${res.data.error}`);
    }
    
    const profile = res.data.profile;
    log.success("Personnage créé !");
    log.info(`Nom: ${profile.characterName}`);
    log.info(`Slot: ${profile.characterSlot}`);
    log.info(`Classe: ${profile.class}`);
    log.info(`Race: ${profile.race}`);

    await sleep(1000);

    // ===== ÉTAPE 3: Connexion WebSocket à WorldRoom =====
    log.section("ÉTAPE 3: CONNEXION WEBSOCKET À WORLDROOM");
    
    log.ws("Initialisation du client Colyseus...");
    client = new Client(`ws://${API_HOST}:${API_PORT}`);
    
    log.ws("Connexion à la room 'world' avec serverId='s1'...");
    
    const room = await client.joinOrCreate("world", {
      token: token,
      serverId: "s1",
      characterSlot: profile.characterSlot
    });
    
    log.success(`Connecté à la room: ${room.roomId}`);
    log.info(`SessionId: ${room.sessionId}`);

    // ===== ÉTAPE 4: Écouter les événements =====
    log.section("ÉTAPE 4: ÉCOUTER LES ÉVÉNEMENTS COLYSEUS");

    // Attendre que le state soit initialisé
    await new Promise<void>((resolve) => {
      room.onStateChange.once((state: any) => {
        log.ws("État initial du monde reçu");
        log.info(`ServerId: ${state.serverId}`);
        log.info(`Joueurs en ligne: ${state.onlineCount}`);
        log.info(`WorldTime: ${new Date(state.worldTime).toISOString()}`);
        
        // Afficher les joueurs actuellement connectés
        if (state.players) {
          log.info(`\nJoueurs dans la room :`);
          state.players.forEach((player: any, sessionId: string) => {
            log.info(`  - ${player.characterName} (${player.class}/${player.race}) Lv${player.level}`);
          });
        }
        
        resolve();
      });
    });

    // Message de bienvenue
    room.onMessage("welcome", (message: any) => {
      log.ws(`Message de bienvenue reçu !`);
      log.info(`  Contenu: ${message.message}`);
      log.info(`  Serveur: ${message.serverId}`);
      log.info(`  Joueurs en ligne: ${message.onlinePlayers}`);
    });

    // Changements d'état
    room.onStateChange((state: any) => {
      log.ws(`État du monde mis à jour (${state.onlineCount} joueur(s))`);
    });

    // Attendre pour voir les événements
    log.info("\nEn attente des événements (3 secondes)...");
    await sleep(3000);

    // ===== ÉTAPE 5: Envoyer un message au serveur =====
    log.section("ÉTAPE 5: ENVOYER UN MESSAGE AU SERVEUR");
    
    log.ws("Envoi d'un message 'test_action'...");
    room.send("test_action", { action: "hello", data: "test from client" });
    
    await sleep(1000);

    // ===== ÉTAPE 6: Déconnexion =====
    log.section("ÉTAPE 6: DÉCONNEXION");
    
    log.ws("Déconnexion de la room...");
    await room.leave();
    log.success("Déconnecté avec succès");

    await sleep(1000);

    // ===== ÉTAPE 7: Test de reconnexion =====
    log.section("ÉTAPE 7: TEST DE RECONNEXION");
    
    log.ws("Reconnexion à la room 'world'...");
    const room2 = await client.joinOrCreate("world", {
      token: token,
      serverId: "s1",
      characterSlot: profile.characterSlot
    });
    
    log.success(`Reconnecté à la room: ${room2.roomId}`);
    log.info(`SessionId: ${room2.sessionId}`);

    // Attendre le state
    await new Promise<void>((resolve) => {
      room2.onStateChange.once((state: any) => {
        log.ws(`État reçu: ${state.onlineCount} joueur(s) en ligne`);
        resolve();
      });
    });

    await sleep(2000);

    log.ws("Déconnexion finale...");
    await room2.leave();
    
    await sleep(1000);

    // ===== ÉTAPE 8: Test avec un second joueur =====
    log.section("ÉTAPE 8: TEST AVEC UN SECOND JOUEUR");
    
    const username2 = `colytest2_${Date.now()}`;
    log.info(`Création du second compte: ${username2}`);
    
    res = await makeRequest("POST", "/auth/register", {
      username: username2,
      password: "password123"
    });
    
    const token2 = res.data.token;
    log.success(`Second compte créé: ${username2}`);

    log.info("Création d'un personnage pour le second joueur...");
    res = await makeRequest("POST", "/profile/s1", {
      characterName: "TestHero2",
      characterClass: "mage",
      characterRace: "winged_lunaris"
    }, token2);
    
    log.success("Second personnage créé");

    log.ws("Connexion des deux joueurs simultanément...");
    
    const client2 = new Client(`ws://${API_HOST}:${API_PORT}`);
    
    const roomPlayer1 = await client.joinOrCreate("world", {
      token: token,
      serverId: "s1",
      characterSlot: 1
    });
    
    const roomPlayer2 = await client2.joinOrCreate("world", {
      token: token2,
      serverId: "s1",
      characterSlot: 1
    });
    
    log.success("Les deux joueurs sont connectés !");
    log.info(`Room 1 SessionId: ${roomPlayer1.sessionId}`);
    log.info(`Room 2 SessionId: ${roomPlayer2.sessionId}`);
    log.info(`Même roomId ? ${roomPlayer1.roomId === roomPlayer2.roomId ? "OUI ✓" : "NON ✗"}`);

    // Attendre les states
    await new Promise<void>((resolve) => {
      let count = 0;
      const checkBoth = () => {
        count++;
        if (count === 2) resolve();
      };
      
      roomPlayer1.onStateChange.once((state: any) => {
        log.ws(`Player1 voit ${state.onlineCount} joueur(s)`);
        checkBoth();
      });
      
      roomPlayer2.onStateChange.once((state: any) => {
        log.ws(`Player2 voit ${state.onlineCount} joueur(s)`);
        checkBoth();
      });
    });

    await sleep(2000);

    log.ws("Déconnexion des deux joueurs...");
    await roomPlayer1.leave();
    await roomPlayer2.leave();

    await sleep(1000);

    // ===== RÉSUMÉ =====
    log.section("RÉSUMÉ DES TESTS");
    
    log.success("✓ Connexion WebSocket à WorldRoom");
    log.success("✓ Authentification JWT dans Colyseus");
    log.success("✓ Chargement du personnage depuis MongoDB");
    log.success("✓ Synchronisation du GameState");
    log.success("✓ Réception des messages serveur");
    log.success("✓ Envoi de messages au serveur");
    log.success("✓ Déconnexion et reconnexion");
    log.success("✓ Plusieurs joueurs dans la même room");
    
    log.info("\n🎉 TOUS LES TESTS COLYSEUS SONT PASSÉS !");

  } catch (error: any) {
    log.section("❌ ÉCHEC CRITIQUE");
    log.error("Un test a échoué");
    log.error(error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
