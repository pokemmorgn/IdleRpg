import { Request, Response } from "express";
import NPC, { INPC } from "../models/NPC";
import Server from "../models/Server";

/**
 * POST /npcs/:serverId
 * Créer un NPC sur un serveur
 */
export const createNPC = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const {
      npcId,
      name,
      type,
      level,
      faction,
      zoneId,
      position,
      rotation,
      modelId,
      dialogueId,
      shopId,
      questIds,
      interactionRadius,
      isActive
    } = req.body;

    // Validation des champs requis
    if (!npcId || !name || !modelId) {
      return res.status(400).json({ 
        error: "Missing required fields: npcId, name, modelId" 
      });
    }

    // Vérifier que le serveur existe
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Vérifier qu'un NPC avec ce npcId n'existe pas déjà sur ce serveur
    const existing = await NPC.findOne({ serverId, npcId });
    if (existing) {
      return res.status(400).json({ 
        error: `NPC ${npcId} already exists on server ${serverId}` 
      });
    }

    // Créer le NPC
    const npc: INPC = await NPC.create({
      npcId,
      serverId,
      name,
      type: type || "dialogue",
      level: level || 1,
      faction: faction || "NEUTRAL",
      zoneId: zoneId || null,
      position: position || { x: 0, y: 0, z: 0 },
      rotation: rotation || { x: 0, y: 0, z: 0 },
      modelId,
      dialogueId: dialogueId || null,
      shopId: shopId || null,
      questIds: questIds || [],
      interactionRadius: interactionRadius || 3,
      isActive: isActive !== undefined ? isActive : true
    });

    console.log(`✅ NPC créé: ${npcId} sur ${serverId}`);

    res.status(201).json({
      message: "NPC created",
      npc: {
        id: npc._id,
        npcId: npc.npcId,
        serverId: npc.serverId,
        name: npc.name,
        type: npc.type,
        level: npc.level,
        faction: npc.faction,
        zoneId: npc.zoneId,
        position: npc.position,
        rotation: npc.rotation,
        modelId: npc.modelId,
        dialogueId: npc.dialogueId,
        shopId: npc.shopId,
        questIds: npc.questIds,
        interactionRadius: npc.interactionRadius,
        isActive: npc.isActive,
        createdAt: npc.createdAt,
        updatedAt: npc.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur création NPC:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /npcs/:serverId/bulk
 * Créer plusieurs NPC d'un coup (optimisation Unity Editor)
 */
export const bulkCreateNPCs = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { npcs } = req.body;

    if (!Array.isArray(npcs) || npcs.length === 0) {
      return res.status(400).json({ 
        error: "npcs array is required and must not be empty" 
      });
    }

    // Vérifier que le serveur existe
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const created: any[] = [];
    const errors: any[] = [];

    // Créer chaque NPC
    for (const npcData of npcs) {
      try {
        // Vérifier les champs requis
        if (!npcData.npcId || !npcData.name || !npcData.modelId) {
          errors.push({
            npcId: npcData.npcId || "unknown",
            error: "Missing required fields: npcId, name, modelId"
          });
          continue;
        }

        // Vérifier qu'il n'existe pas déjà
        const existing = await NPC.findOne({ 
          serverId, 
          npcId: npcData.npcId 
        });
        
        if (existing) {
          errors.push({
            npcId: npcData.npcId,
            error: "NPC already exists on this server"
          });
          continue;
        }

        // Créer le NPC
        const npc = await NPC.create({
          npcId: npcData.npcId,
          serverId,
          name: npcData.name,
          type: npcData.type || "dialogue",
          level: npcData.level || 1,
          faction: npcData.faction || "NEUTRAL",
          position: npcData.position || { x: 0, y: 0, z: 0 },
          rotation: npcData.rotation || { x: 0, y: 0, z: 0 },
          modelId: npcData.modelId,
          dialogueId: npcData.dialogueId || null,
          shopId: npcData.shopId || null,
          questIds: npcData.questIds || [],
          interactionRadius: npcData.interactionRadius || 3,
          isActive: npcData.isActive !== undefined ? npcData.isActive : true
        });

        created.push({
          id: npc._id,
          npcId: npc.npcId,
          name: npc.name
        });

      } catch (err: any) {
        errors.push({
          npcId: npcData.npcId || "unknown",
          error: err.message
        });
      }
    }

    console.log(`✅ Bulk create: ${created.length} NPC créés, ${errors.length} erreurs`);

    res.status(201).json({
      message: `Bulk create completed`,
      created: created.length,
      errors: errors.length,
      npcs: created,
      errorDetails: errors
    });

  } catch (err: any) {
    console.error("❌ Erreur bulk create NPC:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /npcs/:serverId
 * Lister tous les NPC d'un serveur
 */
export const listNPCs = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { type, faction, isActive } = req.query;

    // Vérifier que le serveur existe
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Construire le filtre
    const filter: any = { serverId };
    
    if (type) filter.type = type;
    if (faction) filter.faction = faction;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // Récupérer les NPC
    const npcs = await NPC.find(filter).sort({ name: 1 });

    res.json({
      serverId,
      count: npcs.length,
      npcs: npcs.map(npc => ({
        id: npc._id,
        npcId: npc.npcId,
        name: npc.name,
        type: npc.type,
        level: npc.level,
        faction: npc.faction,
        position: npc.position,
        rotation: npc.rotation,
        modelId: npc.modelId,
        dialogueId: npc.dialogueId,
        shopId: npc.shopId,
        questIds: npc.questIds,
        interactionRadius: npc.interactionRadius,
        isActive: npc.isActive,
        createdAt: npc.createdAt,
        updatedAt: npc.updatedAt
      }))
    });

  } catch (err: any) {
    console.error("❌ Erreur liste NPC:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /npcs/:serverId/:npcId
 * Récupérer les détails d'un NPC spécifique
 */
export const getNPC = async (req: Request, res: Response) => {
  try {
    const { serverId, npcId } = req.params;

    // Vérifier que le serveur existe
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Récupérer le NPC
    const npc = await NPC.findOne({ serverId, npcId });

    if (!npc) {
      return res.status(404).json({ 
        error: `NPC ${npcId} not found on server ${serverId}` 
      });
    }

    res.json({
      npc: {
        id: npc._id,
        npcId: npc.npcId,
        serverId: npc.serverId,
        name: npc.name,
        type: npc.type,
        level: npc.level,
        faction: npc.faction,
        position: npc.position,
        rotation: npc.rotation,
        modelId: npc.modelId,
        dialogueId: npc.dialogueId,
        shopId: npc.shopId,
        questIds: npc.questIds,
        interactionRadius: npc.interactionRadius,
        isActive: npc.isActive,
        createdAt: npc.createdAt,
        updatedAt: npc.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur récupération NPC:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /npcs/:serverId/:npcId
 * Modifier un NPC
 */
export const updateNPC = async (req: Request, res: Response) => {
  try {
    const { serverId, npcId } = req.params;
    const updateData = req.body;

    // Vérifier que le serveur existe
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Récupérer le NPC
    const npc = await NPC.findOne({ serverId, npcId });

    if (!npc) {
      return res.status(404).json({ 
        error: `NPC ${npcId} not found on server ${serverId}` 
      });
    }

    // Interdire la modification de npcId et serverId
    delete updateData.npcId;
    delete updateData.serverId;

    // Mettre à jour
    Object.assign(npc, updateData);
    await npc.save();

    console.log(`✅ NPC mis à jour: ${npcId} sur ${serverId}`);

    res.json({
      message: "NPC updated",
      npc: {
        id: npc._id,
        npcId: npc.npcId,
        serverId: npc.serverId,
        name: npc.name,
        type: npc.type,
        level: npc.level,
        faction: npc.faction,
        position: npc.position,
        rotation: npc.rotation,
        modelId: npc.modelId,
        dialogueId: npc.dialogueId,
        shopId: npc.shopId,
        questIds: npc.questIds,
        interactionRadius: npc.interactionRadius,
        isActive: npc.isActive,
        createdAt: npc.createdAt,
        updatedAt: npc.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur mise à jour NPC:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /npcs/:serverId/:npcId
 * Supprimer un NPC
 */
export const deleteNPC = async (req: Request, res: Response) => {
  try {
    const { serverId, npcId } = req.params;

    // Vérifier que le serveur existe
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Récupérer et supprimer le NPC
    const npc = await NPC.findOne({ serverId, npcId });

    if (!npc) {
      return res.status(404).json({ 
        error: `NPC ${npcId} not found on server ${serverId}` 
      });
    }

    const npcName = npc.name;
    await npc.deleteOne();

    console.log(`✅ NPC supprimé: ${npcId} (${npcName}) sur ${serverId}`);

    res.json({
      message: "NPC deleted",
      npcId: npcId,
      name: npcName,
      serverId: serverId
    });

  } catch (err: any) {
    console.error("❌ Erreur suppression NPC:", err.message);
    res.status(500).json({ error: err.message });
  }
};
