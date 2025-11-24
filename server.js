import express from 'express';
import mongoose from 'mongoose';
import fetch from 'node-fetch';
import { Telegraf } from 'telegraf';

// Khởi tạo bot với token
const bot = new Telegraf('8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E');

// Kết nối MongoDB Atlas
mongoose.connect('mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority')
  .then(() => {
    console.log('Kết nối MongoDB Atlas thành công');
  })
  .catch((error) => {
    console.error('Lỗi kết nối MongoDB:', error);
  });

// Cấu hình schema cho người chơi (Player)
const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  gems: { type: Number, default: 0 },  // Thêm các thuộc tính như gems, level, v.v.
  level: { type: Number, default: 1 }
});

// Tạo model cho người chơi
const Player = mongoose.model('Player', playerSchema, 'player');

// Lệnh /start
bot.start(async (ctx) => {
  const user = ctx.from;  // Lấy thông tin người dùng
  console.log('Thông tin người dùng:', user);

  // Kiểm tra và lưu thông tin người chơi vào cơ sở dữ liệu (collection Player)
  let existingPlayer = await Player.findOne({ userId: user.id });
  if (!existingPlayer) {
    const newPlayer = new Player({
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
    });
    await newPlayer.save();
    console.log('Người chơi mới đã được lưu:', user);
  }

  ctx.reply(`Chào ${user.first_name}! Nhấn /play để tiếp tục.`);
});

// Lệnh /play
bot.command('play', (ctx) => {
  const user = ctx.from;  // Lấy thông tin người dùng
  console.log('Thông tin người dùng:', user);
  
  ctx.reply('Chào mừng bạn đến với Nuôi Rồng Linh Thạch! 🎉\n\nNhấn nút dưới đây để bắt đầu trò chơi.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Mở Mini App', web_app: { url: 'https://dragonspiritfarm.vercel.app/' } }],
      ]
    }
  });
});

// API endpoint để nhận dữ liệu từ WebApp Telegram
const app = express();
app.use(express.json());  // Middleware to parse JSON requests

// Xử lý webhook
app.post('/webhook', async (req, res) => {
  const update = req.body;

  try {
    // Kiểm tra xem có phải update từ bot Telegram không
    if (update && update.message) {
      const user = update.message.from;
      console.log('Thông tin người dùng:', user);

      // Kiểm tra và lưu thông tin người chơi vào cơ sở dữ liệu (collection Player)
      let existingPlayer = await Player.findOne({ userId: user.id });
      if (!existingPlayer) {
        const newPlayer = new Player({
          userId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        });
        await newPlayer.save();
        console.log('Người chơi mới đã được lưu:', user);
      }
    }

    // Trả lời với Telegram
    res.sendStatus(200);
  } catch (error) {
    console.error('Lỗi khi xử lý webhook:', error);
    res.status(500).send('Server Error');
  }
});

// Thiết lập webhook cho bot
const webhookUrl = 'https://dragon-spirit-app.onrender.com/webhook';  // URL của webhook

bot.telegram.setWebhook(webhookUrl).then(() => {
  console.log('Webhook đã được thiết lập');
});

// Bắt đầu server và lắng nghe
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Bắt đầu bot
bot.launch().then(() => {
  console.log("Bot đang hoạt động...");
});
