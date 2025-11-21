import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Quest from "../models/Quest";

// 🔥 Charge le .env à la racine du projet
dotenv.config({
  path: path.resolve(__dirname, "../../../.env")
});

async function seed() {
  console.log("🔌 MONGO_URI:", process.env.MONGO_URI);

  if (!process.env.MONGO_URI) {
    console.error("❌ ERREUR: MONGO_URI introuvable dans .env !");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("📌 Connexion Mongo OK");

  const quest = {
    questId: "quest_test_01",
    name: "Quête du Loup Test",
    description: "Va tuer un loup de test.",
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
        enemyType: "test_wolf"
      }
    ],

    rewards: {
      xp: 100,
      gold: 50,
      items: [],
      reputation: []
    }
  };

  await Quest.deleteOne({ questId: "quest_test_01" });
  await Quest.create(quest);

  console.log("✅ Quête test créée dans MongoDB !");
  process.exit(0);
}

seed().catch(err => console.error("❌ SEED ERROR:", err));
