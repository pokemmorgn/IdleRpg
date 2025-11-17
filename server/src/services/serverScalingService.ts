/**
 * Service de gestion de l'auto-scaling des serveurs
 * Crée automatiquement de nouveaux serveurs quand le seuil est atteint
 */

import Server from "../models/Server";
import { 
  MAX_PLAYERS_PER_SERVER, 
  getNextServerToCreate, 
  getServerCluster,
  getServerNumber,
  DEFAULT_SERVER_CONFIG
} from "../config/servers.config";

/**
 * Vérifie si un nouveau serveur doit être créé
 * Retourne le serverId du nouveau serveur créé, ou null si aucun n'a été créé
 */
export async function checkAndCreateNewServer(): Promise<string | null> {
  try {
    // 1. Récupérer tous les serveurs existants
    const existingServers = await Server.find().sort({ serverId: 1 });
    const existingServerIds = existingServers.map(s => s.serverId);

    // 2. Vérifier si le dernier serveur a atteint le seuil
    if (existingServers.length === 0) {
      console.log("⚠️ Aucun serveur existant");
      return null;
    }

    const lastServer = existingServers[existingServers.length - 1];
    
    console.log(`🔍 Vérification du serveur ${lastServer.serverId}: ${lastServer.currentPlayers}/${MAX_PLAYERS_PER_SERVER} joueurs`);

    // 3. Si le dernier serveur n'a pas atteint le seuil, ne rien faire
    if (lastServer.currentPlayers < MAX_PLAYERS_PER_SERVER) {
      return null;
    }

    // 4. Le seuil est atteint, créer un nouveau serveur
    const nextServerId = getNextServerToCreate(existingServerIds);

    if (!nextServerId) {
      console.log("⚠️ Tous les serveurs sont déjà créés");
      return null;
    }

    // 5. Créer le nouveau serveur
    const cluster = getServerCluster(nextServerId);
    const serverNumber = getServerNumber(nextServerId);

    const newServer = await Server.create({
      serverId: nextServerId,
      name: `Server ${serverNumber}`,
      cluster: cluster,
      status: DEFAULT_SERVER_CONFIG.status,
      capacity: DEFAULT_SERVER_CONFIG.capacity,
      currentPlayers: 0,
      openedAt: new Date()
    });

    console.log(`✅ Nouveau serveur créé automatiquement: ${nextServerId} (Cluster ${cluster})`);

    return nextServerId;

  } catch (error: any) {
    console.error("❌ Erreur lors de la vérification/création de serveur:", error.message);
    return null;
  }
}

/**
 * Incrémente le nombre de joueurs sur un serveur
 * Vérifie automatiquement si un nouveau serveur doit être créé
 */
export async function incrementPlayerCount(serverId: string): Promise<void> {
  try {
    const server = await Server.findOne({ serverId });
    
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Incrémenter le nombre de joueurs
    server.currentPlayers += 1;
    await server.save();

    console.log(`👥 ${serverId}: ${server.currentPlayers} joueur(s) connecté(s)`);

    // Vérifier si on doit créer un nouveau serveur
    await checkAndCreateNewServer();

  } catch (error: any) {
    console.error(`❌ Erreur lors de l'incrémentation des joueurs sur ${serverId}:`, error.message);
    throw error;
  }
}

/**
 * Décrémente le nombre de joueurs sur un serveur
 */
export async function decrementPlayerCount(serverId: string): Promise<void> {
  try {
    const server = await Server.findOne({ serverId });
    
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Décrémenter le nombre de joueurs (minimum 0)
    server.currentPlayers = Math.max(0, server.currentPlayers - 1);
    await server.save();

    console.log(`👥 ${serverId}: ${server.currentPlayers} joueur(s) connecté(s)`);

  } catch (error: any) {
    console.error(`❌ Erreur lors de la décrémentation des joueurs sur ${serverId}:`, error.message);
    throw error;
  }
}

/**
 * Récupère le serveur avec le moins de joueurs (pour le matchmaking)
 */
export async function getLeastPopulatedServer(): Promise<string | null> {
  try {
    const servers = await Server.find({ status: "online" })
      .sort({ currentPlayers: 1, serverId: 1 })
      .limit(1);

    if (servers.length === 0) {
      return null;
    }

    return servers[0].serverId;

  } catch (error: any) {
    console.error("❌ Erreur lors de la recherche du serveur le moins peuplé:", error.message);
    return null;
  }
}
