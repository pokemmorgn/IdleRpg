/**
 * Script de seed pour créer les serveurs logiques
 * Usage: npx ts-node src/scripts/seed-servers.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Server from "../models/Server";
import { generateServersConfig, CLUSTERS } from "../config/servers.config";

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

    log.info("Génération de la configuration des serveurs...");
    const serversConfig = generateServersConfig();
    
    log.info(`Création de ${serversConfig.length} serveurs répartis sur ${CLUSTERS.length} clusters...`);
    
    for (const serverData of serversConfig) {
      await Server.create({
        serverId: serverData.serverId,
        name: serverData.name,
        cluster: serverData.cluster,
        status: serverData.status,
        capacity: serverData.capacity,
        currentPlayers: 0,
        openedAt: serverData.openedAt
      });
      log.success(`${serverData.serverId} - ${serverData.name} (Cluster ${serverData.cluster})`);
    }

    log.success(`\n🎉 ${serversConfig.length} serveurs créés avec succès !`);

    // Afficher la liste groupée par cluster
    console.log("\n" + colors.cyan + "Liste des serveurs par cluster :" + colors.reset);
    const allServers = await Server.find().sort({ cluster: 1, serverId: 1 });
    
    let currentCluster = -1;
    for (const s of allServers) {
      if (s.cluster !== currentCluster) {
        currentCluster = s.cluster;
        const clusterInfo = CLUSTERS.find(c => c.clusterId === currentCluster);
        console.log(`\n${colors.yellow}Cluster ${currentCluster} (${clusterInfo?.servers.length || 0} serveurs):${colors.reset}`);
      }
      console.log(`  ${s.serverId} - ${s.name} (${s.status})`);
    }

    // Afficher les statistiques
    console.log("\n" + colors.cyan + "Statistiques :" + colors.reset);
    for (const cluster of CLUSTERS) {
      const count = await Server.countDocuments({ cluster: cluster.clusterId });
      console.log(`  Cluster ${cluster.clusterId}: ${count}/${cluster.maxServers} serveurs`);
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
