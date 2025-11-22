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

  private static instance: TalentScriptRegistry;

  private constructor() {}

  public static getInstance(): TalentScriptRegistry {
    if (!TalentScriptRegistry.instance) {
      TalentScriptRegistry.instance = new TalentScriptRegistry();
    }
    return TalentScriptRegistry.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("🔧 [TalentScriptRegistry] Déjà initialisé.");
      return;
    }

    console.log("🔧 [TalentScriptRegistry] Initialisation...");
    
    // CORRIGÉ: On construit le chemin vers le dossier DISTRIBUÉ (dist/colyseus/talents)
    // On part de __dirname (qui est dans dist/colyseus/talents) et on reste là.
    const talentsDir = __dirname;

    try {
      await this.loadScriptsFromDirectory(talentsDir);
    } catch (error) {
      console.error("❌ [TalentScriptRegistry] Échec de la lecture du dossier des talents:", error);
      return;
    }

    console.log(`✅ [TalentScriptRegistry] Initialisé. ${this.scripts.size} script(s) chargé(s).`);
    this.isInitialized = true;
  }

  private async loadScriptsFromDirectory(dirPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.loadScriptsFromDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'ITalentScript.js' && entry.name !== 'TalentScriptRegistry.js') {
        // CORRIGÉ: On cherche les fichiers .js compilés
        await this.loadScript(fullPath);
      }
    }
  }

  private async loadScript(scriptPath: string): Promise<void> {
    try {
      // CORRIGÉ: On importe le fichier .js
      const module = await import(scriptPath);
      const TalentClass = module.default;

      if (!TalentClass) {
        console.warn(`⚠️ [TalentScriptRegistry] Le script ${scriptPath} n'a pas d'export par défaut.`);
        return;
      }

      const scriptInstance: ITalentScript = new TalentClass();
      // CORRIGÉ: On extrait le nom du fichier .js
      const scriptName = path.basename(scriptPath, '.js');
      this.scripts.set(scriptName, scriptInstance);
      console.log(`  ➕ Chargé: ${scriptName}`);

    } catch (error) {
      console.error(`❌ [TalentScriptRegistry] Erreur lors du chargement du script ${scriptPath}:`, error);
    }
  }

  public get(scriptName: string): ITalentScript | undefined {
    if (!this.isInitialized) {
      console.warn("⚠️ [TalentScriptRegistry] Tentative d'accès à un script avant l'initialisation.");
      return undefined;
    }
    return this.scripts.get(scriptName);
  }
}

export const talentScriptRegistry = TalentScriptRegistry.getInstance();
