// server/src/colyseus/rooms/WorldRoom.ts

import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter, isCharacterAlreadyConnected } from "../utils/playerLoader";

import { NPCManager } from "../managers/NPCManager";
import { MonsterManager } from "../managers/MonsterManager";
import { CombatManager } from "../managers/CombatManager";

import { QuestManager } from "../managers/QuestManager";
import { QuestObjectiveManager } from "../managers/QuestObjectiveManager";
import { DialogueManager } from "../managers/DialogueManager";
import { TestManager } from "../test/TestManager";

import { SkinManager } from "../managers/SkinManager";
import { computeFullStats } from "../managers/stats/PlayerStatsCalculator";

import ServerProfile from "../../models/ServerProfile";

export class WorldRoom extends Room<GameState> {
    maxClients = 1000;

    private serverId = "";
    private updateInterval: any;

    private npcManager!: NPCManager;
    private monsterManager!: MonsterManager;
    private combatManager!: CombatManager;

    private questManager!: QuestManager;
    private questObjectiveManager!: QuestObjectiveManager;
    private dialogueManager!: DialogueManager;

    private testManager?: TestManager;

    async onCreate(options: { serverId: string }) {
        this.serverId = options.serverId;
        console.log(`🟢 onCreate(serverId=${this.serverId})`);

        this.setState(new GameState(this.serverId));
        console.log("🧬 GameState initialisé");

        new SkinManager();

        this.questManager = new QuestManager(
            this.serverId,
            this.state,
            this.savePlayerData.bind(this)
        );

        await this.questManager.loadAllQuestsFromDB();

        this.questObjectiveManager = new QuestObjectiveManager(
            this.state,
            (sessionId: string, type: string, payload: any) => {
                const client = this.clients.find(c => c.sessionId === sessionId);
                if (client) client.send(type, payload);
            },
            this.savePlayerData.bind(this)
        );

        this.dialogueManager = new DialogueManager(
            this.serverId,
            this.questObjectiveManager,
            this.questManager,
            this.state
        );

        this.npcManager = new NPCManager(
            this.serverId,
            this.state,
            this.questManager,
            this.questObjectiveManager,
            this.dialogueManager
        );

        this.monsterManager = new MonsterManager(this.serverId, this.state);

        this.combatManager = new CombatManager(
            this.state,
            (sessionId, type, data) => {
                const client = this.clients.find(c => c.sessionId === sessionId);
                if (client) client.send(type, data);
            },
            this.questObjectiveManager
        );

        await this.npcManager.loadNPCs();
        await this.monsterManager.loadMonsters();

        if (this.serverId === "test") {
            this.testManager = new TestManager(
                this.state,
                this.questManager,
                this.dialogueManager,
                this.questObjectiveManager
            );
            this.testManager.loadAll();
        }

        console.log("📥 WORLD ROOM READY");

        this.onMessage("*", (client, type, msg) => {
            this.handleMessage(client, String(type), msg);
        });

        this.setSimulationInterval((dt) => {
            this.combatManager.update(dt);
        }, 33);

        this.updateInterval = this.clock.setInterval(() => {
            this.state.updateWorldTime();
        }, 1000);
    }

    async onAuth(client: Client, options: any) {
        if (!options.token) return false;
        if (options.serverId !== this.serverId) return false;

        const valid = await validateToken(options.token);
        if (!valid.valid) return false;

        const load = await loadPlayerCharacter(
            valid.playerId!,
            options.serverId,
            options.characterSlot
        );

        if (!load.success || !load.profile) return false;

        if (isCharacterAlreadyConnected(this.state.players, load.profile.profileId)) {
            return false;
        }

        const p = load.profile;

        return {
            playerId: p.playerId,
            profileId: p.profileId,
            characterName: p.characterName,
            level: p.level,
            characterClass: p.class,
            characterRace: p.race,
            characterSlot: p.characterSlot,
            stats: p.stats,
            questData: p.questData
        };
    }

    async onJoin(client: Client, options: any, auth: any) {
        console.log("🚪 onJoin:", { sessionId: client.sessionId });

        const player = new PlayerState(
            client.sessionId,
            auth.playerId,
            auth.profileId,
            auth.characterSlot,
            auth.characterName,
            auth.level,
            auth.characterClass,
            auth.characterRace
        );

        if (auth.questData) player.loadQuestsFromProfile(auth.questData);

        const computed = computeFullStats(player);
        player.loadStatsFromProfile(computed);

        client.send("stats_update", {
            hp: player.hp,
            maxHp: player.maxHp,
            resource: player.resource,
            maxResource: player.maxResource,
            manaRegen: player.manaRegen,
            attackPower: player.attackPower,
            spellPower: player.spellPower,
            armor: player.armor,
            magicResistance: player.magicResistance,
            criticalChance: player.criticalChance,
            attackSpeed: player.attackSpeed,
            damageReduction: player.damageReduction
        });

        if (this.serverId === "test") player.zoneId = "start_zone";

        this.state.addPlayer(player);
        client.send("welcome", { ok: true });
    }

    async onLeave(client: Client) {
        const player = this.state.players.get(client.sessionId);

        if (player) {
            await this.savePlayerData(player);
        }

        this.state.removePlayer(client.sessionId);
    }

    private handleMessage(client: Client, type: string, msg: any) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const handledBySkin = require("../managers/SkinManager")
            .SkinManagerInstance
            ?.handleMessage(type, client, player, msg);

        if (handledBySkin) return;

        if (type === "respawn") {
            if (!player.isDead) return;
            this.combatManager.respawnPlayer(player);
            return;
        }

        if (type === "npc_interact") {
            this.npcManager.handleInteraction(client, player, msg);
            return;
        }

        if (type === "npc_accept_quest") {
            this.npcManager.handleAcceptQuest(client, player, msg);
            return;
        }

        if (type === "npc_turn_in_quest") {
            this.npcManager.handleTurnInQuest(client, player, msg);
            return;
        }

        if (type === "dialogue_choice") {
            this.npcManager.handleDialogueChoice(client, player, msg);
            return;
        }

        if (type === "test_trigger_quest_objective") {
            const payload = msg;

            switch (payload.type) {
                case "talk":
                    this.questObjectiveManager.onTalkToNPC(player, payload);
                    break;

                case "collect":
                    this.questObjectiveManager.onResourceCollected(player, payload);
                    break;

                case "explore":
                    this.questObjectiveManager.onLocationExplored(player, payload);
                    break;

                case "kill":
                default:
                    this.questObjectiveManager.onMonsterKilled(player, {
                        enemyType: payload.enemyType || "test_wolf",
                        isBoss: payload.isBoss || false,
                        zoneId: player.zoneId
                    });
            }
            return;
        }

        if (type === "spawn_test_monster") {
            this.spawnTestMonster(msg);
            return;
        }
    }

    private async savePlayerData(player: PlayerState): Promise<void> {
        try {
            const computed = computeFullStats(player);

            await ServerProfile.findByIdAndUpdate(player.profileId, {
                $set: {
                    lastOnline: new Date(),
                    stats: computed,
                    questData: player.saveQuestsToProfile()
                }
            });

        } catch (error) {
            console.error("❌ Erreur sauvegarde:", error);
        }
    }

    private spawnTestMonster(msg: any) {
        const MonsterState = require("../schema/MonsterState").MonsterState;

        const m = new MonsterState(
            msg.monsterId,
            msg.name || "Dummy",
            "test",
            1,
            30,
            30,
            5,
            0,
            1,
            "test_zone",
            msg.x, msg.y, msg.z,
            0, 0, 0,
            "aggressive",
            12,
            20,
            2,
            5,
            3,
            false,
            "dummy",
            true
        );

        this.state.addMonster(m);
    }
}
