# 🤖 API NPC - IdleRPG Backend

Documentation complète pour gérer les NPC via l'API REST et WebSocket Colyseus.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Endpoints API REST](#endpoints-api-rest)
3. [Types de NPC](#types-de-npc)
4. [WebSocket Colyseus](#websocket-colyseus)
5. [Modèles de données](#modèles-de-données)
6. [Exemples Unity](#exemples-unity)
7. [Système de zones](#système-de-zones)
8. [Best Practices](#best-practices)

---

## Vue d'ensemble

Le système NPC permet de :
- ✅ **Créer/Modifier/Supprimer** des NPC via l'API REST (Unity Editor)
- ✅ **Synchroniser automatiquement** les NPC dans le GameState (Colyseus)
- ✅ **Interagir avec les NPC** en temps réel (WebSocket)
- ✅ **Organiser par zones** (optionnel)

### Architecture
```
Unity Editor (API REST) → MongoDB → WorldRoom (Colyseus) → Unity Client (WebSocket)
```

1. **Unity Editor** crée/modifie les NPC via API REST
2. **MongoDB** stocke les NPC
3. **WorldRoom** charge les NPC au démarrage
4. **Unity Client** reçoit la liste des NPC via WebSocket

---

## Endpoints API REST

**Base URL:** `http://localhost:3000` (dev) ou `https://your-api.com` (prod)

**⚠️ Toutes les routes nécessitent l'authentification JWT** (Unity Editor doit s'authentifier)

### Header requis
```http
Authorization: Bearer <token>
```

---

### 1. Créer un NPC

**POST** `/npcs/:serverId`

Crée un nouveau NPC sur un serveur.

#### URL Parameters
- `serverId` : ID du serveur (ex: `s1`, `s2`)

#### Body (JSON)
```json
{
  "npcId": "npc_blacksmith_01",
  "name": "Forge Master Thorin",
  "type": "merchant",
  "level": 30,
  "faction": "AURION",
  "zoneId": "village_start",
  "position": {
    "x": 100,
    "y": 0,
    "z": 50
  },
  "rotation": {
    "x": 0,
    "y": 180,
    "z": 0
  },
  "modelId": "npc_dwarf_blacksmith",
  "dialogueId": "dialogue_thorin_greeting",
  "shopId": "shop_blacksmith_01",
  "interactionRadius": 3
}
```

#### Champs requis
- `npcId` : ID unique du NPC
- `name` : Nom affiché
- `modelId` : Référence du prefab Unity

#### Champs optionnels
- `type` : Type de NPC (défaut: `"dialogue"`)
- `level` : Niveau (défaut: `1`)
- `faction` : Faction (défaut: `"NEUTRAL"`)
- `zoneId` : Zone/Map (défaut: `null`)
- `position` : Position (défaut: `{x:0, y:0, z:0}`)
- `rotation` : Rotation (défaut: `{x:0, y:0, z:0}`)
- `dialogueId` : ID du dialogue (défaut: `null`)
- `shopId` : ID du shop (défaut: `null`)
- `questIds` : Array de quest IDs (défaut: `[]`)
- `interactionRadius` : Distance d'interaction (défaut: `3`)
- `isActive` : Si le NPC est actif (défaut: `true`)

#### Réponse succès (201)
```json
{
  "message": "NPC created",
  "npc": {
    "id": "674a1b2c3d4e5f6g7h8i9j0k",
    "npcId": "npc_blacksmith_01",
    "serverId": "s1",
    "name": "Forge Master Thorin",
    "type": "merchant",
    "level": 30,
    "faction": "AURION",
    "zoneId": "village_start",
    "position": { "x": 100, "y": 0, "z": 50 },
    "rotation": { "x": 0, "y": 180, "z": 0 },
    "modelId": "npc_dwarf_blacksmith",
    "dialogueId": "dialogue_thorin_greeting",
    "shopId": "shop_blacksmith_01",
    "questIds": [],
    "interactionRadius": 3,
    "isActive": true,
    "createdAt": "2025-11-18T10:00:00.000Z",
    "updatedAt": "2025-11-18T10:00:00.000Z"
  }
}
```

#### Erreurs possibles

**400 - Champs manquants**
```json
{
  "error": "Missing required fields: npcId, name, modelId"
}
```

**400 - Doublon**
```json
{
  "error": "NPC npc_blacksmith_01 already exists on server s1"
}
```

**404 - Serveur introuvable**
```json
{
  "error": "Server not found"
}
```

---

### 2. Créer plusieurs NPC (Bulk)

**POST** `/npcs/:serverId/bulk`

Crée plusieurs NPC en une seule requête (optimisation Unity Editor).

#### Body (JSON)
```json
{
  "npcs": [
    {
      "npcId": "npc_guard_01",
      "name": "City Guard",
      "type": "dialogue",
      "level": 25,
      "faction": "AURION",
      "position": { "x": 90, "y": 0, "z": 30 },
      "modelId": "npc_human_guard"
    },
    {
      "npcId": "npc_merchant_01",
      "name": "Potion Vendor",
      "type": "merchant",
      "level": 15,
      "faction": "NEUTRAL",
      "position": { "x": 110, "y": 0, "z": 55 },
      "modelId": "npc_human_vendor",
      "shopId": "shop_potions_01"
    }
  ]
}
```

#### Réponse succès (201)
```json
{
  "message": "Bulk create completed",
  "created": 2,
  "errors": 0,
  "npcs": [
    {
      "id": "674a1b2c3d4e5f6g7h8i9j0k",
      "npcId": "npc_guard_01",
      "name": "City Guard",
      "zoneId": null
    },
    {
      "id": "674a1b2c3d4e5f6g7h8i9j0l",
      "npcId": "npc_merchant_01",
      "name": "Potion Vendor",
      "zoneId": null
    }
  ],
  "errorDetails": []
}
```

**Note :** Les NPC en erreur sont listés dans `errorDetails` sans bloquer la création des autres.

---

### 3. Lister les NPC

**GET** `/npcs/:serverId`

Liste tous les NPC d'un serveur avec filtres optionnels.

#### URL Parameters
- `serverId` : ID du serveur

#### Query Parameters (optionnels)
- `type` : Filtrer par type (`merchant`, `quest_giver`, `dialogue`, `hybrid`)
- `faction` : Filtrer par faction (`AURION`, `OMBRE`, `NEUTRAL`)
- `zoneId` : Filtrer par zone (ex: `village_start`)
- `isActive` : Filtrer par status (`true` ou `false`)

#### Exemples
```http
GET /npcs/s1
GET /npcs/s1?type=merchant
GET /npcs/s1?faction=AURION
GET /npcs/s1?zoneId=village_start
GET /npcs/s1?type=merchant&zoneId=village_start
GET /npcs/s1?isActive=true
```

#### Réponse succès (200)
```json
{
  "serverId": "s1",
  "count": 3,
  "filters": {
    "type": "merchant",
    "faction": null,
    "zoneId": "village_start",
    "isActive": null
  },
  "npcs": [
    {
      "id": "674a1b2c3d4e5f6g7h8i9j0k",
      "npcId": "npc_blacksmith_01",
      "name": "Forge Master Thorin",
      "type": "merchant",
      "level": 30,
      "faction": "AURION",
      "zoneId": "village_start",
      "position": { "x": 100, "y": 0, "z": 50 },
      "rotation": { "x": 0, "y": 180, "z": 0 },
      "modelId": "npc_dwarf_blacksmith",
      "dialogueId": "dialogue_thorin_greeting",
      "shopId": "shop_blacksmith_01",
      "questIds": [],
      "interactionRadius": 3,
      "isActive": true,
      "createdAt": "2025-11-18T10:00:00.000Z",
      "updatedAt": "2025-11-18T10:00:00.000Z"
    }
    // ... autres NPC
  ]
}
```

---

### 4. Récupérer un NPC

**GET** `/npcs/:serverId/:npcId`

Récupère les détails d'un NPC spécifique.

#### URL Parameters
- `serverId` : ID du serveur
- `npcId` : ID du NPC

#### Exemple
```http
GET /npcs/s1/npc_blacksmith_01
```

#### Réponse succès (200)
```json
{
  "npc": {
    "id": "674a1b2c3d4e5f6g7h8i9j0k",
    "npcId": "npc_blacksmith_01",
    "serverId": "s1",
    "name": "Forge Master Thorin",
    "type": "merchant",
    "level": 30,
    "faction": "AURION",
    "zoneId": "village_start",
    "position": { "x": 100, "y": 0, "z": 50 },
    "rotation": { "x": 0, "y": 180, "z": 0 },
    "modelId": "npc_dwarf_blacksmith",
    "dialogueId": "dialogue_thorin_greeting",
    "shopId": "shop_blacksmith_01",
    "questIds": [],
    "interactionRadius": 3,
    "isActive": true,
    "createdAt": "2025-11-18T10:00:00.000Z",
    "updatedAt": "2025-11-18T10:00:00.000Z"
  }
}
```

#### Erreurs possibles

**404 - NPC introuvable**
```json
{
  "error": "NPC npc_blacksmith_01 not found on server s1"
}
```

---

### 5. Modifier un NPC

**PUT** `/npcs/:serverId/:npcId`

Modifie un NPC existant.

#### URL Parameters
- `serverId` : ID du serveur
- `npcId` : ID du NPC

#### Body (JSON)
```json
{
  "name": "Master Forge Thorin",
  "level": 35,
  "position": { "x": 105, "y": 0, "z": 55 },
  "zoneId": "village_center"
}
```

**Note :** Seuls les champs fournis sont modifiés. `npcId` et `serverId` ne peuvent pas être modifiés.

#### Réponse succès (200)
```json
{
  "message": "NPC updated",
  "npc": {
    "id": "674a1b2c3d4e5f6g7h8i9j0k",
    "npcId": "npc_blacksmith_01",
    "serverId": "s1",
    "name": "Master Forge Thorin",
    "level": 35,
    "zoneId": "village_center",
    // ... autres champs mis à jour
  }
}
```

---

### 6. Supprimer un NPC

**DELETE** `/npcs/:serverId/:npcId`

Supprime un NPC du serveur.

#### URL Parameters
- `serverId` : ID du serveur
- `npcId` : ID du NPC

#### Exemple
```http
DELETE /npcs/s1/npc_blacksmith_01
```

#### Réponse succès (200)
```json
{
  "message": "NPC deleted",
  "npcId": "npc_blacksmith_01",
  "name": "Forge Master Thorin",
  "serverId": "s1",
  "zoneId": "village_start"
}
```

---

## Types de NPC

### 1. Quest Giver
Donne des quêtes aux joueurs.
```json
{
  "type": "quest_giver",
  "dialogueId": "dialogue_quest_intro",
  "questIds": []
}
```

**Interaction :** Affiche les quêtes disponibles (système de quêtes à implémenter).

---

### 2. Merchant
Vend des items.
```json
{
  "type": "merchant",
  "shopId": "shop_blacksmith_01",
  "dialogueId": "dialogue_merchant_greeting"
}
```

**Interaction :** Ouvre le shop.

---

### 3. Dialogue
NPC simple avec dialogue uniquement.
```json
{
  "type": "dialogue",
  "dialogueId": "dialogue_guard_greeting"
}
```

**Interaction :** Affiche le dialogue.

---

### 4. Hybrid
Combine plusieurs fonctions.
```json
{
  "type": "hybrid",
  "dialogueId": "dialogue_innkeeper_greeting",
  "shopId": "shop_inn_01",
  "questIds": []
}
```

**Interaction :** Peut ouvrir le shop ET donner des quêtes.

---

## WebSocket Colyseus

### Chargement automatique des NPC

Quand un joueur se connecte via WebSocket, les NPC sont **automatiquement chargés** dans le `GameState`.
```typescript
// Unity - Connexion au monde
var room = await client.JoinOrCreate<GameState>("world", new Dictionary<string, object> {
  { "token", jwtToken },
  { "serverId", "s1" },
  { "characterSlot", 1 }
});

// Les NPC sont dans room.State.npcs
room.State.npcs.OnAdd += (npcId, npc) => {
  Debug.Log($"NPC chargé: {npc.name} ({npc.type})");
  InstantiateNPC(npc);
};
```

### Message de bienvenue

Quand le joueur rejoint, il reçoit :
```json
{
  "message": "Bienvenue Arthas sur s1 !",
  "serverId": "s1",
  "onlinePlayers": 5,
  "npcCount": 12
}
```

### Interaction avec un NPC

**Client → Serveur**
```csharp
room.Send("npc_interact", new {
  npcId = "npc_blacksmith_01"
});
```

**Serveur → Client**

Le serveur répond selon le type de NPC :

#### Dialogue
```json
{
  "npcId": "npc_blacksmith_01",
  "npcName": "Forge Master Thorin",
  "dialogueId": "dialogue_thorin_greeting"
}
```

#### Shop
```json
{
  "npcId": "npc_blacksmith_01",
  "npcName": "Forge Master Thorin",
  "shopId": "shop_blacksmith_01"
}
```

#### Quests
```json
{
  "npcId": "npc_sage_01",
  "npcName": "Elder Sage Merlin",
  "questIds": []
}
```

### Messages WebSocket

**Client → Serveur :**
- `npc_interact` - Interagir avec un NPC

**Serveur → Client :**
- `npc_dialogue` - Dialogue du NPC
- `npc_shop_open` - Ouvrir le shop
- `npc_quests` - Liste des quêtes
- `error` - Erreur (NPC introuvable, etc.)

---

## Modèles de données

### NPCState (Colyseus Schema)
```csharp
public class NPCState : Schema
{
    [Type(0)] public string npcId = "";
    [Type(1)] public string name = "";
    [Type(2)] public string type = "";
    [Type(3)] public int level = 1;
    [Type(4)] public string faction = "";
    [Type(5)] public string zoneId = "";
    
    [Type(6)] public float posX = 0;
    [Type(7)] public float posY = 0;
    [Type(8)] public float posZ = 0;
    
    [Type(9)] public float rotX = 0;
    [Type(10)] public float rotY = 0;
    [Type(11)] public float rotZ = 0;
    
    [Type(12)] public string modelId = "";
    [Type(13)] public string dialogueId = "";
    [Type(14)] public string shopId = "";
    [Type(15)] public float interactionRadius = 3;
    [Type(16)] public bool isActive = true;
}
```

### Types de NPC
```csharp
public enum NPCType
{
    QuestGiver,
    Merchant,
    Dialogue,
    Hybrid
}
```

### Factions
```csharp
public enum Faction
{
    AURION,   // Faction de la lumière
    OMBRE,    // Faction des ténèbres
    NEUTRAL   // Neutre
}
```

---

## Exemples Unity

### 1. Manager NPC (Unity Editor)
```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Collections.Generic;

public class NPCEditorManager : MonoBehaviour
{
    private string baseURL = "http://localhost:3000";
    private string token; // Token JWT de l'Editor

    // Créer un NPC
    public IEnumerator CreateNPC(string serverId, NPCData npcData)
    {
        string json = JsonUtility.ToJson(npcData);
        
        UnityWebRequest www = new UnityWebRequest($"{baseURL}/npcs/{serverId}", "POST");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
        www.uploadHandler = new UploadHandlerRaw(bodyRaw);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");
        www.SetRequestHeader("Authorization", $"Bearer {token}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            CreateNPCResponse response = JsonUtility.FromJson<CreateNPCResponse>(www.downloadHandler.text);
            Debug.Log($"NPC créé: {response.npc.name}");
        }
        else
        {
            Debug.LogError($"Erreur: {www.downloadHandler.text}");
        }
    }

    // Lister les NPC
    public IEnumerator ListNPCs(string serverId)
    {
        UnityWebRequest www = UnityWebRequest.Get($"{baseURL}/npcs/{serverId}");
        www.SetRequestHeader("Authorization", $"Bearer {token}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            ListNPCsResponse response = JsonUtility.FromJson<ListNPCsResponse>(www.downloadHandler.text);
            Debug.Log($"{response.count} NPC trouvés sur {serverId}");
            
            foreach (var npc in response.npcs)
            {
                Debug.Log($"- {npc.name} ({npc.type}) à {npc.position.x}, {npc.position.y}, {npc.position.z}");
            }
        }
    }

    // Modifier un NPC
    public IEnumerator UpdateNPC(string serverId, string npcId, NPCUpdateData updateData)
    {
        string json = JsonUtility.ToJson(updateData);
        
        UnityWebRequest www = new UnityWebRequest($"{baseURL}/npcs/{serverId}/{npcId}", "PUT");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
        www.uploadHandler = new UploadHandlerRaw(bodyRaw);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");
        www.SetRequestHeader("Authorization", $"Bearer {token}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            Debug.Log("NPC mis à jour avec succès");
        }
    }

    // Supprimer un NPC
    public IEnumerator DeleteNPC(string serverId, string npcId)
    {
        UnityWebRequest www = UnityWebRequest.Delete($"{baseURL}/npcs/{serverId}/{npcId}");
        www.SetRequestHeader("Authorization", $"Bearer {token}");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            Debug.Log("NPC supprimé avec succès");
        }
    }
}

[System.Serializable]
public class NPCData
{
    public string npcId;
    public string name;
    public string type;
    public int level;
    public string faction;
    public string zoneId;
    public Vector3Data position;
    public Vector3Data rotation;
    public string modelId;
    public string dialogueId;
    public string shopId;
    public float interactionRadius;
}

[System.Serializable]
public class Vector3Data
{
    public float x;
    public float y;
    public float z;
}

[System.Serializable]
public class CreateNPCResponse
{
    public string message;
    public NPCData npc;
}

[System.Serializable]
public class ListNPCsResponse
{
    public string serverId;
    public int count;
    public List<NPCData> npcs;
}

[System.Serializable]
public class NPCUpdateData
{
    public string name;
    public int level;
    public Vector3Data position;
    public string zoneId;
}
```

---

### 2. Manager NPC (Unity Client - Colyseus)
```csharp
using UnityEngine;
using Colyseus;
using System.Collections.Generic;

public class NPCClientManager : MonoBehaviour
{
    private ColyseusRoom<GameState> room;
    private Dictionary<string, GameObject> npcInstances = new Dictionary<string, GameObject>();

    public GameObject npcPrefab; // Prefab de base pour les NPC

    public void Initialize(ColyseusRoom<GameState> gameRoom)
    {
        room = gameRoom;

        // Écouter l'ajout de NPC
        room.State.npcs.OnAdd += OnNPCAdded;

        // Écouter la suppression de NPC
        room.State.npcs.OnRemove += OnNPCRemoved;

        // Écouter les messages du serveur
        room.OnMessage<NPCDialogueMessage>("npc_dialogue", OnNPCDialogue);
        room.OnMessage<NPCShopMessage>("npc_shop_open", OnNPCShopOpen);
        room.OnMessage<NPCQuestsMessage>("npc_quests", OnNPCQuests);
    }

    // NPC ajouté au GameState
    private void OnNPCAdded(string npcId, NPCState npc)
    {
        Debug.Log($"NPC chargé: {npc.name} ({npc.type})");

        // Instancier le NPC dans le monde
        Vector3 position = new Vector3(npc.posX, npc.posY, npc.posZ);
        Quaternion rotation = Quaternion.Euler(npc.rotX, npc.rotY, npc.rotZ);

        GameObject npcObject = Instantiate(npcPrefab, position, rotation);
        npcObject.name = npc.name;

        // Configurer le NPC
        NPCBehaviour npcBehaviour = npcObject.GetComponent<NPCBehaviour>();
        npcBehaviour.Initialize(npc);

        npcInstances[npcId] = npcObject;
    }

    // NPC retiré du GameState
    private void OnNPCRemoved(string npcId, NPCState npc)
    {
        Debug.Log($"NPC retiré: {npc.name}");

        if (npcInstances.ContainsKey(npcId))
        {
            Destroy(npcInstances[npcId]);
            npcInstances.Remove(npcId);
        }
    }

    // Interagir avec un NPC
    public void InteractWithNPC(string npcId)
    {
        Debug.Log($"Interaction avec NPC: {npcId}");
        room.Send("npc_interact", new { npcId = npcId });
    }

    // Réception du dialogue
    private void OnNPCDialogue(NPCDialogueMessage message)
    {
        Debug.Log($"Dialogue de {message.npcName}: {message.dialogueId}");
        // TODO: Afficher le dialogue UI
    }

    // Réception de l'ouverture du shop
    private void OnNPCShopOpen(NPCShopMessage message)
    {
        Debug.Log($"Shop de {message.npcName} ouvert: {message.shopId}");
        // TODO: Ouvrir le shop UI
    }

    // Réception des quêtes
    private void OnNPCQuests(NPCQuestsMessage message)
    {
        Debug.Log($"Quêtes de {message.npcName}: {message.questIds.Length} quête(s)");
        // TODO: Afficher les quêtes UI
    }
}

[System.Serializable]
public class NPCDialogueMessage
{
    public string npcId;
    public string npcName;
    public string dialogueId;
}

[System.Serializable]
public class NPCShopMessage
{
    public string npcId;
    public string npcName;
    public string shopId;
}

[System.Serializable]
public class NPCQuestsMessage
{
    public string npcId;
    public string npcName;
    public string[] questIds;
}
```

---

### 3. Comportement NPC
```csharp
using UnityEngine;

public class NPCBehaviour : MonoBehaviour
{
    private NPCState npcData;
    private NPCClientManager manager;

    public void Initialize(NPCState data)
    {
        npcData = data;
        manager = FindObjectOfType<NPCClientManager>();

        // Charger le modèle approprié selon modelId
        LoadModel(data.modelId);

        // Configurer le collider d'interaction
        SphereCollider interactionCollider = gameObject.AddComponent<SphereCollider>();
        interactionCollider.isTrigger = true;
        interactionCollider.radius = data.interactionRadius;
    }

    private void LoadModel(string modelId)
    {
        // TODO: Charger le prefab correspondant
        Debug.Log($"Chargement du modèle: {modelId}");
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            Debug.Log($"Joueur proche de {npcData.name}");
            // TODO: Afficher l'icône d'interaction
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            Debug.Log($"Joueur s'éloigne de {npcData.name}");
            // TODO: Cacher l'icône d'interaction
        }
    }

    // Appelé quand le joueur appuie sur la touche d'interaction
    public void Interact()
    {
        Debug.Log($"Interaction avec {npcData.name}");
        manager.InteractWithNPC(npcData.npcId);
    }
}
```

---

## Système de zones

Le champ `zoneId` permet d'organiser les NPC par zones/maps.

### Utilisation

**Sans zones (défaut) :**
```json
{
  "npcId": "npc_blacksmith_01",
  "zoneId": null,
  "position": { "x": 100, "y": 0, "z": 50 }
}
```
→ Coordonnées globales, NPC toujours chargé

**Avec zones :**
```json
{
  "npcId": "npc_blacksmith_01",
  "zoneId": "village_start",
  "position": { "x": 10, "y": 0, "z": 5 }
}
```
→ Position locale dans la zone

### Filtrer par zone
```http
GET /npcs/s1?zoneId=village_start
```

### Charger uniquement une zone (WorldRoom)

Le NPCManager peut charger uniquement les NPC d'une zone :
```typescript
// Charger tous les NPC
await this.npcManager.loadNPCs();

// OU charger uniquement une zone
await this.npcManager.loadNPCs("village_start");
```

**Unity :** Le client reçoit uniquement les NPC de la zone chargée.

---

## Best Practices

### ✅ À faire

1. **Nommer les NPC clairement** : `npc_blacksmith_01`, `npc_sage_village`
2. **Utiliser des coordonnées cohérentes** : Placer les NPC aux bons endroits dans Unity
3. **Tester les interactions** avant de déployer
4. **Utiliser le bulk create** pour créer plusieurs NPC d'un coup
5. **Organiser par zones** si tu as plusieurs maps
6. **Créer des prefabs Unity** pour chaque `modelId`
7. **Vérifier la distance d'interaction** (`interactionRadius`)
8. **Désactiver les NPC** plutôt que les supprimer (`isActive: false`)

### ❌ À éviter

1. Ne **jamais créer de doublons** (même `npcId` sur le même serveur)
2. Ne **pas oublier** le `modelId` (requis)
3. Ne **pas mettre des coordonnées absurdes** (vérifier dans Unity)
4. Ne **pas oublier** les références (`dialogueId`, `shopId` si nécessaire)
5. Ne **pas modifier** `npcId` ou `serverId` après création
6. Ne **pas charger tous les NPC** si tu as beaucoup de zones (utiliser les filtres)

---

## Notes importantes

### Server Authority

- ✅ Le serveur **valide tout** (position, distance, interaction)
- ✅ Le client **ne peut pas tricher** (interaction validée côté serveur)
- ✅ Les NPC sont **synchronisés automatiquement** via Colyseus

### Performance

- Les NPC sont **chargés au démarrage** de la WorldRoom
- Utiliser **les zones** pour ne charger que les NPC nécessaires
- Le `GameState` contient **uniquement la liste des NPC** (pas de logique)
- La logique d'interaction est **côté serveur** (NPCManager)

### Prochaines étapes

Le système NPC est prêt pour :
- 📋 **Système de dialogues** (à implémenter)
- 🛒 **Système de shops** (à implémenter)
- 🎯 **Système de quêtes** (à implémenter)

Les structures sont déjà en place (`dialogueId`, `shopId`, `questIds`).

---

**Version:** 1.0.0  
**Dernière mise à jour:** 18 novembre 2025  
**Architecture:** Server Authority totale  
**Contact:** Support technique
