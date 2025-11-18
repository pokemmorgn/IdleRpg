import PlayerTags, { IPlayerTags } from "../models/PlayerTags";

/**
 * GameplayTagManager - Gère les tags de gameplay pour les joueurs
 * Inspiré du système de Gameplay Tags d'Unreal Engine 5
 */
export class GameplayTagManager {
  
  /**
   * Ajoute un tag à un joueur (si pas déjà présent)
   */
  static async addTag(profileId: string, tag: string): Promise<boolean> {
    try {
      // Normaliser le tag (lowercase, trim)
      const normalizedTag = tag.toLowerCase().trim();
      
      if (!normalizedTag) {
        console.warn(`⚠️  [GameplayTag] Tag vide ignoré pour ${profileId}`);
        return false;
      }

      // Récupérer ou créer le document PlayerTags
      let playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        playerTags = await PlayerTags.create({
          profileId,
          tags: [normalizedTag]
        });
        console.log(`✅ [GameplayTag] Tag ajouté: ${normalizedTag} pour ${profileId}`);
        return true;
      }

      // Vérifier si le tag existe déjà
      if (playerTags.tags.includes(normalizedTag)) {
        console.log(`ℹ️  [GameplayTag] Tag déjà présent: ${normalizedTag} pour ${profileId}`);
        return false;
      }

      // Ajouter le tag
      playerTags.tags.push(normalizedTag);
      await playerTags.save();
      
      console.log(`✅ [GameplayTag] Tag ajouté: ${normalizedTag} pour ${profileId}`);
      return true;

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur addTag:`, err.message);
      return false;
    }
  }

  /**
   * Retire un tag d'un joueur
   */
  static async removeTag(profileId: string, tag: string): Promise<boolean> {
    try {
      const normalizedTag = tag.toLowerCase().trim();
      
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        console.log(`ℹ️  [GameplayTag] Aucun tag trouvé pour ${profileId}`);
        return false;
      }

      // Retirer le tag
      const initialLength = playerTags.tags.length;
      playerTags.tags = playerTags.tags.filter(t => t !== normalizedTag);
      
      if (playerTags.tags.length === initialLength) {
        console.log(`ℹ️  [GameplayTag] Tag non trouvé: ${normalizedTag} pour ${profileId}`);
        return false;
      }

      await playerTags.save();
      
      console.log(`✅ [GameplayTag] Tag retiré: ${normalizedTag} de ${profileId}`);
      return true;

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur removeTag:`, err.message);
      return false;
    }
  }

  /**
   * Vérifie si un joueur a un tag exact
   */
  static async hasTag(profileId: string, tag: string): Promise<boolean> {
    try {
      const normalizedTag = tag.toLowerCase().trim();
      
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        return false;
      }

      return playerTags.tags.includes(normalizedTag);

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur hasTag:`, err.message);
      return false;
    }
  }

  /**
   * Vérifie si un joueur a un tag qui correspond à un pattern
   * Ex: hasTagMatching(profileId, "dialogue.thorin.*") 
   * → true si le joueur a n'importe quel tag commençant par "dialogue.thorin."
   */
  static async hasTagMatching(profileId: string, pattern: string): Promise<boolean> {
    try {
      const normalizedPattern = pattern.toLowerCase().trim();
      
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        return false;
      }

      // Convertir le pattern en regex
      // "dialogue.thorin.*" → /^dialogue\.thorin\..*/
      const regexPattern = normalizedPattern
        .replace(/\./g, "\\.")  // Échapper les points
        .replace(/\*/g, ".*");  // Remplacer * par .*
      
      const regex = new RegExp(`^${regexPattern}$`);

      return playerTags.tags.some(tag => regex.test(tag));

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur hasTagMatching:`, err.message);
      return false;
    }
  }

  /**
   * Vérifie si un joueur a TOUS les tags spécifiés (ET logique)
   */
  static async hasAllTags(profileId: string, tags: string[]): Promise<boolean> {
    try {
      if (tags.length === 0) {
        return true;
      }

      const normalizedTags = tags.map(t => t.toLowerCase().trim());
      
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        return false;
      }

      return normalizedTags.every(tag => playerTags.tags.includes(tag));

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur hasAllTags:`, err.message);
      return false;
    }
  }

  /**
   * Vérifie si un joueur a AU MOINS UN des tags spécifiés (OU logique)
   */
  static async hasAnyTag(profileId: string, tags: string[]): Promise<boolean> {
    try {
      if (tags.length === 0) {
        return false;
      }

      const normalizedTags = tags.map(t => t.toLowerCase().trim());
      
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        return false;
      }

      return normalizedTags.some(tag => playerTags.tags.includes(tag));

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur hasAnyTag:`, err.message);
      return false;
    }
  }

  /**
   * Récupère tous les tags d'un joueur
   */
  static async getTags(profileId: string): Promise<string[]> {
    try {
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        return [];
      }

      return playerTags.tags;

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur getTags:`, err.message);
      return [];
    }
  }

  /**
   * Récupère tous les tags qui correspondent à un pattern
   */
  static async getTagsMatching(profileId: string, pattern: string): Promise<string[]> {
    try {
      const normalizedPattern = pattern.toLowerCase().trim();
      
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        return [];
      }

      // Convertir le pattern en regex
      const regexPattern = normalizedPattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*");
      
      const regex = new RegExp(`^${regexPattern}$`);

      return playerTags.tags.filter(tag => regex.test(tag));

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur getTagsMatching:`, err.message);
      return [];
    }
  }

  /**
   * Compte le nombre de tags d'un joueur
   */
  static async countTags(profileId: string): Promise<number> {
    try {
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        return 0;
      }

      return playerTags.tags.length;

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur countTags:`, err.message);
      return 0;
    }
  }

  /**
   * Supprime tous les tags d'un joueur
   */
  static async clearAllTags(profileId: string): Promise<boolean> {
    try {
      const playerTags = await PlayerTags.findOne({ profileId });
      
      if (!playerTags) {
        console.log(`ℹ️  [GameplayTag] Aucun tag à supprimer pour ${profileId}`);
        return false;
      }

      playerTags.tags = [];
      await playerTags.save();
      
      console.log(`✅ [GameplayTag] Tous les tags supprimés pour ${profileId}`);
      return true;

    } catch (err: any) {
      console.error(`❌ [GameplayTag] Erreur clearAllTags:`, err.message);
      return false;
    }
  }
}
