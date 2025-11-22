import { PlayerState } from "../schema/PlayerState";
import { IPlayerComputedStats } from "../../models/ServerProfile";

/**
 * Interface que chaque script de talent doit implémenter.
 */
export interface ITalentScript {
  /**
   * Calcule et retourne le bonus de stats fourni par ce talent à un certain rang.
   * Cette méthode est appelée par le PlayerStatsCalculator.
   * @param player Le joueur concerné.
   * @param rank Le rang du talent (1, 2, 3...).
   * @returns Un objet partiel de stats à ajouter au joueur.
   */
  getStatBonus(player: PlayerState, rank: number): Partial<IPlayerComputedStats>;

  /**
   * Appelé lorsqu'un joueur apprend un rang de ce talent.
   * Utile pour des effets qui ne sont pas des stats (ex: débloquer une compétence).
   * @param player Le joueur concerné.
   * @param rank Le rang qui vient d'être appris.
   */
  onLearn?(player: PlayerState, rank: number): void;

  /**
   * Appelé lorsqu'un joueur oublie un rang de ce talent (lors d'un respec).
   * Utile pour nettoyer les effets de onLearn.
   * @param player Le joueur concerné.
   * @param rank Le rang qui vient d'être retiré.
   */
  onUnlearn?(player: PlayerState, rank: number): void;
}
