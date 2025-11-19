/**
 * AFKBehaviorManager
 * -------------------
 * Responsable du comportement du joueur en mode AFK :
 * - Le joueur reste totalement immobile (position figée)
 * - Fournit les outils de calcul de distance pour le combat AFK
 * - Fournit une fonction simple pour vérifier la portée
 * 
 * Aucun accès au GameState ici.
 * Cette classe est volontairement ultra légère et stateless.
 */

export class AFKBehaviorManager {

  /**
   * Force le joueur à rester à sa position AFK
   * (téléportation silencieuse si le joueur a bougé)
   */
  enforceStaticPosition(
    player: { posX: number; posY: number; posZ: number },
    referencePos: { x: number; y: number; z: number }
  ): void {
    if (
      player.posX !== referencePos.x ||
      player.posY !== referencePos.y ||
      player.posZ !== referencePos.z
    ) {
      player.posX = referencePos.x;
      player.posY = referencePos.y;
      player.posZ = referencePos.z;
    }
  }

  /**
   * Vérifie si une cible est à portée maximale depuis la position AFK
   */
  isWithinRange(
    referencePos: { x: number; y: number; z: number },
    targetPos: { x: number; y: number; z: number },
    maxDistance: number
  ): boolean {
    return (
      this.getDistance(referencePos, targetPos) <= maxDistance
    );
  }

  /**
   * Retourne la distance entre la position AFK et une cible
   */
  getDistanceFromReference(
    referencePos: { x: number; y: number; z: number },
    targetPos: { x: number; y: number; z: number }
  ): number {
    return this.getDistance(referencePos, targetPos);
  }

  /**
   * Fonction interne pour calculer une distance en 3D
   */
  private getDistance(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
