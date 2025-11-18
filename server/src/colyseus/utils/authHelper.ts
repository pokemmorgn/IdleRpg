import jwt from "jsonwebtoken";
import Player from "../../models/Player";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

/**
 * Valide un token JWT et retourne les infos du joueur
 */
export async function validateToken(token: string): Promise<{
  valid: boolean;
  playerId?: string;
  error?: string;
}> {
  try {
    if (!token) {
      return { valid: false, error: "No token provided" };
    }

    // Vérifier et décoder le token
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (!decoded.playerId) {
      return { valid: false, error: "Invalid token payload" };
    }

    // Vérifier que le joueur existe dans MongoDB
    const player = await Player.findById(decoded.playerId);

    if (!player) {
      return { valid: false, error: "Player not found" };
    }

    console.log(`🔐 Token valide pour joueur: ${player.username} (${player._id})`);

    return {
      valid: true,
      playerId: player._id.toString()
    };

  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return { valid: false, error: "Token expired" };
    }
    if (err.name === "JsonWebTokenError") {
      return { valid: false, error: "Invalid token" };
    }
    return { valid: false, error: err.message };
  }
}
