import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter, isCharacterAlreadyConnected } from "../utils/playerLoader";
import { NPCManager } from "../managers/NPCManager";
import { MonsterManager } from "../managers/MonsterManager";
import { CombatManager } from "../managers/CombatManager";
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

export class WorldRoom extends Room<GameState> {

    private serverId = "";
    private updateInterval: any;

    private npcManager!: NPCManager;
    private monsterManager!: MonsterManager;
    private combatManager!: CombatManager;

    // =====================================================================
    // onCreate
    // =====================================================================
    async onCreate(options: { serverId: string }) {

        console.log("======================================================");
        console.log("🧪 DEBUG WORLD ROOM START");
        console.log("options:", options);
        console.log("======================================================");

        this.serverId = options.serverId;
        this.roomId = `world_${this.serverId}`;

        this.setState(new GameState(this.serverId));
        console.log("🌍 State initialisée pour serveur:", this.serverId);

        // Managers
        this.npcManager = new NPCManager(this.serverId, this.state);
        this.monsterManager = new MonsterManager(this.serverId, this.state);

        // CombatManager — seulement 2 arguments (state, broadcast)
        this.combatManager = new CombatManager(
            this.state,
            (sessionId: string, payload: any) => {
                console.log("📡 BROADCAST:", { sessionId, payload });
                const c = this.clients.find(cl => cl.sessionId === sessionId);
                if (c) c.send("combat_event", payload);
            }
        );

        await this.npcManager.loadNPCs();
        await this.monsterManager.loadMonsters();

        console.log("🟢 NPCs + Monsters chargés");

        // ============================
        // HANDLER COLYSEUS NORMAL
        // ============================
        this.onMessage("*", (client, type, msg) => {
            console.log("💬 [*] Message reçu");
            console.log(" type =", type);
            console.log(" msg =", msg);
            this.handleMessage(client, String(type), msg);
        });

        // ============================
        // HANDLER RAW JSON
        // ============================
        this.onMessage("json", (client, raw) => {
            console.log("💬 [JSON] Raw reçu =", raw);
            try {
                const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (obj?.type) {
                    console.log("👉 JSON type =", obj.type);
                    this.handleMessage(client, obj.type, obj);
                }
            } catch (err) {
                console.log("❌ JSON PARSE ERROR:", err);
            }
        });

        // Simulation tick
        this.setSimulationInterval((dt) => this.update(dt), 33);

        // world-clock
        this.updateInterval = this.clock.setInterval(() => {
            this.state.updateWorldTime();
        }, 1000);
    }

    // =====================================================================
    // AUTH
    // =====================================================================
    async onAuth(client: Client, options: JoinOptions): Promise<AuthData | false> {

        console.log("======================================================");
        console.log("🔐 AUTH REQUEST", options);

        if (!options.token) return false;
        if (!options.serverId) return false;
        if (!options.characterSlot) return false;
        if (options.serverId !== this.serverId) return false;

        const token = await validateToken(options.token);
        console.log("validateToken =>", token);

        if (!token.valid || !token.playerId) return false;

        const load = await loadPlayerCharacter(
            token.playerId,
            options.serverId,
            options.characterSlot
        );

        console.log("loadPlayerCharacter =>", load);

        if (!load.success || !load.profile) return false;

        if (isCharacterAlreadyConnected(this.state.players, load.profile.profileId)) {
            console.log("❌ Personnage déjà connecté");
            return false;
        }

        const p = load.profile;

        console.log("🔓 AUTH OK pour:", p.characterName);

        return {
            playerId: p.playerId,
            profileId: p.profileId,
            characterName: p.characterName,
            level: p.level,
            characterClass: p.class,
            characterRace: p.race,
            characterSlot: p.characterSlot
        };
    }

    // =====================================================================
    // JOIN
    // =====================================================================
    async onJoin(client: Client, options: JoinOptions, auth: AuthData) {

        console.log("======================================================");
        console.log("👤 onJoin:", client.sessionId);
        console.log("AuthData:", auth);

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

        // load stats
        const profile = await ServerProfile.findById(auth.profileId);
        if (profile?.computedStats) {
            player.loadStatsFromProfile(profile.computedStats);
        }

        this.state.addPlayer(player);

        console.log("🟢 Player ajouté au GameState");
        console.log("Players =", this.state.players.size);

        client.send("welcome", { ok: true });
    }

    // =====================================================================
    // HANDLE MESSAGE
    // =====================================================================
    private handleMessage(client: Client, type: string, msg: any) {

        console.log("======================================================");
        console.log("📨 handleMessage()");
        console.log(" client:", client.sessionId);
        console.log(" type:", type);
        console.log(" msg:", msg);

        const player = this.state.players.get(client.sessionId);
        if (!player) {
            console.log("❌ Player NOT found in state");
            return;
        }

        // ---------------------------------------------
        // SPAWN TEST MONSTER
        // ---------------------------------------------
        if (type === "spawn_test_monster") {

            console.log("🔥🔥🔥 spawn_test_monster TRIGGERED !!!");

            const MonsterState = require("../schema/MonsterState").MonsterState;

            const mon = new MonsterState(
                msg.monsterId || "test_" + Date.now(),
                msg.name || "Dummy",
                "test",
                1,
                50,
                50,
                8,
                0,
                1,
                "zone",
                msg.x || 120,
                msg.y || 0,
                msg.z || 120,
                0, 0, 0,
                "aggressive",
                10,
                10,
                1,
                4,
                2,
                false,
                "dummy",
                true
            );

            this.state.addMonster(mon);
            console.log("🟢 MONSTER ADDED:", mon.monsterId);
            console.log("Total monsters =", this.state.monsters.size);
            return;
        }

        // ---------------------------------------------
        // MOVE
        // ---------------------------------------------
        if (type === "player_move") {
            console.log("MOVE:", msg);
            player.posX = msg.x;
            player.posY = msg.y;
            player.posZ = msg.z;
            return;
        }
    }

    // =====================================================================
    // UPDATE TICK
    // =====================================================================
    update(deltaTime: number) {
        console.log(`🕒 TICK dt=${deltaTime}ms | players=${this.state.players.size} | monsters=${this.state.monsters.size}`);
        this.combatManager.update(deltaTime);
    }
}
