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
    
    // CORRIGÉ: On s'assure que le chemin pointe bien vers le dossier source, pas le dossier compilé.
    // On part de __filename (le fichier actuel) et on remonte jusqu'au dossier des talents.
    const talentsDir = path.resolve(__dirname);

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
      } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'ITalentScript.ts' && entry.name !== 'TalentScriptRegistry.ts') {
        await this.loadScript(fullPath);
      }
    }
  }

  private async loadScript(scriptPath: string): Promise<void> {
    try {
      // CORRIGÉ: On utilise path.resolve pour s'assurer que le chemin est absolu et correct
      const module = await import(path.resolve(scriptPath));
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

  public get(scriptName: string): ITalentScript | undefined {
    if (!this.isInitialized) {
      console.warn("⚠️ [TalentScriptRegistry] Tentative d'accès à un script avant l'initialisation.");
      return undefined;
    }
    return this.scripts.get(scriptName);
  }
}

export const talentScriptRegistry = TalentScriptRegistry.getInstance();
