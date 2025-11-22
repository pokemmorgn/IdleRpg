import { PlayerState } from "../../../schema/PlayerState";
import { ITalentScript } from "../../ITalentScript";

export default class SmiteTalent implements ITalentScript {
  // Chaque rang donne +2 à la puissance des sorts
  private readonly SPELL_POWER_PER_RANK = 2;

  getStatBonus(player: PlayerState, rank: number): Partial<any> {
    return {
      spellPower: this.SPELL_POWER_PER_RANK * rank
    };
  }

  // Exemple : si ce talent débloquait une compétence au rang 3
  /*
  onLearn(player: PlayerState, rank: number): void {
    if (rank === 3) {
      // Logique pour ajouter un skillId à la barre de sorts du joueur
      if (!player.skillBar.includes("priest_smite")) {
        player.skillBar.push("priest_smite");
      }
    }
  }

  onUnlearn(player: PlayerState, rank: number): void {
    if (rank === 2) { // On retire le rang 3, donc on nettoie
      const index = player.skillBar.indexOf("priest_smite");
      if (index > -1) {
        player.skillBar.splice(index, 1);
      }
    }
  }
  */
}
