import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

interface AFKSummary {
  monstersKilled: number;
  xpGained: number;
  goldGained: number;
  deaths: number;
  totalTime: number;
}

interface AFKSessionMemory {
  profileId: string;
  referencePos: { x: number; y: number; z: number };
  isActive: boolean;
  startTime: number;
  lastUpdate: number;
  summary: AFKSummary;
  timeLimitReached: boolean;
}

export class AFKManager {
  private readonly MAX_AFK_DURATION = 7200; // 2h
  private readonly sessions: Map<string, AFKSessionMemory> = new Map();

  constructor(
    private readonly gameState: GameState,
    private readonly broadcastToClient: (
      sessionId: string,
      type: string,
      data: any
    ) => void
  ) {}

  // ----------------------------------------------------
  // ACTIVATION
  // ----------------------------------------------------
  activateAFK(client: Client, player: PlayerState): void {
    const session: AFKSessionMemory = {
      profileId: player.profileId,
      referencePos: { x: player.posX, y: player.posY, z: player.posZ },
      isActive: true,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      timeLimitReached: false,
      summary: {
        monstersKilled: 0,
        xpGained: 0,
        goldGained: 0,
        deaths: 0,
        totalTime: 0,
      },
    };

    this.sessions.set(player.profileId, session);
    player.isAFK = true;

    client.send("afk_activated", {
      referencePosition: session.referencePos,
      maxDuration: this.MAX_AFK_DURATION,
    });

    console.log(`💤 AFK activé pour ${player.characterName}`);
  }

  // ----------------------------------------------------
  // DÉSACTIVATION
  // ----------------------------------------------------
  deactivateAFK(
    client: Client,
    player: PlayerState,
    reason: "manual" | "time_limit" = "manual"
  ): void {
    const session = this.sessions.get(player.profileId);
    if (!session) return;

    this.updateSessionTime(session);
    session.isActive = false;

    player.isAFK = false;
    this.sessions.delete(player.profileId);

    client.send("afk_deactivated", { reason });
    console.log(`⏹ AFK désactivé pour ${player.characterName}`);
  }

  // ----------------------------------------------------
  // MISE À JOUR DU TEMPS
  // ----------------------------------------------------
  private updateSessionTime(session: AFKSessionMemory): void {
    const now = Date.now();
    const deltaSec = Math.floor((now - session.lastUpdate) / 1000);

    if (deltaSec > 0) {
      session.summary.totalTime += deltaSec;
      session.lastUpdate = now;

      if (
        session.summary.totalTime >= this.MAX_AFK_DURATION &&
        !session.timeLimitReached
      ) {
        session.timeLimitReached = true;
        console.log(`⏰ Limite 2h atteinte (profileId=${session.profileId})`);

        // notifier le joueur si il est en ligne
        const player = Array.from(this.gameState.players.values()).find(
          (p) => p.profileId === session.profileId
        );

        if (player) {
          this.broadcastToClient(player.sessionId, "afk_time_limit_reached", {
            message: "AFK max duration reached (2h)",
          });
        }
      }
    }
  }

  // ----------------------------------------------------
  // RÉCOMPENSES : KILL
  // ----------------------------------------------------
  addKill(profileId: string, xp: number, gold: number): void {
    const session = this.sessions.get(profileId);
    if (!session || !session.isActive) return;

    this.updateSessionTime(session);
    if (session.timeLimitReached) return;

    session.summary.monstersKilled++;
    session.summary.xpGained += xp;
    session.summary.goldGained += gold;
  }

  // ----------------------------------------------------
  // RÉCOMPENSES : MORT
  // ----------------------------------------------------
  addDeath(profileId: string): void {
    const session = this.sessions.get(profileId);
    if (!session || !session.isActive) return;

    this.updateSessionTime(session);
    session.summary.deaths++;
  }

  // ----------------------------------------------------
  // SUMMARY TEMPS RÉEL
  // ----------------------------------------------------
  sendSummaryUpdate(client: Client, profileId: string): void {
    const session = this.sessions.get(profileId);
    if (!session) return;

    this.updateSessionTime(session);

    client.send("afk_summary_update", {
      ...session.summary,
      timeRemaining: Math.max(
        0,
        this.MAX_AFK_DURATION - session.summary.totalTime
      ),
    });
  }

  // ----------------------------------------------------
  // CLAIM FINAL
  // ----------------------------------------------------
  claimSummary(client: Client, player: PlayerState): void {
    const session = this.sessions.get(player.profileId);
    if (!session) {
      client.send("error", { message: "No AFK session found" });
      return;
    }

    this.updateSessionTime(session);
    const summary = session.summary;

    client.send("afk_summary_claimed", summary);

    // reset session
    this.sessions.delete(player.profileId);
    player.isAFK = false;

    console.log(`🎁 Claim AFK pour ${player.characterName}`, summary);
  }

  // ----------------------------------------------------
  // TICK
  // ----------------------------------------------------
  update(deltaTime: number): void {
    for (const session of this.sessions.values()) {
      if (session.isActive) {
        this.updateSessionTime(session);
      }
    }
  }
}
