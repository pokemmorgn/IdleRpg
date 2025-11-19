import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import AFKSession, { IAFKSession } from "../../models/AFKSession";

/**
 * AFKManager – Gère tout le cycle AFK :
 * -------------------------------------
 * - Activation / désactivation AFK
 * - Sauvegarde position de référence (PlayerState + Mongo)
 * - Gestion du timer (max 2h)
 * - Mise à jour du récap AFK
 * - Notification des limites
 * - Synchronisation client
 * - Mode runtime : cache mémoire pour AFKCombatSystem
 */

export class AFKManager {

    private readonly MAX_AFK_DURATION = 7200; // 2h en secondes

    // Cache runtime: profileId → session AFK MongoDB
    private activeSessions: Map<string, IAFKSession> = new Map();

    constructor(
        private gameState: GameState,
        private broadcastToClient: (sessionId: string, type: string, data: any) => void
    ) {}

    // ---------------------------------------------------------
    // ACTIVER LE MODE AFK
    // ---------------------------------------------------------
    async activateAFK(client: Client, player: PlayerState): Promise<void> {
        try {
            console.log(`💤 [AFKManager] Activation AFK → ${player.characterName}`);

            // 1) Stopper tout combat actif
            player.inCombat = false;
            player.targetMonsterId = "";

            // 2) Stocker position AFK de référence dans PlayerState
            player.afkRefX = player.posX;
            player.afkRefY = player.posY;
            player.afkRefZ = player.posZ;

            // 3) Charger session AFK Mongo ou en créer une
            let session = await AFKSession.findOne({
                profileId: player.profileId,
                serverId: this.gameState.serverId
            });

            if (!session) {
                session = await AFKSession.create({
                    profileId: player.profileId,
                    serverId: this.gameState.serverId,
                    isActive: true,
                    startTime: new Date(),
                    lastUpdateTime: new Date(),
                    referencePosition: {
                        x: player.afkRefX,
                        y: player.afkRefY,
                        z: player.afkRefZ,
                    },
                    summary: {
                        monstersKilled: 0,
                        xpGained: 0,
                        goldGained: 0,
                        deaths: 0,
                        totalTime: 0,
                    },
                    maxDuration: this.MAX_AFK_DURATION,
                    timeLimitReached: false,
                });
            } else {
                // Réactivation d'une session existante
                session.isActive = true;
                session.startTime = new Date();
                session.lastUpdateTime = new Date();
                session.referencePosition = {
                    x: player.afkRefX,
                    y: player.afkRefY,
                    z: player.afkRefZ,
                };
                session.timeLimitReached = false;
                session.summary = {
                    monstersKilled: 0,
                    xpGained: 0,
                    goldGained: 0,
                    deaths: 0,
                    totalTime: 0,
                };
                await session.save();
            }

            this.activeSessions.set(player.profileId, session);

            // 4) Marquer AFK
            player.isAFK = true;

            // 5) Envoyer message client
            client.send("afk_activated", {
                referencePosition: {
                    x: player.afkRefX,
                    y: player.afkRefY,
                    z: player.afkRefZ,
                },
                maxDuration: this.MAX_AFK_DURATION,
            });

        } catch (err: any) {
            console.error("❌ [AFKManager] activateAFK error:", err);
            client.send("error", { message: "Failed to activate AFK mode" });
        }
    }

    // ---------------------------------------------------------
    // DÉSACTIVER LE MODE AFK
    // ---------------------------------------------------------
    async deactivateAFK(client: Client, player: PlayerState, reason: "manual" | "time_limit" = "manual") {
        try {
            console.log(`⛔ [AFKManager] Désactivation AFK → ${player.characterName}`);

            const session = await this.getSession(player.profileId);
            if (!session) return;

            // Mettre à jour le temps avant désactivation
            await this.updateSessionTime(session);

            session.isActive = false;
            await session.save();

            this.activeSessions.delete(player.profileId);
            player.isAFK = false;

            client.send("afk_deactivated", { reason });

        } catch (err: any) {
            console.error("❌ [AFKManager] deactivateAFK error:", err);
        }
    }

    // ---------------------------------------------------------
    // AJOUTER KILL (+XP +GOLD)
    // ---------------------------------------------------------
    async addMonsterKill(profileId: string, xp: number, gold: number) {
        const session = await this.getSession(profileId);
        if (!session || !session.isActive) return;
        if (session.timeLimitReached) return;

        await this.updateSessionTime(session);

        session.summary.monstersKilled++;
        session.summary.xpGained += xp;
        session.summary.goldGained += gold;

        await session.save();
    }

    // ---------------------------------------------------------
    // AJOUTER MORT
    // ---------------------------------------------------------
    async addDeath(profileId: string) {
        const session = await this.getSession(profileId);
        if (!session || !session.isActive) return;

        await this.updateSessionTime(session);
        session.summary.deaths++;

        await session.save();
    }

    // ---------------------------------------------------------
    // RÉCAP TEMPS RÉEL
    // ---------------------------------------------------------
    async sendSummaryUpdate(client: Client, profileId: string) {
        const session = await this.getSession(profileId);
        if (!session) return;

        await this.updateSessionTime(session);

        const timeRemaining = Math.max(0, this.MAX_AFK_DURATION - session.summary.totalTime);

        client.send("afk_summary_update", {
            ...session.summary,
            timeElapsed: session.summary.totalTime,
            timeRemaining,
        });
    }

    // ---------------------------------------------------------
    // CLAIM FINAL
    // ---------------------------------------------------------
    async claimSummary(client: Client, player: PlayerState) {
        const session = await this.getSession(player.profileId);
        if (!session) return;

        await this.updateSessionTime(session);

        client.send("afk_summary_claimed", {
            summary: session.summary,
        });

        // Reset
        session.summary = {
            monstersKilled: 0,
            xpGained: 0,
            goldGained: 0,
            deaths: 0,
            totalTime: 0,
        };
        session.timeLimitReached = false;

        await session.save();
    }

    // ---------------------------------------------------------
    // UPDATE GLOBAL (WorldRoom)
    // Vérifie limite de 2h + notifie joueur
    // ---------------------------------------------------------
    async update(deltaTime: number) {
        const now = Date.now();

        for (const [profileId, session] of this.activeSessions) {

            // Total depuis le début
            const elapsed = Math.floor((now - session.startTime.getTime()) / 1000);

            if (elapsed >= this.MAX_AFK_DURATION && !session.timeLimitReached) {
                session.timeLimitReached = true;
                session.summary.totalTime = this.MAX_AFK_DURATION;
                await session.save();

                // Chercher le joueur connecté
                const player = this.gameState.playersByProfile.get(profileId);
                if (player) {
                    this.broadcastToClient(player.sessionId, "afk_time_limit_reached", {
                        message: "AFK time limit reached (2 hours)",
                    });
                }
            }
        }
    }

    // ---------------------------------------------------------
    // UTILITAIRES
    // ---------------------------------------------------------
    private async updateSessionTime(session: IAFKSession) {
        const now = new Date();
        const delta = Math.floor((now.getTime() - session.lastUpdateTime.getTime()) / 1000);

        session.summary.totalTime += delta;
        session.lastUpdateTime = now;

        if (session.summary.totalTime >= this.MAX_AFK_DURATION)
            session.timeLimitReached = true;

        await session.save();
    }

    private async getSession(profileId: string): Promise<IAFKSession | null> {
        if (this.activeSessions.has(profileId))
            return this.activeSessions.get(profileId)!;

        const session = await AFKSession.findOne({
            profileId,
            serverId: this.gameState.serverId,
        });

        if (session && session.isActive)
            this.activeSessions.set(profileId, session);

        return session;
    }
}
