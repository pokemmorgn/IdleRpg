import { PlayerState } from "../schema/PlayerState";

/**
 * AFKBehaviorManager (Version propre)
 *
 * Objectifs :
 * - Le joueur AFK reste *statique*
 * - Le joueur ne doit pas bouger volontairement
 * - MAIS le monstre doit pouvoir s’approcher normalement
 * - Aucune téléportation inutile
 */
export class AFKBehaviorManager {

  // Distance maximale autorisée entre la position AFK
  // et la position actuelle du joueur avant correction.
  private readonly POSITION_TOLERANCE = 0.5; // mètres

  /**
   * Maintient le joueur proche de sa position AFK,
   * mais uniquement si il s’en éloigne trop.
   *
   * @param player - Joueur en mode AFK
   * @param referencePosition - Position AFK fixe
   */
  enforceStaticPosition(
    player: PlayerState,
    referencePosition: { x: number; y: number; z: number }
  ): void {

    if (!player.isAFK) return; // Ne rien faire si pas AFK

    // Calcul de la distance entre la position actuelle du joueur
    // et sa position AFK
    const dx = player.posX - referencePosition.x;
    const dy = player.posY - referencePosition.y;
    const dz = player.posZ - referencePosition.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Si le joueur est dans une zone acceptable → ne rien faire
    if (distance <= this.POSITION_TOLERANCE) {
      return;
    }

    // Sinon → on remet le joueur à sa position AFK (doucement)
    player.posX = referencePosition.x;
    player.posY = referencePosition.y;
    player.posZ = referencePosition.z;

    console.log(
      `📍 [AFK] Correction de position pour ${player.characterName} (écart: ${distance.toFixed(
        2
      )}m)`
    );
  }

  /**
   * Distance utilitaire
   */
  private getDistance(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number
  ): number {
    const dx = x2 - x1;
    const dy = x2 - x1;
    const dz = x2 - x1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
