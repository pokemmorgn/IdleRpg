import { Request, Response } from "express";
import Dialogue, { IDialogue } from "../models/Dialogue";

/**
 * POST /dialogues
 * Créer un dialogue
 */
export const createDialogue = async (req: Request, res: Response) => {
  try {
    const {
      dialogueId,
      npcId,
      description,
      nodes
    } = req.body;

    // Validation des champs requis
    if (!dialogueId || !nodes || nodes.length === 0) {
      return res.status(400).json({ 
        error: "Missing required fields: dialogueId, nodes (must not be empty)" 
      });
    }

    // Vérifier qu'il y a un noeud "start"
    const hasStart = nodes.some((node: any) => node.nodeId === "start");
    if (!hasStart) {
      return res.status(400).json({ 
        error: "Dialogue must have a 'start' node" 
      });
    }

    // Vérifier qu'un dialogue avec ce dialogueId n'existe pas déjà
    const existing = await Dialogue.findOne({ dialogueId });
    if (existing) {
      return res.status(400).json({ 
        error: `Dialogue ${dialogueId} already exists` 
      });
    }

    // Créer le dialogue
    const dialogue: IDialogue = await Dialogue.create({
      dialogueId,
      npcId: npcId || null,
      description: description || null,
      nodes
    });

    console.log(`✅ Dialogue créé: ${dialogueId}`);

    res.status(201).json({
      message: "Dialogue created",
      dialogue: {
        id: dialogue._id,
        dialogueId: dialogue.dialogueId,
        npcId: dialogue.npcId,
        description: dialogue.description,
        nodes: dialogue.nodes,
        createdAt: dialogue.createdAt,
        updatedAt: dialogue.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur création dialogue:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /dialogues/bulk
 * Créer plusieurs dialogues d'un coup (optimisation Unity Editor)
 */
export const bulkCreateDialogues = async (req: Request, res: Response) => {
  try {
    const { dialogues } = req.body;

    if (!Array.isArray(dialogues) || dialogues.length === 0) {
      return res.status(400).json({ 
        error: "dialogues array is required and must not be empty" 
      });
    }

    const created: any[] = [];
    const errors: any[] = [];

    // Créer chaque dialogue
    for (const dialogueData of dialogues) {
      try {
        // Vérifier les champs requis
        if (!dialogueData.dialogueId || !dialogueData.nodes || dialogueData.nodes.length === 0) {
          errors.push({
            dialogueId: dialogueData.dialogueId || "unknown",
            error: "Missing required fields: dialogueId, nodes"
          });
          continue;
        }

        // Vérifier qu'il y a un noeud "start"
        const hasStart = dialogueData.nodes.some((node: any) => node.nodeId === "start");
        if (!hasStart) {
          errors.push({
            dialogueId: dialogueData.dialogueId,
            error: "Dialogue must have a 'start' node"
          });
          continue;
        }

        // Vérifier qu'il n'existe pas déjà
        const existing = await Dialogue.findOne({ 
          dialogueId: dialogueData.dialogueId 
        });
        
        if (existing) {
          errors.push({
            dialogueId: dialogueData.dialogueId,
            error: "Dialogue already exists"
          });
          continue;
        }

        // Créer le dialogue
        const dialogue = await Dialogue.create({
          dialogueId: dialogueData.dialogueId,
          npcId: dialogueData.npcId || null,
          description: dialogueData.description || null,
          nodes: dialogueData.nodes
        });

        created.push({
          id: dialogue._id,
          dialogueId: dialogue.dialogueId,
          description: dialogue.description
        });

      } catch (err: any) {
        errors.push({
          dialogueId: dialogueData.dialogueId || "unknown",
          error: err.message
        });
      }
    }

    console.log(`✅ Bulk create: ${created.length} dialogues créés, ${errors.length} erreurs`);

    res.status(201).json({
      message: `Bulk create completed`,
      created: created.length,
      errors: errors.length,
      dialogues: created,
      errorDetails: errors
    });

  } catch (err: any) {
    console.error("❌ Erreur bulk create dialogues:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /dialogues
 * Lister tous les dialogues
 */
export const listDialogues = async (req: Request, res: Response) => {
  try {
    const { npcId } = req.query;

    // Construire le filtre
    const filter: any = {};
    
    if (npcId) filter.npcId = npcId;

    // Récupérer les dialogues
    const dialogues = await Dialogue.find(filter).sort({ dialogueId: 1 });

    res.json({
      count: dialogues.length,
      filters: {
        npcId: npcId || null
      },
      dialogues: dialogues.map(dialogue => ({
        id: dialogue._id,
        dialogueId: dialogue.dialogueId,
        npcId: dialogue.npcId,
        description: dialogue.description,
        nodes: dialogue.nodes,
        createdAt: dialogue.createdAt,
        updatedAt: dialogue.updatedAt
      }))
    });

  } catch (err: any) {
    console.error("❌ Erreur liste dialogues:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /dialogues/:dialogueId
 * Récupérer les détails d'un dialogue spécifique
 */
export const getDialogue = async (req: Request, res: Response) => {
  try {
    const { dialogueId } = req.params;

    // Récupérer le dialogue
    const dialogue = await Dialogue.findOne({ dialogueId });

    if (!dialogue) {
      return res.status(404).json({ 
        error: `Dialogue ${dialogueId} not found` 
      });
    }

    res.json({
      dialogue: {
        id: dialogue._id,
        dialogueId: dialogue.dialogueId,
        npcId: dialogue.npcId,
        description: dialogue.description,
        nodes: dialogue.nodes,
        createdAt: dialogue.createdAt,
        updatedAt: dialogue.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur récupération dialogue:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /dialogues/:dialogueId
 * Modifier un dialogue
 */
export const updateDialogue = async (req: Request, res: Response) => {
  try {
    const { dialogueId } = req.params;
    const updateData = req.body;

    // Récupérer le dialogue
    const dialogue = await Dialogue.findOne({ dialogueId });

    if (!dialogue) {
      return res.status(404).json({ 
        error: `Dialogue ${dialogueId} not found` 
      });
    }

    // Interdire la modification de dialogueId
    delete updateData.dialogueId;

    // Si on modifie les nodes, vérifier qu'il y a toujours un "start"
    if (updateData.nodes) {
      const hasStart = updateData.nodes.some((node: any) => node.nodeId === "start");
      if (!hasStart) {
        return res.status(400).json({ 
          error: "Dialogue must have a 'start' node" 
        });
      }
    }

    // Mettre à jour
    Object.assign(dialogue, updateData);
    await dialogue.save();

    console.log(`✅ Dialogue mis à jour: ${dialogueId}`);

    res.json({
      message: "Dialogue updated",
      dialogue: {
        id: dialogue._id,
        dialogueId: dialogue.dialogueId,
        npcId: dialogue.npcId,
        description: dialogue.description,
        nodes: dialogue.nodes,
        createdAt: dialogue.createdAt,
        updatedAt: dialogue.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur mise à jour dialogue:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /dialogues/:dialogueId
 * Supprimer un dialogue
 */
export const deleteDialogue = async (req: Request, res: Response) => {
  try {
    const { dialogueId } = req.params;

    // Récupérer et supprimer le dialogue
    const dialogue = await Dialogue.findOne({ dialogueId });

    if (!dialogue) {
      return res.status(404).json({ 
        error: `Dialogue ${dialogueId} not found` 
      });
    }

    const dialogueDesc = dialogue.description;
    await dialogue.deleteOne();

    console.log(`✅ Dialogue supprimé: ${dialogueId}`);

    res.json({
      message: "Dialogue deleted",
      dialogueId: dialogueId,
      description: dialogueDesc
    });

  } catch (err: any) {
    console.error("❌ Erreur suppression dialogue:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /dialogues/:dialogueId/validate
 * Valider un dialogue (vérifier la cohérence de l'arbre)
 */
export const validateDialogue = async (req: Request, res: Response) => {
  try {
    const { dialogueId } = req.params;

    const dialogue = await Dialogue.findOne({ dialogueId });

    if (!dialogue) {
      return res.status(404).json({ 
        error: `Dialogue ${dialogueId} not found` 
      });
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Vérifier qu'il y a un noeud "start"
    const hasStart = dialogue.nodes.some(node => node.nodeId === "start");
    if (!hasStart) {
      errors.push("Missing 'start' node");
    }

    // 2. Vérifier que tous les nextNode existent
    const nodeIds = new Set(dialogue.nodes.map(node => node.nodeId));
    
    dialogue.nodes.forEach(node => {
      node.choices.forEach(choice => {
        if (!nodeIds.has(choice.nextNode)) {
          errors.push(`Node '${node.nodeId}' references non-existent node '${choice.nextNode}'`);
        }
      });
    });

    // 3. Vérifier les noeuds orphelins (jamais référencés)
    const referencedNodes = new Set<string>();
    dialogue.nodes.forEach(node => {
      node.choices.forEach(choice => {
        referencedNodes.add(choice.nextNode);
      });
    });

    dialogue.nodes.forEach(node => {
      if (node.nodeId !== "start" && !referencedNodes.has(node.nodeId)) {
        warnings.push(`Node '${node.nodeId}' is never referenced (orphan node)`);
      }
    });

    // 4. Vérifier les boucles infinies potentielles
    dialogue.nodes.forEach(node => {
      if (node.choices.length === 0 && node.nodeId !== "end") {
        warnings.push(`Node '${node.nodeId}' has no choices and is not named 'end' (dead end)`);
      }
    });

    const isValid = errors.length === 0;

    res.json({
      dialogueId: dialogue.dialogueId,
      isValid,
      errors,
      warnings,
      nodeCount: dialogue.nodes.length,
      summary: isValid ? "Dialogue is valid" : "Dialogue has errors"
    });

  } catch (err: any) {
    console.error("❌ Erreur validation dialogue:", err.message);
    res.status(500).json({ error: err.message });
  }
};
