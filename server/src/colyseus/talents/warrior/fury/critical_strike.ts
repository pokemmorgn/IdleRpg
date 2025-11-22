import { PlayerState } from "../../schema/PlayerState";
import { ITalentScript } from "../ITalentScript";

export default class CriticalStrikeTalent implements ITalentScript {
  // Chaque rang donne +1.5% de coup critique
  private readonly CRIT_PER_RANK = 1.5;

  getStatBonus(player: PlayerState, rank: number): Partial<import("../../../models/ServerProfile").IPlayerComputedStats> {
    return {
      criticalChance: this.CRIT_PER_RANK * rank
    };
  }

  // Exemple : si ce talent débloquait une compétence au rang 5
  /*
  onLearn(player: PlayerState, rank: number): void {
    if (rank === 5) {
      // Logique pour ajouter un skillId à la barre de sorts du joueur
      if (!player.skillBar.includes("warrior_cleave")) {
        player.skillBar.push("warrior_cleave");
      }
    }
  }

  onUnlearn(player: PlayerState, rank: number): void {
    if (rank === 4) { // On retire le rang 5, donc on nettoie
      const index = player.skillBar.indexOf("warrior_cleave");
      if (index > -1) {
        player.skillBar.splice(index, 1);
      }
    }
  }
  */
}
