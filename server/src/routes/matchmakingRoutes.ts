import { Router } from "express";
import { getRoom } from "@colyseus/core";
import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter } from "../utils/playerLoader";

const router = Router();

/**
 * POST /matchmaking/join-world
 * Body: { serverId, characterSlot }
 */
router.post("/join-world", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Missing token" });
        }

        const token = authHeader.replace("Bearer ", "");
        const validation = await validateToken(token);

        if (!validation.valid) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const { serverId, characterSlot } = req.body;
        if (!serverId || characterSlot == null) {
            return res.status(400).json({ error: "Missing serverId or characterSlot" });
        }

        // Charger le perso
        const load = await loadPlayerCharacter(validation.playerId, serverId, characterSlot);
        if (!load.success || !load.profile) {
            return res.status(404).json({ error: "Character not found" });
        }

        // Colyseus → trouver ou créer la room world_xxx
        const room = await getRoom("world", { serverId });

        if (!room) {
            return res.status(500).json({ error: "No world room found" });
        }

        const seat = await room.reserveSeat({
            token,
            serverId,
            characterSlot
        });

        return res.json({
            room: {
                name: room.name,
                roomId: room.roomId,
                serverId: room.options.serverId
            },
            sessionId: seat.sessionId
        });

    } catch (err: any) {
        console.error("❌ join-world error:", err);
        return res.status(500).json({ error: "Matchmaking error", details: err.message });
    }
});

export default router;
