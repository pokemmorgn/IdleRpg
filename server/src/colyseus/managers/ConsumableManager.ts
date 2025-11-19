import { PlayerState } from "../schema/PlayerState";

/**
 * Types de consommables disponibles
 * Tous les 10 levels, un nouveau tier débloqué avec plus de soin
 */
interface ConsumableType {
  itemId: string;
  name: string;
  healAmount: number;
  minLevel: number;
}

/**
 * Configuration des potions HP (tous les 10 levels)
 */
const POTION_TIERS: ConsumableType[] = [
  { itemId: "potion_hp_t1", name: "Minor Health Potion", healAmount: 200, minLevel: 1 },
  { itemId: "potion_hp_t2", name: "Health Potion", healAmount: 500, minLevel: 10 },
  { itemId: "potion_hp_t3", name: "Greater Health Potion", healAmount: 1000, minLevel: 20 },
  { itemId: "potion_hp_t4", name: "Superior Health Potion", healAmount: 2000, minLevel: 30 },
  { itemId: "potion_hp_t5", name: "Epic Health Potion", healAmount: 3500, minLevel: 40 },
  { itemId: "potion_hp_t6", name: "Legendary Health Potion", healAmount: 5000, minLevel: 50 },
];

/**
 * Configuration de la nourriture (tous les 10 levels)
 */
const FOOD_TIERS: ConsumableType[] = [
  { itemId: "food_t1", name: "Bread", healAmount: 100, minLevel: 1 },
  { itemId: "food_t2", name: "Cooked Meat", healAmount: 250, minLevel: 10 },
  { itemId: "food_t3", name: "Roasted Fish", healAmount: 500, minLevel: 20 },
  { itemId: "food_t4", name: "Grilled Steak", healAmount: 1000, minLevel: 30 },
  { itemId: "food_t5", name: "Feast Platter", healAmount: 1750, minLevel: 40 },
  { itemId: "food_t6", name: "Royal Banquet", healAmount: 2500, minLevel: 50 },
];

/**
 * ConsumableManager - Gère la consommation automatique de potions/nourriture
 * 
 * Responsabilités :
 * - Détecter quand le joueur a besoin de soins (HP < 50%)
 * - Chercher le meilleur consommable disponible selon le level
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
   * Utilise une potion HP (meilleure disponible selon le level)
   */
  private usePotionHP(player: PlayerState): boolean {
    // Trouver le meilleur tier disponible pour le level du joueur
    const bestPotion = this.getBestConsumableForLevel(POTION_TIERS, player.level);
    
    // Consommer la potion
    player.potionHP--;
    
    // Soigner le joueur
    const hpBefore = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + bestPotion.healAmount);
    const actualHeal = player.hp - hpBefore;
    
    console.log(`💊 [ConsumableManager] ${player.characterName} utilise ${bestPotion.name}`);
    console.log(`   +${actualHeal} HP (${hpBefore} → ${player.hp}/${player.maxHp})`);
    console.log(`   Potions restantes: ${player.potionHP}`);
    
    return true;
  }
  
  /**
   * Utilise de la nourriture (meilleure disponible selon le level)
   */
  private useFood(player: PlayerState): boolean {
    // Trouver le meilleur tier disponible pour le level du joueur
    const bestFood = this.getBestConsumableForLevel(FOOD_TIERS, player.level);
    
    // Consommer la nourriture
    player.food--;
    
    // Soigner le joueur
    const hpBefore = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + bestFood.healAmount);
    const actualHeal = player.hp - hpBefore;
    
    console.log(`🍖 [ConsumableManager] ${player.characterName} utilise ${bestFood.name}`);
    console.log(`   +${actualHeal} HP (${hpBefore} → ${player.hp}/${player.maxHp})`);
    console.log(`   Nourriture restante: ${player.food}`);
    
    return true;
  }
  
  /**
   * Trouve le meilleur consommable disponible pour le level du joueur
   */
  private getBestConsumableForLevel(tiers: ConsumableType[], playerLevel: number): ConsumableType {
    // Trouver le tier le plus élevé accessible
    let bestTier = tiers[0]; // Par défaut, le tier 1
    
    for (const tier of tiers) {
      if (playerLevel >= tier.minLevel) {
        bestTier = tier;
      } else {
        break; // On a trouvé le meilleur tier accessible
      }
    }
    
    return bestTier;
  }
  
  /**
   * Récupère les infos du consommable actuel pour le level
   */
  getCurrentPotionInfo(playerLevel: number): ConsumableType {
    return this.getBestConsumableForLevel(POTION_TIERS, playerLevel);
  }
  
  /**
   * Récupère les infos de la nourriture actuelle pour le level
   */
  getCurrentFoodInfo(playerLevel: number): ConsumableType {
    return this.getBestConsumableForLevel(FOOD_TIERS, playerLevel);
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
    
    const potionInfo = this.getCurrentPotionInfo(player.level);
    const foodInfo = this.getCurrentFoodInfo(player.level);
    
    console.log(`🎁 [ConsumableManager] ${player.characterName} reçoit:`);
    console.log(`   ${potions}x ${potionInfo.name} (${potionInfo.healAmount} HP chacune)`);
    console.log(`   ${food}x ${foodInfo.name} (${foodInfo.healAmount} HP chacune)`);
    console.log(`   Total: ${player.potionHP} potions, ${player.food} nourriture`);
  }
  
  /**
   * Réinitialise les consommables d'un joueur (pour les tests)
   */
  resetConsumables(player: PlayerState, potions: number = 10, food: number = 20): void {
    player.potionHP = potions;
    player.food = food;
    
    const potionInfo = this.getCurrentPotionInfo(player.level);
    const foodInfo = this.getCurrentFoodInfo(player.level);
    
    console.log(`🔄 [ConsumableManager] Consommables réinitialisés pour ${player.characterName} (Lv${player.level})`);
    console.log(`   ${potions}x ${potionInfo.name} (${potionInfo.healAmount} HP)`);
    console.log(`   ${food}x ${foodInfo.name} (${foodInfo.healAmount} HP)`);
  }
  
  /**
   * Liste tous les tiers de potions disponibles
   */
  static getAllPotionTiers(): ConsumableType[] {
    return POTION_TIERS;
  }
  
  /**
   * Liste tous les tiers de nourriture disponibles
   */
  static getAllFoodTiers(): ConsumableType[] {
    return FOOD_TIERS;
  }
}
