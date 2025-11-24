// ==============================
//        CONFIG
// ==============================
const BOT_TOKEN = '8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E'; // Đặt token của bot Telegram vào đây
const MONGO_URL = 'mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority'; // Đặt URL kết nối MongoDB vào đây
const WEBAPP_URL = 'YOUR_WEBAPP_URL'; // Đặt URL của ứng dụng Mini App vào đây
const BACKEND_URL = 'https://dragon-spirit-app.onrender.com'; // Đặt URL của backend vào đây

// ==============================
//        IMPORT MODULES
// ==============================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("crypto");
const { Telegraf } = require("telegraf");

// ==============================
//        INIT EXPRESS APP
// ==============================
const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// ==============================
//        TELEGRAM BOT
// ==============================
const bot = new Telegraf(BOT_TOKEN);

// Webhook instead of polling
app.use(bot.webhookCallback("/telegram-bot"));
bot.telegram.setWebhook(BACKEND_URL + "/telegram-bot");

// ==============================
//        START / PLAY
// ==============================
bot.start((ctx) => {
  ctx.reply(
    `🐉 Chào ${ctx.from.first_name}!\nBấm nút để mở Mini App.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Mở Game",
              web_app: { url: WEBAPP_URL }
            }
          ]
        ]
      }
    }
  );
});

bot.command("play", (ctx) => {
  ctx.reply("Nhấn để mở game:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Mở Mini App",
            web_app: { url: WEBAPP_URL }
          }
        ]
      ]
    }
  });
});

// ==============================
//        DATABASE
// ==============================
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

const PlayerSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  username: String,
  gems: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
});

const Player = mongoose.model("Player", PlayerSchema);

// ==============================
//   VERIFY TELEGRAM initData
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

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calcHash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  if (calcHash !== hash) return null;

  return Object.fromEntries(params.entries());
}

// ==============================
//        API — SYNC USER
// ==============================
app.post("/sync", async (req, res) => {
  const { initData, level, gems } = req.body;

  const auth = verifyInitData(initData, BOT_TOKEN);
  if (!auth || !auth.user) {
    return res.json({ success: false, error: "INVALID_INITDATA" });
  }

  const uid = auth.user.id;
  const username = auth.user.username || "Player";

  let p = await Player.findOne({ userId: uid });
  if (!p) {
    p = new Player({
      userId: uid,
      username,
      level,
      gems,
    });
  } else {
    p.level = level;
    p.gems = gems;
  }

  await p.save();

  res.json({ success: true, gems: p.gems, level: p.level });
});

// ==============================
//        API — COLLECT
// ==============================
app.post("/collect", async (req, res) => {
  const { initData, amount } = req.body;

  const auth = verifyInitData(initData, BOT_TOKEN);
  if (!auth || !auth.user) {
    return res.json({ success: false, error: "INVALID_INITDATA" });
  }

  const uid = auth.user.id;
  const username = auth.user.username || "Player";

  let p = await Player.findOne({ userId: uid });
  if (!p) {
    p = new Player({ userId: uid, username });
  }

  p.gems += Number(amount || 0);
  await p.save();

  res.json({ success: true, gems: p.gems });
});

// ==============================
//        API — LEADERBOARD
// ==============================
app.get("/leaderboard", async (req, res) => {
  const top = await Player.find().sort({ gems: -1 }).limit(20);

  res.json({
    success: true,
    leaderboard: top.map((p) => ({
      username: p.username,
      gems: p.gems,
    })),
  });
});

// ==============================
//        RUN SERVER
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log("SERVER RUNNING on port " + PORT)
);
