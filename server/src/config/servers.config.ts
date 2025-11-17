/**
 * Configuration des serveurs logiques
 * Les serveurs sont regroupés par clusters pour la scalabilité
 */

export interface ServerConfig {
  serverId: string;      // "s1", "s2", etc.
  name: string;          // "Server 1", "Server 2", etc.
  cluster: number;       // Numéro du cluster (1, 2, 3...)
  status: "online" | "maintenance" | "full";
  capacity: number;
  openedAt: Date;
}

export interface ClusterConfig {
  clusterId: number;     // 1, 2, 3...
  name: string;          // "Cluster 1", "Cluster 2", etc.
  servers: string[];     // ["s1", "s2", "s3"...]
  maxServers: number;    // Nombre max de serveurs dans ce cluster
}

/**
 * Configuration des clusters
 * Chaque cluster regroupe 10 serveurs
 */
export const CLUSTERS: ClusterConfig[] = [
  {
    clusterId: 1,
    name: "Cluster 1",
    servers: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
    maxServers: 10
  },
  {
    clusterId: 2,
    name: "Cluster 2",
    servers: ["s11", "s12", "s13", "s14", "s15", "s16", "s17", "s18", "s19", "s20"],
    maxServers: 10
  },
  {
    clusterId: 3,
    name: "Cluster 3",
    servers: ["s21", "s22", "s23", "s24", "s25", "s26", "s27", "s28", "s29", "s30"],
    maxServers: 10
  }
];

/**
 * ===== CONFIGURATION AUTO-SCALING =====
 */

/**
 * Nombre maximum de joueurs par serveur avant de créer un nouveau serveur
 * IMPORTANT : Modifie cette valeur pour changer le seuil d'auto-création
 */
export const MAX_PLAYERS_PER_SERVER = 3;

/**
 * Capacité totale d'un serveur (hard limit)
 */
export const SERVER_CAPACITY = 10000;

/**
 * Configuration par défaut d'un serveur
 */
export const DEFAULT_SERVER_CONFIG = {
  status: "online" as const,
  capacity: SERVER_CAPACITY,
  currentPlayers: 0
};

/**
 * Serveurs à créer initialement (seulement s1 et s2 pour commencer)
 */
export const INITIAL_SERVERS = ["s1", "s2"];

/**
 * Génère la configuration complète des serveurs
 * Par défaut, crée seulement les serveurs initiaux (s1, s2)
 */
export function generateServersConfig(serversToCreate: string[] = INITIAL_SERVERS): ServerConfig[] {
  const servers: ServerConfig[] = [];
  
  for (const cluster of CLUSTERS) {
    for (const serverId of cluster.servers) {
      // Ne créer que les serveurs spécifiés
      if (!serversToCreate.includes(serverId)) {
        continue;
      }
      
      // Extraire le numéro du serveur (s1 -> 1, s11 -> 11)
      const serverNumber = parseInt(serverId.substring(1));
      
      servers.push({
        serverId: serverId,
        name: `Server ${serverNumber}`,
        cluster: cluster.clusterId,
        status: DEFAULT_SERVER_CONFIG.status,
        capacity: DEFAULT_SERVER_CONFIG.capacity,
        openedAt: new Date("2025-01-15T10:00:00.000Z")
      });
    }
  }
  
  return servers;
}

/**
 * Récupère le cluster d'un serveur
 */
export function getServerCluster(serverId: string): number | null {
  for (const cluster of CLUSTERS) {
    if (cluster.servers.includes(serverId)) {
      return cluster.clusterId;
    }
  }
  return null;
}

/**
 * Récupère tous les serveurs d'un cluster
 */
export function getClusterServers(clusterId: number): string[] {
  const cluster = CLUSTERS.find(c => c.clusterId === clusterId);
  return cluster ? cluster.servers : [];
}

/**
 * Vérifie si un serverId est valide
 */
export function isValidServerId(serverId: string): boolean {
  return CLUSTERS.some(cluster => cluster.servers.includes(serverId));
}

/**
 * Récupère le nom d'un cluster
 */
export function getClusterName(clusterId: number): string {
  const cluster = CLUSTERS.find(c => c.clusterId === clusterId);
  return cluster ? cluster.name : `Cluster ${clusterId}`;
}

/**
 * Récupère le prochain serveur à créer dans l'ordre
 * Retourne null si tous les serveurs sont créés
 */
export function getNextServerToCreate(existingServers: string[]): string | null {
  // Parcourir tous les clusters dans l'ordre
  for (const cluster of CLUSTERS) {
    for (const serverId of cluster.servers) {
      if (!existingServers.includes(serverId)) {
        return serverId;
      }
    }
  }
  return null; // Tous les serveurs sont créés
}

/**
 * Extrait le numéro d'un serverId (s1 -> 1, s15 -> 15)
 */
export function getServerNumber(serverId: string): number {
  return parseInt(serverId.substring(1));
}
