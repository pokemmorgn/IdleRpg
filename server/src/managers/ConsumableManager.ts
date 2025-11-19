import { PlayerState } from "../schema/PlayerState";

/**
 * ConsumableManager - Gère la consommation automatique de potions/nourriture
 * 
 * Responsabilités :
 * - Détecter quand le joueur a besoin de soins (HP < 50%)
 * - Chercher des consommables dans l'inventaire (placeholder)
 * - Consommer automatiquement (priorité : Potions HP > Nourriture)
 * - Retourner false si plus de consommables (le joueur peut mourir)
 * 
 * NOTE : Version placeholder pour l'instant (inventaire pas encore implémenté)
 * Les consommables sont stockés directement dans PlayerState temporairement
 */
export class ConsumableManager {
  
  /**
   * Tente de soigner un joueur si nécessaire
   * 
   * @param player - État du joueur
   * @returns true si soigné ou pas besoin, false si plus de consommables
   */
  tryHealPlayer(player: PlayerState): boolean {
    // Vérifier si le joueur a besoin de soins (HP < 50%)
    const needsHealing = player.hp < player.maxHp * 0.5;
    
    if (!needsHealing) {
      return true; // Pas besoin de soins
    }
    
    console.log(`🩹 [ConsumableManager] ${player.characterName} a besoin de soins (HP: ${player.hp}/${player.maxHp})`);
    
    // Priorité 1 : Potions HP
    if (player.potionHP > 0) {
      return this.usePotionHP(player);
    }
    
    // Priorité 2 : Nourriture
    if (player.food > 0) {
      return this.useFood(player);
    }
    
    // Plus de consommables
    console.log(`❌ [ConsumableManager] ${player.characterName} n'a plus de consommables !`);
    return false;
  }
  
  /**
   * Utilise une potion HP
   */
  private usePotionHP(player: PlayerState): boolean {
    const healAmount = 200; // Une potion soigne 200 HP
    
    // Consommer la potion
    player.potionHP--;
    
    // Soigner le joueur
    const hpBefore = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    const actualHeal = player.hp - hpBefore;
    
    console.log(`💊 [ConsumableManager] ${player.characterName} utilise une Potion HP`);
    console.log(`   +${actualHeal} HP (${hpBefore} → ${player.hp}/${player.maxHp})`);
    console.log(`   Potions restantes: ${player.potionHP}`);
    
    return true;
  }
  
  /**
   * Utilise de la nourriture
   */
  private useFood(player: PlayerState): boolean {
    const healAmount = 100; // La nourriture soigne 100 HP
    
    // Consommer la nourriture
    player.food--;
    
    // Soigner le joueur
    const hpBefore = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    const actualHeal = player.hp - hpBefore;
    
    console.log(`🍖 [ConsumableManager] ${player.characterName} utilise de la Nourriture`);
    console.log(`   +${actualHeal} HP (${hpBefore} → ${player.hp}/${player.maxHp})`);
    console.log(`   Nourriture restante: ${player.food}`);
    
    return true;
  }
  
  /**
   * Vérifie si le joueur a encore des consommables
   */
  hasConsumables(player: PlayerState): boolean {
    return player.potionHP > 0 || player.food > 0;
  }
  
  /**
   * Compte le nombre total de consommables
   */
  getTotalConsumables(player: PlayerState): number {
    return player.potionHP + player.food;
  }
  
  /**
   * Donne des consommables à un joueur (pour les tests)
   */
  giveConsumables(player: PlayerState, potions: number, food: number): void {
    player.potionHP += potions;
    player.food += food;
    
    console.log(`🎁 [ConsumableManager] ${player.characterName} reçoit ${potions} potions et ${food} nourriture`);
    console.log(`   Total: ${player.potionHP} potions, ${player.food} nourriture`);
  }
  
  /**
   * Réinitialise les consommables d'un joueur (pour les tests)
   */
  resetConsumables(player: PlayerState, potions: number = 10, food: number = 20): void {
    player.potionHP = potions;
    player.food = food;
    
    console.log(`🔄 [ConsumableManager] Consommables réinitialisés pour ${player.characterName}`);
    console.log(`   ${potions} potions, ${food} nourriture`);
  }
}
