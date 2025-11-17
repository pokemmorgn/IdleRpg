/**
 * Service de gestion de l'auto-scaling des serveurs
 * Crée automatiquement de nouveaux serveurs quand le seuil est atteint
 * Compte les COMPTES UNIQUES, pas les personnages
 */

import Server from "../models/Server";
import ServerProfile from "../models/ServerProfile";
import { 
  MAX_PLAYERS_PER_SERVER, 
  getNextServerToCreate, 
  getServerCluster,
  getServerNumber,
  DEFAULT_SERVER_CONFIG,
  shouldLockServer,
  INVITATION_SYSTEM_ENABLED
} from "../config/servers.config";

/**
 * Compte le nombre de comptes uniques ayant au moins un personnage sur un serveur
 */
export async function countUniquePlayersOnServer(serverId: string): Promise<number> {
  try {
    const uniquePlayers = await ServerProfile.distinct("playerId", { serverId });
    return uniquePlayers.length;
  } catch (error: any) {
    console.error(`❌ Erreur lors du comptage des joueurs sur ${serverId}:`, error.message);
    return 0;
  }
}

/**
 * Met à jour le compteur de joueurs d'un serveur (comptes uniques)
 */
export async function updatePlayerCount(serverId: string): Promise<void> {
  try {
    const server = await Server.findOne({ serverId });
    
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Compter les comptes uniques
    const uniquePlayerCount = await countUniquePlayersOnServer(serverId);
    
    server.currentPlayers = uniquePlayerCount;
    await server.save();

    console.log(`👥 ${serverId}: ${server.currentPlayers} compte(s) unique(s)`);

  } catch (error: any) {
    console.error(`❌ Erreur lors de la mise à jour du compteur sur ${serverId}:`, error.message);
    throw error;
  }
}

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
    
    console.log(`🔍 Vérification du serveur ${lastServer.serverId}: ${lastServer.currentPlayers}/${MAX_PLAYERS_PER_SERVER} compte(s)`);

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
 * Vérifie et met à jour le statut de verrouillage d'un serveur
 */
export async function updateServerLockStatus(serverId: string): Promise<void> {
  try {
    if (!INVITATION_SYSTEM_ENABLED) {
      return;
    }

    const server = await Server.findOne({ serverId });
    if (!server) {
      return;
    }

    const shouldBeLocked = shouldLockServer(server.currentPlayers);

    // Si le serveur doit être verrouillé mais ne l'est pas encore
    if (shouldBeLocked && server.status === "online") {
      server.status = "locked";
      await server.save();
      console.log(`🔒 Serveur ${serverId} verrouillé (${server.currentPlayers} comptes)`);
    }
    // Si le serveur ne doit plus être verrouillé
    else if (!shouldBeLocked && server.status === "locked") {
      server.status = "online";
      await server.save();
      console.log(`🔓 Serveur ${serverId} déverrouillé (${server.currentPlayers} comptes)`);
    }

  } catch (error: any) {
    console.error(`❌ Erreur lors de la mise à jour du statut de ${serverId}:`, error.message);
  }
}

/**
 * Met à jour le compteur après ajout/suppression de personnage
 * Vérifie automatiquement si un nouveau serveur doit être créé
 * Vérifie si le serveur doit être verrouillé
 */
export async function syncPlayerCount(serverId: string): Promise<void> {
  try {
    // Mettre à jour le compteur
    await updatePlayerCount(serverId);

    // Récupérer le serveur mis à jour
    const server = await Server.findOne({ serverId });
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Vérifier si le serveur doit être verrouillé
    await updateServerLockStatus(serverId);

    // Vérifier si on doit créer un nouveau serveur
    await checkAndCreateNewServer();

  } catch (error: any) {
    console.error(`❌ Erreur lors de la synchronisation des joueurs sur ${serverId}:`, error.message);
    throw error;
  }
}

/**
 * Incrémente le nombre de joueurs sur un serveur (DEPRECATED - utiliser syncPlayerCount)
 * Conservé pour compatibilité
 */
export async function incrementPlayerCount(serverId: string): Promise<void> {
  await syncPlayerCount(serverId);
}

/**
 * Décrémente le nombre de joueurs sur un serveur (DEPRECATED - utiliser syncPlayerCount)
 * Conservé pour compatibilité
 */
export async function decrementPlayerCount(serverId: string): Promise<void> {
  await syncPlayerCount(serverId);
}

/**
 * Récupère le serveur avec le moins de joueurs (pour le matchmaking)
 * Exclut les serveurs verrouillés
 */
export async function getLeastPopulatedServer(): Promise<string | null> {
  try {
    const servers = await Server.find({ 
      status: "online" // Exclut "locked", "maintenance", "full"
    })
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

/**
 * Vérifie si un serveur accepte de nouveaux joueurs
 */
export async function canJoinServer(serverId: string, hasInvitation: boolean = false): Promise<boolean> {
  try {
    const server = await Server.findOne({ serverId });
    
    if (!server) {
      return false;
    }

    // Serveur en maintenance ou full
    if (server.status === "maintenance" || server.status === "full") {
      return false;
    }

    // Serveur verrouillé mais le joueur a une invitation
    if (server.status === "locked" && hasInvitation) {
      return true;
    }

    // Serveur verrouillé sans invitation
    if (server.status === "locked" && !hasInvitation) {
      return false;
    }

    // Serveur online
    return true;

  } catch (error: any) {
    console.error(`❌ Erreur lors de la vérification d'accès à ${serverId}:`, error.message);
    return false;
  }
}
