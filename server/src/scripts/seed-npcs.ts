/**
 * Script de seed des NPC nécessaires aux quêtes
 * Usage: npx ts-node server/src/scripts/seed-npcs.ts
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
  success: (msg: string) =>
    console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) =>
    console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) =>
    console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg: string) =>
    console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

const SERVER_ID = "test"; // même serveur que tes quêtes

const NPCS = [
  {
    npcId: "npc_instructor",
    name: "Maître Instructeur",
    type: "quest_giver",
    faction: "AURION",
    zoneId: "start_zone",
    modelId: "npc_human_instructor_01",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 180, z: 0 },
    questIds: ["main_01", "main_02", "main_03"],
  },
  {
    npcId: "npc_gatherer",
    name: "Collecteur de Baies",
    type: "quest_giver",
    faction: "NEUTRAL",
    zoneId: "start_zone",
    modelId: "npc_human_gatherer_01",
    position: { x: 3, y: 0, z: 1 },
    rotation: { x: 0, y: 90, z: 0 },
    questIds: ["side_01", "side_02"],
  },
  {
    npcId: "npc_old_lady",
    name: "Vieille Dame",
    type: "dialogue",
    faction: "NEUTRAL",
    zoneId: "start_zone",
    modelId: "npc_human_oldlady_01",
    position: { x: 2, y: 0, z: -1 },
    rotation: { x: 0, y: 45, z: 0 },
    questIds: [],
  },
  {
    npcId: "npc_farmer",
    name: "Fermier",
    type: "quest_giver",
    faction: "NEUTRAL",
    zoneId: "start_zone",
    modelId: "npc_human_farmer_01",
    position: { x: -2, y: 0, z: 1 },
    rotation: { x: 0, y: 270, z: 0 },
    questIds: ["side_03"],
  }
];

async function seedNPCs() {
  try {
    log.info("Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);
    log.success("Connecté à MongoDB");

    for (const npc of NPCS) {
      log.info(`Suppression de '${npc.npcId}'...`);
      await NPC.deleteOne({ serverId: SERVER_ID, npcId: npc.npcId });

      log.info(`Création de '${npc.npcId}'...`);
      await NPC.create({
        ...npc,
        serverId: SERVER_ID,
        level: 1,
        interactionRadius: 3,
        isActive: true,
      });

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
