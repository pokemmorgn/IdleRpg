/**
 * Script de test pour l'authentification
 * Usage: npx ts-node src/scripts/test-auth.ts
 */

import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;

interface AuthResponse {
  message: string;
  token: string;
  playerId: string;
}

interface HttpResponse {
  statusCode: number;
  data: any;
}

/**
 * Helper pour faire des requêtes HTTP avec Node.js natif
 */
function makeRequest(method: string, path: string, body?: any): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode || 500,
            data: parsed,
          });
        } catch (err) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }

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
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.cyan}${"=".repeat(50)}\n${msg}\n${"=".repeat(50)}${colors.reset}\n`),
};

/**
 * Test 1: Créer un nouveau compte
 */
async function testRegister() {
  log.section("TEST 1: REGISTER");

  const timestamp = Date.now();
  const username = `testplayer_${timestamp}`;
  const password = "password123";

  try {
    log.info(`Tentative de création de compte: ${username}`);

    const response = await makeRequest("POST", "/auth/register", {
      username,
      password,
      email: `${username}@test.com`,
    });

    if (response.statusCode !== 200) {
      throw new Error(`Status ${response.statusCode}: ${response.data.error}`);
    }

    log.success("Compte créé avec succès !");
    log.info(`PlayerId: ${response.data.playerId}`);
    log.info(`Token reçu: ${response.data.token.substring(0, 20)}...`);

    return { username, password, token: response.data.token, playerId: response.data.playerId };
  } catch (error: any) {
    log.error(`Erreur: ${error.message}`);
    throw error;
  }
}

/**
 * Test 2: Se connecter avec le compte créé
 */
async function testLogin(username: string, password: string) {
  log.section("TEST 2: LOGIN");

  try {
    log.info(`Tentative de connexion avec: ${username}`);

    const response = await makeRequest("POST", "/auth/login", {
      username,
      password,
    });

    if (response.statusCode !== 200) {
      throw new Error(`Status ${response.statusCode}: ${response.data.error}`);
    }

    log.success("Connexion réussie !");
    log.info(`PlayerId: ${response.data.playerId}`);
    log.info(`Token reçu: ${response.data.token.substring(0, 20)}...`);

    return response.data.token;
  } catch (error: any) {
    log.error(`Erreur: ${error.message}`);
    throw error;
  }
}

/**
 * Test 3: Vérifier qu'on ne peut pas créer un doublon
 */
async function testDuplicateRegister(username: string, password: string) {
  log.section("TEST 3: DUPLICATE REGISTER (doit échouer)");

  try {
    log.info(`Tentative de création d'un compte existant: ${username}`);

    const response = await makeRequest("POST", "/auth/register", {
      username,
      password,
    });

    if (response.statusCode === 400) {
      // C'est ce qu'on veut : le serveur rejette le doublon
      log.success("Le serveur a bien rejeté le doublon");
      log.info(`Message: ${response.data.error}`);
      return true;
    } else if (response.statusCode === 200) {
      log.error("Le serveur a accepté un doublon (BUG)");
      return false;
    } else {
      log.error(`Le serveur a retourné un code inattendu: ${response.statusCode}`);
      return false;
    }
  } catch (error: any) {
    log.error(`Erreur réseau: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Vérifier qu'un mauvais mot de passe échoue
 */
async function testWrongPassword(username: string) {
  log.section("TEST 4: WRONG PASSWORD (doit échouer)");

  try {
    log.info(`Tentative de connexion avec un mauvais mot de passe`);

    const response = await makeRequest("POST", "/auth/login", {
      username,
      password: "wrongpassword",
    });

    if (response.statusCode === 400) {
      // C'est ce qu'on veut : le serveur rejette le mauvais mot de passe
      log.success("Le serveur a bien rejeté le mauvais mot de passe");
      log.info(`Message: ${response.data.error}`);
      return true;
    } else if (response.statusCode === 200) {
      log.error("Le serveur a accepté un mauvais mot de passe (BUG)");
      return false;
    } else {
      log.error(`Le serveur a retourné un code inattendu: ${response.statusCode}`);
      return false;
    }
  } catch (error: any) {
    log.error(`Erreur réseau: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Vérifier la route /health
 */
async function testHealth() {
  log.section("TEST 5: HEALTH CHECK");

  try {
    log.info("Vérification du endpoint /health");

    const response = await makeRequest("GET", "/health");

    if (response.statusCode !== 200) {
      throw new Error(`Status ${response.statusCode}`);
    }

    log.success("Health check OK");
    log.info(`Status: ${response.data.status}`);
    log.info(`MongoDB: ${response.data.mongo}`);

    return response.data.status === "healthy";
  } catch (error: any) {
    log.error(`Erreur: ${error.message}`);
    return false;
  }
}

/**
 * Lance tous les tests
 */
async function runAllTests() {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║          🔐 TEST AUTH SUITE - IdleRPG 🔐          ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

  log.info(`API URL: http://${API_HOST}:${API_PORT}`);
  log.info(`Démarrage des tests...\n`);

  let allPassed = true;

  try {
    // Test Health
    const healthOk = await testHealth();
    if (!healthOk) {
      log.error("Le serveur n'est pas healthy, arrêt des tests");
      process.exit(1);
    }

    // Test Register
    const registerData = await testRegister();

    // Test Login
    await testLogin(registerData.username, registerData.password);

    // Test Duplicate (doit échouer)
    const duplicateOk = await testDuplicateRegister(registerData.username, registerData.password);
    if (!duplicateOk) allPassed = false;

    // Test Wrong Password (doit échouer)
    const wrongPwOk = await testWrongPassword(registerData.username);
    if (!wrongPwOk) allPassed = false;

    // Résumé
    log.section("RÉSUMÉ");
    if (allPassed) {
      log.success("Tous les tests sont passés ! 🎉");
      log.info(`Compte test créé: ${registerData.username}`);
      log.info(`PlayerId: ${registerData.playerId}`);
    } else {
      log.warning("Certains tests ont échoué");
      process.exit(1);
    }
  } catch (error: any) {
    log.section("ÉCHEC CRITIQUE");
    log.error("Un test critique a échoué");
    console.error(error);
    process.exit(1);
  }
}

// Lancement
if (require.main === module) {
  runAllTests();
}
