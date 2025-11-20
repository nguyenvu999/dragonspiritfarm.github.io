import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URL =
  "mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const PlayerSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    gems: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// FIX QUAN TRỌNG: dùng collection "player"
const Player = mongoose.model("Player", PlayerSchema, "player");

app.get("/player/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    let player = await Player.findOne({ userId });

    if (!player) {
      return res.json({ success: false, message: "not found" });
    }

    return res.json({
      success: true,
      player,
    });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
});

app.post("/sync", async (req, res) => {
  try {
    const { userId, username, firstName, lastName, gems, level } = req.body;

    if (!userId)
      return res.json({ success: false, message: "Missing userId" });

    let player = await Player.findOne({ userId });

    if (!player) {
      player = new Player({
        userId,
        username,
        firstName,
        lastName,
        gems: gems || 0,
        level: level || 1,
      });

      await player.save();
    } else {
      if (gems > player.gems) player.gems = gems;
      if (level > player.level) player.level = level;

      if (username) player.username = username;
      if (firstName) player.firstName = firstName;
      if (lastName) player.lastName = lastName;

      await player.save();
    }

    return res.json({
      success: true,
      gems: player.gems,
      level: player.level,
    });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const list = await Player.find().sort({ gems: -1 }).limit(50);

    return res.json({
      success: true,
      leaderboard: list.map((p) => ({
        userId: p.userId,
        username: p.username || "Player",
        gems: p.gems,
        level: p.level,
      })),
    });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at port ${PORT}`));
