# 🎮 IdleRPG - API Documentation pour Unity

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Endpoints API](#endpoints-api)
3. [Modèles de données](#modèles-de-données)
4. [Flow d'intégration Unity](#flow-dintégration-unity)
5. [Exemples d'intégration Unity](#exemples-dintégration-unity)
6. [Gestion des erreurs](#gestion-des-erreurs)
7. [Best Practices](#best-practices)

---

## Vue d'ensemble

Le système backend IdleRPG permet aux joueurs de créer un compte global, puis de créer des personnages sur différents serveurs logiques (EU, NA, ASIA).

### Fonctionnalités principales

- ✅ **Authentification JWT** : Compte global avec token valide 7 jours
- ✅ **Multi-serveurs logiques** : 6 serveurs (EU-1, EU-2, NA-1, NA-2, ASIA-1, ASIA-2)
- ✅ **Multi-personnages** : Un personnage par serveur
- ✅ **3 classes** : Warrior, Mage, Archer
- ✅ **Progression isolée** : Chaque serveur a sa propre progression
- ✅ **System scalable** : Architecture prête pour Colyseus et WebSocket

### Base URL

```
Development: http://localhost:3000
Production: https://your-api-domain.com
```

---

## Endpoints API

### 🔐 Authentification

#### 1. Créer un compte

**POST** `/auth/register`

Crée un nouveau compte joueur global.

##### Body
```json
{
  "username": "player123",
  "password": "securepassword",
  "email": "player@example.com"
}
```

##### Réponse succès (200)
```json
{
  "message": "Account created",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playerId": "691b1784df3d07ebc63a6180"
}
```

##### Erreurs possibles (400)
```json
{
  "error": "Missing username or password"
}
```
```json
{
  "error": "Username already taken"
}
```

##### Notes importantes
- Le **username** est unique globalement
- Le **token JWT** est valide **7 jours**
- L'**email** est optionnel
- Stocker le token côté Unity pour les futures requêtes

---

#### 2. Se connecter

**POST** `/auth/login`

Connecte un joueur existant.

##### Body
```json
{
  "username": "player123",
  "password": "securepassword"
}
```

##### Réponse succès (200)
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playerId": "691b1784df3d07ebc63a6180"
}
```

##### Erreurs possibles (400)
```json
{
  "error": "Missing username or password"
}
```
```json
{
  "error": "Invalid username or password"
}
```

---

### 🌍 Serveurs

#### 3. Lister tous les serveurs

**GET** `/servers`

Récupère la liste de tous les serveurs disponibles.

##### Headers
Aucun (route publique)

##### Réponse succès (200)
```json
{
  "servers": [
    {
      "serverId": "eu-1",
      "name": "Europe - Server 1",
      "region": "EU",
      "status": "online",
      "currentPlayers": 1250,
      "capacity": 10000,
      "openedAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "serverId": "eu-2",
      "name": "Europe - Server 2",
      "region": "EU",
      "status": "online",
      "currentPlayers": 850,
      "capacity": 10000,
      "openedAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "serverId": "na-1",
      "name": "North America - Server 1",
      "region": "NA",
      "status": "online",
      "currentPlayers": 3200,
      "capacity": 10000,
      "openedAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "serverId": "na-2",
      "name": "North America - Server 2",
      "region": "NA",
      "status": "online",
      "currentPlayers": 1900,
      "capacity": 10000,
      "openedAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "serverId": "asia-1",
      "name": "Asia - Server 1",
      "region": "ASIA",
      "status": "online",
      "currentPlayers": 5600,
      "capacity": 10000,
      "openedAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "serverId": "asia-2",
      "name": "Asia - Server 2",
      "region": "ASIA",
      "status": "online",
      "currentPlayers": 4100,
      "capacity": 10000,
      "openedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

##### Status possibles
- `online` - Serveur accessible
- `maintenance` - Serveur en maintenance (ne pas permettre la connexion)
- `full` - Serveur plein (ne pas permettre la création de nouveau personnage)

##### Utilisation Unity
- Afficher cette liste après le login
- Permettre au joueur de choisir son serveur
- Filtrer/trier par région si besoin
- Afficher des badges visuels selon le status

---

#### 4. Détails d'un serveur

**GET** `/servers/:serverId`

Récupère les informations détaillées d'un serveur spécifique.

##### URL Parameters
- `serverId` : ID du serveur (ex: `eu-1`)

##### Exemple
```
GET /servers/eu-1
```

##### Headers
Aucun (route publique)

##### Réponse succès (200)
```json
{
  "serverId": "eu-1",
  "name": "Europe - Server 1",
  "region": "EU",
  "status": "online",
  "currentPlayers": 1250,
  "capacity": 10000,
  "openedAt": "2025-01-15T10:00:00.000Z"
}
```

##### Erreurs possibles (404)
```json
{
  "error": "Server not found"
}
```

---

### 👤 Profils Joueur

**Important :** Toutes les routes de profil nécessitent l'authentification JWT.

##### Header requis
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

#### 5. Vérifier le profil sur un serveur

**GET** `/profile/:serverId`

Vérifie si le joueur a déjà un personnage sur ce serveur.

##### URL Parameters
- `serverId` : ID du serveur (ex: `eu-1`)

##### Exemple
```
GET /profile/eu-1
Authorization: Bearer <token>
```

##### Réponse succès (200) - Profil existant
```json
{
  "exists": true,
  "profile": {
    "profileId": "691b18027aadf7ba00013110",
    "serverId": "eu-1",
    "characterName": "Arthas",
    "level": 15,
    "xp": 2500,
    "gold": 1250,
    "class": "warrior",
    "lastOnline": "2025-01-16T14:30:00.000Z"
  }
}
```

##### Réponse succès (200) - Pas de profil
```json
{
  "exists": false,
  "serverId": "eu-1",
  "message": "No profile on this server"
}
```

##### Erreurs possibles

**401 - Non authentifié**
```json
{
  "error": "No token provided"
}
```
```json
{
  "error": "Invalid token"
}
```
```json
{
  "error": "Token expired"
}
```

**404 - Serveur introuvable**
```json
{
  "error": "Server not found"
}
```

##### Utilisation Unity
- Appeler après que le joueur a choisi un serveur
- Si `exists: false` → Afficher écran de création de personnage
- Si `exists: true` → Charger les données et lancer le jeu

---

#### 6. Créer un personnage

**POST** `/profile/:serverId`

Crée un nouveau personnage sur le serveur choisi.

##### URL Parameters
- `serverId` : ID du serveur (ex: `eu-1`)

##### Headers
```http
Authorization: Bearer <token>
Content-Type: application/json
```

##### Body
```json
{
  "characterName": "Arthas",
  "characterClass": "warrior"
}
```

##### Classes disponibles
- `warrior` - Guerrier (Tank/DPS)
- `mage` - Mage (DPS magique)
- `archer` - Archer (DPS physique à distance)

##### Réponse succès (201)
```json
{
  "message": "Profile created",
  "profile": {
    "profileId": "691b18027aadf7ba00013110",
    "serverId": "eu-1",
    "characterName": "Arthas",
    "level": 1,
    "xp": 0,
    "gold": 0,
    "class": "warrior"
  }
}
```

##### Erreurs possibles

**400 - Données invalides**
```json
{
  "error": "Character name is required"
}
```

**400 - Profil déjà existant**
```json
{
  "error": "Profile already exists on this server"
}
```

**400 - Serveur non accessible**
```json
{
  "error": "Server is maintenance"
}
```
```json
{
  "error": "Server is full"
}
```

**401 - Non authentifié**
```json
{
  "error": "Unauthorized"
}
```

**404 - Serveur introuvable**
```json
{
  "error": "Server not found"
}
```

##### Notes importantes
- Un joueur ne peut avoir qu'**un seul personnage par serveur**
- Le personnage commence toujours **niveau 1** avec **0 gold** et **0 xp**
- Le `characterName` doit être fourni par le joueur
- Le `characterClass` par défaut est `warrior` si non spécifié

---

#### 7. Lister tous les profils

**GET** `/profile`

Récupère tous les personnages du joueur sur tous les serveurs.

##### Headers
```http
Authorization: Bearer <token>
```

##### Réponse succès (200)
```json
{
  "profiles": [
    {
      "profileId": "691b18027aadf7ba00013110",
      "serverId": "eu-1",
      "characterName": "Arthas",
      "level": 15,
      "xp": 2500,
      "gold": 1250,
      "class": "warrior",
      "lastOnline": "2025-01-16T14:30:00.000Z"
    },
    {
      "profileId": "691b18027aadf7ba00013111",
      "serverId": "na-1",
      "characterName": "Jaina",
      "level": 8,
      "xp": 650,
      "gold": 320,
      "class": "mage",
      "lastOnline": "2025-01-14T09:15:00.000Z"
    }
  ]
}
```

##### Réponse succès (200) - Aucun profil
```json
{
  "profiles": []
}
```

##### Erreurs possibles

**401 - Non authentifié**
```json
{
  "error": "Unauthorized"
}
```

##### Utilisation Unity
- Afficher un écran de sélection de serveur/personnage
- Permettre au joueur de choisir quel personnage jouer
- Trier par `lastOnline` pour afficher le dernier joué en premier
- Afficher le serveur et la classe de chaque personnage

---

### 🏥 Health Check

#### 8. Vérifier l'état du serveur

**GET** `/health`

Vérifie que le serveur et la base de données sont opérationnels.

##### Headers
Aucun (route publique)

##### Réponse succès (200)
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T10:30:00.000Z",
  "mongo": "connected"
}
```

##### Réponse dégradée (200)
```json
{
  "status": "degraded",
  "timestamp": "2025-01-16T10:30:00.000Z",
  "mongo": "disconnected"
}
```

##### Utilisation Unity
- Appeler au lancement de l'application
- Si le serveur ne répond pas ou est `degraded`, afficher un message d'erreur
- Optionnel : afficher un indicateur de latence

---

## Modèles de données

### Player (Compte global)

```csharp
[Serializable]
public class Player
{
    public string _id;              // PlayerId MongoDB
    public string username;         // Nom d'utilisateur unique
    public string email;            // Email (optionnel)
    public int level;               // Niveau global du compte (future feature)
    public int xp;                  // XP global (future feature)
    public int gold;                // Gold global (future feature)
    public string lastOnline;       // Dernière connexion
    public string createdAt;        // Date de création du compte
    public string updatedAt;        // Dernière mise à jour
}
```

**Note :** Pour l'instant, seul le système de profils par serveur est utilisé. Les stats globales (`level`, `xp`, `gold`) seront implémentées plus tard.

---

### Server

```csharp
[Serializable]
public class Server
{
    public string serverId;         // ID unique (ex: "eu-1")
    public string name;             // Nom affiché (ex: "Europe - Server 1")
    public string region;           // Région : "EU", "NA", "ASIA"
    public string status;           // "online", "maintenance", "full"
    public int currentPlayers;      // Nombre de joueurs connectés
    public int capacity;            // Capacité maximale
    public string openedAt;         // Date d'ouverture du serveur
}

[Serializable]
public class ServerListResponse
{
    public List<Server> servers;
}
```

##### Valeurs possibles

**Regions:**
- `EU` - Europe
- `NA` - North America
- `ASIA` - Asia

**Status:**
- `online` - Serveur accessible
- `maintenance` - En maintenance
- `full` - Plein (limite de joueurs atteinte)

---

### ServerProfile (Personnage sur un serveur)

```csharp
[Serializable]
public class ServerProfile
{
    public string profileId;        // ID MongoDB du profil
    public string serverId;         // ID du serveur (ex: "eu-1")
    public string characterName;    // Nom du personnage
    public int level;               // Niveau du personnage
    public int xp;                  // Expérience
    public int gold;                // Or
    public string characterClass;   // Classe: "warrior", "mage", "archer"
    public string lastOnline;       // Dernière connexion sur ce serveur
}

[Serializable]
public class ProfileResponse
{
    public bool exists;
    public ServerProfile profile;   // null si exists = false
    public string serverId;         // ID du serveur
    public string message;          // Message si pas de profil
}

[Serializable]
public class ProfileListResponse
{
    public List<ServerProfile> profiles;
}

[Serializable]
public class CreateProfileRequest
{
    public string characterName;
    public string characterClass;  // "warrior", "mage", "archer"
}

[Serializable]
public class CreateProfileResponse
{
    public string message;
    public ServerProfile profile;
}
```

##### Classes de personnage

```csharp
public enum CharacterClass
{
    Warrior,    // Guerrier - Tank/DPS mêlée
    Mage,       // Mage - DPS magique
    Archer      // Archer - DPS physique à distance
}
```

---

### Auth Responses

```csharp
[Serializable]
public class AuthRequest
{
    public string username;
    public string password;
    public string email;            // Optionnel pour register
}

[Serializable]
public class AuthResponse
{
    public string message;
    public string token;            // Token JWT
    public string playerId;         // ID du joueur
}

[Serializable]
public class ErrorResponse
{
    public string error;
}
```

---

## Flow d'intégration Unity

### Scénario 1 : Nouveau joueur

```
1. Écran de login/register
   ↓
2. POST /auth/register
   Body: { username, password, email }
   ↓
   Recevoir: { token, playerId }
   ↓
3. Stocker token en PlayerPrefs
   ↓
4. GET /servers
   ↓
   Afficher liste des 6 serveurs
   ↓
5. Joueur choisit "eu-1"
   ↓
6. GET /profile/eu-1 (avec token)
   ↓
   Réponse: { exists: false }
   ↓
7. Afficher écran de création de personnage
   - Input: Nom du personnage
   - Choix: Warrior / Mage / Archer
   ↓
8. POST /profile/eu-1 (avec token)
   Body: { characterName: "Arthas", characterClass: "warrior" }
   ↓
   Profil créé: { profileId, level: 1, xp: 0, gold: 0 }
   ↓
9. Sauvegarder serverId et profileId en PlayerPrefs
   ↓
10. Lancer le jeu avec ce profil
```

---

### Scénario 2 : Joueur existant - Une connexion

```
1. Écran de login
   ↓
2. POST /auth/login
   Body: { username, password }
   ↓
   Recevoir: { token, playerId }
   ↓
3. Stocker token en PlayerPrefs
   ↓
4. GET /profile (avec token)
   ↓
   Réponse: { profiles: [profil sur eu-1] }
   ↓
5. 1 seul profil trouvé → Charger automatiquement
   ↓
6. GET /profile/eu-1 (avec token)
   ↓
   Réponse: { exists: true, profile: {...} }
   ↓
7. Sauvegarder serverId et profileId en PlayerPrefs
   ↓
8. Lancer le jeu directement
```

---

### Scénario 3 : Joueur existant - Plusieurs connexions

```
1. Écran de login
   ↓
2. POST /auth/login
   ↓
   Recevoir token
   ↓
3. GET /profile (avec token)
   ↓
   Réponse: { 
     profiles: [
       { serverId: "eu-1", characterName: "Arthas", level: 15, class: "warrior" },
       { serverId: "na-1", characterName: "Jaina", level: 8, class: "mage" }
     ]
   }
   ↓
4. Afficher écran de sélection
   - Liste des personnages avec serveur, nom, level, classe
   - Bouton "Jouer" pour chaque personnage
   - Bouton "Créer nouveau personnage" (vers liste des serveurs)
   ↓
5. Joueur choisit son personnage sur "na-1"
   ↓
6. GET /profile/na-1 (avec token)
   ↓
   Charger les données du profil
   ↓
7. Lancer le jeu sur ce serveur
```

---

### Scénario 4 : Créer un alt sur un autre serveur

```
1. Joueur connecté avec profil sur "eu-1"
   ↓
2. Menu → "Changer de serveur" ou "Nouveau personnage"
   ↓
3. GET /servers
   ↓
   Afficher liste des serveurs
   ↓
4. Joueur choisit "asia-1"
   ↓
5. GET /profile/asia-1 (avec token)
   ↓
   Réponse: { exists: false }
   ↓
6. Afficher écran de création de personnage
   ↓
7. POST /profile/asia-1
   Body: { characterName: "NewChar", characterClass: "mage" }
   ↓
   Nouveau profil créé
   ↓
8. Lancer le jeu sur asia-1
```

---

## Exemples d'intégration Unity

### 1. Système d'authentification

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;

public class AuthManager : MonoBehaviour
{
    private string baseURL = "http://localhost:3000";
    private string jwtToken;
    private string playerId;

    // Register
    public IEnumerator Register(string username, string password, string email)
    {
        AuthRequest request = new AuthRequest
        {
            username = username,
            password = password,
            email = email
        };

        string json = JsonUtility.ToJson(request);
        
        UnityWebRequest www = new UnityWebRequest($"{baseURL}/auth/register", "POST");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
        www.uploadHandler = new UploadHandlerRaw(bodyRaw);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            AuthResponse response = JsonUtility.FromJson<AuthResponse>(www.downloadHandler.text);
            
            jwtToken = response.token;
            playerId = response.playerId;
            
            // Sauvegarder
            PlayerPrefs.SetString("jwt_token", jwtToken);
            PlayerPrefs.SetString("player_id", playerId);
            PlayerPrefs.Save();
            
            Debug.Log("Register success!");
            OnAuthSuccess();
        }
        else
        {
            ErrorResponse error = JsonUtility.FromJson<ErrorResponse>(www.downloadHandler.text);
            Debug.LogError($"Register failed: {error.error}");
            OnAuthFailed(error.error);
        }
    }

    // Login
    public IEnumerator Login(string username, string password)
    {
        AuthRequest request = new AuthRequest
        {
            username = username,
            password = password
        };

        string json = JsonUtility.ToJson(request);
        
        UnityWebRequest www = new UnityWebRequest($"{baseURL}/auth/login", "POST");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
        www.uploadHandler = new UploadHandlerRaw(bodyRaw);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            AuthResponse response = JsonUtility.FromJson<AuthResponse>(www.downloadHandler.text);
            
            jwtToken = response.token;
            playerId = response.playerId;
            
            // Sauvegarder
            PlayerPrefs.SetString("jwt_token", jwtToken);
            PlayerPrefs.SetString("player_id", playerId);
            PlayerPrefs.Save();
            
            Debug.Log("Login success!");
            OnAuthSuccess();
        }
        else
        {
            ErrorResponse error = JsonUtility.FromJson<ErrorResponse>(www.downloadHandler.text);
            Debug.LogError($"Login failed: {error.error}");
            OnAuthFailed(error.error);
        }
    }

    // Auto-login si token existe
    public void TryAutoLogin()
    {
        if (PlayerPrefs.HasKey("jwt_token"))
        {
            jwtToken = PlayerPrefs.GetString("jwt_token");
            playerId = PlayerPrefs.GetString("player_id");
            
            // Valider le token en appelant GET /profile
            StartCoroutine(ValidateToken());
        }
        else
        {
            // Pas de token, afficher écran de login
            ShowLoginScreen();
        }
    }

    private IEnumerator ValidateToken()
    {
        UnityWebRequest www = UnityWebRequest.Get($"{baseURL}/profile");
        www.SetRequestHeader("Authorization", $"Bearer {jwtToken}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            // Token valide, continuer
            OnAuthSuccess();
        }
        else
        {
            // Token expiré ou invalide, redemander login
            Logout();
            ShowLoginScreen();
        }
    }

    public void Logout()
    {
        jwtToken = null;
        playerId = null;
        PlayerPrefs.DeleteKey("jwt_token");
        PlayerPrefs.DeleteKey("player_id");
        PlayerPrefs.Save();
    }

    private void OnAuthSuccess()
    {
        // Charger la liste des serveurs
        ServerManager.Instance.LoadServers();
    }

    private void OnAuthFailed(string error)
    {
        // Afficher popup d'erreur
        UIManager.Instance.ShowError(error);
    }

    private void ShowLoginScreen()
    {
        // Afficher UI de login
        UIManager.Instance.ShowLoginScreen();
    }

    public string GetToken()
    {
        return jwtToken;
    }

    public string GetPlayerId()
    {
        return playerId;
    }
}
```

---

### 2. Gestion des serveurs

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Collections.Generic;

public class ServerManager : MonoBehaviour
{
    public static ServerManager Instance;
    
    private string baseURL = "http://localhost:3000";
    public List<Server> servers = new List<Server>();

    private void Awake()
    {
        Instance = this;
    }

    public IEnumerator LoadServers()
    {
        UnityWebRequest www = UnityWebRequest.Get($"{baseURL}/servers");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            ServerListResponse response = 
                JsonUtility.FromJson<ServerListResponse>(www.downloadHandler.text);
            
            servers = response.servers;
            
            Debug.Log($"Loaded {servers.Count} servers");
            DisplayServerList();
        }
        else
        {
            Debug.LogError("Failed to load servers");
        }
    }

    public IEnumerator GetServerDetails(string serverId)
    {
        UnityWebRequest www = UnityWebRequest.Get($"{baseURL}/servers/{serverId}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            Server server = JsonUtility.FromJson<Server>(www.downloadHandler.text);
            
            Debug.Log($"Server {server.name}: {server.currentPlayers}/{server.capacity} players");
            return server;
        }
        else
        {
            Debug.LogError($"Failed to get server {serverId}");
            return null;
        }
    }

    private void DisplayServerList()
    {
        // Afficher UI de sélection de serveur
        UIManager.Instance.ShowServerSelectionScreen(servers);
    }

    public Server GetServerById(string serverId)
    {
        return servers.Find(s => s.serverId == serverId);
    }
}
```

---

### 3. Gestion des profils

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Collections.Generic;

public class ProfileManager : MonoBehaviour
{
    public static ProfileManager Instance;
    
    private string baseURL = "http://localhost:3000";
    public List<ServerProfile> profiles = new List<ServerProfile>();
    public ServerProfile currentProfile;

    private void Awake()
    {
        Instance = this;
    }

    // Charger tous les profils du joueur
    public IEnumerator LoadAllProfiles()
    {
        string token = AuthManager.Instance.GetToken();
        
        UnityWebRequest www = UnityWebRequest.Get($"{baseURL}/profile");
        www.SetRequestHeader("Authorization", $"Bearer {token}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            ProfileListResponse response = 
                JsonUtility.FromJson<ProfileListResponse>(www.downloadHandler.text);
            
            profiles = response.profiles;
            
            Debug.Log($"Loaded {profiles.Count} profiles");
            
            if (profiles.Count == 0)
            {
                // Aucun personnage, aller à la sélection de serveur
                UIManager.Instance.ShowServerSelectionScreen(ServerManager.Instance.servers);
            }
            else if (profiles.Count == 1)
            {
                // Un seul personnage, charger automatiquement
                yield return LoadProfile(profiles[0].serverId);
            }
            else
            {
                // Plusieurs personnages, afficher sélection
                UIManager.Instance.ShowProfileSelectionScreen(profiles);
            }
        }
        else
        {
            Debug.LogError("Failed to load profiles");
            
            // Si 401, token expiré
            if (www.responseCode == 401)
            {
                AuthManager.Instance.Logout();
                UIManager.Instance.ShowLoginScreen();
            }
        }
    }

    // Vérifier si profil existe sur un serveur
    public IEnumerator CheckProfile(string serverId)
    {
        string token = AuthManager.Instance.GetToken();
        
        UnityWebRequest www = UnityWebRequest.Get($"{baseURL}/profile/{serverId}");
        www.SetRequestHeader("Authorization", $"Bearer {token}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            ProfileResponse response = 
                JsonUtility.FromJson<ProfileResponse>(www.downloadHandler.text);
            
            if (response.exists)
            {
                // Profil existe, charger
                currentProfile = response.profile;
                OnProfileLoaded();
            }
            else
            {
                // Pas de profil, afficher création
                UIManager.Instance.ShowCharacterCreationScreen(serverId);
            }
        }
        else
        {
            Debug.LogError($"Failed to check profile on {serverId}");
        }
    }

    // Charger un profil spécifique
    public IEnumerator LoadProfile(string serverId)
    {
        string token = AuthManager.Instance.GetToken();
        
        UnityWebRequest www = UnityWebRequest.Get($"{baseURL}/profile/{serverId}");
        www.SetRequestHeader("Authorization", $"Bearer {token}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            ProfileResponse response = 
                JsonUtility.FromJson<ProfileResponse>(www.downloadHandler.text);
            
            if (response.exists)
            {
                currentProfile = response.profile;
                
                // Sauvegarder le dernier serveur joué
                PlayerPrefs.SetString("last_server", serverId);
                PlayerPrefs.Save();
                
                OnProfileLoaded();
            }
            else
            {
                Debug.LogError("Profile does not exist");
            }
        }
    }

    // Créer un nouveau personnage
    public IEnumerator CreateProfile(string serverId, string characterName, string characterClass)
    {
        string token = AuthManager.Instance.GetToken();
        
        CreateProfileRequest request = new CreateProfileRequest
        {
            characterName = characterName,
            characterClass = characterClass
        };

        string json = JsonUtility.ToJson(request);
        
        UnityWebRequest www = new UnityWebRequest($"{baseURL}/profile/{serverId}", "POST");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
        www.uploadHandler = new UploadHandlerRaw(bodyRaw);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");
        www.SetRequestHeader("Authorization", $"Bearer {token}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            CreateProfileResponse response = 
                JsonUtility.FromJson<CreateProfileResponse>(www.downloadHandler.text);
            
            currentProfile = response.profile;
            
            Debug.Log($"Profile created: {currentProfile.characterName}");
            
            // Sauvegarder
            PlayerPrefs.SetString("last_server", serverId);
            PlayerPrefs.Save();
            
            OnProfileLoaded();
        }
        else
        {
            ErrorResponse error = JsonUtility.FromJson<ErrorResponse>(www.downloadHandler.text);
            Debug.LogError($"Failed to create profile: {error.error}");
            UIManager.Instance.ShowError(error.error);
        }
    }

    private void OnProfileLoaded()
    {
        Debug.Log($"Profile loaded: {currentProfile.characterName} (Lv{currentProfile.level})");
        
        // Charger le jeu
        GameManager.Instance.StartGame(currentProfile);
    }

    public ServerProfile GetCurrentProfile()
    {
        return currentProfile;
    }
}
```

---

### 4. UI Manager (Example)

```csharp
using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;

public class UIManager : MonoBehaviour
{
    public static UIManager Instance;

    [Header("Screens")]
    public GameObject loginScreen;
    public GameObject serverSelectionScreen;
    public GameObject profileSelectionScreen;
    public GameObject characterCreationScreen;
    public GameObject errorPopup;

    [Header("Server Selection")]
    public Transform serverListContainer;
    public GameObject serverButtonPrefab;

    [Header("Profile Selection")]
    public Transform profileListContainer;
    public GameObject profileButtonPrefab;

    [Header("Character Creation")]
    public InputField characterNameInput;
    public Dropdown classDropdown;
    public Button createButton;

    private string selectedServerId;

    private void Awake()
    {
        Instance = this;
    }

    public void ShowLoginScreen()
    {
        HideAllScreens();
        loginScreen.SetActive(true);
    }

    public void ShowServerSelectionScreen(List<Server> servers)
    {
        HideAllScreens();
        serverSelectionScreen.SetActive(true);

        // Vider la liste
        foreach (Transform child in serverListContainer)
        {
            Destroy(child.gameObject);
        }

        // Créer les boutons
        foreach (Server server in servers)
        {
            GameObject button = Instantiate(serverButtonPrefab, serverListContainer);
            
            // Setup du bouton
            button.GetComponentInChildren<Text>().text = 
                $"{server.name}\n{server.currentPlayers}/{server.capacity} players";
            
            // Status badge
            Image statusBadge = button.transform.Find("StatusBadge").GetComponent<Image>();
            if (server.status == "online")
            {
                statusBadge.color = Color.green;
            }
            else if (server.status == "maintenance")
            {
                statusBadge.color = Color.red;
                button.GetComponent<Button>().interactable = false;
            }
            else if (server.status == "full")
            {
                statusBadge.color = Color.yellow;
            }

            // Click event
            button.GetComponent<Button>().onClick.AddListener(() =>
            {
                OnServerSelected(server.serverId);
            });
        }
    }

    public void ShowProfileSelectionScreen(List<ServerProfile> profiles)
    {
        HideAllScreens();
        profileSelectionScreen.SetActive(true);

        // Vider la liste
        foreach (Transform child in profileListContainer)
        {
            Destroy(child.gameObject);
        }

        // Trier par lastOnline
        profiles.Sort((a, b) => 
            System.DateTime.Parse(b.lastOnline).CompareTo(System.DateTime.Parse(a.lastOnline))
        );

        // Créer les boutons
        foreach (ServerProfile profile in profiles)
        {
            GameObject button = Instantiate(profileButtonPrefab, profileListContainer);
            
            Server server = ServerManager.Instance.GetServerById(profile.serverId);
            
            button.GetComponentInChildren<Text>().text = 
                $"{profile.characterName}\nLv{profile.level} {profile.characterClass}\n{server.name}";
            
            button.GetComponent<Button>().onClick.AddListener(() =>
            {
                StartCoroutine(ProfileManager.Instance.LoadProfile(profile.serverId));
            });
        }

        // Bouton "Nouveau personnage"
        GameObject newButton = Instantiate(profileButtonPrefab, profileListContainer);
        newButton.GetComponentInChildren<Text>().text = "+ Nouveau personnage";
        newButton.GetComponent<Button>().onClick.AddListener(() =>
        {
            ShowServerSelectionScreen(ServerManager.Instance.servers);
        });
    }

    public void ShowCharacterCreationScreen(string serverId)
    {
        HideAllScreens();
        characterCreationScreen.SetActive(true);
        
        selectedServerId = serverId;
        
        Server server = ServerManager.Instance.GetServerById(serverId);
        characterCreationScreen.transform.Find("ServerName").GetComponent<Text>().text = 
            $"Serveur: {server.name}";

        // Setup dropdown
        classDropdown.ClearOptions();
        classDropdown.AddOptions(new List<string> { "Warrior", "Mage", "Archer" });

        // Setup bouton
        createButton.onClick.RemoveAllListeners();
        createButton.onClick.AddListener(() =>
        {
            string characterName = characterNameInput.text;
            string characterClass = classDropdown.options[classDropdown.value].text.ToLower();
            
            if (string.IsNullOrEmpty(characterName))
            {
                ShowError("Veuillez entrer un nom de personnage");
                return;
            }

            StartCoroutine(ProfileManager.Instance.CreateProfile(
                selectedServerId, 
                characterName, 
                characterClass
            ));
        });
    }

    public void ShowError(string message)
    {
        errorPopup.SetActive(true);
        errorPopup.GetComponentInChildren<Text>().text = message;
    }

    private void HideAllScreens()
    {
        loginScreen.SetActive(false);
        serverSelectionScreen.SetActive(false);
        profileSelectionScreen.SetActive(false);
        characterCreationScreen.SetActive(false);
        errorPopup.SetActive(false);
    }

    private void OnServerSelected(string serverId)
    {
        // Vérifier si profil existe
        StartCoroutine(ProfileManager.Instance.CheckProfile(serverId));
    }
}
```

---

### 5. Game Manager (Example)

```csharp
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance;

    private ServerProfile currentProfile;

    private void Awake()
    {
        Instance = this;
    }

    private void Start()
    {
        // Au lancement du jeu
        AuthManager.Instance.TryAutoLogin();
    }

    public void StartGame(ServerProfile profile)
    {
        currentProfile = profile;
        
        Debug.Log($"Starting game with {profile.characterName} on {profile.serverId}");
        
        // Charger la scène de jeu
        UnityEngine.SceneManagement.SceneManager.LoadScene("GameScene");
    }

    public ServerProfile GetCurrentProfile()
    {
        return currentProfile;
    }

    public void BackToServerSelection()
    {
        // Retour à la sélection
        StartCoroutine(ProfileManager.Instance.LoadAllProfiles());
    }
}
```

---

## Gestion des erreurs

### Codes HTTP

| Code | Signification | Action Unity |
|------|--------------|--------------|
| 200 | Succès | Traiter la réponse |
| 201 | Créé | Traiter la réponse |
| 400 | Requête invalide | Afficher message d'erreur |
| 401 | Non authentifié | Logout + Retour login |
| 404 | Non trouvé | Afficher message d'erreur |
| 500 | Erreur serveur | Afficher erreur générique |

---

### Gestion des erreurs 401 (Token expiré)

```csharp
public void HandleUnauthorized()
{
    // Token expiré, déconnecter
    AuthManager.Instance.Logout();
    
    // Afficher message
    UIManager.Instance.ShowError("Votre session a expiré, veuillez vous reconnecter");
    
    // Retour login
    UIManager.Instance.ShowLoginScreen();
}
```

---

### Retry Logic

```csharp
public IEnumerator LoadServersWithRetry(int maxRetries = 3)
{
    int attempts = 0;
    
    while (attempts < maxRetries)
    {
        yield return ServerManager.Instance.LoadServers();
        
        if (ServerManager.Instance.servers.Count > 0)
        {
            // Succès
            yield break;
        }
        
        attempts++;
        
        // Attente exponentielle
        yield return new WaitForSeconds(Mathf.Pow(2, attempts));
    }
    
    // Échec après plusieurs tentatives
    UIManager.Instance.ShowError("Impossible de se connecter au serveur");
}
```

---

### Timeout

```csharp
public IEnumerator LoadServersWithTimeout(float timeout = 10f)
{
    float startTime = Time.time;
    
    UnityWebRequest www = UnityWebRequest.Get($"{baseURL}/servers");

    www.SendWebRequest();

    while (!www.isDone)
    {
        if (Time.time - startTime > timeout)
        {
            www.Abort();
            Debug.LogError("Request timeout");
            UIManager.Instance.ShowError("Le serveur ne répond pas");
            yield break;
        }
        
        yield return null;
    }

    // Traiter la réponse
}
```

---

## Best Practices

### ✅ À faire

1. **Stocker le token JWT** en PlayerPrefs de manière sécurisée
2. **Auto-login** au lancement si token valide
3. **Valider le token** avant chaque flow important
4. **Gérer les 401** en déconnectant l'utilisateur
5. **Afficher des messages d'erreur clairs** à l'utilisateur
6. **Utiliser des retry** pour les requêtes importantes
7. **Implémenter des timeouts** pour éviter les blocages
8. **Trier les profils** par `lastOnline` (dernier joué en premier)
9. **Sauvegarder le dernier serveur** joué en PlayerPrefs
10. **Afficher des loaders** pendant les requêtes API
11. **Vérifier le status du serveur** avant de permettre la création
12. **Afficher des badges visuels** selon le status du serveur (online/full/maintenance)
13. **Valider les inputs** côté client avant d'appeler l'API
14. **Gérer les cas offline** gracieusement

### ❌ À éviter

1. Ne **jamais stocker** le mot de passe
2. Ne **jamais faire confiance** aux données locales
3. Ne **jamais** ignorer les codes d'erreur HTTP
4. Ne pas laisser l'utilisateur **bloquer** sur une erreur réseau
5. Ne pas oublier de **logout** sur erreur 401
6. Ne pas créer de personnage si le serveur est `maintenance` ou `full`
7. Ne pas laisser l'UI **sans feedback** pendant les requêtes
8. Ne pas ignorer les **timeout** de requêtes

---

## Stockage local (PlayerPrefs)

### Données à stocker

```csharp
// Auth
PlayerPrefs.SetString("jwt_token", token);
PlayerPrefs.SetString("player_id", playerId);

// Dernière session
PlayerPrefs.SetString("last_server", serverId);
PlayerPrefs.SetString("last_character", characterName);

// Préférences
PlayerPrefs.SetInt("auto_login", 1);
```

### Au lancement de l'application

```csharp
void Start()
{
    if (PlayerPrefs.GetInt("auto_login", 1) == 1)
    {
        AuthManager.Instance.TryAutoLogin();
    }
    else
    {
        UIManager.Instance.ShowLoginScreen();
    }
}
```

---

## Roadmap / Prochaines fonctionnalités

Les fonctionnalités suivantes seront ajoutées dans les prochaines versions :

- 🔄 **WebSocket avec Colyseus** pour le jeu en temps réel
- ⚔️ **Système de combat** et auto-attack
- 🌍 **Zones et farming** solo/offline
- 👥 **Système d'alts** (personnages secondaires contrôlés par IA)
- 🤖 **IA des alts** avec 4 niveaux de comportement
- 🏰 **Donjons** de groupe (joueur + alts IA)
- ⚔️ **Arène PvP** asynchrone
- 🛒 **Auction House** entre joueurs
- 🎒 **Inventaire** et équipement
- 📊 **Statistiques** de personnage

Cette documentation sera mise à jour au fur et à mesure de l'implémentation.

---

**Version:** 1.0.0  
**Dernière mise à jour:** 16 janvier 2025  
**Architecture:** Server Authority  
**Contact:** Greg (Discord)
