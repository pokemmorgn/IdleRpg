/**
 * Script de seed pour créer les serveurs logiques
 * Usage: npx ts-node src/scripts/seed-servers.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Server from "../models/Server";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

const servers = [
  // Europe
  {
    serverId: "eu-1",
    name: "Europe - Server 1",
    region: "EU",
    status: "online",
    capacity: 10000,
    currentPlayers: 0,
  },
  {
    serverId: "eu-2",
    name: "Europe - Server 2",
    region: "EU",
    status: "online",
    capacity: 10000,
    currentPlayers: 0,
  },
  // North America
  {
    serverId: "na-1",
    name: "North America - Server 1",
    region: "NA",
    status: "online",
    capacity: 10000,
    currentPlayers: 0,
  },
  {
    serverId: "na-2",
    name: "North America - Server 2",
    region: "NA",
    status: "online",
    capacity: 10000,
    currentPlayers: 0,
  },
  // Asia
  {
    serverId: "asia-1",
    name: "Asia - Server 1",
    region: "ASIA",
    status: "online",
    capacity: 10000,
    currentPlayers: 0,
  },
  {
    serverId: "asia-2",
    name: "Asia - Server 2",
    region: "ASIA",
    status: "online",
    capacity: 10000,
    currentPlayers: 0,
  },
];

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

async function seedServers() {
  try {
    log.info("Connexion à MongoDB...");
    await mongoose.connect(MONGO_URI);
    log.success("Connecté à MongoDB");

    log.info("Suppression des anciens serveurs...");
    await Server.deleteMany({});
    log.success("Anciens serveurs supprimés");

    log.info("Création des 6 serveurs...");
    
    for (const serverData of servers) {
      await Server.create(serverData);
      log.success(`${serverData.serverId} - ${serverData.name}`);
    }

    log.success(`\n🎉 ${servers.length} serveurs créés avec succès !`);

    // Afficher la liste
    console.log("\n" + colors.cyan + "Liste des serveurs :" + colors.reset);
    const allServers = await Server.find().sort({ region: 1, serverId: 1 });
    
    let currentRegion = "";
    for (const s of allServers) {
      if (s.region !== currentRegion) {
        currentRegion = s.region;
        console.log(`\n${colors.yellow}${currentRegion}:${colors.reset}`);
      }
      console.log(`  ${s.serverId} - ${s.name} (${s.status})`);
    }

    await mongoose.disconnect();
    log.success("\nDéconnecté de MongoDB");
    process.exit(0);

  } catch (error: any) {
    log.error(`Erreur: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedServers();
}
