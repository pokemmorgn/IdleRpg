/**
 * Script de seed pour créer plusieurs quêtes principales et secondaires
 * Usage: npx ts-node server/src/scripts/seed-main-and-side-quests.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Quest from "../models/Quest";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

async function seedQuests() {
  try {
    console.log("Connexion MongoDB...");
    await mongoose.connect(MONGO_URI);

    const quests = [

      // 🌟 QUÊTES PRINCIPALES
      {
        questId: "main_01",
        name: "Premiers Pas",
        description: "Parlez à l'instructeur pour commencer votre aventure.",
        giverNpcId: "npc_instructor",
        type: "main",
        requiredLevel: 1,
        prerequisiteQuestId: "",
        zoneId: "start_zone",
        isActive: true,
        isOneShot: true,
        objectives: [
          { objectiveId: "talk_instructor", type: "talk", npcId: "npc_instructor" }
        ],
        rewards: { xp: 50, gold: 0, items: [], reputation: [] },
      },

      {
        questId: "main_02",
        name: "Chasser le Loup",
        description: "Tuez un loup menaçant près du village.",
        giverNpcId: "npc_instructor",
        type: "main",
        requiredLevel: 1,
        prerequisiteQuestId: "main_01",
        zoneId: "start_zone",
        isActive: true,
        isOneShot: true,
        objectives: [
          {
            objectiveId: "kill_wolf",
            type: "kill",
            count: 1,
            enemyType: "wolf_basic",
          },
        ],
        rewards: { xp: 100, gold: 10, items: [], reputation: [] },
      },

      {
        questId: "main_03",
        name: "Explorer le Camp",
        description: "Explorez le campement à l'est du village.",
        giverNpcId: "npc_instructor",
        type: "main",
        requiredLevel: 2,
        prerequisiteQuestId: "main_02",
        zoneId: "start_zone",
        isActive: true,
        isOneShot: true,
        objectives: [
          { objectiveId: "explore_camp", type: "explore", locationId: "camp_east" }
        ],
        rewards: { xp: 150, gold: 20, items: [], reputation: [] },
      },

      // ⭐ QUÊTES SECONDAIRES
      {
        questId: "side_01",
        name: "Collecte de Baies",
        description: "Collectez des baies dans la clairière.",
        giverNpcId: "npc_gatherer",
        type: "secondary",
        requiredLevel: 1,
        prerequisiteQuestId: "",
        zoneId: "start_zone",
        isActive: true,
        isOneShot: true,
        objectives: [
          {
            objectiveId: "collect_berries",
            type: "collect",
            resourceId: "berry",
            count: 5,
          },
        ],
        rewards: { xp: 20, gold: 20, items: [], reputation: [] },
      },

      {
        questId: "side_02",
        name: "La Vieille Dame du Village",
        description: "Parlez à la vieille dame au centre du village.",
        giverNpcId: "npc_gatherer",
        type: "secondary",
        requiredLevel: 1,
        prerequisiteQuestId: "side_01",
        zoneId: "start_zone",
        isActive: true,
        isOneShot: true,
        objectives: [
          { objectiveId: "talk_old_lady", type: "talk", npcId: "npc_old_lady" },
        ],
        rewards: { xp: 30, gold: 40, items: [], reputation: [] },
      },

      {
        questId: "side_03",
        name: "Les Rats de la Grange",
        description: "Éliminez les rats dans la vieille grange.",
        giverNpcId: "npc_farmer",
        type: "secondary",
        requiredLevel: 1,
        prerequisiteQuestId: "",
        zoneId: "start_zone",
        isActive: true,
        isOneShot: true,
        objectives: [
          {
            objectiveId: "kill_rats",
            type: "kill",
            enemyType: "rat",
            count: 3,
          },
        ],
        rewards: { xp: 60, gold: 15, items: [], reputation: [] },
      }
    ];

    for (const q of quests) {
      await Quest.deleteOne({ questId: q.questId });
      await Quest.create(q);
      console.log(`→ ${q.questId} créée.`);
    }

    await mongoose.disconnect();
    console.log("Toutes les quêtes ont été créées !");
    process.exit(0);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) seedQuests();
