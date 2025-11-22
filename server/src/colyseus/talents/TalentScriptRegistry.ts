import fs from 'fs/promises';
import path from 'path';
import { ITalentScript } from './ITalentScript';

/**
 * Registre qui charge et fournit l'accès à tous les scripts de talents.
 * Implémente un pattern Singleton pour n'être initialisé qu'une seule fois.
 */
class TalentScriptRegistry {
  private scripts: Map<string, ITalentScript> = new Map();
  private isInitialized = false;

  // L'instance unique de la classe (Singleton)
  private static instance: TalentScriptRegistry;

  // Le constructeur est privé pour forcer l'utilisation du singleton.
  private constructor() {}

  /**
   * Récupère l'instance unique du registre.
   */
  public static getInstance(): TalentScriptRegistry {
    if (!TalentScriptRegistry.instance) {
      TalentScriptRegistry.instance = new TalentScriptRegistry();
    }
    return TalentScriptRegistry.instance;
  }

  /**
   * Scanne le dossier des talents et charge tous les scripts .ts trouvés.
   * Cette méthode doit être appelée une seule fois au démarrage du serveur.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("🔧 [TalentScriptRegistry] Déjà initialisé.");
      return;
    }

    console.log("🔧 [TalentScriptRegistry] Initialisation...");
    const talentsDir = path.join(__dirname); // Le dossier actuel est .../colyseus/talents

    try {
      await this.loadScriptsFromDirectory(talentsDir);
    } catch (error) {
      console.error("❌ [TalentScriptRegistry] Échec de la lecture du dossier des talents:", error);
      return;
    }

    console.log(`✅ [TalentScriptRegistry] Initialisé. ${this.scripts.size} script(s) chargé(s).`);
    this.isInitialized = true;
  }

  /**
   * Charge récursivement les scripts depuis un répertoire.
   */
  private async loadScriptsFromDirectory(dirPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.loadScriptsFromDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'ITalentScript.ts' && entry.name !== 'TalentScriptRegistry.ts') {
        await this.loadScript(fullPath);
      }
    }
  }

  /**
   * Charge un script de talent et l'ajoute au registre.
   */
  private async loadScript(scriptPath: string): Promise<void> {
    try {
      const module = await import(scriptPath);
      const TalentClass = module.default;

      if (!TalentClass) {
        console.warn(`⚠️ [TalentScriptRegistry] Le script ${scriptPath} n'a pas d'export par défaut.`);
        return;
      }

      const scriptInstance: ITalentScript = new TalentClass();
      const scriptName = path.basename(scriptPath, '.ts');
      this.scripts.set(scriptName, scriptInstance);
      console.log(`  ➕ Chargé: ${scriptName}`);

    } catch (error) {
      console.error(`❌ [TalentScriptRegistry] Erreur lors du chargement du script ${scriptPath}:`, error);
    }
  }

  /**
   * Récupère une instance de script de talent par son nom.
   * @param scriptName Le nom du script (ex: "critical_strike")
   * @returns L'instance du script ou undefined si non trouvé.
   */
  public get(scriptName: string): ITalentScript | undefined {
    if (!this.isInitialized) {
      console.warn("⚠️ [TalentScriptRegistry] Tentative d'accès à un script avant l'initialisation.");
      return undefined;
    }
    return this.scripts.get(scriptName);
  }
}

// Export de l'instance unique via la méthode getInstance()
export const talentScriptRegistry = TalentScriptRegistry.getInstance();
