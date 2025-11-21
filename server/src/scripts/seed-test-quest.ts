import mongoose from "mongoose";
import dotenv from "dotenv";
import Quest from "../models/Quest"; // ton modèle officiel

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("🌱 Connected to DB");

  const questId = "quest_test_01";

  // Si elle existe déjà on supprime
  await Quest.deleteOne({ questId });

  await Quest.create({
    questId: "quest_test_01",
    name: "Quête du Loup Test",
    description: "Va tuer un loup de test pour le maître des quêtes.",
    giverNpcId: "npc_test_01",
    type: "secondary",
    requiredLevel: 1,
    prerequisiteQuestId: "",
    zoneId: "test_zone",
    isOneShot: true,
    isActive: true,

    objectives: [
      {
        objectiveId: "kill_wolf_obj",
        type: "kill",
        count: 1,
        enemyType: "test_wolf"
      }
    ],

    rewards: {
      xp: 100,
      gold: 50,
      items: [],
      reputation: []
    }
  });

  console.log("✅ Test quest seeded into DB !");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
