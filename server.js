// ==============================
//      CONFIG
// ==============================
// NÊN để các giá trị này vào biến môi trường khi deploy
const BOT_TOKEN  = process.env.BOT_TOKEN  || "8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E";
const MONGO_URL  = process.env.MONGO_URL  || "mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://nguyenvu999.github.io/dragonspiritfarm.github.io/";

// ==============================
//      IMPORT MODULES
// ==============================
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
const bodyParser = require("body-parser");
const crypto     = require("crypto");
const { Telegraf } = require("telegraf");

// ==============================
//      INIT EXPRESS APP
// ==============================
const app = express();
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

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
const PlayerSchema = new mongoose.Schema(
  {
    userId:   { type: String, required: true, unique: true }, // ví dụ "123456789" (id Telegram)
    username: String,
    firstName:String,
    lastName: String,

    gems:  { type: Number, default: 0 },
    level: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const Player = mongoose.model("Player", PlayerSchema);

// ==============================
//      VERIFY TELEGRAM initData
// ==============================
function verifyInitData(initData, botToken) {
  if (!initData) return null;

  try {
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

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash !== hash) return null;

    return Object.fromEntries(params.entries());
  } catch (e) {
    console.error("verifyInitData error:", e);
    return null;
  }
}

// ==============================
//      TELEGRAM BOT
// ==============================
const bot = new Telegraf(BOT_TOKEN);

// /start
bot.start((ctx) => {
  ctx.reply(
    `Chào ${ctx.from.first_name}!\nNhấn /play để mở game.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Mở Mini App",
              web_app: { url: WEBAPP_URL } // không cần ?uid nữa, dùng initData
            }
          ]
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
        [
          {
            text: "Mở Mini App",
            web_app: { url: WEBAPP_URL }
          }
        ]
      ],
    },
  });
});

// /leaderboard (trong bot)
bot.command("leaderboard", async (ctx) => {
  const list = await Player.find().sort({ gems: -1 }).limit(20);
  let msg = "<b>🏆 BẢNG XẾP HẠNG</b>\n\n";
  list.forEach((p, i) => {
    msg += `${i + 1}. <b>${p.username || "NoName"}</b>: ${p.gems} 💎\n`;
  });
  ctx.reply(msg, { parse_mode: "HTML" });
});

bot.launch().then(() => console.log("BOT RUNNING..."));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// ==============================
//      API — SYNC (dùng initData)
//      Frontend gửi: { initData, gems, level }
// ==============================
app.post("/sync", async (req, res) => {
  try {
    const { initData, gems, level } = req.body;

    const data = verifyInitData(initData, BOT_TOKEN);
    if (!data || !data.user) {
      return res.status(403).json({ success: false, error: "INVALID_INITDATA" });
    }

    const tgUser = JSON.parse(data.user);
    const userId  = String(tgUser.id);
    const username  = tgUser.username || tgUser.first_name || "Player";
    const firstName = tgUser.first_name || "";
    const lastName  = tgUser.last_name || "";

    const safeGems  = Number.isFinite(+gems)  ? Math.max(0, Math.floor(+gems)) : 0;
    const safeLevel = Number.isFinite(+level) ? Math.max(1, Math.floor(+level)) : 1;

    const player = await Player.findOneAndUpdate(
      { userId },
      {
        $set: {
          username,
          firstName,
          lastName,
          gems: safeGems,
          level: safeLevel,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      gems: player.gems,
      level: player.level,
      username: player.username,
    });
  } catch (err) {
    console.error("SYNC ERROR:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

// ==============================
//      API — LEADERBOARD CHO FRONTEND
//      Frontend expect: { success, leaderboard: [...] }
// ==============================
app.get("/leaderboard", async (req, res) => {
  try {
    const top = await Player.find().sort({ gems: -1 }).limit(20).lean();
    const leaderboard = top.map((p) => ({
      userId:   p.userId,
      username: p.username || "NoName",
      gems:     p.gems,
      level:    p.level,
    }));
    return res.json({ success: true, leaderboard });
  } catch (err) {
    console.error("LEADERBOARD ERROR:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

// ==============================
//      RUN SERVER
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SERVER RUNNING on port ${PORT}`));
