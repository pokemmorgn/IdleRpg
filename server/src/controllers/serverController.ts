import { Request, Response } from "express";
import Server from "../models/Server";

/**
 * GET /servers
 * Liste tous les serveurs disponibles
 */
export const listServers = async (req: Request, res: Response) => {
  try {
    const servers = await Server.find().sort({ region: 1, serverId: 1 });

    res.json({
      servers: servers.map(s => ({
        serverId: s.serverId,
        name: s.name,
        region: s.region,
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
      region: server.region,
      status: server.status,
      currentPlayers: server.currentPlayers,
      capacity: server.capacity,
      openedAt: server.openedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
