// server.js (fixed) - supports atomic collect endpoint
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// =====================
//  CONNECT DATABASE
// =====================
const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// =====================
//  SCHEMA
// =====================
const PlayerSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    gems: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastSync: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Player = mongoose.model("Player", PlayerSchema, "player");

// =====================
//  GET PLAYER
// =====================
app.get("/player/:id", async (req, res) => {
  try {
    const userId = String(req.params.id);
    const player = await Player.findOne({ userId }).lean();

    if (!player) {
      return res.json({ success: false, message: "not found" });
    }

    return res.json({ success: true, player });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
//  SYNC DATA (client -> server)
//  Use for initial save / full-state sync
// =====================
app.post("/sync", async (req, res) => {
  try {
    const { userId, username, firstName, lastName, gems, level } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "missing userId" });

    let player = await Player.findOne({ userId });

    // Create if not exists
    if (!player) {
      player = await Player.create({
        userId,
        username: username || "Player",
        firstName,
        lastName,
        gems: Number(gems) || 0,
        level: Number(level) || 1,
      });

      return res.json({
        success: true,
        created: true,
        gems: player.gems,
        level: player.level,
      });
    }

    // Update user info fields (non-destructive)
    if (username) player.username = username;
    if (firstName) player.firstName = firstName;
    if (lastName) player.lastName = lastName;

    // Keep server authoritative for absolute values:
    // If client sends larger gems we accept it (still use max to avoid accidental overwrite by old client)
    if (typeof gems === "number") {
      player.gems = Math.max(player.gems, gems);
    }
    if (typeof level === "number") {
      player.level = Math.max(player.level, level);
    }

    player.lastSync = new Date();
    await player.save();

    return res.json({ success: true, gems: player.gems, level: player.level });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
//  COLLECT endpoint (atomic increment)
//  Client should call this with { userId, amount }
//  Server will increment gems atomically and return the new value.
//  This is the recommended way when "picking up" produced gems.
// =====================
app.post("/collect", async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "missing userId" });
    const delta = Number(amount || 0);
    if (!Number.isFinite(delta) || delta <= 0) {
      return res.status(400).json({ success: false, message: "invalid amount" });
    }

    // Atomic increment and return the updated document
    const updated = await Player.findOneAndUpdate(
      { userId },
      { $inc: { gems: delta }, $set: { lastSync: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    // If upsert created doc, ensure fields exist
    const gemsNow = updated.gems || 0;
    return res.json({ success: true, gems: gemsNow });
  } catch (error) {
    console.error("/collect error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
//  LEADERBOARD
// =====================
app.get("/leaderboard", async (req, res) => {
  try {
    const top = await Player.find()
      .sort({ gems: -1 })
      .limit(50)
      .select("userId username gems level -_id")
      .lean();

    return res.json({
      success: true,
      leaderboard: top,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
//  START SERVER
// =====================
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => console.log("Server chạy port", PORT));
