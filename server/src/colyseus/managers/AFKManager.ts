import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import AFKSession, { IAFKSession } from "../../models/AFKSession";

/**
 * AFKManager - Gère le mode AFK et le système de récap
 * 
 * Responsabilités :
 * - Activer/Désactiver le mode AFK pour un joueur
 * - Sauvegarder la position de référence AFK
 * - Tracker le temps AFK (max 2h)
 * - Accumuler le récap (monstres tués, XP, loot, morts)
 * - Envoyer le récap au client (temps réel si connecté)
 * - Gérer le claim du récap (appliquer XP + loot)
 * - Bloquer les gains après 2h
 * - Persister le récap en MongoDB (AFKSession)
 */
export class AFKManager {
  private serverId: string;
  private gameState: GameState;
  
  // Map pour stocker les sessions AFK en mémoire (cache)
  private activeSessions: Map<string, IAFKSession> = new Map();
  
  // Constantes
  private readonly MAX_AFK_DURATION = 7200; // 2 heures en secondes
  
  constructor(serverId: string, gameState: GameState) {
    this.serverId = serverId;
    this.gameState = gameState;
  }
  
  /**
   * Active le mode AFK pour un joueur
   */
  async activateAFK(client: Client, playerState: PlayerState): Promise<void> {
    try {
      console.log(`💤 [AFKManager] ${playerState.characterName} active le mode AFK`);
      
      // Vérifier si une session existe déjà
      let session = await AFKSession.findOne({
        profileId: playerState.profileId,
        serverId: this.serverId
      });
      
      if (!session) {
        // Créer une nouvelle session
        session = await AFKSession.create({
          profileId: playerState.profileId,
          serverId: this.serverId,
          isActive: true,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          referencePosition: {
            x: playerState.posX,
            y: playerState.posY,
            z: playerState.posZ
          },
          summary: {
            monstersKilled: 0,
            xpGained: 0,
            goldGained: 0,
            deaths: 0,
            totalTime: 0
          },
          maxDuration: this.MAX_AFK_DURATION,
          timeLimitReached: false
        });
      } else {
        // Réactiver la session existante (reset si claim précédent)
        if (!session.isActive) {
          // Reset de la session si elle était inactive
          session.isActive = true;
          session.startTime = new Date();
          session.lastUpdateTime = new Date();
          session.referencePosition = {
            x: playerState.posX,
            y: playerState.posY,
            z: playerState.posZ
          };
          session.timeLimitReached = false;
        }
        await session.save();
      }
      
      // Stocker en cache
      this.activeSessions.set(playerState.profileId, session);
      
      // Marquer le joueur comme AFK
      playerState.isAFK = true;
      
      // Envoyer confirmation au client
      client.send("afk_activated", {
        referencePosition: {
          x: playerState.posX,
          y: playerState.posY,
          z: playerState.posZ
        },
        maxDuration: this.MAX_AFK_DURATION
      });
      
      console.log(`✅ [AFKManager] Mode AFK activé pour ${playerState.characterName} à (${playerState.posX}, ${playerState.posY}, ${playerState.posZ})`);
      
    } catch (err: any) {
      console.error(`❌ [AFKManager] Erreur activateAFK:`, err.message);
      client.send("error", { message: "Failed to activate AFK mode" });
    }
  }
  
  /**
   * Désactive le mode AFK pour un joueur
   */
  async deactivateAFK(client: Client, playerState: PlayerState, reason: "manual" | "time_limit" = "manual"): Promise<void> {
    try {
      console.log(`⏰ [AFKManager] ${playerState.characterName} désactive le mode AFK (raison: ${reason})`);
      
      // Récupérer la session
      const session = await this.getSession(playerState.profileId);
      
      if (!session || !session.isActive) {
        client.send("error", { message: "No active AFK session" });
        return;
      }
      
      // Mettre à jour le temps total
      await this.updateSessionTime(session);
      
      // Désactiver la session
      session.isActive = false;
      await session.save();
      
      // Retirer du cache
      this.activeSessions.delete(playerState.profileId);
      
      // Marquer le joueur comme non-AFK
      playerState.isAFK = false;
      
      // Envoyer confirmation au client
      client.send("afk_deactivated", {
        reason: reason
      });
      
      console.log(`✅ [AFKManager] Mode AFK désactivé pour ${playerState.characterName}`);
      
    } catch (err: any) {
      console.error(`❌ [AFKManager] Erreur deactivateAFK:`, err.message);
    }
  }
  
  /**
   * Met à jour le temps de la session
   */
  private async updateSessionTime(session: IAFKSession): Promise<void> {
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - session.lastUpdateTime.getTime()) / 1000);
    
    session.summary.totalTime += elapsedSeconds;
    session.lastUpdateTime = now;
    
    // Vérifier la limite de 2h
    if (session.summary.totalTime >= this.MAX_AFK_DURATION && !session.timeLimitReached) {
      session.timeLimitReached = true;
      console.log(`⏰ [AFKManager] Limite de 2h atteinte pour session ${session.profileId}`);
    }
    
    await session.save();
  }
  
  /**
   * Ajoute un monstre tué au récap
   */
  async addMonsterKill(profileId: string, xp: number, gold: number): Promise<void> {
    try {
      const session = await this.getSession(profileId);
      
      if (!session || !session.isActive) {
        return;
      }
      
      // Vérifier la limite de temps
      if (session.timeLimitReached) {
        console.log(`⚠️  [AFKManager] Session ${profileId} a atteint la limite de temps, pas de gain`);
        return;
      }
      
      // Mettre à jour le temps
      await this.updateSessionTime(session);
      
      // Ajouter au récap
      session.summary.monstersKilled++;
      session.summary.xpGained += xp;
      session.summary.goldGained += gold;
      
      await session.save();
      
      console.log(`📊 [AFKManager] Monstre ajouté au récap: +${xp} XP, +${gold} or (Total: ${session.summary.monstersKilled} monstres)`);
      
    } catch (err: any) {
      console.error(`❌ [AFKManager] Erreur addMonsterKill:`, err.message);
    }
  }
  
  /**
   * Ajoute une mort au récap
   */
  async addDeath(profileId: string): Promise<void> {
    try {
      const session = await this.getSession(profileId);
      
      if (!session || !session.isActive) {
        return;
      }
      
      // Mettre à jour le temps
      await this.updateSessionTime(session);
      
      // Ajouter au récap
      session.summary.deaths++;
      
      await session.save();
      
      console.log(`💀 [AFKManager] Mort ajoutée au récap (Total: ${session.summary.deaths} morts)`);
      
    } catch (err: any) {
      console.error(`❌ [AFKManager] Erreur addDeath:`, err.message);
    }
  }
  
  /**
   * Envoie le récap au client (temps réel)
   */
  async sendSummaryUpdate(client: Client, profileId: string): Promise<void> {
    try {
      const session = await this.getSession(profileId);
      
      if (!session) {
        return;
      }
      
      // Mettre à jour le temps
      await this.updateSessionTime(session);
      
      // Calculer le temps restant
      const timeRemaining = Math.max(0, this.MAX_AFK_DURATION - session.summary.totalTime);
      
      // Envoyer au client
      client.send("afk_summary_update", {
        monstersKilled: session.summary.monstersKilled,
        xpGained: session.summary.xpGained,
        goldGained: session.summary.goldGained,
        deaths: session.summary.deaths,
        timeElapsed: session.summary.totalTime,
        timeRemaining: timeRemaining
      });
      
    } catch (err: any) {
      console.error(`❌ [AFKManager] Erreur sendSummaryUpdate:`, err.message);
    }
  }
  
  /**
   * Claim le récap (appliquer XP + loot)
   */
  async claimSummary(client: Client, playerState: PlayerState): Promise<void> {
    try {
      console.log(`🎁 [AFKManager] ${playerState.characterName} claim son récap AFK`);
      
      const session = await this.getSession(playerState.profileId);
      
      if (!session) {
        client.send("error", { message: "No AFK session found" });
        return;
      }
      
      // Mettre à jour le temps une dernière fois
      await this.updateSessionTime(session);
      
      const summary = session.summary;
      
      // Vérifier qu'il y a quelque chose à claim
      if (summary.monstersKilled === 0 && summary.xpGained === 0 && summary.goldGained === 0) {
        client.send("error", { message: "Nothing to claim" });
        return;
      }
      
      // TODO: Appliquer l'XP au joueur (level up system pas encore implémenté)
      // await applyXP(playerState.profileId, summary.xpGained);
      
      // TODO: Appliquer l'or au joueur (inventaire pas encore implémenté)
      // await applyGold(playerState.profileId, summary.goldGained);
      
      console.log(`✅ [AFKManager] Récap claim:`);
      console.log(`   Monstres tués: ${summary.monstersKilled}`);
      console.log(`   XP gagnée: ${summary.xpGained}`);
      console.log(`   Or gagné: ${summary.goldGained}`);
      console.log(`   Morts: ${summary.deaths}`);
      console.log(`   Temps total: ${summary.totalTime}s`);
      
      // Envoyer confirmation au client
      client.send("afk_summary_claimed", {
        xpGained: summary.xpGained,
        goldGained: summary.goldGained,
        // newLevel: si level up
        summary: {
          monstersKilled: summary.monstersKilled,
          xpGained: summary.xpGained,
          goldGained: summary.goldGained,
          deaths: summary.deaths,
          totalTime: summary.totalTime
        }
      });
      
      // Reset le récap
      session.summary = {
        monstersKilled: 0,
        xpGained: 0,
        goldGained: 0,
        deaths: 0,
        totalTime: 0
      };
      session.timeLimitReached = false;
      
      await session.save();
      
    } catch (err: any) {
      console.error(`❌ [AFKManager] Erreur claimSummary:`, err.message);
      client.send("error", { message: "Failed to claim AFK summary" });
    }
  }
  
  /**
   * Récupère la session d'un joueur (cache ou DB)
   */
  private async getSession(profileId: string): Promise<IAFKSession | null> {
    // Vérifier le cache d'abord
    if (this.activeSessions.has(profileId)) {
      return this.activeSessions.get(profileId)!;
    }
    
    // Sinon charger depuis MongoDB
    const session = await AFKSession.findOne({
      profileId,
      serverId: this.serverId
    });
    
    if (session && session.isActive) {
      this.activeSessions.set(profileId, session);
    }
    
    return session;
  }
  
  /**
   * Vérifie si un joueur est en mode AFK
   */
  async isPlayerAFK(profileId: string): Promise<boolean> {
    const session = await this.getSession(profileId);
    return session ? session.isActive : false;
  }
  
  /**
   * Récupère la position de référence d'un joueur AFK
   */
  async getReferencePosition(profileId: string): Promise<{ x: number; y: number; z: number } | null> {
    const session = await this.getSession(profileId);
    return session ? session.referencePosition : null;
  }
  
  /**
   * Tick du manager (appelé depuis WorldRoom.update)
   */
  async update(deltaTime: number): Promise<void> {
    // Mettre à jour les timers des sessions actives
    for (const [profileId, session] of this.activeSessions.entries()) {
      // Vérifier la limite de temps
      const now = new Date();
      const totalElapsed = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
      
      if (totalElapsed >= this.MAX_AFK_DURATION && !session.timeLimitReached) {
        session.timeLimitReached = true;
        session.summary.totalTime = this.MAX_AFK_DURATION;
        await session.save();
        
        console.log(`⏰ [AFKManager] Limite de 2h atteinte pour ${profileId}`);
        
        // Envoyer notification au client si connecté
        const player = this.gameState.players.get(profileId);
        if (player) {
          // Trouver le client (on devra passer la référence depuis WorldRoom)
          // Pour l'instant, on log juste
          console.log(`📤 [AFKManager] Devrait envoyer afk_time_limit_reached à ${player.characterName}`);
        }
      }
    }
  }
  
  /**
   * Charge toutes les sessions actives au démarrage
   */
  async loadActiveSessions(): Promise<void> {
    try {
      const sessions = await AFKSession.find({
        serverId: this.serverId,
        isActive: true
      });
      
      for (const session of sessions) {
        this.activeSessions.set(session.profileId, session);
      }
      
      console.log(`📂 [AFKManager] ${sessions.length} session(s) AFK active(s) chargée(s)`);
      
    } catch (err: any) {
      console.error(`❌ [AFKManager] Erreur loadActiveSessions:`, err.message);
    }
  }
}
