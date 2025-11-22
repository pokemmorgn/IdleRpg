/**
 * Script de seed des talents
 * Usage : npx ts-node server/src/scripts/seed-talents.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Talent, { ITalent } from "../models/Talent"; // On importe le modèle et l'interface

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

// =========================================================
// 📌 DÉFINITION DE NOS TALENTS DE TEST
// =========================================================
const TALENTS_TO_SEED: Partial<ITalent>[] = [
  {
    talentId: "warrior_fury_critical_strike",
    name: "Critical Strike",
    description: "Increases your critical strike chance by 1.5% per rank.",
    icon: "icons/talents/warrior_critical_strike.png",
    treeId: "warrior_fury",
    maxRank: 5,
    requiredLevel: 5,
    prerequisites: [],
    scriptName: "critical_strike"
  },
  {
    // Exemple d'un second talent qui dépend du premier
    talentId: "warrior_fury_impale",
    name: "Impale",
    description: "Your critical strikes also cause a bleed for 10 damage per rank.",
    icon: "icons/talents/warrior_impale.png",
    treeId: "warrior_fury",
    maxRank: 3,
    requiredLevel: 10,
    prerequisites: [
        { type: 'talent', talentId: 'warrior_fury_critical_strike', rank: 2 }
    ],
    scriptName: "impale"
  },
  // =========================================================
  // 🆕 AJOUT : TALENT DE PRÊTRE
  // =========================================================
  {
    talentId: "priest_holy_smite",
    name: "Smite",
    description: "Increases your spell power by 2 per rank.",
    icon: "icons/talents/priest_smite.png",
    treeId: "priest_holy",
    maxRank: 5,
    requiredLevel: 5,
    prerequisites: [], // Pas de prérequis pour ce premier talent
    scriptName: "smite" // Doit correspondre au nom du fichier smite.ts
  }
];

// =========================================================
// 📌 SEED
// =========================================================
async function seedTalents() {
  try {
    console.log("🔌 Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);

    console.log("🧹 Nettoyage des anciens talents de test...");
    await Talent.deleteMany({ talentId: { $in: TALENTS_TO_SEED.map(t => t.talentId) } });

    console.log("🌱 Insertion des nouveaux talents...");
    for (const talentData of TALENTS_TO_SEED) {
      const talent = new Talent(talentData);
      await talent.save();
      console.log(`→ Talent ${talent.talentId} créé.`);
    }

    await mongoose.disconnect();
    console.log("🎉 Tous les talents ont été créés !");
    process.exit(0);

  } catch (err) {
    console.error("❌ ERREUR:", err);
    process.exit(1);
  }
}

if (require.main === module) seedTalents();
