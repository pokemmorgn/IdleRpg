import { Room, Client } from "colyseus";
import jwt from "jsonwebtoken";
import Player from "../database/models/Player";

export class AuthRoom extends Room {
  onCreate(options: any) {
    console.log("🔐 AuthRoom créée");
  }

  async onAuth(client: Client, options: any) {
    try {
      const token = options.token;
      if (!token) {
        throw new Error("No token provided");
      }

      // Vérifie le token
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
      const playerId = decoded.playerId;

      if (!playerId) {
        throw new Error("Invalid token payload");
      }

      // Charge les infos joueur depuis MongoDB
      const player = await Player.findById(playerId);
      if (!player) {
        throw new Error("Player not found");
      }

      console.log(`🟢 Auth OK pour player: ${playerId}`);

      // Stocke dans le client
      (client as any).playerId = playerId;

      return true;

    } catch (err) {
      console.log("🔴 Auth failed:", err);
      throw err;
    }
  }

  onJoin(client: Client) {
    console.log(`👤 Player ${client.sessionId} joined AuthRoom`);
  }

  onLeave(client: Client) {
    console.log(`👋 Player left AuthRoom`);
  }

  onDispose() {
    console.log("♻ AuthRoom destroyed");
  }
}
