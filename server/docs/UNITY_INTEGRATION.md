# 🎮 Unity Integration Guide - IdleRPG

Documentation complète pour l'intégration du backend IdleRPG dans Unity.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Installation](#installation)
4. [Endpoints API REST](#endpoints-api-rest)
5. [WebSocket Colyseus](#websocket-colyseus)
6. [Modèles de données](#modèles-de-données)
7. [Flow d'intégration](#flow-dintégration)
8. [Gestion des erreurs](#gestion-des-erreurs)
9. [Best Practices](#best-practices)

---

## Vue d'ensemble

Le système backend IdleRPG fonctionne en **deux parties** :

### **1. API REST** (Authentification & Gestion)
- Création de compte
- Login/Logout
- Sélection serveur
- Création/Gestion des personnages
- Liste des classes et races

### **2. WebSocket Colyseus** (Gameplay temps réel)
- Connexion au monde
- Synchronisation du GameState
- Messages serveur ↔ client
- **Server Authority totale**

### Architecture
```
Unity → REST API (Login, Profils, Serveurs)
     ↓
Unity choisit serveur + personnage
     ↓
Unity → WebSocket Colyseus (Gameplay)
     ↓
WorldRoom valide + charge personnage
     ↓
Jeu en temps réel (Server Authority)
```

### Base URLs
```
Production: https://your-api-domain.com
Development: http://localhost:3000

REST API: {baseUrl}/
WebSocket: ws://{baseUrl}/
```

---

## Prérequis

### Unity Version
- **Unity 2021.3 LTS** ou supérieur
- **.NET Standard 2.1**

### Packages requis
1. **Colyseus SDK for Unity**
   - GitHub: https://github.com/colyseus/colyseus-unity-sdk.git#upm
   - Installation via Package Manager (Add package from git URL)

2. **Newtonsoft.Json**
   - Package: `com.unity.nuget.newtonsoft-json`
   - Installation via Package Manager

---

## Installation

### 1. Installer Colyseus SDK
```
Window → Package Manager → + → Add package from git URL
https://github.com/colyseus/colyseus-unity-sdk.git#upm
```

### 2. Installer Newtonsoft.Json
```
Window → Package Manager → + → Add package by name
com.unity.nuget.newtonsoft-json
```

### 3. Vérifier l'installation

- Vérifier que `Colyseus` namespace est accessible
- Vérifier que `Newtonsoft.Json` namespace est accessible

---

## Endpoints API REST

### 🔐 Authentification

#### 1. Créer un compte

**POST** `/auth/register`
```json
Body: {
  "username": "player123",
  "password": "securepassword",
  "email": "optional@email.com"
}

Response (200): {
  "message": "Account created",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playerId": "691b1784df3d07ebc63a6180"
}

Errors (400):
- "Missing username or password"
- "Username already taken"
```

**Notes importantes :**
- Le token JWT est valide **7 jours**
- Stocker le token dans PlayerPrefs
- Le username est unique globalement

---

#### 2. Se connecter

**POST** `/auth/login`
```json
Body: {
  "username": "player123",
  "password": "securepassword"
}

Response (200): {
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playerId": "691b1784df3d07ebc63a6180"
}

Errors (400):
- "Missing username or password"
- "Invalid username or password"
```

---

### 🌍 Serveurs

#### 3. Lister tous les serveurs

**GET** `/servers`
```json
Response (200): {
  "servers": [
    {
      "serverId": "s1",
      "name": "Server 1",
      "cluster": 1,
      "status": "online",
      "currentPlayers": 150,
      "capacity": 10000,
      "openedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

**Status possibles :**
- `online` - Serveur accessible
- `locked` - Serveur verrouillé (code d'invitation requis)
- `maintenance` - En maintenance
- `full` - Plein

---

#### 4. Détails d'un serveur

**GET** `/servers/:serverId`
```json
Response (200): {
  "serverId": "s1",
  "name": "Server 1",
  "cluster": 1,
  "status": "online",
  "currentPlayers": 150,
  "capacity": 10000,
  "openedAt": "2025-01-15T10:00:00.000Z"
}

Errors (404):
- "Server not found"
```

---

### 🎮 Classes et Races

#### 5. Lister toutes les classes

**GET** `/game-data/classes`
```json
Response (200): {
  "classes": [
    {
      "classId": "priest",
      "nameKey": "class.priest.name",
      "descriptionKey": "class.priest.description",
      "roles": ["HEALER", "SUPPORT"]
    },
    {
      "classId": "mage",
      "nameKey": "class.mage.name",
      "descriptionKey": "class.mage.description",
      "roles": ["DPS"]
    },
    {
      "classId": "paladin",
      "nameKey": "class.paladin.name",
      "descriptionKey": "class.paladin.description",
      "roles": ["TANK", "HEALER"]
    },
    {
      "classId": "rogue",
      "nameKey": "class.rogue.name",
      "descriptionKey": "class.rogue.description",
      "roles": ["DPS"]
    },
    {
      "classId": "warrior",
      "nameKey": "class.warrior.name",
      "descriptionKey": "class.warrior.description",
      "roles": ["TANK", "DPS"]
    },
    {
      "classId": "druid",
      "nameKey": "class.druid.name",
      "descriptionKey": "class.druid.description",
      "roles": ["SUPPORT", "HEALER", "DPS"]
    }
  ]
}
```

**Query params optionnels :**
- `?role=TANK` - Filtrer par rôle (TANK, DPS, HEALER, SUPPORT)

---

#### 6. Lister toutes les races

**GET** `/game-data/races`
```json
Response (200): {
  "races": [
    // FACTION AURION (4 races)
    {
      "raceId": "human_elion",
      "nameKey": "race.human_elion.name",
      "descriptionKey": "race.human_elion.description",
      "faction": "AURION"
    },
    {
      "raceId": "dwarf_rune",
      "nameKey": "race.dwarf_rune.name",
      "descriptionKey": "race.dwarf_rune.description",
      "faction": "AURION"
    },
    {
      "raceId": "winged_lunaris",
      "nameKey": "race.winged_lunaris.name",
      "descriptionKey": "race.winged_lunaris.description",
      "faction": "AURION"
    },
    {
      "raceId": "sylphide_forest",
      "nameKey": "race.sylphide_forest.name",
      "descriptionKey": "race.sylphide_forest.description",
      "faction": "AURION"
    },
    
    // FACTION OMBRE (4 races)
    {
      "raceId": "varkyns_beast",
      "nameKey": "race.varkyns_beast.name",
      "descriptionKey": "race.varkyns_beast.description",
      "faction": "OMBRE"
    },
    {
      "raceId": "morhri_insect",
      "nameKey": "race.morhri_insect.name",
      "descriptionKey": "race.morhri_insect.description",
      "faction": "OMBRE"
    },
    {
      "raceId": "ghrannite_stone",
      "nameKey": "race.ghrannite_stone.name",
      "descriptionKey": "race.ghrannite_stone.description",
      "faction": "OMBRE"
    },
    {
      "raceId": "selenite_lunar",
      "nameKey": "race.selenite_lunar.name",
      "descriptionKey": "race.selenite_lunar.description",
      "faction": "OMBRE"
    }
  ]
}
```

**Query params optionnels :**
- `?faction=AURION` - Filtrer par faction (AURION, OMBRE)

---

#### 7. Classes autorisées pour une race

**GET** `/game-data/allowed-classes/:raceId`
```json
Response (200): {
  "raceId": "human_elion",
  "allowedClasses": [
    {
      "classId": "priest",
      "nameKey": "class.priest.name",
      "descriptionKey": "class.priest.description",
      "roles": ["HEALER", "SUPPORT"]
    },
    {
      "classId": "mage",
      "nameKey": "class.mage.name",
      "descriptionKey": "class.mage.description",
      "roles": ["DPS"]
    },
    {
      "classId": "paladin",
      "nameKey": "class.paladin.name",
      "descriptionKey": "class.paladin.description",
      "roles": ["TANK", "HEALER"]
    },
    {
      "classId": "rogue",
      "nameKey": "class.rogue.name",
      "descriptionKey": "class.rogue.description",
      "roles": ["DPS"]
    },
    {
      "classId": "warrior",
      "nameKey": "class.warrior.name",
      "descriptionKey": "class.warrior.description",
      "roles": ["TANK", "DPS"]
    }
    // Pas de "druid" - restriction !
  ],
  "totalAllowed": 5,
  "totalClasses": 6
}

Errors (404):
- "Race not found"
```

**⚠️ RESTRICTION IMPORTANTE :**
- Les **Humains (human_elion) NE PEUVENT PAS être Druide**
- Toutes les autres races peuvent jouer toutes les classes

---

### 👤 Profils Personnages

**⚠️ Header requis pour toutes les routes :**
```
Authorization: Bearer {token}
```

#### 8. Vérifier les personnages sur un serveur

**GET** `/profile/:serverId`
```json
// Si aucun personnage
Response (200): {
  "exists": false,
  "serverId": "s1",
  "characterCount": 0,
  "maxCharacters": 5,
  "message": "No profile on this server"
}

// Si des personnages existent
Response (200): {
  "exists": true,
  "serverId": "s1",
  "characterCount": 2,
  "maxCharacters": 5,
  "profiles": [
    {
      "profileId": "691b18027aadf7ba00013110",
      "serverId": "s1",
      "characterSlot": 1,
      "characterName": "Arthas",
      "level": 15,
      "xp": 2500,
      "gold": 1250,
      "class": "warrior",
      "race": "human_elion",
      "lastOnline": "2025-01-16T14:30:00.000Z"
    },
    {
      "profileId": "691b18027aadf7ba00013111",
      "serverId": "s1",
      "characterSlot": 2,
      "characterName": "Jaina",
      "level": 8,
      "xp": 650,
      "gold": 320,
      "class": "mage",
      "race": "winged_lunaris",
      "lastOnline": "2025-01-14T09:15:00.000Z"
    }
  ]
}

Errors (401):
- "No token provided"
- "Invalid token"
- "Token expired"

Errors (404):
- "Server not found"
```

---

#### 9. Créer un personnage

**POST** `/profile/:serverId`
```json
Body: {
  "characterName": "Thrall",
  "characterClass": "warrior",
  "characterRace": "dwarf_rune",
  "characterSlot": 3  // Optionnel (1-5), auto si non spécifié
}

Response (201): {
  "message": "Profile created",
  "profile": {
    "profileId": "691b18027aadf7ba00013110",
    "serverId": "s1",
    "characterSlot": 3,
    "characterName": "Thrall",
    "level": 1,
    "xp": 0,
    "gold": 0,
    "class": "warrior",
    "race": "dwarf_rune"
  },
  "usedInvitation": false,
  "characterCount": 3,
  "maxCharacters": 5
}

Errors (400):
- "Character name is required"
- "Character class is required"
- "Character race is required"
- "Invalid character class" (classe n'existe pas)
- "Invalid character race" (race n'existe pas)
- "This class is not allowed for this race" (Humain + Druide par ex.)
- "Maximum 5 characters per server reached"
- "Character slot X is already occupied"
- "Invalid character slot" (pas entre 1-5)

Errors (403):
- "Server is locked. Invitation code required." (serveur verrouillé)

Errors (400):
- "Server is in maintenance"
- "Server is full"

Errors (401):
- "Unauthorized"

Errors (404):
- "Server not found"
```

**Notes importantes :**
- **5 personnages maximum** par serveur
- Slots 1-5 (auto ou manuel)
- Si serveur `locked`, un `invitationCode` est requis dans le body
- Personnage commence toujours niveau 1 avec 0 gold et 0 xp

---

#### 10. Lister tous les personnages

**GET** `/profile`
```json
Response (200): {
  "profiles": [
    {
      "profileId": "691b18027aadf7ba00013110",
      "serverId": "s1",
      "characterSlot": 1,
      "characterName": "Arthas",
      "level": 15,
      "xp": 2500,
      "gold": 1250,
      "class": "warrior",
      "race": "human_elion",
      "lastOnline": "2025-01-16T14:30:00.000Z"
    },
    {
      "profileId": "691b18027aadf7ba00013111",
      "serverId": "s2",
      "characterSlot": 1,
      "characterName": "Jaina",
      "level": 8,
      "xp": 650,
      "gold": 320,
      "class": "mage",
      "race": "winged_lunaris",
      "lastOnline": "2025-01-14T09:15:00.000Z"
    }
  ],
  "totalCharacters": 2
}

Errors (401):
- "Unauthorized"
```

---

#### 11. Supprimer un personnage

**DELETE** `/profile/:serverId/:characterSlot`
```json
Response (200): {
  "message": "Profile deleted",
  "serverId": "s1",
  "characterSlot": 2,
  "characterName": "Jaina"
}

Errors (400):
- "Invalid character slot"

Errors (401):
- "Unauthorized"

Errors (404):
- "Profile not found"
```

---

### 🏥 Health Check

#### 12. Vérifier l'état du serveur

**GET** `/health`
```json
Response (200): {
  "status": "healthy",
  "timestamp": "2025-01-16T10:30:00.000Z",
  "mongo": "connected"
}

// Si problème
Response (200): {
  "status": "degraded",
  "timestamp": "2025-01-16T10:30:00.000Z",
  "mongo": "disconnected"
}
```

**Utilisation :**
- Appeler au lancement de l'application
- Si `degraded`, afficher un message d'erreur
- Optionnel : afficher un indicateur de latence

---

## WebSocket Colyseus

### Connexion au monde

Une fois le joueur authentifié et un personnage sélectionné, se connecter via WebSocket :
```csharp
// Connexion
var client = new ColyseusClient("ws://localhost:3000");

var room = await client.JoinOrCreate<GameState>("world", new Dictionary<string, object> {
  { "token", jwtToken },         // Token JWT
  { "serverId", "s1" },          // Serveur choisi
  { "characterSlot", 1 }         // Slot du personnage (1-5)
});
```

### Ce qui se passe côté serveur

1. **WorldRoom.onAuth()** valide :
   - ✅ Token JWT valide et non expiré
   - ✅ Serveur existe et est accessible
   - ✅ Slot est valide (1-5)
   - ✅ Personnage existe dans MongoDB
   - ✅ Personnage appartient au joueur
   - ✅ Personnage pas déjà connecté

2. **WorldRoom.onJoin()** :
   - Ajoute le joueur au GameState
   - Envoie message `welcome`
   - Met à jour `lastOnline` dans MongoDB
   - Synchronise avec tous les clients

3. **WorldRoom.onLeave()** :
   - Met à jour `lastOnline`
   - Autorise reconnexion (30 secondes)
   - Retire du GameState après timeout

### Messages serveur

#### Message de bienvenue

**Event:** `welcome`
```json
{
  "message": "Bienvenue Arthas sur s1 !",
  "serverId": "s1",
  "onlinePlayers": 15
}
```

#### Envoyer un message au serveur
```csharp
room.Send("player_action", new {
  action = "attack",
  targetId = 42
});
```

Le serveur reçoit dans `handleMessage()` et traite selon le type de message.

---

### GameState synchronisé

Le `GameState` est automatiquement synchronisé avec tous les clients connectés à la room.

**Contenu du GameState :**
- `serverId` : ID du serveur (s1, s2, etc.)
- `players` : Map des joueurs connectés (présence en ligne uniquement)
- `worldTime` : Timestamp serveur (sync)
- `onlineCount` : Nombre de joueurs en ligne

**Contenu de chaque PlayerState :**
- `sessionId` : ID de session Colyseus
- `playerId` : MongoDB Player._id
- `profileId` : MongoDB ServerProfile._id
- `characterSlot` : Slot du personnage (1-5)
- `characterName` : Nom du personnage
- `level` : Niveau
- `class` : Classe
- `race` : Race
- `connectedAt` : Timestamp de connexion
- `lastActivity` : Dernier heartbeat

**⚠️ IMPORTANT :**
- Le GameState contient **UNIQUEMENT** la liste des joueurs en ligne
- Le **gameplay détaillé** (HP, position, monstres, etc.) est géré **côté serveur uniquement**
- **Server Authority totale** - Le client ne peut PAS tricher

---

### Écouter les changements
```csharp
// État initial (une seule fois)
room.OnStateChange.Once((state, isFirstState) => {
  Debug.Log($"État initial reçu: {state.onlineCount} joueurs");
});

// Changements d'état
room.OnStateChange((state, isFirstState) => {
  Debug.Log($"État mis à jour: {state.onlineCount} joueurs");
});
```

### Déconnexion
```csharp
// Déconnexion volontaire
await room.Leave();

// Déconnexion accidentelle : reconnexion automatique (30s)
// Le serveur garde le personnage connecté temporairement
```

---

## Modèles de données

### Classes disponibles
```
priest   - HEALER, SUPPORT
mage     - DPS
paladin  - TANK, HEALER
rogue    - DPS
warrior  - TANK, DPS
druid    - SUPPORT, HEALER, DPS
```

### Races disponibles

**FACTION AURION (4 races) :**
```
human_elion      - Humains d'Élion
dwarf_rune       - Nains de Pierre-Rune
winged_lunaris   - Ailés Lunaris
sylphide_forest  - Sylphides Forestiers
```

**FACTION OMBRE (4 races) :**
```
varkyns_beast    - Varkyns
morhri_insect    - Morhri
ghrannite_stone  - Ghrannites
selenite_lunar   - Sélénithes
```

### Restrictions classe/race

**⚠️ UNIQUEMENT UNE RESTRICTION :**
- **Humains (human_elion) NE PEUVENT PAS être Druide**
- Toutes les autres combinaisons sont autorisées

---

## Flow d'intégration

### Scénario 1 : Nouveau joueur
```
1. Écran de login/register
   ↓
2. POST /auth/register
   Body: { username, password }
   ↓
3. Recevoir token JWT
   ↓
4. Stocker token en PlayerPrefs
   ↓
5. GET /servers
   ↓
6. Afficher liste des serveurs
   ↓
7. Joueur choisit "s1"
   ↓
8. GET /profile/s1
   ↓
9. Réponse: { exists: false }
   ↓
10. GET /game-data/races (afficher factions)
    ↓
11. Joueur choisit race "dwarf_rune"
    ↓
12. GET /game-data/allowed-classes/dwarf_rune
    ↓
13. Afficher les classes autorisées
    ↓
14. Joueur choisit classe "warrior"
    ↓
15. POST /profile/s1
    Body: { characterName: "Thrall", characterClass: "warrior", characterRace: "dwarf_rune" }
    ↓
16. Personnage créé (slot 1)
    ↓
17. Connexion WebSocket Colyseus
    client.JoinOrCreate("world", { token, serverId: "s1", characterSlot: 1 })
    ↓
18. Joueur dans le jeu !
```

---

### Scénario 2 : Joueur existant - Un personnage
```
1. Écran de login
   ↓
2. POST /auth/login
   ↓
3. Recevoir token
   ↓
4. GET /profile
   ↓
5. Réponse: { profiles: [1 personnage sur s1] }
   ↓
6. Charger automatiquement ce personnage
   ↓
7. Connexion WebSocket
   client.JoinOrCreate("world", { token, serverId: "s1", characterSlot: 1 })
   ↓
8. Joueur dans le jeu !
```

---

### Scénario 3 : Joueur existant - Plusieurs personnages
```
1. Écran de login
   ↓
2. POST /auth/login
   ↓
3. Recevoir token
   ↓
4. GET /profile
   ↓
5. Réponse: { profiles: [3 personnages sur différents serveurs] }
   ↓
6. Afficher écran de sélection
   - Liste des personnages avec serveur, nom, level, classe, race
   - Bouton "Jouer" pour chaque
   - Bouton "Créer nouveau personnage"
   ↓
7. Joueur choisit un personnage sur "s2", slot 1
   ↓
8. Connexion WebSocket
   client.JoinOrCreate("world", { token, serverId: "s2", characterSlot: 1 })
   ↓
9. Joueur dans le jeu !
```

---

### Scénario 4 : Créer un second personnage sur le même serveur
```
1. Joueur connecté avec personnage slot 1 sur s1
   ↓
2. Menu → "Nouveau personnage"
   ↓
3. GET /profile/s1
   ↓
4. Réponse: { characterCount: 1, maxCharacters: 5 }
   ↓
5. Afficher écran de création (races/classes)
   ↓
6. Joueur choisit race + classe
   ↓
7. POST /profile/s1
   Body: { characterName: "NewChar", characterClass: "mage", characterRace: "winged_lunaris", characterSlot: 2 }
   ↓
8. Personnage créé (slot 2)
   ↓
9. Connexion WebSocket avec nouveau personnage
   client.JoinOrCreate("world", { token, serverId: "s1", characterSlot: 2 })
   ↓
10. Joueur dans le jeu avec nouveau personnage !
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
| 403 | Interdit | Afficher message (ex: serveur locked) |
| 404 | Non trouvé | Afficher message d'erreur |
| 500 | Erreur serveur | Afficher erreur générique |

### Erreurs 401 (Token expiré)

Si erreur 401 :
1. Supprimer token de PlayerPrefs
2. Afficher message "Session expirée"
3. Retour écran de login

### Retry Logic

Pour les requêtes importantes (création personnage, claim rewards, etc.) :
- 3 tentatives maximum
- Attente exponentielle (2^tentative secondes)
- Afficher erreur après 3 échecs

### Timeout

- Timeout par défaut : 30 secondes
- Afficher message "Serveur ne répond pas" si timeout

---

## Best Practices

### ✅ À faire

1. **Stocker le token JWT** en PlayerPrefs de manière sécurisée
2. **Auto-login** au lancement si token valide
3. **Valider le token** avant chaque flow important (appeler `/health` ou `/profile`)
4. **Gérer les 401** en déconnectant l'utilisateur
5. **Afficher des messages d'erreur clairs** à l'utilisateur
6. **Utiliser des retry** pour les requêtes importantes
7. **Implémenter des timeouts** pour éviter les blocages
8. **Trier les profils** par `lastOnline` (dernier joué en premier)
9. **Sauvegarder le dernier serveur** joué en PlayerPrefs
10. **Afficher des loaders** pendant les requêtes API
11. **Vérifier le status du serveur** avant de permettre la création
12. **Afficher des badges visuels** selon le status (online/locked/full/maintenance)
13. **Valider les inputs** côté client avant d'appeler l'API
14. **Gérer les cas offline** gracieusement
15. **Afficher la limite de personnages** (5/5)
16. **Bloquer la classe Druide** pour les Humains dans l'UI
17. **Utiliser les `nameKey` et `descriptionKey`** pour l'i18n
18. **Écouter les WebSocket** pour les notifications temps réel

### ❌ À éviter

1. Ne **jamais stocker** le mot de passe
2. Ne **jamais faire confiance** aux données locales
3. Ne **jamais** ignorer les codes d'erreur HTTP
4. Ne pas laisser l'utilisateur **bloquer** sur une erreur réseau
5. Ne pas oublier de **logout** sur erreur 401
6. Ne pas créer de personnage si le serveur est `maintenance` ou `full`
7. Ne pas laisser l'UI **sans feedback** pendant les requêtes
8. Ne pas ignorer les **timeout** de requêtes
9. Ne pas permettre Humain + Druide
10. Ne pas afficher les classes non autorisées pour une race
11. Ne pas oublier que le GameState ne contient QUE la présence en ligne
12. Ne pas essayer de gérer le gameplay côté client (Server Authority)

---

## Stockage local (PlayerPrefs)

### Données à stocker
```
"jwt_token"        → Token JWT
"player_id"        → ID du joueur
"last_server"      → Dernier serveur joué
"last_slot"        → Dernier slot joué
"auto_login"       → Auto-login activé (1/0)
```

### Au lancement de l'application
```
Si PlayerPrefs.HasKey("jwt_token") ET auto_login == 1:
  → TryAutoLogin()
Sinon:
  → ShowLoginScreen()
```

---

## Roadmap / Prochaines fonctionnalités

Les fonctionnalités suivantes seront ajoutées :

- 🔄 **Logique de jeu** : Monstres, combats, loot
- ⚔️ **Système de combat** : Actions, dégâts, XP
- 🌍 **Zones et farming** : Mondes, zones, ennemis
- 👥 **Système d'alts** : Personnages IA contrôlés
- 🤖 **IA des alts** : Comportements automatiques
- 🏰 **Donjons** : Instances de groupe
- ⚔️ **Arène PvP** : Combat asynchrone
- 🛒 **Auction House** : Marché entre joueurs
- 🎒 **Inventaire** : Items et équipement
- 📊 **Statistiques** : Détails du personnage

---

**Version:** 1.0.0  
**Dernière mise à jour:** 18 novembre 2025  
**Architecture:** Server Authority (100% côté serveur)  
**Contact:** Support technique
