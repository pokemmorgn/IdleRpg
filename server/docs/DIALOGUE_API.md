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
