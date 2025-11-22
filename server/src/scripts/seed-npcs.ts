/**
 * Script de seed des NPC nécessaires aux quêtes
 * Usage: npx ts-node server/src/scripts/seed-npcs.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import NPC from "../models/NPC";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

const SERVER_ID = "test";

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
    console.log("Connexion MongoDB...");
    await mongoose.connect(MONGO_URI);

    for (const npc of NPCS) {
      await NPC.deleteOne({ serverId: SERVER_ID, npcId: npc.npcId });
      await NPC.create({
        ...npc,
        serverId: SERVER_ID,
        level: 1,
        interactionRadius: 3,
        isActive: true,
      });
      console.log(`→ NPC ${npc.npcId} créé.`);
    }

    await mongoose.disconnect();
    console.log("Tous les NPC ont été créés !");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

if (require.main === module) seedNPCs();
