import express from "express";
import { matchMaker } from "@colyseus/core";
import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter } from "../utils/playerLoader";

const router = express.Router();

/**
 * JOINDRE OU CRÉER LA ROOM "world"
 */
router.post("/join-world", async (req, res) => {
    try {
        const { token, serverId, characterSlot } = req.body;

        if (!token || !serverId || !characterSlot) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        // Auth JWT
        const t = await validateToken(token);
        if (!t.valid) return res.status(401).json({ error: "Invalid token" });

        // Profil
        const charLoad = await loadPlayerCharacter(t.playerId, serverId, characterSlot);
        if (!charLoad.success) {
            return res.status(404).json({ error: "Character not found" });
        }

        // UTILISER LE MATCHMAKER OFFICIEL
        const seat = await matchMaker.joinOrCreate("world", {
            serverId,
            characterSlot
        });

        return res.json({
            room: {
                roomId: seat.room.roomId,
                roomName: seat.room.roomName
            },
            sessionId: seat.sessionId
        });

    } catch (err) {
        console.error("❌ matchmaking error:", err);
        return res.status(500).json({ error: "matchmaking_error" });
    }
});

export default router;
