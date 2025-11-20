import { Router } from "express";
import jwt from "jsonwebtoken";
import { matchMaker } from "colyseus";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

const router = Router();

/**
 * POST /matchmaking/join-world
 * Body: { serverId, characterSlot }
 */
router.post("/join-world", async (req, res) => {
    try {
        // Vérification token
        const header = req.headers.authorization;
        if (!header) {
            return res.status(401).json({ error: "Missing Authorization header" });
        }

        const token = header.replace("Bearer ", "");
        let decoded: any;

        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch {
            return res.status(401).json({ error: "Invalid token" });
        }

        const playerId = decoded.playerId;
        if (!playerId) {
            return res.status(401).json({ error: "Invalid token payload" });
        }

        const { serverId, characterSlot } = req.body;

        if (!serverId || characterSlot == null) {
            return res.status(400).json({ error: "serverId & characterSlot required" });
        }

        // Réservation de place dans une WorldRoom
        const seat = await matchMaker.joinOrCreate("world", {
            serverId,
            token,
            characterSlot
        });

        return res.json({
            room: {
                name: seat.room.name,
                roomId: seat.room.roomId,
                processId: seat.room.processId
            },
            sessionId: seat.sessionId
        });

    } catch (err: any) {
        console.error("❌ join-world error:", err);
        return res.status(500).json({ error: "Matchmaking error", details: err.message });
    }
});

export default router;
