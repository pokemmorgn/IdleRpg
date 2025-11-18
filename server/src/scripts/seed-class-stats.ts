import mongoose from "mongoose";
import dotenv from "dotenv";
import ClassStats from "../models/ClassStats";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

/**
 * Script de seed pour créer les 6 classes de base
 * 
 * Commande: npm run seed:classes
 */

const classesData = [
  // ========================================
  // WARRIOR - Tank / Melee DPS
  // ========================================
  {
    class: "warrior",
    displayName: "Guerrier",
    description: "Tank robuste avec beaucoup de HP et défense. Génère de la rage en combat pour utiliser des compétences puissantes.",
    resourceType: "rage",
    baseMoveSpeed: 5.0,
    baseStats: {
      strength: 20,      // AP = 50
      agility: 12,       // AS = 2.26s, Evasion = 6%
      intelligence: 5,   // SP = 20 (inutile)
      endurance: 25,     // HP = 225, DR = 12.5%
      spirit: 5          // Mana Regen = 15 (inutile pour warrior)
    },
    statsPerLevel: {
      strength: 2,       // Focus physique
      agility: 1,
      intelligence: 0,
      endurance: 3,      // Très tanky
      spirit: 0
    },
    isActive: true
  },
  
  // ========================================
  // MAGE - Ranged Magical DPS
  // ========================================
  {
    class: "mage",
    displayName: "Mage",
    description: "DPS magique à distance avec burst élevé. Fragile mais dégâts dévastateurs.",
    resourceType: "mana",
    baseMoveSpeed: 5.0,
    baseStats: {
      strength: 5,       // AP = 20 (inutile)
      agility: 10,       // AS = 2.3s, Evasion = 5%
      intelligence: 30,  // SP = 70, Mana = 250
      endurance: 12,     // HP = 160, DR = 6%
      spirit: 20         // Mana Regen = 45
    },
    statsPerLevel: {
      strength: 0,
      agility: 1,
      intelligence: 4,   // Focus magie
      endurance: 1,
      spirit: 2
    },
    isActive: true
  },
  
  // ========================================
  // PRIEST - Healer / Support
  // ========================================
  {
    class: "priest",
    displayName: "Prêtre",
    description: "Healer et support avec soins puissants et buffs d'équipe. Magie divine.",
    resourceType: "mana",
    baseMoveSpeed: 5.0,
    baseStats: {
      strength: 5,       // AP = 20 (inutile)
      agility: 8,        // AS = 2.34s, Evasion = 4%
      intelligence: 28,  // SP = 66, Mana = 240
      endurance: 14,     // HP = 170, DR = 7%
      spirit: 25         // Mana Regen = 55
    },
    statsPerLevel: {
      strength: 0,
      agility: 0.5,
      intelligence: 3.5, // Focus soins
      endurance: 1.5,
      spirit: 3          // Beaucoup de regen
    },
    isActive: true
  },
  
  // ========================================
  // PALADIN - Tank / Healer / Hybrid
  // ========================================
  {
    class: "paladin",
    displayName: "Paladin",
    description: "Hybride polyvalent tank/healer/dps. Armure lourde et magie sacrée.",
    resourceType: "mana",
    baseMoveSpeed: 5.0,
    baseStats: {
      strength: 16,      // AP = 42
      agility: 8,        // AS = 2.34s, Evasion = 4%
      intelligence: 18,  // SP = 46, Mana = 190
      endurance: 20,     // HP = 200, DR = 10%
      spirit: 15         // Mana Regen = 35
    },
    statsPerLevel: {
      strength: 1.5,
      agility: 0.5,
      intelligence: 2,
      endurance: 2,      // Solide
      spirit: 1.5
    },
    isActive: true
  },
  
  // ========================================
  // ROGUE - Melee DPS Burst
  // ========================================
  {
    class: "rogue",
    displayName: "Voleur",
    description: "DPS mélée agile avec burst élevé. Furtivité, combos rapides et critiques.",
    resourceType: "energy",
    baseMoveSpeed: 5.5, // Plus rapide
    baseStats: {
      strength: 16,      // AP = 42
      agility: 26,       // AS = 1.98s, Evasion = 13%
      intelligence: 5,   // SP = 20 (inutile)
      endurance: 14,     // HP = 170, DR = 7%
      spirit: 5          // Mana Regen = 15 (inutile)
    },
    statsPerLevel: {
      strength: 2,
      agility: 3,        // Focus AGI
      intelligence: 0,
      endurance: 1,
      spirit: 0
    },
    isActive: true
  },
  
  // ========================================
  // DRUID - Hybrid (DPS / Healer / Tank)
  // ========================================
  {
    class: "druid",
    displayName: "Druide",
    description: "Hybride ultime avec transformation. DPS/Healer/Tank selon la forme. Magie nature.",
    resourceType: "mana", // Par défaut en forme humaine
    baseMoveSpeed: 5.0,
    baseStats: {
      strength: 12,      // AP = 34
      agility: 14,       // AS = 2.22s, Evasion = 7%
      intelligence: 20,  // SP = 50, Mana = 200
      endurance: 16,     // HP = 180, DR = 8%
      spirit: 18         // Mana Regen = 41
    },
    statsPerLevel: {
      strength: 1,
      agility: 1.5,
      intelligence: 2.5,
      endurance: 1.5,
      spirit: 2
    },
    isActive: true
  }
];

/**
 * Seed les classes dans MongoDB
 */
async function seedClasses() {
  try {
    console.log("🌱 Démarrage du seed des classes...");
    
    // Connexion à MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connecté à MongoDB");
    
    // Supprimer toutes les classes existantes
    const deleteResult = await ClassStats.deleteMany({});
    console.log(`🗑️  ${deleteResult.deletedCount} classe(s) supprimée(s)`);
    
    // Créer les nouvelles classes
    const createdClasses = await ClassStats.insertMany(classesData);
    console.log(`✅ ${createdClasses.length} classe(s) créée(s):`);
    
    // Afficher un résumé
    for (const cls of createdClasses) {
      console.log(`   - ${cls.displayName} (${cls.class})`);
      console.log(`     Resource: ${cls.resourceType}`);
      console.log(`     Base Stats: STR=${cls.baseStats.strength}, AGI=${cls.baseStats.agility}, INT=${cls.baseStats.intelligence}, END=${cls.baseStats.endurance}, SPI=${cls.baseStats.spirit}`);
      console.log(`     Per Level: STR=${cls.statsPerLevel.strength}, AGI=${cls.statsPerLevel.agility}, INT=${cls.statsPerLevel.intelligence}, END=${cls.statsPerLevel.endurance}, SPI=${cls.statsPerLevel.spirit}`);
      console.log("");
    }
    
    console.log("🎉 Seed terminé avec succès !");
    
  } catch (err: any) {
    console.error("❌ Erreur lors du seed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Déconnecté de MongoDB");
    process.exit(0);
  }
}

// Exécuter le seed
seedClasses();
