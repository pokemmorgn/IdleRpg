import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Étendre l'interface Request pour ajouter playerId
declare global {
  namespace Express {
    interface Request {
      playerId?: string;
    }
  }
}

/**
 * Middleware pour protéger les routes avec JWT
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Format: "Bearer <token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Vérifier et décoder le token
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (!decoded.playerId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // Ajouter le playerId à la requête
    req.playerId = decoded.playerId;

    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(500).json({ error: "Authentication failed" });
  }
};
