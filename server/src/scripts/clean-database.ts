/**
 * Script de nettoyage complet de la base de données
 * Usage: npx ts-node src/scripts/clean-database.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

async function cleanDatabase() {
  try {
    log.info("Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);
    log.success("Connecté à MongoDB");

    log.warning("⚠️  NETTOYAGE COMPLET DE LA BASE DE DONNÉES");
    log.warning("Toutes les données seront supprimées !");
    
    // Vérifier que la connexion DB existe
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error("Database connection not established");
    }

    // Supprimer toutes les collections
    const collections = await db.collections();
    
    for (const collection of collections) {
      const count = await collection.countDocuments();
      await collection.drop();
      log.info(`Collection "${collection.collectionName}" supprimée (${count} documents)`);
    }

    log.success("Base de données nettoyée avec succès !");

    await mongoose.disconnect();
    log.success("Déconnecté de MongoDB");

    log.info("\n📝 Prochaines étapes:");
    log.info("1. Relancer le seed: npx ts-node src/scripts/seed-servers.ts");
    log.info("2. Redémarrer le serveur: npm run dev");
    log.info("3. Lancer les tests");

    process.exit(0);

  } catch (error: any) {
    log.error(`Erreur: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanDatabase();
}
