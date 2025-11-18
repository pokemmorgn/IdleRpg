import { Request, Response } from "express";
import Monster, { IMonster } from "../models/Monster";
import Server from "../models/Server";

export const createMonster = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const {
      monsterId,
      name,
      type,
      level,
      stats,
      zoneId,
      spawnPosition,
      spawnRotation,
      behavior,
      lootTable,
      xpReward,
      respawnTime,
      respawnOnDeath,
      modelId,
      isActive
    } = req.body;

    if (!monsterId || !name || !modelId) {
      return res.status(400).json({ 
        error: "Missing required fields: monsterId, name, modelId" 
      });
    }

    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const existing = await Monster.findOne({ serverId, monsterId });
    if (existing) {
      return res.status(400).json({ 
        error: `Monster ${monsterId} already exists on server ${serverId}` 
      });
    }

    const monster: IMonster = await Monster.create({
      monsterId,
      serverId,
      name,
      type: type || "normal",
      level: level || 1,
      stats: stats || { hp: 100, maxHp: 100, attack: 10, defense: 5, speed: 100 },
      zoneId: zoneId || null,
      spawnPosition: spawnPosition || { x: 0, y: 0, z: 0 },
      spawnRotation: spawnRotation || { x: 0, y: 0, z: 0 },
      behavior: behavior || { type: "aggressive", aggroRange: 10, leashRange: 30, attackRange: 2 },
      lootTable: lootTable || [],
      xpReward: xpReward || 10,
      respawnTime: respawnTime || 30,
      respawnOnDeath: respawnOnDeath !== undefined ? respawnOnDeath : true,
      modelId,
      isActive: isActive !== undefined ? isActive : true
    });

    console.log(`✅ Monster créé: ${monsterId} sur ${serverId}`);

    res.status(201).json({
      message: "Monster created",
      monster: {
        id: monster._id,
        monsterId: monster.monsterId,
        serverId: monster.serverId,
        name: monster.name,
        type: monster.type,
        level: monster.level,
        stats: monster.stats,
        zoneId: monster.zoneId,
        spawnPosition: monster.spawnPosition,
        spawnRotation: monster.spawnRotation,
        behavior: monster.behavior,
        lootTable: monster.lootTable,
        xpReward: monster.xpReward,
        respawnTime: monster.respawnTime,
        respawnOnDeath: monster.respawnOnDeath,
        modelId: monster.modelId,
        isActive: monster.isActive,
        createdAt: monster.createdAt,
        updatedAt: monster.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur création monster:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const bulkCreateMonsters = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { monsters } = req.body;

    if (!Array.isArray(monsters) || monsters.length === 0) {
      return res.status(400).json({ 
        error: "monsters array is required and must not be empty" 
      });
    }

    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const created: any[] = [];
    const errors: any[] = [];

    for (const monsterData of monsters) {
      try {
        if (!monsterData.monsterId || !monsterData.name || !monsterData.modelId) {
          errors.push({
            monsterId: monsterData.monsterId || "unknown",
            error: "Missing required fields: monsterId, name, modelId"
          });
          continue;
        }

        const existing = await Monster.findOne({ 
          serverId, 
          monsterId: monsterData.monsterId 
        });
        
        if (existing) {
          errors.push({
            monsterId: monsterData.monsterId,
            error: "Monster already exists on this server"
          });
          continue;
        }

        const monster = await Monster.create({
          monsterId: monsterData.monsterId,
          serverId,
          name: monsterData.name,
          type: monsterData.type || "normal",
          level: monsterData.level || 1,
          stats: monsterData.stats || { hp: 100, maxHp: 100, attack: 10, defense: 5, speed: 100 },
          zoneId: monsterData.zoneId || null,
          spawnPosition: monsterData.spawnPosition || { x: 0, y: 0, z: 0 },
          spawnRotation: monsterData.spawnRotation || { x: 0, y: 0, z: 0 },
          behavior: monsterData.behavior || { type: "aggressive", aggroRange: 10, leashRange: 30, attackRange: 2 },
          lootTable: monsterData.lootTable || [],
          xpReward: monsterData.xpReward || 10,
          respawnTime: monsterData.respawnTime || 30,
          respawnOnDeath: monsterData.respawnOnDeath !== undefined ? monsterData.respawnOnDeath : true,
          modelId: monsterData.modelId,
          isActive: monsterData.isActive !== undefined ? monsterData.isActive : true
        });

        created.push({
          id: monster._id,
          monsterId: monster.monsterId,
          name: monster.name,
          zoneId: monster.zoneId
        });

      } catch (err: any) {
        errors.push({
          monsterId: monsterData.monsterId || "unknown",
          error: err.message
        });
      }
    }

    console.log(`✅ Bulk create: ${created.length} monsters créés, ${errors.length} erreurs`);

    res.status(201).json({
      message: `Bulk create completed`,
      created: created.length,
      errors: errors.length,
      monsters: created,
      errorDetails: errors
    });

  } catch (err: any) {
    console.error("❌ Erreur bulk create monsters:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const listMonsters = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { type, zoneId, isActive } = req.query;

    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const filter: any = { serverId };
    
    if (type) filter.type = type;
    if (zoneId) filter.zoneId = zoneId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const monsters = await Monster.find(filter).sort({ name: 1 });

    res.json({
      serverId,
      count: monsters.length,
      filters: {
        type: type || null,
        zoneId: zoneId || null,
        isActive: isActive !== undefined ? isActive === "true" : null
      },
      monsters: monsters.map(monster => ({
        id: monster._id,
        monsterId: monster.monsterId,
        name: monster.name,
        type: monster.type,
        level: monster.level,
        stats: monster.stats,
        zoneId: monster.zoneId,
        spawnPosition: monster.spawnPosition,
        spawnRotation: monster.spawnRotation,
        behavior: monster.behavior,
        lootTable: monster.lootTable,
        xpReward: monster.xpReward,
        respawnTime: monster.respawnTime,
        respawnOnDeath: monster.respawnOnDeath,
        modelId: monster.modelId,
        isActive: monster.isActive,
        createdAt: monster.createdAt,
        updatedAt: monster.updatedAt
      }))
    });

  } catch (err: any) {
    console.error("❌ Erreur liste monsters:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getMonster = async (req: Request, res: Response) => {
  try {
    const { serverId, monsterId } = req.params;

    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const monster = await Monster.findOne({ serverId, monsterId });

    if (!monster) {
      return res.status(404).json({ 
        error: `Monster ${monsterId} not found on server ${serverId}` 
      });
    }

    res.json({
      monster: {
        id: monster._id,
        monsterId: monster.monsterId,
        serverId: monster.serverId,
        name: monster.name,
        type: monster.type,
        level: monster.level,
        stats: monster.stats,
        zoneId: monster.zoneId,
        spawnPosition: monster.spawnPosition,
        spawnRotation: monster.spawnRotation,
        behavior: monster.behavior,
        lootTable: monster.lootTable,
        xpReward: monster.xpReward,
        respawnTime: monster.respawnTime,
        respawnOnDeath: monster.respawnOnDeath,
        modelId: monster.modelId,
        isActive: monster.isActive,
        createdAt: monster.createdAt,
        updatedAt: monster.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur récupération monster:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const updateMonster = async (req: Request, res: Response) => {
  try {
    const { serverId, monsterId } = req.params;
    const updateData = req.body;

    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const monster = await Monster.findOne({ serverId, monsterId });

    if (!monster) {
      return res.status(404).json({ 
        error: `Monster ${monsterId} not found on server ${serverId}` 
      });
    }

    delete updateData.monsterId;
    delete updateData.serverId;

    Object.assign(monster, updateData);
    await monster.save();

    console.log(`✅ Monster mis à jour: ${monsterId} sur ${serverId}`);

    res.json({
      message: "Monster updated",
      monster: {
        id: monster._id,
        monsterId: monster.monsterId,
        serverId: monster.serverId,
        name: monster.name,
        type: monster.type,
        level: monster.level,
        stats: monster.stats,
        zoneId: monster.zoneId,
        spawnPosition: monster.spawnPosition,
        spawnRotation: monster.spawnRotation,
        behavior: monster.behavior,
        lootTable: monster.lootTable,
        xpReward: monster.xpReward,
        respawnTime: monster.respawnTime,
        respawnOnDeath: monster.respawnOnDeath,
        modelId: monster.modelId,
        isActive: monster.isActive,
        createdAt: monster.createdAt,
        updatedAt: monster.updatedAt
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur mise à jour monster:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const deleteMonster = async (req: Request, res: Response) => {
  try {
    const { serverId, monsterId } = req.params;

    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const monster = await Monster.findOne({ serverId, monsterId });

    if (!monster) {
      return res.status(404).json({ 
        error: `Monster ${monsterId} not found on server ${serverId}` 
      });
    }

    const monsterName = monster.name;
    const monsterZone = monster.zoneId;
    await monster.deleteOne();

    console.log(`✅ Monster supprimé: ${monsterId} (${monsterName}) sur ${serverId}${monsterZone ? ` zone: ${monsterZone}` : ''}`);

    res.json({
      message: "Monster deleted",
      monsterId: monsterId,
      name: monsterName,
      serverId: serverId,
      zoneId: monsterZone
    });

  } catch (err: any) {
    console.error("❌ Erreur suppression monster:", err.message);
    res.status(500).json({ error: err.message });
  }
};
