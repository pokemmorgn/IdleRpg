# 💬 API Dialogues - IdleRPG Backend

Documentation complète pour gérer les dialogues et les gameplay tags via l'API REST et WebSocket Colyseus.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Gameplay Tags](#gameplay-tags)
3. [Endpoints API REST](#endpoints-api-rest)
4. [Système de Dialogues](#système-de-dialogues)
5. [Spam Protection](#spam-protection)
6. [WebSocket Colyseus](#websocket-colyseus)
7. [Modèles de données](#modèles-de-données)
8. [Exemples Unity](#exemples-unity)
9. [Best Practices](#best-practices)

---

## Vue d'ensemble

Le système de dialogues permet de :
- ✅ **Créer des arbres de dialogues** complexes avec choix multiples
- ✅ **Conditions dynamiques** (level, gameplay tags, inventaire)
- ✅ **Actions automatiques** (donner XP, ajouter tags, ouvrir shop)
- ✅ **Protection anti-spam** avec tiers multiples
- ✅ **Localisation complète** (toutes les strings sont des clés de traduction)
- ✅ **Gameplay Tags** (système inspiré d'Unreal Engine 5)

### Architecture
```
Unity Editor (API REST) → MongoDB → DialogueManager (Colyseus) → Unity Client (WebSocket)
```

1. **Unity Editor** crée/modifie les dialogues via API REST
2. **MongoDB** stocke les dialogues et les tags joueurs
3. **DialogueManager** évalue conditions/actions et gère la logique
4. **Unity Client** reçoit les noeuds de dialogue via WebSocket

---

## Gameplay Tags

### Concept

Système de tags hiérarchiques inspiré d'Unreal Engine 5 pour marquer les états/progressions du joueur.

**Format :** `categorie.sous_categorie.detail`

**Exemples :**
```
dialogue.thorin.met
dialogue.thorin.tutorial_completed
quest.main.chapter1.started
quest.main.chapter1.completed
skill.blacksmith.unlocked
recipe.iron_sword.learned
achievement.first_kill
npc.elder.trust_high
faction.aurion.reputation_100
event.village_saved
```

### Avantages

✅ **Hiérarchie claire** : Organisation naturelle  
✅ **Queries puissantes** : Wildcard matching (`dialogue.thorin.*`)  
✅ **Pas de boolean** : Le tag existe ou n'existe pas  
✅ **Extensible** : Facile d'ajouter des catégories  
✅ **Pattern éprouvé** : Utilisé dans Unreal Engine 5

### Opérations disponibles
```typescript
// Ajouter un tag
GameplayTagManager.addTag(profileId, "dialogue.thorin.tutorial_completed")

// Vérifier un tag exact
GameplayTagManager.hasTag(profileId, "dialogue.thorin.met")

// Vérifier avec wildcard
GameplayTagManager.hasTagMatching(profileId, "dialogue.thorin.*")

// Vérifier plusieurs tags (ET)
GameplayTagManager.hasAllTags(profileId, ["dialogue.thorin.met", "quest.main.chapter1.started"])

// Vérifier plusieurs tags (OU)
GameplayTagManager.hasAnyTag(profileId, ["dialogue.thorin.met", "dialogue.elder.met"])
```

---

## Endpoints API REST

**Base URL:** `http://localhost:3000` (dev) ou `https://your-api.com` (prod)

**⚠️ Toutes les routes nécessitent l'authentification JWT**

### Header requis
```http
Authorization: Bearer <token>
```

---

### 1. Créer un dialogue

**POST** `/dialogues`

Crée un nouveau dialogue.

#### Body (JSON)

**Dialogue simple :**
```json
{
  "dialogueId": "dialogue_thorin_greeting",
  "npcId": "npc_blacksmith_01",
  "description": "Thorin's simple greeting dialogue",
  "nodes": [
    {
      "nodeId": "start",
      "text": "dialogue.thorin.greeting",
      "choices": [
        {
          "choiceText": "dialogue.common.goodbye",
          "nextNode": "end"
        }
      ]
    },
    {
      "nodeId": "end",
      "text": "dialogue.thorin.farewell",
      "choices": []
    }
  ]
}
```

**Dialogue avec conditions et actions :**
```json
{
  "dialogueId": "dialogue_thorin_advanced",
  "npcId": "npc_blacksmith_01",
  "description": "Advanced dialogue with conditions and actions",
  "nodes": [
    {
      "nodeId": "start",
      "text": "dialogue.thorin.greeting",
      "conditions": [
        {
          "type": "level_min",
          "value": 10
        },
        {
          "type": "has_tag",
          "tag": "dialogue.thorin.met"
        }
      ],
      "actions": [
        {
          "type": "add_tag",
          "tag": "dialogue.thorin.greeted_today"
        },
        {
          "type": "give_xp",
          "amount": 50
        }
      ],
      "choices": [
        {
          "choiceText": "dialogue.thorin.choice.about_work",
          "nextNode": "about_work",
          "conditions": [
            {
              "type": "level_min",
              "value": 15
            }
          ]
        },
        {
          "choiceText": "dialogue.common.goodbye",
          "nextNode": "end"
        }
      ]
    },
    {
      "nodeId": "about_work",
      "text": "dialogue.thorin.about_work",
      "actions": [
        {
          "type": "add_tag",
          "tag": "dialogue.thorin.learned_blacksmith"
        }
      ],
      "choices": [
        {
          "choiceText": "dialogue.common.thanks",
          "nextNode": "end"
        }
      ]
    },
    {
      "nodeId": "end",
      "text": "dialogue.thorin.farewell",
      "choices": []
    }
  ]
}
```

**Dialogue avec spam protection :**
```json
{
  "dialogueId": "dialogue_thorin_spam",
  "npcId": "npc_blacksmith_01",
  "description": "Dialogue with spam protection",
  "spamProtection": {
    "enabled": true,
    "resetDelay": 300,
    "tiers": [
      {
        "minCount": 1,
        "maxCount": 3,
        "startNode": "start"
      },
      {
        "minCount": 4,
        "maxCount": 7,
        "startNode": "annoyed"
      },
      {
        "minCount": 8,
        "maxCount": null,
        "startNode": "angry"
      }
    ]
  },
  "nodes": [
    {
      "nodeId": "start",
      "text": "dialogue.thorin.greeting",
      "choices": [
        {
          "choiceText": "dialogue.common.goodbye",
          "nextNode": "end"
        }
      ]
    },
    {
      "nodeId": "annoyed",
      "text": "dialogue.thorin.annoyed",
      "choices": [
        {
          "choiceText": "dialogue.common.sorry",
          "nextNode": "end"
        }
      ]
    },
    {
      "nodeId": "angry",
      "text": "dialogue.thorin.angry",
      "choices": []
    },
    {
      "nodeId": "end",
      "text": "dialogue.thorin.farewell",
      "choices": []
    }
  ]
}
```

#### Champs requis
- `dialogueId` : ID unique du dialogue
- `nodes` : Array de noeuds (minimum 1)
- Le dialogue **doit** avoir un noeud avec `nodeId: "start"`

#### Champs optionnels
- `npcId` : ID du NPC (pour organisation)
- `description` : Description en anglais (pour les devs)
- `spamProtection` : Configuration anti-spam

#### Réponse succès (201)
```json
{
  "message": "Dialogue created",
  "dialogue": {
    "id": "674a1b2c3d4e5f6g7h8i9j0k",
    "dialogueId": "dialogue_thorin_greeting",
    "npcId": "npc_blacksmith_01",
    "description": "Thorin's greeting dialogue",
    "spamProtection": null,
    "nodes": [...],
    "createdAt": "2025-11-18T10:00:00.000Z",
    "updatedAt": "2025-11-18T10:00:00.000Z"
  }
}
```

#### Erreurs possibles

**400 - Champs manquants**
```json
{
  "error": "Missing required fields: dialogueId, nodes (must not be empty)"
}
```

**400 - Pas de noeud "start"**
```json
{
  "error": "Dialogue must have a 'start' node"
}
```

**400 - Doublon**
```json
{
  "error": "Dialogue dialogue_thorin_greeting already exists"
}
```

---

### 2. Créer plusieurs dialogues (Bulk)

**POST** `/dialogues/bulk`

Crée plusieurs dialogues en une seule requête (optimisation Unity Editor).

#### Body (JSON)
```json
{
  "dialogues": [
    {
      "dialogueId": "dialogue_guard_greeting",
      "npcId": "npc_guard_01",
      "description": "Guard's greeting",
      "nodes": [
        {
          "nodeId": "start",
          "text": "dialogue.guard.greeting",
          "choices": []
        }
      ]
    },
    {
      "dialogueId": "dialogue_merchant_greeting",
      "npcId": "npc_merchant_01",
      "description": "Merchant's greeting",
      "nodes": [
        {
          "nodeId": "start",
          "text": "dialogue.merchant.greeting",
          "actions": [
            {
              "type": "open_shop",
              "shopId": "shop_general_01"
            }
          ],
          "choices": [
            {
              "choiceText": "dialogue.common.thanks",
              "nextNode": "end"
            }
          ]
        },
        {
          "nodeId": "end",
          "text": "dialogue.merchant.farewell",
          "choices": []
        }
      ]
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
  "dialogues": [
    {
      "id": "674a1b2c3d4e5f6g7h8i9j0k",
      "dialogueId": "dialogue_guard_greeting",
      "description": "Guard's greeting"
    },
    {
      "id": "674a1b2c3d4e5f6g7h8i9j0l",
      "dialogueId": "dialogue_merchant_greeting",
      "description": "Merchant's greeting"
    }
  ],
  "errorDetails": []
}
```

**Note :** Les dialogues en erreur sont listés dans `errorDetails` sans bloquer la création des autres.

---

### 3. Lister les dialogues

**GET** `/dialogues`

Liste tous les dialogues avec filtres optionnels.

#### Query Parameters (optionnels)
- `npcId` : Filtrer par NPC (ex: `npc_blacksmith_01`)

#### Exemples
```http
GET /dialogues
GET /dialogues?npcId=npc_blacksmith_01
```

#### Réponse succès (200)
```json
{
  "count": 3,
  "filters": {
    "npcId": "npc_blacksmith_01"
  },
  "dialogues": [
    {
      "id": "674a1b2c3d4e5f6g7h8i9j0k",
      "dialogueId": "dialogue_thorin_greeting",
      "npcId": "npc_blacksmith_01",
      "description": "Thorin's greeting",
      "spamProtection": null,
      "nodes": [...],
      "createdAt": "2025-11-18T10:00:00.000Z",
      "updatedAt": "2025-11-18T10:00:00.000Z"
    }
    // ... autres dialogues
  ]
}
```

---

### 4. Récupérer un dialogue

**GET** `/dialogues/:dialogueId`

Récupère les détails d'un dialogue spécifique.

#### Exemple
```http
GET /dialogues/dialogue_thorin_greeting
```

#### Réponse succès (200)
```json
{
  "dialogue": {
    "id": "674a1b2c3d4e5f6g7h8i9j0k",
    "dialogueId": "dialogue_thorin_greeting",
    "npcId": "npc_blacksmith_01",
    "description": "Thorin's greeting",
    "spamProtection": null,
    "nodes": [
      {
        "nodeId": "start",
        "text": "dialogue.thorin.greeting",
        "conditions": [],
        "actions": [],
        "choices": [
          {
            "choiceText": "dialogue.common.goodbye",
            "nextNode": "end",
            "conditions": []
          }
        ]
      },
      {
        "nodeId": "end",
        "text": "dialogue.thorin.farewell",
        "conditions": [],
        "actions": [],
        "choices": []
      }
    ],
    "createdAt": "2025-11-18T10:00:00.000Z",
    "updatedAt": "2025-11-18T10:00:00.000Z"
  }
}
```

---

### 5. Modifier un dialogue

**PUT** `/dialogues/:dialogueId`

Modifie un dialogue existant.

#### Body (JSON)
```json
{
  "description": "Updated description",
  "nodes": [
    {
      "nodeId": "start",
      "text": "dialogue.thorin.greeting_updated",
      "choices": [
        {
          "choiceText": "dialogue.common.goodbye",
          "nextNode": "end"
        }
      ]
    },
    {
      "nodeId": "end",
      "text": "dialogue.thorin.farewell",
      "choices": []
    }
  ]
}
```

**Note :** Seuls les champs fournis sont modifiés. `dialogueId` ne peut pas être modifié.

#### Réponse succès (200)
```json
{
  "message": "Dialogue updated",
  "dialogue": {
    "id": "674a1b2c3d4e5f6g7h8i9j0k",
    "dialogueId": "dialogue_thorin_greeting",
    "description": "Updated description",
    "nodes": [...],
    "updatedAt": "2025-11-18T11:00:00.000Z"
  }
}
```

---

### 6. Supprimer un dialogue

**DELETE** `/dialogues/:dialogueId`

Supprime un dialogue.

#### Exemple
```http
DELETE /dialogues/dialogue_thorin_greeting
```

#### Réponse succès (200)
```json
{
  "message": "Dialogue deleted",
  "dialogueId": "dialogue_thorin_greeting",
  "description": "Thorin's greeting"
}
```

---

### 7. Valider un dialogue

**GET** `/dialogues/:dialogueId/validate`

Valide la cohérence d'un dialogue (références, orphelins, dead ends).

#### Exemple
```http
GET /dialogues/dialogue_thorin_greeting/validate
```

#### Réponse succès (200)
```json
{
  "dialogueId": "dialogue_thorin_greeting",
  "isValid": true,
  "errors": [],
  "warnings": [
    "Node 'extra_node' is never referenced (orphan node)"
  ],
  "nodeCount": 3,
  "hasSpamProtection": false,
  "summary": "Dialogue is valid"
}
```

**Avec erreurs :**
```json
{
  "dialogueId": "dialogue_broken",
  "isValid": false,
  "errors": [
    "Missing 'start' node",
    "Node 'start' references non-existent node 'invalid_node'"
  ],
  "warnings": [],
  "nodeCount": 2,
  "hasSpamProtection": false,
  "summary": "Dialogue has errors"
}
```

---

## Système de Dialogues

### Structure d'un dialogue
```
Dialogue
  ├─ dialogueId (unique)
  ├─ npcId (optionnel)
  ├─ description (en anglais, pour les devs)
  ├─ spamProtection (optionnel)
  └─ nodes (array)
       └─ Node
            ├─ nodeId (unique dans le dialogue)
            ├─ text (clé de traduction)
            ├─ conditions (array, optionnel)
            ├─ actions (array, optionnel)
            └─ choices (array)
                 └─ Choice
                      ├─ choiceText (clé de traduction)
                      ├─ nextNode (nodeId suivant)
                      └─ conditions (array, optionnel)
```

### Types de conditions

#### 1. level_min
Le joueur doit avoir un niveau minimum.
```json
{
  "type": "level_min",
  "value": 10
}
```

#### 2. level_max
Le joueur doit avoir un niveau maximum.
```json
{
  "type": "level_max",
  "value": 50
}
```

#### 3. has_tag
Le joueur doit avoir un gameplay tag spécifique.
```json
{
  "type": "has_tag",
  "tag": "dialogue.thorin.tutorial_completed"
}
```

#### 4. has_all_tags
Le joueur doit avoir TOUS les tags (ET logique).
```json
{
  "type": "has_all_tags",
  "tags": [
    "dialogue.thorin.met",
    "quest.main.chapter1.started"
  ]
}
```

#### 5. has_any_tag
Le joueur doit avoir AU MOINS UN des tags (OU logique).
```json
{
  "type": "has_any_tag",
  "tags": [
    "dialogue.thorin.met",
    "dialogue.elder.met"
  ]
}
```

#### 6. has_tag_matching
Le joueur doit avoir un tag correspondant au pattern (wildcard).
```json
{
  "type": "has_tag_matching",
  "tag": "dialogue.thorin.*"
}
```

#### 7. has_item (PLACEHOLDER)
Le joueur doit avoir un item dans son inventaire.
```json
{
  "type": "has_item",
  "itemId": "item_iron_ore",
  "quantity": 5
}
```

**Note :** Cette condition retourne toujours `true` pour l'instant (inventaire pas encore implémenté).

#### 8. quest_completed (PLACEHOLDER)
Le joueur doit avoir complété une quête.
```json
{
  "type": "quest_completed",
  "questId": "quest_blacksmith_intro"
}
```

**Note :** Cette condition retourne toujours `true` pour l'instant (quêtes pas encore implémentées).

---

### Types d'actions

#### 1. add_tag
Ajoute un gameplay tag au joueur.
```json
{
  "type": "add_tag",
  "tag": "dialogue.thorin.tutorial_completed"
}
```

#### 2. remove_tag
Retire un gameplay tag du joueur.
```json
{
  "type": "remove_tag",
  "tag": "dialogue.thorin.tutorial_in_progress"
}
```

#### 3. give_xp
Donne de l'XP au joueur.
```json
{
  "type": "give_xp",
  "amount": 100
}
```

**Note :** Le client reçoit un message `xp_gained` avec le montant.

#### 4. open_shop
Ouvre le shop d'un NPC.
```json
{
  "type": "open_shop",
  "shopId": "shop_blacksmith_01"
}
```

**Note :** Le client reçoit un message `shop_open` avec le `shopId`.

#### 5. give_item (PLACEHOLDER)
Donne un item au joueur.
```json
{
  "type": "give_item",
  "itemId": "item_iron_sword",
  "quantity": 1
}
```

**Note :** Placeholder (inventaire pas encore implémenté).

#### 6. learn_recipe (PLACEHOLDER)
Apprend une recette de crafting au joueur.
```json
{
  "type": "learn_recipe",
  "recipeId": "recipe_iron_sword"
}
```

**Note :** Placeholder (crafting pas encore implémenté).

#### 7. learn_skill (PLACEHOLDER)
Apprend un skill au joueur.
```json
{
  "type": "learn_skill",
  "skillId": "skill_blacksmith"
}
```

**Note :** Placeholder (skills pas encore implémentés).

#### 8. start_quest (PLACEHOLDER)
Démarre une quête.
```json
{
  "type": "start_quest",
  "questId": "quest_blacksmith_intro"
}
```

**Note :** Placeholder (quêtes pas encore implémentées).

---

## Spam Protection

Le spam protection permet de changer le noeud de départ selon le nombre d'interactions avec le NPC.

### Concept

**Compteurs :**
- **totalInteractions** : Compteur permanent (jamais réinitialisé)
- **shortTermCount** : Compteur court terme (réinitialisé après `resetDelay` secondes)

**Tiers :**
- Chaque tier définit un intervalle de compteur et un noeud de départ

### Configuration
```json
{
  "spamProtection": {
    "enabled": true,
    "resetDelay": 300,
    "tiers": [
      {
        "minCount": 1,
        "maxCount": 3,
        "startNode": "start"
      },
      {
        "minCount": 4,
        "maxCount": 7,
        "startNode": "annoyed"
      },
      {
        "minCount": 8,
        "maxCount": null,
        "startNode": "angry"
      }
    ]
  }
}
```

**Paramètres :**
- `enabled` : Active/désactive le spam protection
- `resetDelay` : Délai en secondes avant reset du compteur court (défaut: 300 = 5 minutes)
- `tiers` : Array de tiers

**Tier :**
- `minCount` : Compteur minimum (inclus)
- `maxCount` : Compteur maximum (inclus) - `null` = infini
- `startNode` : Noeud de départ pour ce tier

### Exemple de comportement
```
Interaction 1-3 (shortTermCount: 1, 2, 3)
  → Noeud "start"
  → NPC: "Bonjour voyageur !"

Interaction 4-7 (shortTermCount: 4, 5, 6, 7)
  → Noeud "annoyed"
  → NPC: "Encore toi ?"

Interaction 8+ (shortTermCount: 8, 9, 10...)
  → Noeud "angry"
  → NPC: "Arrête de me déranger !"

Après 5 minutes sans interaction
  → shortTermCount réinitialisé à 0
  → Retour au tier 1 à la prochaine interaction
```

### Best Practices

✅ **Toujours inclure "start"** dans le premier tier  
✅ **Pas de gaps** : Les tiers doivent se suivre (1-3, 4-7, 8+)  
✅ **Dernier tier ouvert** : `maxCount: null` pour le dernier tier  
✅ **Delay raisonnable** : 300s (5 min) est un bon défaut

---

## WebSocket Colyseus

### Connexion
```csharp
var room = await client.JoinOrCreate<GameState>("world", new Dictionary<string, object> {
  { "token", jwtToken },
  { "serverId", "s1" },
  { "characterSlot", 1 }
});
```

### Interaction avec un NPC

**Client → Serveur :**
```csharp
room.Send("npc_interact", new {
  npcId = "npc_blacksmith_01"
});
```

**Serveur → Client :**
```csharp
room.OnMessage<DialogueNodeMessage>("dialogue_node", (message) => {
  // Afficher le dialogue
  Debug.Log($"NPC: {message.text}");
  Debug.Log($"Choix disponibles: {message.choices.Length}");
});
```

### Faire un choix dans un dialogue

**Client → Serveur :**
```csharp
room.Send("dialogue_choice", new {
  dialogueId = "dialogue_thorin_greeting",
  nodeId = "start",
  choiceIndex = 0  // Index du choix sélectionné
});
```

**Serveur → Client (noeud suivant) :**
```csharp
room.OnMessage<DialogueNodeMessage>("dialogue_node", (message) => {
  // Nouveau noeud reçu
});
```

**Serveur → Client (fin du dialogue) :**
```csharp
room.OnMessage<DialogueEndMessage>("dialogue_end", (message) => {
  // Dialogue terminé
  Debug.Log($"Fin: {message.text}");
});
```

### Messages WebSocket

**Client → Serveur :**
- `npc_interact` - Interagir avec un NPC
- `dialogue_choice` - Faire un choix dans un dialogue

**Serveur → Client :**
- `dialogue_node` - Noeud de dialogue avec choix
- `dialogue_end` - Fin du dialogue (pas de choix)
- `xp_gained` - XP gagné (action)
- `shop_open` - Ouvrir le shop (action)
- `error` - Erreur

---

## Modèles de données

### DialogueNodeMessage
```csharp
[Serializable]
public class DialogueNodeMessage
{
    public string dialogueId;
    public string npcId;
    public string nodeId;
    public string text;              // Clé de traduction
    public DialogueChoiceData[] choices;
}

[Serializable]
public class DialogueChoiceData
{
    public string text;              // Clé de traduction
    public string nextNode;
}
```

### DialogueEndMessage
```csharp
[Serializable]
public class DialogueEndMessage
{
    public string dialogueId;
    public string nodeId;
    public string text;              // Clé de traduction
}
```

### XPGainedMessage
```csharp
[Serializable]
public class XPGainedMessage
{
    public int amount;
}
```

### ShopOpenMessage
```csharp
[Serializable]
public class ShopOpenMessage
{
    public string shopId;
}
```

---

## Exemples Unity

### 1. Manager Dialogue (Unity Client)
```csharp
using UnityEngine;
using Colyseus;
using System.Collections.Generic;

public class DialogueManager : MonoBehaviour
{
    private ColyseusRoom<GameState> room;
    
    [Header("UI")]
    public DialogueUI dialogueUI;
    
    private string currentDialogueId;
    private string currentNodeId;

    public void Initialize(ColyseusRoom<GameState> gameRoom)
    {
        room = gameRoom;

        // Écouter les messages du serveur
        room.OnMessage<DialogueNodeMessage>("dialogue_node", OnDialogueNode);
        room.OnMessage<DialogueEndMessage>("dialogue_end", OnDialogueEnd);
        room.OnMessage<XPGainedMessage>("xp_gained", OnXPGained);
        room.OnMessage<ShopOpenMessage>("shop_open", OnShopOpen);
    }

    // Interaction avec un NPC
    public void InteractWithNPC(string npcId)
    {
        Debug.Log($"Interaction avec NPC: {npcId}");
        room.Send("npc_interact", new { npcId = npcId });
    }

    // Réception d'un noeud de dialogue
    private void OnDialogueNode(DialogueNodeMessage message)
    {
        Debug.Log($"Dialogue reçu: {message.nodeId}");
        
        currentDialogueId = message.dialogueId;
        currentNodeId = message.nodeId;

        // Traduire le texte
        string translatedText = LocalizationManager.GetString(message.text);

        // Traduire les choix
        List<string> translatedChoices = new List<string>();
        foreach (var choice in message.choices)
        {
            string choiceText = LocalizationManager.GetString(choice.text);
            translatedChoices.Add(choiceText);
        }

        // Afficher le dialogue dans l'UI
        dialogueUI.ShowDialogue(translatedText, translatedChoices.ToArray());
    }

    // Fin du dialogue
    private void OnDialogueEnd(DialogueEndMessage message)
    {
        Debug.Log($"Fin du dialogue: {message.nodeId}");

        string translatedText = LocalizationManager.GetString(message.text);
        
        // Afficher le texte final puis fermer
        dialogueUI.ShowFinalText(translatedText);
        
        // Fermer après 2 secondes
        Invoke("CloseDialogue", 2f);
    }

    // Faire un choix
    public void MakeChoice(int choiceIndex)
    {
        Debug.Log($"Choix fait: {choiceIndex}");

        room.Send("dialogue_choice", new {
            dialogueId = currentDialogueId,
            nodeId = currentNodeId,
            choiceIndex = choiceIndex
        });
    }

    // XP gagné
    private void OnXPGained(XPGainedMessage message)
    {
        Debug.Log($"XP gagné: {message.amount}");
        // TODO: Afficher l'animation d'XP
    }

    // Shop ouvert
    private void OnShopOpen(ShopOpenMessage message)
    {
        Debug.Log($"Shop ouvert: {message.shopId}");
        // TODO: Ouvrir le shop UI
    }

    // Fermer le dialogue
    private void CloseDialogue()
    {
        dialogueUI.Hide();
        currentDialogueId = null;
        currentNodeId = null;
    }
}
```

---

### 2. Dialogue UI
```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class DialogueUI : MonoBehaviour
{
    [Header("UI Elements")]
    public GameObject dialoguePanel;
    public TextMeshProUGUI dialogueText;
    public Transform choicesContainer;
    public GameObject choiceButtonPrefab;

    private DialogueManager dialogueManager;
    private GameObject[] currentChoiceButtons;

    void Start()
    {
        dialogueManager = FindObjectOfType<DialogueManager>();
        Hide();
    }

    public void ShowDialogue(string text, string[] choices)
    {
        // Afficher le panel
        dialoguePanel.SetActive(true);

        // Afficher le texte
        dialogueText.text = text;

        // Nettoyer les anciens choix
        ClearChoices();

        // Créer les boutons de choix
        currentChoiceButtons = new GameObject[choices.Length];
        
        for (int i = 0; i < choices.Length; i++)
        {
            GameObject choiceButton = Instantiate(choiceButtonPrefab, choicesContainer);
            
            TextMeshProUGUI buttonText = choiceButton.GetComponentInChildren<TextMeshProUGUI>();
            buttonText.text = choices[i];

            int choiceIndex = i;  // Capture pour le closure
            Button button = choiceButton.GetComponent<Button>();
            button.onClick.AddListener(() => OnChoiceClicked(choiceIndex));

            currentChoiceButtons[i] = choiceButton;
        }
    }

    public void ShowFinalText(string text)
    {
        dialogueText.text = text;
        ClearChoices();
    }

    public void Hide()
    {
        dialoguePanel.SetActive(false);
        ClearChoices();
    }

    private void OnChoiceClicked(int choiceIndex)
    {
        dialogueManager.MakeChoice(choiceIndex);
    }

    private void ClearChoices()
    {
        if (currentChoiceButtons != null)
        {
            foreach (GameObject button in currentChoiceButtons)
            {
                if (button != null) Destroy(button);
            }
            currentChoiceButtons = null;
        }
    }
}
```

---

### 3. Localisation Manager (exemple simple)
```csharp
using UnityEngine;
using System.Collections.Generic;

public class LocalizationManager : MonoBehaviour
{
    private static Dictionary<string, Dictionary<string, string>> translations;
    private static string currentLanguage = "fr";

    void Awake()
    {
        LoadTranslations();
    }

    private void LoadTranslations()
    {
        translations = new Dictionary<string, Dictionary<string, string>>();

        // Exemple de traductions
        translations["dialogue.thorin.greeting"] = new Dictionary<string, string>
        {
            { "fr", "Bienvenue dans ma forge, voyageur !" },
            { "en", "Welcome to my forge, traveler!" },
            { "es", "¡Bienvenido a mi forja, viajero!" }
        };

        translations["dialogue.thorin.farewell"] = new Dictionary<string, string>
        {
            { "fr", "Que les flammes de la forge te protègent !" },
            { "en", "May the flames of the forge protect you!" },
            { "es", "¡Que las llamas de la forja te protejan!" }
        };

        translations["dialogue.common.goodbye"] = new Dictionary<string, string>
        {
            { "fr", "Au revoir" },
            { "en", "Goodbye" },
            { "es", "Adiós" }
        };

        translations["dialogue.common.thanks"] = new Dictionary<string, string>
        {
            { "fr", "Merci !" },
            { "en", "Thanks!" },
            { "es", "¡Gracias!" }
        };

        // TODO: Charger depuis JSON ou CSV
    }

    public static string GetString(string key)
    {
        if (translations.ContainsKey(key))
        {
            if (translations[key].ContainsKey(currentLanguage))
            {
                return translations[key][currentLanguage];
            }
        }

        Debug.LogWarning($"Translation not found: {key} ({currentLanguage})");
        return key;  // Fallback: retourner la clé
    }

    public static void SetLanguage(string language)
    {
        currentLanguage = language;
    }
}
```

---

## Best Practices

### ✅ À faire

1. **Nommer clairement les dialogues** : `dialogue_npc_context` (ex: `dialogue_thorin_greeting`)
2. **Utiliser des clés de traduction cohérentes** : `dialogue.npc.context` (ex: `dialogue.thorin.greeting`)
3. **Toujours avoir un noeud "start"** même avec spam protection
4. **Valider les dialogues** avec l'endpoint `/validate` avant de déployer
5. **Utiliser le bulk create** pour créer plusieurs dialogues d'un coup
6. **Organiser les gameplay tags** avec une hiérarchie claire
7. **Tester les conditions** avec différents états joueur
8. **Documenter les actions** dans la description du dialogue

### ❌ À éviter

1. Ne **jamais créer de doublons** (même `dialogueId`)
2. Ne **pas oublier** le noeud "start"
3. Ne **pas créer de références cassées** (nextNode qui n'existe pas)
4. Ne **pas créer de boucles infinies** sans issue
5. Ne **pas utiliser de texte brut** (toujours des clés de traduction)
6. Ne **pas modifier** `dialogueId` après création
7. Ne **pas abuser** des conditions complexes (performance)
8. Ne **pas créer des arbres trop profonds** (> 20 noeuds)

---

## Workflow recommandé

### 1. **Design** (sur papier/Miro)
- Dessiner l'arbre de dialogue
- Définir les conditions
- Définir les actions
- Vérifier la cohérence

### 2. **Création** (Unity Editor ou Postman)
- Créer le dialogue via API REST
- Valider avec `/validate`
- Tester en jeu

### 3. **Itération** (Unity Editor)
- Modifier le dialogue
- Revalider
- Tester

### 4. **Production** (Unity Client)
- Le client reçoit automatiquement le dialogue via WebSocket
- Pas besoin de redéployer le client

---

## Notes importantes

### Server Authority

- ✅ Le serveur **valide toutes les conditions** (level, tags, inventaire)
- ✅ Le serveur **exécute toutes les actions** (tags, XP, shop)
- ✅ Le client **ne peut pas tricher** (tout est validé côté serveur)
- ✅ Les dialogues sont **synchronisés automatiquement** via Colyseus

### Performance

- Les dialogues sont **chargés à la demande** (pas en mémoire permanente)
- Les conditions sont **évaluées côté serveur** (pas de triche possible)
- Les gameplay tags sont **en base de données** (persistance garantie)
- Le spam protection utilise **deux compteurs** (court + long terme)

### Localisation

- **Tous les textes sont des clés** : `dialogue.thorin.greeting`
- Le client **traduit localement** selon la langue du joueur
- Le serveur **ne connaît pas les traductions** (juste les clés)
- **Facilite les mises à jour** de traductions sans toucher au serveur

---

**Version:** 1.0.0  
**Dernière mise à jour:** 18 novembre 2025  
**Architecture:** Server Authority totale  
**Contact:** Support technique
