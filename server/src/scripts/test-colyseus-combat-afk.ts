/**
 * TEST Combat Auto + AFK via Colyseus (Version longue)
 * Usage: npx ts-node src/scripts/test-colyseus-combat-afk-long.ts
 */

import { Client } from "colyseus.js";
import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;

// Configuration du test
const AFK_DURATION_SECONDS = 60; // Durée du test AFK (1 minute pour debug, augmenter à 300+ pour prod)
const SUMMARY_CHECK_INTERVAL = 5000; // Vérifier le récap toutes les 5 secondes

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

    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({
              statusCode: res.statusCode || 500,
              data: JSON.parse(data),
            });
          } catch {
            reject(new Error(`Parse error: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const log = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  reset: "\x1b[0m",

  ok(msg: string) {
    console.log(`${this.green}✓ ${msg}${this.reset}`);
  },
  info(msg: string) {
    console.log(`${this.blue}ℹ️  ${msg}${this.reset}`);
  },
  error(msg: string) {
    console.log(`${this.red}❌ ${msg}${this.reset}`);
  },
  warning(msg: string) {
    console.log(`${this.yellow}⚠️  ${msg}${this.reset}`);
  },
  section(title: string) {
    console.log(`\n${this.cyan}${"=".repeat(70)}\n${title}\n${"=".repeat(70)}${this.reset}`);
  },
  combat(msg: string) {
    console.log(`${this.magenta}⚔️  ${msg}${this.reset}`);
  },
  stat(label: string, value: any) {
    console.log(`${this.white}  ${label}: ${this.cyan}${value}${this.reset}`);
  },
};

// Statistiques en temps réel
const stats = {
  combatStarts: 0,
  damageDealt: 0,
  damageTaken: 0,
  monstersKilled: 0,
  playerDeaths: 0,
  xpGained: 0,
  goldGained: 0,
  criticalHits: 0,
  misses: 0,
  
  reset() {
    this.combatStarts = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.monstersKilled = 0;
    this.playerDeaths = 0;
    this.xpGained = 0;
    this.goldGained = 0;
    this.criticalHits = 0;
    this.misses = 0;
  },
  
  display() {
    log.section("📊 STATISTIQUES TEMPS RÉEL");
    log.stat("Combats démarrés", this.combatStarts);
    log.stat("Monstres tués", this.monstersKilled);
    log.stat("Dégâts infligés", this.damageDealt);
    log.stat("Dégâts subis", this.damageTaken);
    log.stat("Coups critiques", this.criticalHits);
    log.stat("Attaques manquées", this.misses);
    log.stat("Morts du joueur", this.playerDeaths);
    log.stat("XP gagnée", this.xpGained);
    log.stat("Or gagné", this.goldGained);
    
    if (this.damageDealt > 0) {
      const avgDmg = (this.damageDealt / (this.combatStarts || 1)).toFixed(2);
      log.stat("Dégâts moyens", avgDmg);
    }
  }
};

async function runTest() {
  log.section("TEST COLYSEUS - COMBAT + AFK (VERSION LONGUE)");
  log.info(`Durée du test AFK: ${AFK_DURATION_SECONDS} secondes`);
  log.info(`Vérification du récap toutes les ${SUMMARY_CHECK_INTERVAL / 1000}s`);

  let token: string;
  let profile: any;
  let client: Client;
  let room: any;
  let afkStartTime: number;
  let summaryCheckInterval: any;

  // Position de spawn (zone avec monstres)
  const spawnX = 100;
  const spawnY = 0;
  const spawnZ = 100;

  try {
    // 1) Création compte
    log.section("1. Création du compte");

    const username = "afklongtest_" + Date.now();
    const res1 = await makeRequest("POST", "/auth/register", {
      username,
      password: "password123",
    });

    token = res1.data.token;
    log.ok("Compte créé");

    // 2) Création personnage
    log.section("2. Création du personnage");

    const res2 = await makeRequest(
      "POST",
      "/profile/s1",
      {
        characterName: "AFKLongTester_" + Date.now(),
        characterClass: "warrior",
        characterRace: "human_elion",
        characterSlot: 1,
      },
      token
    );

    if (!res2.data.success || !res2.data.profile)
      throw new Error("Profile creation failed: " + res2.data.error);

    profile = res2.data.profile;

    log.ok("Personnage créé");
    log.stat("Nom", profile.characterName);
    log.stat("Classe", profile.class);
    log.stat("HP", `${profile.computedStats.maxHp}`);
    log.stat("Attack Power", profile.computedStats.attackPower);
    log.stat("Attack Speed", `${profile.computedStats.attackSpeed}s`);

    // 3) Connexion WS
    log.section("3. Connexion WebSocket");

    client = new Client(`ws://${API_HOST}:${API_PORT}`);

    room = await client.joinOrCreate("world", {
      token,
      serverId: "s1",
      characterSlot: profile.characterSlot,
    });

    log.ok(`Connecté à la room ${room.roomId}`);
    log.info(`Session = ${room.sessionId}`);

    // 4) Setup des handlers WebSocket
    log.section("4. Configuration des listeners");

    let lastSummary: any = null;

    room.onMessage("welcome", (msg: any) => {
      log.ok("Bienvenue reçu !");
      log.stat("Joueurs en ligne", msg.onlinePlayers);
      log.stat("Monstres disponibles", msg.monsterCount);
    });

    room.onMessage("combat_start", (msg: any) => {
      stats.combatStarts++;
      log.combat(`Combat #${stats.combatStarts} démarre contre ${msg.monsterId}`);
    });

    room.onMessage("combat_damage", (msg: any) => {
      // Déterminer qui inflige les dégâts
      if (msg.attackerId === room.sessionId) {
        // Le joueur attaque
        stats.damageDealt += msg.damage;
        if (msg.isCritical) stats.criticalHits++;
        if (msg.isMiss) stats.misses++;
      } else {
        // Le joueur subit des dégâts
        stats.damageTaken += msg.damage;
      }
    });

    room.onMessage("combat_death", (msg: any) => {
      if (msg.isPlayer) {
        stats.playerDeaths++;
        log.warning(`☠️  Mort du joueur ! (Total: ${stats.playerDeaths})`);
      } else {
        stats.monstersKilled++;
        log.ok(`💀 Monstre tué ! (Total: ${stats.monstersKilled})`);
      }
    });

    room.onMessage("xp_gained", (msg: any) => {
      stats.xpGained += msg.amount;
    });

    room.onMessage("loot_dropped", (msg: any) => {
      stats.goldGained += msg.gold;
    });

    room.onMessage("afk_activated", (msg: any) => {
      log.ok("Mode AFK activé !");
      log.stat("Position de référence", `(${msg.referencePosition.x}, ${msg.referencePosition.y}, ${msg.referencePosition.z})`);
      log.stat("Durée max", `${msg.maxDuration}s (${msg.maxDuration / 3600}h)`);
    });

    room.onMessage("afk_summary_update", (summary: any) => {
      lastSummary = summary;
      // Ne pas log à chaque update pour éviter le spam
    });

    room.onMessage("afk_summary_claimed", (data: any) => {
      log.section("🎁 RÉCAP CLAIM");
      log.stat("Monstres tués", data.summary.monstersKilled);
      log.stat("XP gagnée", data.summary.xpGained);
      log.stat("Or gagné", data.summary.goldGained);
      log.stat("Morts", data.summary.deaths);
      log.stat("Temps total", `${data.summary.totalTime}s (${(data.summary.totalTime / 60).toFixed(2)} min)`);
    });

    room.onMessage("afk_time_limit_reached", (msg: any) => {
      log.warning("⏰ LIMITE DE TEMPS AFK ATTEINTE (2h)");
      log.warning(msg.message);
    });

    room.onMessage("player_resurrected", (msg: any) => {
      log.ok(`✨ Résurrection ! HP: ${msg.hp}/${msg.maxHp}`);
    });

    log.ok("Listeners configurés");

    // 5) Téléporter le joueur sur la zone de spawn
    log.section("5. Téléportation sur la zone de combat");

    room.send("player_move", {
      x: spawnX,
      y: spawnY,
      z: spawnZ,
    });

    log.ok(`Téléporté à (${spawnX}, ${spawnY}, ${spawnZ})`);
    await wait(2000);

    // 6) Activer le mode AFK
    log.section("6. Activation du mode AFK");

    room.send("activate_afk_mode", {});
    afkStartTime = Date.now();
    log.ok("Mode AFK activé !");

    // 7) Démarrer la surveillance du récap
    log.section(`7. Surveillance AFK pendant ${AFK_DURATION_SECONDS}s`);
    log.info("Appuyez sur Ctrl+C pour arrêter le test\n");

    let elapsedSeconds = 0;
    const totalSeconds = AFK_DURATION_SECONDS;

    summaryCheckInterval = setInterval(() => {
      elapsedSeconds += SUMMARY_CHECK_INTERVAL / 1000;
      
      const remaining = totalSeconds - elapsedSeconds;
      const progress = ((elapsedSeconds / totalSeconds) * 100).toFixed(1);
      
      console.log(`\n${"─".repeat(70)}`);
      log.info(`Temps écoulé: ${elapsedSeconds}s / ${totalSeconds}s (${progress}%)`);
      log.info(`Temps restant: ${remaining}s`);
      
      // Afficher les stats en temps réel
      stats.display();
      
      // Demander le récap AFK au serveur
      room.send("get_afk_summary", {});
      
      if (lastSummary) {
        log.section("📋 RÉCAP AFK SERVEUR");
        log.stat("Monstres tués", lastSummary.monstersKilled);
        log.stat("XP gagnée", lastSummary.xpGained);
        log.stat("Or gagné", lastSummary.goldGained);
        log.stat("Morts", lastSummary.deaths);
        log.stat("Temps écoulé", `${lastSummary.timeElapsed}s`);
        log.stat("Temps restant (limite 2h)", `${lastSummary.timeRemaining}s`);
      }
      
    }, SUMMARY_CHECK_INTERVAL);

    // Attendre la durée du test
    await wait(AFK_DURATION_SECONDS * 1000);

    // 8) Arrêter la surveillance
    clearInterval(summaryCheckInterval);

    log.section("8. Fin de la période AFK");
    
    // Demander un dernier récap
    room.send("get_afk_summary", {});
    await wait(500);
    
    if (lastSummary) {
      log.section("📋 RÉCAP FINAL AFK");
      log.stat("Monstres tués", lastSummary.monstersKilled);
      log.stat("XP gagnée", lastSummary.xpGained);
      log.stat("Or gagné", lastSummary.goldGained);
      log.stat("Morts", lastSummary.deaths);
      log.stat("Temps total", `${lastSummary.timeElapsed}s (${(lastSummary.timeElapsed / 60).toFixed(2)} min)`);
    }

    // 9) Claim le récap
    log.section("9. Claim du récapitulatif");
    
    room.send("claim_afk_summary", {});
    await wait(1000);

    // 10) Désactiver l'AFK
    log.section("10. Désactivation du mode AFK");
    
    room.send("deactivate_afk_mode", {});
    await wait(500);
    log.ok("Mode AFK désactivé");

    // 11) Statistiques finales
    log.section("📊 STATISTIQUES FINALES");
    stats.display();
    
    const afkDuration = (Date.now() - afkStartTime) / 1000;
    const killsPerMinute = (stats.monstersKilled / (afkDuration / 60)).toFixed(2);
    const xpPerMinute = (stats.xpGained / (afkDuration / 60)).toFixed(2);
    const goldPerMinute = (stats.goldGained / (afkDuration / 60)).toFixed(2);
    
    log.section("⚡ EFFICACITÉ");
    log.stat("Durée totale", `${afkDuration.toFixed(2)}s (${(afkDuration / 60).toFixed(2)} min)`);
    log.stat("Monstres/min", killsPerMinute);
    log.stat("XP/min", xpPerMinute);
    log.stat("Or/min", goldPerMinute);
    
    if (stats.playerDeaths > 0) {
      const survivalRate = ((1 - (stats.playerDeaths / stats.monstersKilled)) * 100).toFixed(2);
      log.stat("Taux de survie", `${survivalRate}%`);
    }

    // 12) Déconnexion
    log.section("12. Déconnexion");
    await room.leave();
    log.ok("Déconnecté proprement");

    log.section("✅ TEST TERMINÉ AVEC SUCCÈS");

  } catch (err: any) {
    log.error("ERREUR: " + err.message);
    console.error(err);
    
    if (summaryCheckInterval) {
      clearInterval(summaryCheckInterval);
    }
    
    process.exit(1);
  }
}

// Gérer Ctrl+C proprement
process.on('SIGINT', () => {
  log.section("⚠️  ARRÊT MANUEL DU TEST");
  log.info("Affichage des stats avant fermeture...");
  stats.display();
  process.exit(0);
});

runTest();
