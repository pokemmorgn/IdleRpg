// server/src/colyseus/managers/LevelManager.ts

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

/**
 * LevelManager
 * ------------
 * Gère toute la logique de gain d'expérience, les montées de niveau,
 * le recalcul des stats et la notification au joueur.
 */
export class LevelManager {

  constructor(
    private readonly state: GameState,
    private readonly sendToClient: (sessionId: string, type: string, data: any) => void,
    private readonly saveCallback: (player: PlayerState) => Promise<void>
  ) {}

  // ===========================================================
  // AJOUTER DE L'XP
  // ===========================================================
  addXP(player: PlayerState, amount: number): void {
    if (amount <= 0) return;

    player.xp += amount;

    // Multi-level possible (ex: gros reward de quête)
    let leveledUp = false;

    while (player.xp >= player.nextLevelXp) {
      player.xp -= player.nextLevelXp;
      this.levelUp(player);
      leveledUp = true;
    }

    // Feedback client → "gain_xp"
    this.sendToClient(player.sessionId, "gain_xp", {
      amount,
      currentXp: player.xp,
      nextLevelXp: player.nextLevelXp
    });

    if (leveledUp) {
      // sauvegarde si montée de niveau
      this.saveCallback(player);
    }
  }

  // ===========================================================
  // LEVEL UP
  // ===========================================================
  private levelUp(player: PlayerState): void {
    player.level++;

    // XP required augmente automatiquement
    player.nextLevelXp = this.computeNextLevelXp(player.level);

    // Recalcul stats
    const newStats = computeFullStats(player);
    player.loadStatsFromProfile(newStats);

    // Full heal / full resource
    player.hp = player.maxHp;
    player.resource = player.maxResource;

    // Envoyer info au client
    this.sendToClient(player.sessionId, "level_up", {
      level: player.level,
      newStats: newStats,
      nextLevelXp: player.nextLevelXp
    });

    console.log(`⭐ ${player.characterName} est maintenant niveau ${player.level}!`);
  }

  // ===========================================================
  // FORMULE XP
  // ===========================================================
  private computeNextLevelXp(level: number): number {
    // Formule mobile classique :
    // Lvl 1 → 100, Lvl 2 → 150, Lvl 3 → 225, Lvl 10 → 3800 etc.
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }
}
