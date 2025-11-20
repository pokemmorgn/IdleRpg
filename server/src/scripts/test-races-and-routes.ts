/**
 * Script de test pour la configuration des races et les routes de statistiques
 * Usage: npx ts-node test-races-and-routes.ts
 */

import http from "http";
import {
  ALL_RACES,
  RACES_BY_ID,
  VALID_RACE_IDS,
  isValidRace,
  getRaceById,
  getRacesByFaction,
  getReadableRaceBonuses,
  Faction,
  RaceConfig
} from './races.config'; // Adaptez le chemin si nécessaire

// --- Configuration du serveur API ---
const API_HOST = "localhost";
const API_PORT = 3000;
const API_BASE_PATH = "/stats"; // Basé sur votre routeur

// --- Helper pour les requêtes HTTP (similaire à votre exemple) ---
interface HttpResponse {
  statusCode: number;
  data: any;
}

function makeRequest(method: string, path: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path: `${API_BASE_PATH}${path}`,
        method,
        headers: { "Content-Type": "application/json" },
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
          } catch (err) {
            reject(new Error(`Parse error on ${path}: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

// --- Helper pour un affichage coloré et lisible (similaire à votre exemple) ---
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
  data: (msg: string) => console.log(`${colors.magenta}📊 ${msg}${colors.reset}`),
};

// --- Fonction principale de test ---
async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    🧪 TEST RACES CONFIG & STATS ROUTES - IdleRPG 🧞        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}${API_BASE_PATH}`);
  log.info("Démarrage des tests...\n");

  let allTestsPassed = true;

  // =================================================================
  // PARTIE 1: TESTS DE LA LOGIQUE DE CONFIGURATION (sans serveur)
  // =================================================================
  log.section("PARTIE 1: TESTS LOGIQUES (races.config.ts)");

  try {
    // Test 1: Cohérence des données
    log.info("Test 1.1: Vérification de la cohérence des données de race");
    ALL_RACES.forEach(race => {
      if (!race.raceId || !race.nameKey || !race.faction) {
        log.error(`La race ${race.raceId || 'INCONNUE'} est mal formée.`);
        allTestsPassed = false;
      }
    });
    log.success("Structure des données de race validée.");

    // Test 2: isValidRace
    log.info("Test 1.2: Vérification de la fonction isValidRace");
    if (isValidRace('human_elion') && !isValidRace('race_inexistante')) {
      log.success("isValidRace fonctionne correctement.");
    } else {
      log.error("isValidRace a un comportement inattendu.");
      allTestsPassed = false;
    }

    // Test 3: getRaceById
    log.info("Test 1.3: Vérification de la fonction getRaceById");
    const humanRace = getRaceById('human_elion');
    if (humanRace && humanRace.raceId === 'human_elion') {
      log.success("getRaceById trouve une race existante.");
    } else {
      log.error("getRaceById n'a pas trouvé une race existante.");
      allTestsPassed = false;
    }
    if (getRaceById('race_inexistante') === undefined) {
      log.success("getRaceById retourne 'undefined' pour une race inexistante.");
    } else {
      log.error("getRaceById ne retourne pas 'undefined' pour une race inexistante.");
      allTestsPassed = false;
    }

    // Test 4: getRacesByFaction
    log.info("Test 1.4: Vérification de la fonction getRacesByFaction");
    const aurionRaces = getRacesByFaction('AURION');
    const ombreRaces = getRacesByFaction('OMBRE');
    if (aurionRaces.length === 4 && aurionRaces.every(r => r.faction === 'AURION')) {
      log.success("getRacesByFaction filtre correctement la faction AURION.");
    } else {
      log.error("getRacesByFaction a échoué pour la faction AURION.");
      allTestsPassed = false;
    }
    if (ombreRaces.length === 4 && ombreRaces.every(r => r.faction === 'OMBRE')) {
      log.success("getRacesByFaction filtre correctement la faction OMBRE.");
    } else {
      log.error("getRacesByFaction a échoué pour la faction OMBRE.");
      allTestsPassed = false;
    }

    // Test 5: getReadableRaceBonuses
    log.info("Test 1.5: Vérification de la fonction getReadableRaceBonuses");
    ALL_RACES.forEach(race => {
        const bonuses = getReadableRaceBonuses(race);
        // Actuellement, tous les bonus sont vides
        if (bonuses.length === 0) {
            log.success(`Bonus vides correctement gérés pour ${race.raceId}`);
        } else {
            log.warning(`Bonus inattendus pour ${race.raceId}: ${bonuses.join(', ')}`);
        }
    });

  } catch (error: any) {
    log.section("❌ ÉCHEC CRITIQUE DES TESTS LOGIQUES");
    log.error(error.message);
    allTestsPassed = false;
  }

  // =================================================================
  // PARTIE 2: TESTS DES ROUTES API (avec serveur)
  // =================================================================
  log.section("PARTIE 2: TESTS DES ROUTES API (stats.routes.ts)");

  try {
    // Test 1: GET /races
    log.info("Test 2.1: GET /races");
    const resRaces = await makeRequest("GET", "/races");
    if (resRaces.statusCode === 200 && Array.isArray(resRaces.data) && resRaces.data.length === ALL_RACES.length) {
      log.success(`GET /races a retourné ${resRaces.data.length} races, comme attendu.`);
    } else {
      log.error(`GET /races a échoué. Status: ${resRaces.statusCode}, Data: ${JSON.stringify(resRaces.data)}`);
      allTestsPassed = false;
    }

    // Test 2: GET /races/:raceId
    log.info("Test 2.2: GET /races/human_elion");
    const resRace = await makeRequest("GET", "/races/human_elion");
    if (resRace.statusCode === 200 && resRace.data.raceId === 'human_elion') {
      log.success("GET /races/:raceId a retourné la bonne race.");
    } else {
      log.error(`GET /races/:raceId a échoué. Status: ${resRace.statusCode}`);
      allTestsPassed = false;
    }

    // Test 3: GET /races/:raceId/classes
    log.info("Test 2.3: GET /races/human_elion/classes");
    const resRaceClasses = await makeRequest("GET", "/races/human_elion/classes");
    if (resRaceClasses.statusCode === 200 && Array.isArray(resRaceClasses.data)) {
      log.success(`GET /races/:raceId/classes a retourné une liste de ${resRaceClasses.data.length} classes.`);
    } else {
      log.error(`GET /races/:raceId/classes a échoué. Status: ${resRaceClasses.statusCode}`);
      allTestsPassed = false;
    }
    
    // Test 4: GET /classes
    log.info("Test 2.4: GET /classes");
    const resClasses = await makeRequest("GET", "/classes");
    if (resClasses.statusCode === 200 && Array.isArray(resClasses.data)) {
      log.success(`GET /classes a retourné une liste de ${resClasses.data.length} classes.`);
    } else {
      log.error(`GET /classes a échoué. Status: ${resClasses.statusCode}`);
      allTestsPassed = false;
    }

    // Test 5: GET /creation-data
    log.info("Test 2.5: GET /creation-data");
    const resCreationData = await makeRequest("GET", "/creation-data");
    const hasCorrectKeys = resCreationData.data && 
                          typeof resCreationData.data === 'object' &&
                          Array.isArray(resCreationData.data.races) &&
                          Array.isArray(resCreationData.data.classes) &&
                          typeof resCreationData.data.restrictions === 'object' &&
                          typeof resCreationData.data.byRace === 'object';

    if (resCreationData.statusCode === 200 && hasCorrectKeys) {
      log.success("GET /creation-data a retourné un objet avec la structure attendue.");
    } else {
      log.error(`GET /creation-data a échoué ou a une structure incorrecte. Status: ${resCreationData.statusCode}`);
      allTestsPassed = false;
    }

  } catch (error: any) {
    log.section("❌ ÉCHEC CRITIQUE DES TESTS D'API");
    log.error(`Impossible de contacter le serveur sur http://${API_HOST}:${API_PORT}`);
    log.error("Assurez-vous que votre serveur est en cours d'exécution.");
    log.error(error.message);
    allTestsPassed = false;
  }

  // =================================================================
  // RÉSUMÉ FINAL
  // =================================================================
  log.section("RÉSUMÉ FINAL DES TESTS");

  if (allTestsPassed) {
    log.success("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !");
    console.log("");
    log.info("✅ Logique de configuration des races");
    log.info("✅ Routes de l'API /stats");
    log.info("✅ Cohérence entre la configuration et l'API");
  } else {
    log.error("❌ CERTAINS TESTS ONT ÉCHOUÉ");
    log.warning("Consultez les logs ci-dessus pour identifier les problèmes.");
    process.exit(1); // Termine le script avec un code d'erreur
  }
}

// Lancement du script
if (require.main === module) {
  runTests();
}
