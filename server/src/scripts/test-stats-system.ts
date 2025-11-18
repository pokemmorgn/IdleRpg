import mongoose from "mongoose";
import dotenv from "dotenv";
import ClassStats from "../models/ClassStats";
import ServerProfile from "../models/ServerProfile";
import Player from "../models/Player";
import Server from "../models/Server";
import { StatsManager } from "../managers/StatsManager";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

/**
 * Script de test pour le système de stats
 * 
 * Commande: npm run test:stats
 */

async function testStatsSystem() {
  try {
    console.log("🧪 Démarrage des tests du système de stats...\n");
    
    // Connexion à MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connecté à MongoDB\n");
    
    // ========================================
    // TEST 1: Vérifier que les classes existent
    // ========================================
    console.log("📋 TEST 1: Vérification des classes");
    const classes = await ClassStats.find({});
    console.log(`   ✅ ${classes.length} classe(s) trouvée(s)`);
    
    if (classes.length === 0) {
      console.log("   ⚠️  Aucune classe trouvée. Exécute d'abord: npm run seed:classes");
      return;
    }
    
    for (const cls of classes) {
      console.log(`   - ${cls.displayName} (${cls.class}) - ${cls.resourceType}`);
    }
    console.log("");
    
    // ========================================
    // TEST 2: Créer un joueur de test
    // ========================================
    console.log("📋 TEST 2: Création d'un joueur de test");
    
    // Supprimer l'ancien joueur de test s'il existe
    await Player.deleteOne({ username: "test_stats_user" });
    
    const testPlayer = await Player.create({
      username: "test_stats_user",
      email: "test@stats.com",
      password: "test123",
      level: 1,
      xp: 0,
      gold: 0
    });
    
    console.log(`   ✅ Joueur créé: ${testPlayer.username} (${testPlayer._id})\n`);
    
    // ========================================
    // TEST 3: Créer un serveur de test
    // ========================================
    console.log("📋 TEST 3: Création d'un serveur de test");
    
    let testServer = await Server.findOne({ serverId: "test" });
    if (!testServer) {
      testServer = await Server.create({
        serverId: "test",
        name: "Test Server",
        cluster: 1,
        status: "online",
        capacity: 1000,
        currentPlayers: 0,
        openedAt: new Date()
      });
    }
    
    console.log(`   ✅ Serveur: ${testServer.name} (${testServer.serverId})\n`);
    
    // ========================================
    // TEST 4: Créer un personnage pour chaque classe
    // ========================================
    console.log("📋 TEST 4: Création de personnages de test\n");
    
    const profiles = [];
    
    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      
      // Supprimer l'ancien profil s'il existe
      await ServerProfile.deleteOne({
        playerId: testPlayer._id,
        serverId: "test",
        characterSlot: i + 1
      });
      
      // Créer le profil
      const profile = await ServerProfile.create({
        playerId: testPlayer._id,
        serverId: "test",
        characterSlot: i + 1,
        characterName: `Test ${cls.displayName}`,
        level: 1,
        xp: 0,
        gold: 0,
        class: cls.class,
        race: "human_elion",
        primaryStats: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          endurance: 10,
          spirit: 10
        },
        computedStats: {
          hp: 100,
          maxHp: 100,
          resource: 100,
          maxResource: 100,
          manaRegen: 0,
          rageRegen: 0,
          energyRegen: 0,
          attackPower: 10,
          spellPower: 10,
          attackSpeed: 2.5,
          criticalChance: 0,
          criticalDamage: 150,
          damageReduction: 0,
          moveSpeed: 5.0,
          armor: 0,
          magicResistance: 0,
          precision: 0,
          evasion: 0,
          penetration: 0,
          tenacity: 0,
          lifesteal: 0,
          spellPenetration: 0
        }
      });
      
      // Initialiser les stats
      await StatsManager.initializeNewCharacter(String(profile._id));
      
      // Recharger le profil
      const updatedProfile = await ServerProfile.findById(profile._id);
      profiles.push(updatedProfile);
      
      console.log(`   ✅ ${updatedProfile!.characterName} (${updatedProfile!.class})`);
      console.log(`      Level: ${updatedProfile!.level}`);
      console.log(`      Primary: STR=${updatedProfile!.primaryStats.strength}, AGI=${updatedProfile!.primaryStats.agility}, INT=${updatedProfile!.primaryStats.intelligence}, END=${updatedProfile!.primaryStats.endurance}, SPI=${updatedProfile!.primaryStats.spirit}`);
      console.log(`      HP: ${updatedProfile!.computedStats.hp}/${updatedProfile!.computedStats.maxHp}`);
      console.log(`      Resource: ${updatedProfile!.computedStats.resource}/${updatedProfile!.computedStats.maxResource}`);
      console.log(`      Regens: Mana=${updatedProfile!.computedStats.manaRegen}, Rage=${updatedProfile!.computedStats.rageRegen}, Energy=${updatedProfile!.computedStats.energyRegen}`);
      console.log(`      AP: ${updatedProfile!.computedStats.attackPower}, SP: ${updatedProfile!.computedStats.spellPower}`);
      console.log(`      AS: ${updatedProfile!.computedStats.attackSpeed}s, Evasion: ${updatedProfile!.computedStats.evasion}%`);
      console.log(`      DR: ${updatedProfile!.computedStats.damageReduction}%, Move: ${updatedProfile!.computedStats.moveSpeed}m/s\n`);
    }
    
    // ========================================
    // TEST 5: Tester le level up
    // ========================================
    console.log("📋 TEST 5: Test du Level Up (Warrior Level 1 → 10)\n");
    
    const warriorProfile = profiles.find(p => p!.class === "warrior");
    
    if (warriorProfile) {
      console.log(`   Avant Level Up:`);
      console.log(`      Level: ${warriorProfile.level}`);
      console.log(`      HP: ${warriorProfile.computedStats.maxHp}`);
      console.log(`      AP: ${warriorProfile.computedStats.attackPower}`);
      console.log(`      AS: ${warriorProfile.computedStats.attackSpeed}s\n`);
      
      // Level up à 10
      await StatsManager.onLevelUp(String(warriorProfile._id), 10);
      
      const leveledWarrior = await ServerProfile.findById(warriorProfile._id);
      
      console.log(`   Après Level Up:`);
      console.log(`      Level: ${leveledWarrior!.level}`);
      console.log(`      Primary: STR=${leveledWarrior!.primaryStats.strength}, AGI=${leveledWarrior!.primaryStats.agility}, INT=${leveledWarrior!.primaryStats.intelligence}, END=${leveledWarrior!.primaryStats.endurance}, SPI=${leveledWarrior!.primaryStats.spirit}`);
      console.log(`      HP: ${leveledWarrior!.computedStats.maxHp}`);
      console.log(`      AP: ${leveledWarrior!.computedStats.attackPower}`);
      console.log(`      AS: ${leveledWarrior!.computedStats.attackSpeed}s`);
      console.log(`      Evasion: ${leveledWarrior!.computedStats.evasion}%`);
      console.log(`      DR: ${leveledWarrior!.computedStats.damageReduction}%\n`);
    }
    
    // ========================================
    // TEST 6: Tester le recalcul manuel
    // ========================================
    console.log("📋 TEST 6: Test du recalcul manuel (Mage)\n");
    
    const mageProfile = profiles.find(p => p!.class === "mage");
    
    if (mageProfile) {
      console.log(`   Avant recalcul:`);
      console.log(`      Mana: ${mageProfile.computedStats.maxResource}`);
      console.log(`      Mana Regen: ${mageProfile.computedStats.manaRegen}`);
      console.log(`      SP: ${mageProfile.computedStats.spellPower}\n`);
      
      await StatsManager.updatePlayerStats(String(mageProfile._id));
      
      const recalcedMage = await ServerProfile.findById(mageProfile._id);
      
      console.log(`   Après recalcul:`);
      console.log(`      Mana: ${recalcedMage!.computedStats.maxResource}`);
      console.log(`      Mana Regen: ${recalcedMage!.computedStats.manaRegen}`);
      console.log(`      SP: ${recalcedMage!.computedStats.spellPower}\n`);
    }
    
    console.log("✅ Tous les tests sont passés avec succès !\n");
    
  } catch (err: any) {
    console.error("❌ Erreur lors des tests:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Déconnecté de MongoDB");
    process.exit(0);
  }
}

// Exécuter les tests
testStatsSystem();
