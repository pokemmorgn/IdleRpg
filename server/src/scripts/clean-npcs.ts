/**
 * Script de nettoyage des NPC
 * Supprime tous les NPC de tous les serveurs
 * Usage: npx ts-node src/scripts/clean-npcs.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import NPC from "../models/NPC";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

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
  section: (msg: string) => console.log(`\n${colors.cyan}${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}${colors.reset}\n`),
};

async function cleanNPCs() {
  try {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           🧹 NETTOYAGE DES NPC - IdleRPG 🧹               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

    log.info("Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);
    log.success("Connecté à MongoDB");

    // ===== ÉTAPE 1: Compter les NPC existants =====
    log.section("ÉTAPE 1: ÉTAT ACTUEL");
    
    const totalNPCs = await NPC.countDocuments();
    log.info(`Total de NPC dans la base: ${totalNPCs}`);

    if (totalNPCs === 0) {
      log.info("Aucun NPC à supprimer !");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Compter par serveur
    const servers = await NPC.distinct("serverId");
    log.info(`NPC répartis sur ${servers.length} serveur(s):`);
    
    for (const serverId of servers) {
      const count = await NPC.countDocuments({ serverId });
      const zones = await NPC.distinct("zoneId", { serverId });
      const zonesCount = zones.filter(z => z !== null).length;
      console.log(`  - ${serverId}: ${count} NPC (${zonesCount} zone(s))`);
    }

    // ===== ÉTAPE 2: Lister quelques NPC =====
    log.section("ÉTAPE 2: APERÇU DES NPC");
    
    const sampleNPCs = await NPC.find().limit(10).select("npcId name serverId zoneId type");
    
    if (sampleNPCs.length > 0) {
      log.info("Exemples de NPC qui seront supprimés:");
      sampleNPCs.forEach(npc => {
        const zone = npc.zoneId ? ` [${npc.zoneId}]` : "";
        console.log(`  - ${npc.npcId}: ${npc.name} (${npc.serverId}${zone}) - ${npc.type}`);
      });
      
      if (totalNPCs > 10) {
        console.log(`  ... et ${totalNPCs - 10} autre(s) NPC`);
      }
    }

    // ===== ÉTAPE 3: Confirmation =====
    log.section("ÉTAPE 3: CONFIRMATION");
    
    log.warning(`⚠️  ATTENTION: ${totalNPCs} NPC vont être supprimés !`);
    log.warning("Cette action est IRRÉVERSIBLE !");
    
    console.log("");
    log.info("Pour continuer, relance le script avec l'argument --confirm:");
    log.info("npx ts-node src/scripts/clean-npcs.ts --confirm");
    
    // Vérifier si l'argument --confirm est présent
    const hasConfirm = process.argv.includes("--confirm");
    
    if (!hasConfirm) {
      log.info("\nAnnulation du nettoyage (sécurité)");
      await mongoose.disconnect();
      process.exit(0);
    }

    // ===== ÉTAPE 4: Suppression =====
    log.section("ÉTAPE 4: SUPPRESSION DES NPC");
    
    log.warning("Suppression en cours...");
    
    const result = await NPC.deleteMany({});
    
    log.success(`${result.deletedCount} NPC supprimé(s) avec succès !`);

    // ===== ÉTAPE 5: Vérification =====
    log.section("ÉTAPE 5: VÉRIFICATION");
    
    const remainingNPCs = await NPC.countDocuments();
    
    if (remainingNPCs === 0) {
      log.success("La collection NPCs est maintenant vide !");
    } else {
      log.error(`Il reste encore ${remainingNPCs} NPC (erreur inattendue)`);
    }

    await mongoose.disconnect();
    log.success("Déconnecté de MongoDB");

    // ===== RÉSUMÉ =====
    log.section("RÉSUMÉ");
    
    log.success("Nettoyage terminé avec succès !");
    log.info(`NPC supprimés: ${result.deletedCount}`);
    log.info("La base de données est prête pour de nouveaux NPC");

    process.exit(0);

  } catch (error: any) {
    log.section("❌ ERREUR CRITIQUE");
    log.error(`Erreur: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanNPCs();
}
