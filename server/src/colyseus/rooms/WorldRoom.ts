import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter, isCharacterAlreadyConnected } from "../utils/playerLoader";
import { NPCManager } from "../managers/NPCManager";
import ServerProfile from "../../models/ServerProfile";

interface JoinOptions {
  token: string;
  serverId: string;
  characterSlot: number;
}

interface AuthData {
  playerId: string;
  profileId: string;
  characterName: string;
  level: number;
  characterClass: string;
  characterRace: string;
  characterSlot: number;
}

/**
 * WorldRoom - Room principale du jeu
 * Une instance par serveur logique (s1, s2, s3...)
 * Chaque joueur a son propre monde instancié côté serveur
 * Le GameState contient la liste des joueurs en ligne (présence) + les NPC actifs
 */
export class WorldRoom extends Room<GameState> {
  maxClients = 1000; // Maximum de joueurs par serveur logique
  
  private serverId: string = "";
  private updateInterval: any;
  private npcManager!: NPCManager;  // Gestionnaire des NPC

  /**
   * Création de la room
   */
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    this.roomId = `world_${this.serverId}`;
    
    // Initialiser l'état du monde
    this.setState(new GameState(this.serverId));

    console.log(`🌍 WorldRoom créée pour serveur: ${this.serverId}`);

    // Initialiser le NPCManager
    this.npcManager = new NPCManager(this.serverId, this.state);

    // Charger les NPC depuis MongoDB
    await this.npcManager.loadNPCs();

    // Gestionnaire de messages
    this.onMessage("*", (client, type, message) => {
      this.handleMessage(client, String(type), message);
    });

    // Tick du serveur (30 FPS = ~33ms)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 33);

    // Heartbeat pour mettre à jour worldTime (toutes les secondes)
    this.updateInterval = this.clock.setInterval(() => {
      this.state.updateWorldTime();
    }, 1000);
  }

  /**
   * Authentification du joueur
   * Valide le JWT et charge le personnage depuis MongoDB
   */
  async onAuth(client: Client, options: JoinOptions): Promise<AuthData | false> {
    try {
      console.log(`🔐 Tentative de connexion: ${client.sessionId}`);

      // 1. Vérifier que toutes les options sont présentes
      if (!options.token || !options.serverId || !options.characterSlot) {
        console.log("❌ Options manquantes");
        return false;
      }

      // 2. Vérifier que c'est bien le bon serveur
      if (options.serverId !== this.serverId) {
        console.log(`❌ Mauvais serverId: ${options.serverId} (attendu: ${this.serverId})`);
        return false;
      }

      // 3. Valider le token JWT
      const tokenValidation = await validateToken(options.token);
      if (!tokenValidation.valid || !tokenValidation.playerId) {
        console.log(`❌ Token invalide: ${tokenValidation.error}`);
        return false;
      }

      const playerId = tokenValidation.playerId;

      // 4. Charger le personnage depuis MongoDB
      const characterLoad = await loadPlayerCharacter(
        playerId,
        options.serverId,
        options.characterSlot
      );

      if (!characterLoad.success || !characterLoad.profile) {
        console.log(`❌ Personnage non trouvé: ${characterLoad.error}`);
        return false;
      }

      const profile = characterLoad.profile;

      // 5. Vérifier que le personnage n'est pas déjà connecté
      if (isCharacterAlreadyConnected(this.state.players, profile.profileId)) {
        console.log(`❌ Personnage déjà connecté: ${profile.characterName}`);
        return false;
      }

      console.log(`✅ Auth OK: ${profile.characterName} (${profile.class}/${profile.race})`);

      // Retourner les données du personnage
      return {
        playerId: profile.playerId,
        profileId: profile.profileId,
        characterName: profile.characterName,
        level: profile.level,
        characterClass: profile.class,
        characterRace: profile.race,
        characterSlot: profile.characterSlot
      };

    } catch (err: any) {
      console.error("❌ Erreur dans onAuth:", err.message);
      return false;
    }
  }

  /**
   * Joueur rejoint la room (après auth OK)
   */
  async onJoin(client: Client, options: JoinOptions, auth: AuthData) {
    try {
      console.log(`👤 ${auth.characterName} rejoint ${this.serverId}`);

      // Créer le PlayerState
      const playerState = new PlayerState(
        client.sessionId,
        auth.playerId,
        auth.profileId,
        auth.characterSlot,
        auth.characterName,
        auth.level,
        auth.characterClass,
        auth.characterRace
      );

      // Ajouter au GameState
      this.state.addPlayer(playerState);

      // Mettre à jour lastOnline dans MongoDB (temps réel)
      await this.updateLastOnline(auth.profileId);

      // Message de bienvenue au client
      client.send("welcome", {
        message: `Bienvenue ${auth.characterName} sur ${this.serverId} !`,
        serverId: this.serverId,
        onlinePlayers: this.state.onlineCount,
        npcCount: this.npcManager.getNPCCount()
      });

      console.log(`✅ ${auth.characterName} connecté (${this.state.onlineCount} joueurs, ${this.npcManager.getNPCCount()} NPC)`);

    } catch (err: any) {
      console.error("❌ Erreur dans onJoin:", err.message);
    }
  }

  /**
   * Joueur quitte la room
   */
  async onLeave(client: Client, consented: boolean) {
    try {
      const playerState = this.state.players.get(client.sessionId);

      if (!playerState) {
        return;
      }

      const characterName = playerState.characterName;
      const profileId = playerState.profileId;

      if (consented) {
        // Déconnexion volontaire
        console.log(`👋 ${characterName} quitte ${this.serverId} (volontaire)`);
        
        // Mettre à jour lastOnline
        await this.updateLastOnline(profileId);

        // Retirer du state
        this.state.removePlayer(client.sessionId);

      } else {
        // Déconnexion accidentelle : autoriser reconnexion (30 secondes)
        console.log(`⚠️  ${characterName} déconnecté (accidentel) - reconnexion autorisée 30s`);
        
        try {
          await this.allowReconnection(client, 30);
          console.log(`🔄 ${characterName} reconnecté avec succès`);
        } catch (err) {
          // Timeout atteint, retirer du state
          console.log(`❌ ${characterName} - timeout reconnexion`);
          await this.updateLastOnline(profileId);
          this.state.removePlayer(client.sessionId);
        }
      }

    } catch (err: any) {
      console.error("❌ Erreur dans onLeave:", err.message);
    }
  }

  /**
   * Réception de messages du client
   */
  private handleMessage(client: Client, type: string | number, message: any) {
    const playerState = this.state.players.get(client.sessionId);
    
    if (!playerState) {
      return;
    }

    console.log(`📨 Message de ${playerState.characterName}: ${type}`, message);

    // Déléguer les interactions NPC au NPCManager
    if (type === "npc_interact") {
      this.npcManager.handleInteraction(client, playerState, message);
      return;
    }

    // Commande admin pour recharger les NPC (utile en développement)
    if (type === "npc_reload" && this.isAdmin(playerState)) {
      this.npcManager.reloadNPCs();
      client.send("info", { message: "NPCs reloaded" });
      return;
    }

    // TODO: Gérer les autres actions du joueur ici
    // Ex: "attack", "move", "pickup_item", etc.
  }

  /**
   * Vérifie si un joueur est admin (à implémenter proprement plus tard)
   */
  private isAdmin(playerState: PlayerState): boolean {
    // TODO: Vérifier dans la DB si le joueur est admin
    return false;
  }

  /**
   * Tick du serveur (appelé toutes les ~33ms)
   */
  update(deltaTime: number) {
    // TODO: Logique de jeu ici
    // Ex: Update des monstres, combats, etc.
  }

  /**
   * Nettoyage de la room
   */
  onDispose() {
    console.log(`♻️  WorldRoom ${this.serverId} détruite`);
    
    if (this.updateInterval) {
      this.updateInterval.clear();
    }
  }

  /**
   * Met à jour le lastOnline dans MongoDB
   */
  private async updateLastOnline(profileId: string): Promise<void> {
    try {
      await ServerProfile.findByIdAndUpdate(profileId, {
        lastOnline: new Date()
      });
    } catch (err: any) {
      console.error("❌ Erreur update lastOnline:", err.message);
    }
  }
}
```

---

## Changements clés :

✅ **NPCManager instancié** dans `onCreate()`  
✅ **WorldRoom allégée** - Tout ce qui concerne les NPC est délégué  
✅ **handleMessage() simplifié** - Délègue `npc_interact` au NPCManager  
✅ **Commande admin `npc_reload`** pour recharger les NPC en dev  
✅ **getNPCCount()** via NPCManager dans le welcome message  
✅ **Code plus maintenable** - Séparation des responsabilités claire

---

## Architecture finale :
```
WorldRoom
  ├─ Gère les joueurs (connexion, déconnexion, auth)
  ├─ Gère le tick du serveur
  └─ Utilise NPCManager pour tout ce qui concerne les NPC

NPCManager
  ├─ Charge les NPC depuis MongoDB
  ├─ Gère les interactions joueur → NPC
  ├─ Fournit des helpers (getNPC, getNPCsByType, etc.)
  └─ Peut recharger les NPC à chaud
