import { PlayerState } from "../schema/PlayerState";
import { InventoryState } from "../schema/InventoryState"; // On importe l'inventaire

/**
 * Types de consommables disponibles
 */
interface ConsumableType {
  itemId: string;
  name: string;
  healAmount: number;
  minLevel: number;
}

/**
 * Configuration des potions HP
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
 * Configuration de la nourriture
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
 * ConsumableManager - Gère la consommation via l'inventaire du joueur
 */
export class ConsumableManager {
  
  /**
   * Tente de soigner un joueur si nécessaire
   */
  tryHealPlayer(player: PlayerState): boolean {
    const needsHealing = player.hp < player.maxHp * 0.5;
    
    if (!needsHealing) {
      return true; // Pas besoin de soins
    }
    
    console.log(`🩹 [ConsumableManager] ${player.characterName} a besoin de soins (HP: ${player.hp}/${player.maxHp})`);
    
    // Priorité 1 : Potions HP
    const potionToUse = this.getBestConsumableForLevel(POTION_TIERS, player.level);
    if (this.getItemCount(player, potionToUse.itemId) > 0) {
      return this.useConsumable(player, potionToUse);
    }
    
    // Priorité 2 : Nourriture
    const foodToUse = this.getBestConsumableForLevel(FOOD_TIERS, player.level);
    if (this.getItemCount(player, foodToUse.itemId) > 0) {
      return this.useConsumable(player, foodToUse);
    }
    
    console.log(`❌ [ConsumableManager] ${player.characterName} n'a plus de consommables !`);
    return false;
  }
  
  /**
   * Utilise un consommable de l'inventaire
   */
  private useConsumable(player: PlayerState, consumable: ConsumableType): boolean {
    // 1. Retirer l'objet de l'inventaire
    if (!this.removeItemFromInventory(player, consumable.itemId, 1)) {
        console.error(`Erreur: Impossible de retirer 1x ${consumable.itemId} de l'inventaire de ${player.characterName}`);
        return false;
    }

    // 2. Soigner le joueur
    const hpBefore = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + consumable.healAmount);
    const actualHeal = player.hp - hpBefore;
    
    console.log(`💊 [ConsumableManager] ${player.characterName} utilise ${consumable.name}`);
    console.log(`   +${actualHeal} HP (${hpBefore} → ${player.hp}/${player.maxHp})`);
    
    return true;
  }

  // --- Méthodes utilitaires pour l'inventaire ---

  /**
   * Récupère le nombre d'un certain item dans l'inventaire personnel.
   */
  private getItemCount(player: PlayerState, itemId: string): number {
    return player.inventory.personalItems.get(itemId) || 0;
  }

  /**
   * Retire un certain nombre d'items de l'inventaire.
   * @returns true si succès, false si l'item n'existe pas ou pas assez.
   */
  private removeItemFromInventory(player: PlayerState, itemId: string, quantity: number): boolean {
    const currentCount = this.getItemCount(player, itemId);
    if (currentCount < quantity) {
      return false;
    }

    const newCount = currentCount - quantity;
    if (newCount <= 0) {
      player.inventory.personalItems.delete(itemId);
    } else {
      player.inventory.personalItems.set(itemId, newCount);
    }
    
    // NOTE: Il faudra appeler la sauvegarde de l'inventaire après cette opération.
    // Le système qui appelle `tryHealPlayer` devrait s'en charger.
    return true;
  }
  
  /**
   * Ajoute un item à l'inventaire (pour les tests / récompenses).
   */
  private addItemToInventory(player: PlayerState, itemId: string, quantity: number): void {
    const currentCount = this.getItemCount(player, itemId);
    player.inventory.personalItems.set(itemId, currentCount + quantity);
  }

  // --- Méthodes publiques (adaptées pour l'inventaire) ---

  private getBestConsumableForLevel(tiers: ConsumableType[], playerLevel: number): ConsumableType {
    let bestTier = tiers[0];
    for (const tier of tiers) {
      if (playerLevel >= tier.minLevel) {
        bestTier = tier;
      } else {
        break;
      }
    }
    return bestTier;
  }
  
  getCurrentPotionInfo(playerLevel: number): ConsumableType {
    return this.getBestConsumableForLevel(POTION_TIERS, playerLevel);
  }
  
  getCurrentFoodInfo(playerLevel: number): ConsumableType {
    return this.getBestConsumableForLevel(FOOD_TIERS, playerLevel);
  }
  
  hasConsumables(player: PlayerState): boolean {
    const potionToCheck = this.getBestConsumableForLevel(POTION_TIERS, player.level);
    const foodToCheck = this.getBestConsumableForLevel(FOOD_TIERS, player.level);
    return this.getItemCount(player, potionToCheck.itemId) > 0 || this.getItemCount(player, foodToCheck.itemId) > 0;
  }
  
  getTotalConsumables(player: PlayerState): number {
    let total = 0;
    POTION_TIERS.forEach(p => total += this.getItemCount(player, p.itemId));
    FOOD_TIERS.forEach(f => total += this.getItemCount(player, f.itemId));
    return total;
  }
  
  /**
   * Donne des consommables à un joueur (pour les tests)
   */
  giveConsumables(player: PlayerState, potions: number, food: number): void {
    const potionInfo = this.getCurrentPotionInfo(player.level);
    const foodInfo = this.getCurrentFoodInfo(player.level);
    
    this.addItemToInventory(player, potionInfo.itemId, potions);
    this.addItemToInventory(player, foodInfo.itemId, food);
    
    console.log(`🎁 [ConsumableManager] ${player.characterName} reçoit:`);
    console.log(`   ${potions}x ${potionInfo.name} (${potionInfo.healAmount} HP chacune)`);
    console.log(`   ${food}x ${foodInfo.name} (${foodInfo.healAmount} HP chacune)`);
  }
  
  /**
   * Réinitialise les consommables d'un joueur (pour les tests)
   */
  resetConsumables(player: PlayerState, potions: number = 10, food: number = 20): void {
    // On vide d'abord les anciens
    POTION_TIERS.forEach(p => player.inventory.personalItems.delete(p.itemId));
    FOOD_TIERS.forEach(f => player.inventory.personalItems.delete(f.itemId));

    // On ajoute les nouveaux
    this.giveConsumables(player, potions, food);
  }
  
  static getAllPotionTiers(): ConsumableType[] {
    return POTION_TIERS;
  }
  
  static getAllFoodTiers(): ConsumableType[] {
    return FOOD_TIERS;
  }
}
