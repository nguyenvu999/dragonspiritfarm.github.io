// ==============================
//      CONFIG (KHÔNG DÙNG .env)
// ==============================
const BOT_TOKEN = "8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E";     // Telegram bot token
const MONGO_URL = "mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority";     // MongoDB Atlas URL
const WEBAPP_URL = "https://dragonspiritfarm.vercel.app/";    // WebApp URL (Mini App)

// ==============================
//      IMPORT MODULES
// ==============================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { Telegraf } = require("telegraf");

// ==============================
//      INIT EXPRESS APP
// ==============================
const app = express();
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Apply rate limiting to all API routes
app.use(
  rateLimit({
    windowMs: 10 * 1000,
    max: 20,
  })
);

// ==============================
//      DATABASE CONNECT
// ==============================
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("DB ERROR:", err));

// ==============================
//      DATABASE MODEL
// ==============================
const PlayerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,

  gems: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
});

const Player = mongoose.model("Player", PlayerSchema);

// ==============================
//      VERIFY TELEGRAM initData
// ==============================
function verifyInitData(initData, botToken) {
  if (!initData) return null;

  const encoded = decodeURIComponent(initData);
  const params = new URLSearchParams(encoded);

  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([key, val]) => `${key}=${val}`)
    .sort()
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculated = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return calculated === hash ? Object.fromEntries(params.entries()) : null;
}

// ==============================
//      TELEGRAM BOT
// ==============================
const bot = new Telegraf(BOT_TOKEN);

// START command — KHÔNG LƯU USER
bot.start((ctx) => {
  ctx.reply(
    `Chào ${ctx.from.first_name}!\nNhấn /play để mở game.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Mở Mini App", web_app: { url: WEBAPP_URL } }],
        ],
      },
    }
  );
});

// /play
bot.command("play", (ctx) => {
  ctx.reply("Nhấn nút bên dưới để mở Mini App:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Mở Mini App", web_app: { url: WEBAPP_URL } }],
      ],
    },
  });
});

// Leaderboard command
bot.command("leaderboard", async (ctx) => {
  const list = await Player.find().sort({ gems: -1 }).limit(20);

  let msg = "<b>🏆 BẢNG XẾP HẠNG</b>\n\n";
  list.forEach((p, i) => {
    msg += `${i + 1}. <b>${p.username || "NoName"}</b>: ${p.gems} 💎\n`;
  });

  ctx.reply(msg, { parse_mode: "HTML" });
});

bot.launch();
console.log("BOT RUNNING...");

// ==============================
//      API — SYNC USER (KHÔNG TẠO USER)
// ==============================
app.post("/sync", async (req, res) => {
  const { initData } = req.body;

  const auth = verifyInitData(initData, BOT_TOKEN);
  if (!auth) return res.status(403).json({ ok: false, error: "INVALID_DATA" });

  const userId = auth.user?.id;
  const player = await Player.findOne({ userId });

  res.json({
    ok: true,
    exists: !!player,
    player: player || null,
  });
});

// ==============================
//      API — COLLECT → TẠO USER TẠI ĐÂY
// ==============================
app.post("/collect", async (req, res) => {
  const { initData, gems } = req.body;

  const auth = verifyInitData(initData, BOT_TOKEN);
  if (!auth) return res.status(403).json({ ok: false, error: "INVALID_DATA" });

  const tgUser = auth.user;

  let player = await Player.findOne({ userId: tgUser.id });

  // CREATE IF NOT EXISTS — Only HERE!
  if (!player) {
    player = new Player({
      userId: tgUser.id,
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      gems: 0,
    });
  }

  player.gems += Number(gems || 0);
  await player.save();

  res.json({ ok: true, gems: player.gems });
});

// ==============================
//      API — LEADERBOARD
// ==============================
app.get("/leaderboard", async (req, res) => {
  const top = await Player.find().sort({ gems: -1 }).limit(20);
  res.json(top);
});

// ==============================
//      RUN SERVER
// ==============================
const PORT = 3000;
app.listen(PORT, () => console.log(`SERVER RUNNING on port ${PORT}`));


