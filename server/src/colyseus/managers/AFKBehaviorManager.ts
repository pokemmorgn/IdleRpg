import { PlayerState } from "../schema/PlayerState";

/**
 * AFKBehaviorManager - Gère la logique de position en mode AFK
 * 
 * Responsabilités :
 * - Maintenir le joueur à sa position de référence (pas de mouvement)
 * - Vérifier que les monstres sont dans le rayon d'attaque (40m)
 * - Si monstre trop loin → Tant pis, on l'ignore
 * 
 * NOTE : Ce manager est volontairement simple.
 * Le joueur en AFK reste COMPLÈTEMENT STATIQUE à sa position de référence.
 * Il n'attaque que les monstres qui sont à portée (40m).
 * Fichier modulaire pour faciliter les modifications futures si besoin.
 */
export class AFKBehaviorManager {
  
  // Constantes de comportement
  private readonly MAX_ATTACK_RANGE = 40; // Distance max pour attaquer un monstre (mètres)
  
  /**
   * Vérifie si un monstre est à portée d'attaque depuis la position de référence
   * 
   * @param referencePosition - Position de référence AFK du joueur
   * @param monsterPosition - Position du monstre
   * @returns true si le monstre est à portée, false sinon
   */
  isMonsterInRange(
    referencePosition: { x: number; y: number; z: number },
    monsterPosition: { x: number; y: number; z: number }
  ): boolean {
    const distance = this.getDistance(
      referencePosition.x, referencePosition.y, referencePosition.z,
      monsterPosition.x, monsterPosition.y, monsterPosition.z
    );
    
    return distance <= this.MAX_ATTACK_RANGE;
  }
  
  /**
   * Force le joueur à rester à sa position de référence
   * (appelé à chaque tick pour s'assurer qu'il ne bouge pas)
   * 
   * @param player - État du joueur
   * @param referencePosition - Position de référence AFK
   */
  enforceStaticPosition(
    player: PlayerState,
    referencePosition: { x: number; y: number; z: number }
  ): void {
    // Vérifier si le joueur a bougé de sa position de référence
    if (
      player.posX !== referencePosition.x ||
      player.posY !== referencePosition.y ||
      player.posZ !== referencePosition.z
    ) {
      // Forcer le retour à la position de référence (téléportation instantanée)
      player.posX = referencePosition.x;
      player.posY = referencePosition.y;
      player.posZ = referencePosition.z;
      
      console.log(`📍 [AFKBehavior] ${player.characterName} repositionné à sa position AFK`);
    }
  }
  
  /**
   * Calcule la distance entre deux positions 3D
   */
  private getDistance(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Récupère la distance max d'attaque
   */
  getMaxAttackRange(): number {
    return this.MAX_ATTACK_RANGE;
  }
  
  /**
   * Récupère la distance actuelle entre la position de référence et une cible
   */
  getDistanceFromReference(
    referencePosition: { x: number; y: number; z: number },
    targetPosition: { x: number; y: number; z: number }
  ): number {
    return this.getDistance(
      referencePosition.x, referencePosition.y, referencePosition.z,
      targetPosition.x, targetPosition.y, targetPosition.z
    );
  }
}
