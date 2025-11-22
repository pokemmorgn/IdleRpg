/**
 * Script de seed pour créer les PNJ nécessaires aux quêtes
 * Usage: npx ts-node server/src/scripts/seed-npcs.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import NPC from "../models/NPC"; // Assure-toi d'avoir un modèle NPC

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
};

const NPCS = [
  {
    npcId: "npc_instructor",
    name: "Maître Instructeur",
    zoneId: "test_zone",
    dialogueId: "dialogue_instructor",
    x: 0, y: 0, z: 0
  },
  {
    npcId: "npc_gatherer",
    name: "Collecteur de Baies",
    zoneId: "test_zone",
    dialogueId: "dialogue_gatherer",
    x: 3, y: 0, z: 1
  },
  {
    npcId: "npc_old_lady",
    name: "Vieille Dame",
    zoneId: "test_zone",
    dialogueId: "dialogue_old_lady",
    x: 2, y: 0, z: -1
  },
  {
    npcId: "npc_farmer",
    name: "Fermier",
    zoneId: "test_zone",
    dialogueId: "dialogue_farmer",
    x: -2, y: 0, z: 1
  }
];

async function seedNPCs() {
  try {
    log.info("Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);
    log.success("Connecté à MongoDB");

    for (const npc of NPCS) {
      log.info(`Suppression de '${npc.npcId}'...`);
      await NPC.deleteOne({ npcId: npc.npcId });

      log.info(`Création de '${npc.npcId}'...`);
      await NPC.create(npc);
      log.success(`→ ${npc.npcId} créé.`);
    }

    log.success("\n🎉 Tous les NPC ont été créés avec succès !");
    await mongoose.disconnect();
    log.success("Déconnecté de MongoDB");

    process.exit(0);

  } catch (err: any) {
    log.error(`Erreur: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedNPCs();
}
