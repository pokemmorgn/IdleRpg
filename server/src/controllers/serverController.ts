import { Request, Response } from "express";
import Server from "../models/Server";

/**
 * GET /servers
 * Liste tous les serveurs disponibles (groupés par cluster)
 */
export const listServers = async (req: Request, res: Response) => {
  try {
    const servers = await Server.find().sort({ cluster: 1, serverId: 1 });

    res.json({
      servers: servers.map(s => ({
        serverId: s.serverId,
        name: s.name,
        cluster: s.cluster,
        status: s.status,
        currentPlayers: s.currentPlayers,
        capacity: s.capacity,
        openedAt: s.openedAt
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /servers/:serverId
 * Récupère les détails d'un serveur spécifique
 */
export const getServer = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;

    const server = await Server.findOne({ serverId });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    res.json({
      serverId: server.serverId,
      name: server.name,
      cluster: server.cluster,
      status: server.status,
      currentPlayers: server.currentPlayers,
      capacity: server.capacity,
      openedAt: server.openedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /servers/cluster/:clusterId
 * Liste tous les serveurs d'un cluster spécifique
 */
export const getClusterServers = async (req: Request, res: Response) => {
  try {
    const clusterId = parseInt(req.params.clusterId);

    if (isNaN(clusterId)) {
      return res.status(400).json({ error: "Invalid cluster ID" });
    }

    const servers = await Server.find({ cluster: clusterId }).sort({ serverId: 1 });

    res.json({
      clusterId: clusterId,
      serverCount: servers.length,
      servers: servers.map(s => ({
        serverId: s.serverId,
        name: s.name,
        status: s.status,
        currentPlayers: s.currentPlayers,
        capacity: s.capacity,
        openedAt: s.openedAt
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
