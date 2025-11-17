/**
 * Script de migration pour le système multi-personnages
 * Supprime l'ancien index unique et nettoie les données
 * Usage: npx ts-node src/scripts/migrate-multi-characters.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import ServerProfile from "../models/ServerProfile";

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

async function migrate() {
  try {
    log.section("MIGRATION MULTI-PERSONNAGES");
    
    log.info("Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);
    log.success("Connecté à MongoDB");

    // Récupérer la collection native
    const collection = mongoose.connection.collection("serverprofiles");

    // ===== ÉTAPE 1: Lister les index existants =====
    log.section("ÉTAPE 1: LISTER LES INDEX EXISTANTS");
    
    const indexes = await collection.indexes();
    
    log.info("Index actuels:");
    indexes.forEach((index: any) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // ===== ÉTAPE 2: Supprimer l'ancien index unique =====
    log.section("ÉTAPE 2: SUPPRIMER L'ANCIEN INDEX");
    
    const oldIndexName = "playerId_1_serverId_1";
    
    try {
      const indexExists = indexes.some((idx: any) => idx.name === oldIndexName);
      
      if (indexExists) {
        log.warning(`Suppression de l'index "${oldIndexName}"...`);
        await collection.dropIndex(oldIndexName);
        log.success(`Index "${oldIndexName}" supprimé`);
      } else {
        log.info(`Index "${oldIndexName}" n'existe pas (déjà supprimé)`);
      }
    } catch (err: any) {
      if (err.code === 27) {
        log.info("Index déjà supprimé");
      } else {
        throw err;
      }
    }

    // ===== ÉTAPE 3: Vérifier les profils sans characterSlot =====
    log.section("ÉTAPE 3: VÉRIFIER LES PROFILS SANS characterSlot");
    
    const profilesWithoutSlot = await ServerProfile.countDocuments({
      characterSlot: { $exists: false }
    });
    
    if (profilesWithoutSlot > 0) {
      log.warning(`${profilesWithoutSlot} profil(s) sans characterSlot trouvé(s)`);
      log.info("Ces profils seront supprimés car incompatibles avec le nouveau système");
      
      await ServerProfile.deleteMany({
        characterSlot: { $exists: false }
      });
      
      log.success(`${profilesWithoutSlot} profil(s) supprimé(s)`);
    } else {
      log.success("Tous les profils ont un characterSlot");
    }

    // ===== ÉTAPE 4: Vérifier les doublons potentiels =====
    log.section("ÉTAPE 4: VÉRIFIER LES DOUBLONS");
    
    const duplicates = await ServerProfile.aggregate([
      {
        $group: {
          _id: {
            playerId: "$playerId",
            serverId: "$serverId",
            characterSlot: "$characterSlot"
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    if (duplicates.length > 0) {
      log.warning(`${duplicates.length} doublon(s) trouvé(s)`);
      
      for (const dup of duplicates) {
        log.warning(`Doublon: playerId=${dup._id.playerId}, serverId=${dup._id.serverId}, slot=${dup._id.characterSlot}`);
        
        // Garder le plus récent, supprimer les autres
        const profiles = await ServerProfile.find({
          playerId: dup._id.playerId,
          serverId: dup._id.serverId,
          characterSlot: dup._id.characterSlot
        }).sort({ createdAt: -1 });
        
        for (let i = 1; i < profiles.length; i++) {
          await profiles[i].deleteOne();
          log.info(`  Supprimé: ${profiles[i].characterName}`);
        }
      }
      
      log.success("Doublons nettoyés");
    } else {
      log.success("Aucun doublon trouvé");
    }

    // ===== ÉTAPE 5: Créer les nouveaux index =====
    log.section("ÉTAPE 5: CRÉER LES NOUVEAUX INDEX");
    
    log.info("Création des index via Mongoose...");
    
    // Forcer la synchronisation des index
    await ServerProfile.syncIndexes();
    
    log.success("Index synchronisés");

    // ===== ÉTAPE 6: Vérifier les nouveaux index =====
    log.section("ÉTAPE 6: VÉRIFIER LES NOUVEAUX INDEX");
    
    const newIndexes = await collection.indexes();
    
    log.info("Index après migration:");
    newIndexes.forEach((index: any) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    const hasNewIndex = newIndexes.some((idx: any) => 
      idx.name === "playerId_1_serverId_1_characterSlot_1"
    );
    
    if (hasNewIndex) {
      log.success("✅ Nouvel index unique créé avec succès");
    } else {
      log.error("❌ Nouvel index non trouvé");
    }

    // ===== RÉSUMÉ =====
    log.section("RÉSUMÉ DE LA MIGRATION");
    
    const totalProfiles = await ServerProfile.countDocuments();
    
    log.success("Migration terminée avec succès !");
    log.info(`Profils restants: ${totalProfiles}`);
    log.info("Le système multi-personnages est maintenant opérationnel");
    
    await mongoose.disconnect();
    log.success("Déconnecté de MongoDB");
    
    process.exit(0);

  } catch (error: any) {
    log.section("❌ ERREUR CRITIQUE");
    log.error(`Erreur: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}
