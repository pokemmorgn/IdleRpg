import mongoose from "mongoose";
import Quest from "../models/Quest";
import dotenv from "dotenv";

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI!);

  console.log("📌 Connexion Mongo OK");

  const q = {
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
  await Quest.create(q);

  console.log("✅ Quête test créée en DB !");
  process.exit(0);
}

seed().catch(err => console.error(err));
