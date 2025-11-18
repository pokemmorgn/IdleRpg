/**
 * Script de nettoyage des dialogues
 * Supprime tous les dialogues
 * Usage: npx ts-node src/scripts/clean-dialogues.ts --confirm
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Dialogue from "../models/Dialogue";

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

async function cleanDialogues() {
  try {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        🧹 NETTOYAGE DES DIALOGUES - IdleRPG 🧹            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

    log.info("Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);
    log.success("Connecté à MongoDB");

    // Compter les dialogues
    log.section("ÉTAT ACTUEL");
    
    const totalDialogues = await Dialogue.countDocuments();
    log.info(`Total de dialogues dans la base: ${totalDialogues}`);

    if (totalDialogues === 0) {
      log.info("Aucun dialogue à supprimer !");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Lister quelques dialogues
    const sampleDialogues = await Dialogue.find().limit(10).select("dialogueId npcId description");
    
    if (sampleDialogues.length > 0) {
      log.info("Exemples de dialogues qui seront supprimés:");
      sampleDialogues.forEach(dialogue => {
        const npc = dialogue.npcId ? ` (${dialogue.npcId})` : "";
        console.log(`  - ${dialogue.dialogueId}${npc}: ${dialogue.description}`);
      });
      
      if (totalDialogues > 10) {
        console.log(`  ... et ${totalDialogues - 10} autre(s) dialogue(s)`);
      }
    }

    // Confirmation
    log.section("CONFIRMATION");
    
    log.warning(`⚠️  ATTENTION: ${totalDialogues} dialogue(s) vont être supprimés !`);
    log.warning("Cette action est IRRÉVERSIBLE !");
    
    console.log("");
    log.info("Pour continuer, relance le script avec l'argument --confirm:");
    log.info("npx ts-node src/scripts/clean-dialogues.ts --confirm");
    
    const hasConfirm = process.argv.includes("--confirm");
    
    if (!hasConfirm) {
      log.info("\nAnnulation du nettoyage (sécurité)");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Suppression
    log.section("SUPPRESSION DES DIALOGUES");
    
    log.warning("Suppression en cours...");
    
    const result = await Dialogue.deleteMany({});
    
    log.success(`${result.deletedCount} dialogue(s) supprimé(s) avec succès !`);

    // Vérification
    log.section("VÉRIFICATION");
    
    const remainingDialogues = await Dialogue.countDocuments();
    
    if (remainingDialogues === 0) {
      log.success("La collection Dialogues est maintenant vide !");
    } else {
      log.error(`Il reste encore ${remainingDialogues} dialogue(s) (erreur inattendue)`);
    }

    await mongoose.disconnect();
    log.success("Déconnecté de MongoDB");

    // Résumé
    log.section("RÉSUMÉ");
    
    log.success("Nettoyage terminé avec succès !");
    log.info(`Dialogues supprimés: ${result.deletedCount}`);
    log.info("La base de données est prête pour de nouveaux dialogues");

    process.exit(0);

  } catch (error: any) {
    log.section("❌ ERREUR CRITIQUE");
    log.error(`Erreur: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanDialogues();
}
