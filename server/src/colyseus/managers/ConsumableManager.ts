import { PlayerState } from "../schema/PlayerState";
import { InventorySlot } from "../schema/InventorySlot"; // On importe InventorySlot

/**
 * Types de consommables disponibles
 */
interface ConsumableType {
  itemId: string;
  name: string;
  healAmount: number;
  minLevel: number;
}

// ... (POTION_TIERS et FOOD_TIERS restent inchangés)
const POTION_TIERS: ConsumableType[] = [
  { itemId: "potion_hp_t1", name: "Minor Health Potion", healAmount: 200, minLevel: 1 },
  { itemId: "potion_hp_t2", name: "Health Potion", healAmount: 500, minLevel: 10 },
  { itemId: "potion_hp_t3", name: "Greater Health Potion", healAmount: 1000, minLevel: 20 },
  { itemId: "potion_hp_t4", name: "Superior Health Potion", healAmount: 2000, minLevel: 30 },
  { itemId: "potion_hp_t5", name: "Epic Health Potion", healAmount: 3500, minLevel: 40 },
  { itemId: "potion_hp_t6", name: "Legendary Health Potion", healAmount: 5000, minLevel: 50 },
];

const FOOD_TIERS: ConsumableType[] = [
  { itemId: "food_t1", name: "Bread", healAmount: 100, minLevel: 1 },
  { itemId: "food_t2", name: "Cooked Meat", healAmount: 250, minLevel: 10 },
  { itemId: "food_t3", name: "Roasted Fish", healAmount: 500, minLevel: 20 },
  { itemId: "food_t4", name: "Grilled Steak", healAmount: 1000, minLevel: 30 },
  { itemId: "food_t5", name: "Feast Platter", healAmount: 1750, minLevel: 40 },
  { itemId: "food_t6", name: "Royal Banquet", healAmount: 2500, minLevel: 50 },
];

export class ConsumableManager {
  
  tryHealPlayer(player: PlayerState): boolean {
    const needsHealing = player.hp < player.maxHp * 0.5;
    if (!needsHealing) return true;
    
    console.log(`🩹 [ConsumableManager] ${player.characterName} a besoin de soins (HP: ${player.hp}/${player.maxHp})`);
    
    const potionToUse = this.getBestConsumableForLevel(POTION_TIERS, player.level);
    if (this.getItemCount(player, potionToUse.itemId) > 0) {
      return this.useConsumable(player, potionToUse);
    }
    
    const foodToUse = this.getBestConsumableForLevel(FOOD_TIERS, player.level);
    if (this.getItemCount(player, foodToUse.itemId) > 0) {
      return this.useConsumable(player, foodToUse);
    }
    
    console.log(`❌ [ConsumableManager] ${player.characterName} n'a plus de consommables !`);
    return false;
  }
  
  private useConsumable(player: PlayerState, consumable: ConsumableType): boolean {
    if (!this.removeItemFromInventory(player, consumable.itemId, 1)) {
        console.error(`Erreur: Impossible de retirer 1x ${consumable.itemId} de l'inventaire de ${player.characterName}`);
        return false;
    }

    const hpBefore = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + consumable.healAmount);
    const actualHeal = player.hp - hpBefore;
    
    console.log(`💊 [ConsumableManager] ${player.characterName} utilise ${consumable.name}`);
    console.log(`   +${actualHeal} HP (${hpBefore} → ${player.hp}/${player.maxHp})`);
    
    return true;
  }

  // --- Méthodes utilitaires pour l'inventaire (CORRIGÉES) ---

  /**
   * Récupère le nombre d'un certain item dans l'inventaire personnel.
   */
  private getItemCount(player: PlayerState, itemId: string): number {
    const slot = player.inventory.personalItems.get(itemId);
    return slot ? slot.amount : 0;
  }

  /**
   * Retire un certain nombre d'items de l'inventaire.
   */
  private removeItemFromInventory(player: PlayerState, itemId: string, quantity: number): boolean {
    const slot = player.inventory.personalItems.get(itemId);

    if (!slot || slot.amount < quantity) {
      return false;
    }

    slot.amount -= quantity;

    if (slot.amount <= 0) {
      slot.clear(); // Utilise la méthode clear() pour bien nettoyer
      player.inventory.personalItems.delete(itemId);
    }
    
    return true;
  }

  /**
   * Ajoute un item à l'inventaire.
   */
  private addItemToInventory(player: PlayerState, itemId: string, quantity: number): void {
    let slot = player.inventory.personalItems.get(itemId);

    if (slot) {
      slot.amount += quantity;
    } else {
      // Crée un nouvel InventorySlot si l'item n'existe pas
      slot = new InventorySlot();
      slot.setItem(itemId, quantity);
      player.inventory.personalItems.set(itemId, slot);
    }
  }

  // --- Le reste des méthodes est inchangé ---
  
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
  
  giveConsumables(player: PlayerState, potions: number, food: number): void {
    const potionInfo = this.getCurrentPotionInfo(player.level);
    const foodInfo = this.getCurrentFoodInfo(player.level);
    
    this.addItemToInventory(player, potionInfo.itemId, potions);
    this.addItemToInventory(player, foodInfo.itemId, food);
    
    console.log(`🎁 [ConsumableManager] ${player.characterName} reçoit:`);
    console.log(`   ${potions}x ${potionInfo.name} (${potionInfo.healAmount} HP chacune)`);
    console.log(`   ${food}x ${foodInfo.name} (${foodInfo.healAmount} HP chacune)`);
  }
  
  resetConsumables(player: PlayerState, potions: number = 10, food: number = 20): void {
    POTION_TIERS.forEach(p => player.inventory.personalItems.delete(p.itemId));
    FOOD_TIERS.forEach(f => player.inventory.personalItems.delete(f.itemId));
    this.giveConsumables(player, potions, food);
  }
  
  static getAllPotionTiers(): ConsumableType[] {
    return POTION_TIERS;
  }
  
  static getAllFoodTiers(): ConsumableType[] {
    return FOOD_TIERS;
  }
}
