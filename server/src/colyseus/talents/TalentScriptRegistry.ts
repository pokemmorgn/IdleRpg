// ...

import { LevelManager } from "../managers/LevelManager";
import { QuestObjectiveManager } from "../managers/QuestObjectiveManager";
// AJOUT: Importer le registre de scripts de talents
import { talentScriptRegistry } from "../talents/TalentScriptRegistry";

export class WorldRoom extends Room<GameState> {
  // ...

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    console.log(`🟢 onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");

    // AJOUT: Initialiser le registre de talents AVANT de l'utiliser
    await talentScriptRegistry.initialize();

    new SkinManager();

    // Load managers
    // ...
  }
  // ...
}
