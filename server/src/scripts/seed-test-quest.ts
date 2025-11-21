/**
 * Script de seed pour créer la quête de test
 * Usage: npx ts-node server/src/scripts/seed-test-quest.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Quest from "../models/Quest";

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
  success: (msg: string) =>
    console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) =>
    console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) =>
    console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg: string) =>
    console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

async function seedTestQuest() {
  try {
    log.info("Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);
    log.success("Connecté à MongoDB");

    const questId = "quest_test_01";

    log.info(`Suppression de l'ancienne quête '${questId}'...`);
    await Quest.deleteOne({ questId });
    log.success("Ancienne quête supprimée");

    log.info("Création de la quête de test...");

    const quest = await Quest.create({
      questId,
      name: "Quête du Loup Test",
      description: "Va tuer un loup de test pour le maître des quêtes.",
      giverNpcId: "npc_test_01",
      type: "secondary",
      requiredLevel: 1,
      prerequisiteQuestId: "",
      zoneId: "test_zone",
      isActive: true,
      isOneShot: true,

      objectives: [
        {
          objectiveId: "kill_wolf_obj",
          type: "kill",
          count: 1,
          enemyType: "test_wolf",
        },
      ],

      rewards: {
        xp: 100,
        gold: 50,
        items: [],
        reputation: [],
      },
    });

    log.success(`Quête '${questId}' créée avec succès !`);
    console.log(colors.cyan + "\nDétails de la quête :" + colors.reset);
    console.log(quest);

    await mongoose.disconnect();
    log.success("\nDéconnecté de MongoDB");
    process.exit(0);

  } catch (error: any) {
    log.error(`Erreur: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedTestQuest();
}
