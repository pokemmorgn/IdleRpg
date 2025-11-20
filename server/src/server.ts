import express, { Application, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// --- Colyseus ---
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "./colyseus/rooms/WorldRoom";
import matchmakingRoutes from "./routes/matchmakingRoutes";

// --- Routes ---
import authRoutes from "./routes/authRoutes";
import serverRoutes from "./routes/serverRoutes";
import profileRoutes from "./routes/profileRoutes";
import invitationRoutes from "./routes/invitationRoutes";
import gameDataRoutes from "./routes/gameDataRoutes";
import npcRoutes from "./routes/npcRoutes";
import dialogueRoutes from "./routes/dialogueRoutes"; 
import monsterRoutes from "./routes/monsterRoutes";
import statsRoutes from "./routes/statsRoutes"; // ← AJOUT

dotenv.config();

const app: Application = express();

// HTTP server partagé entre Express & Colyseus
const httpServer = createServer(app);

const PORT = parseInt(process.env.PORT || "3000", 10);
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";
const NODE_ENV = process.env.NODE_ENV || "development";

// -------------------------
//       CORS
// -------------------------
const corsOptions = {
  origin: NODE_ENV === "production"
    ? ["https://your-domain.com"]
    : ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// -------------------------
//   Logging simple
// -------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// -------------------------
//   PAGE D'ACCUEIL API
// -------------------------
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "IdleRPG API is running",
    version: "1.0.0",
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// -------------------------
//         HEALTH
// -------------------------
app.get("/health", async (req: Request, res: Response) => {
  const health: any = {
    status: "starting",
    timestamp: new Date().toISOString(),
    mongo: "unknown"
  };

  try {
    const dbState = mongoose.connection.readyState;
    health.mongo = dbState === 1 ? "connected" : "disconnected";
    health.status = dbState === 1 ? "healthy" : "degraded";

    res.json(health);
  } catch {
    res.status(500).json({
      status: "unhealthy",
      mongo: "error"
    });
  }
});

// -------------------------
//      ROUTES
// -------------------------
app.use("/auth", authRoutes);
app.use("/matchmaking", matchmakingRoutes);
app.use("/servers", serverRoutes);
app.use("/profile", profileRoutes);
app.use("/invitation", invitationRoutes);
app.use("/game-data", gameDataRoutes);
app.use("/npcs", npcRoutes);
app.use("/dialogues", dialogueRoutes);
app.use("/monsters", monsterRoutes);
app.use("/stats", statsRoutes); // ← AJOUT

// -------------------------
//    404 Catch-All
// -------------------------
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method
  });
});

// -------------------------
//  GLOBAL ERROR HANDLER
// -------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ Global error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: NODE_ENV === "production" ? undefined : err.message
  });
});

// -------------------------
//     MongoDB Connect
// -------------------------
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed");
    process.exit(1);
  }
};

// -------------------------
//  COLYSEUS SERVER SETUP
// -------------------------
let colyseusServer: Server;

const setupColyseus = () => {
  colyseusServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer, // même port que Express
    }),
  });

  // --- WorldRoom - Room principale du jeu ---
  colyseusServer
    .define("world", WorldRoom)
    .filterBy(["serverId"]);

  console.log("🟢 Colyseus initialisé avec WorldRoom");
  console.log("📌 Les rooms seront créées dynamiquement : world_s1, world_s2, etc.");
};

// -------------------------
//       Start Server
// -------------------------
const startServer = async () => {
  await connectDB();
  setupColyseus();

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 IdleRPG + Colyseus server running on port ${PORT}`);
    console.log(`   HTTP: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

export default app;
