import express from 'express';
import mongoose from 'mongoose';
import fetch from 'node-fetch';  // Import node-fetch (tương thích ES module)
import { Telegraf } from 'telegraf';

// Khởi tạo bot với token
const bot = new Telegraf('8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E');  // Thay 'YOUR_BOT_TOKEN' bằng token bot của bạn

// Kết nối MongoDB Atlas
mongoose.connect('mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Kết nối MongoDB Atlas thành công');
}).catch((error) => {
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

app.post('/fetchUserData', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Bot token và URL cho Telegram bot
    const botToken = '8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E'; // Thay 'YOUR_BOT_TOKEN' bằng token bot của bạn

    // Fetch user data từ Telegram WebApp
    const response = await fetch(`https://api.telegram.org/bot${botToken}/webAppData`, {
      method: 'POST',
      body: JSON.stringify({ initData }),
      headers: { 'Content-Type': 'application/json' }
    });

    const userData = await response.json();
    console.log('Dữ liệu người dùng từ Telegram:', userData);

    if (userData.ok) {
      // Trả về dữ liệu người dùng nếu thành công
      res.json({
        success: true,
        user: userData.result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user data from Telegram',
      });
    }
  } catch (error) {
    console.error('Lỗi khi fetch user data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data',
    });
  }
});

// Port và start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Bắt đầu bot
bot.launch().then(() => {
  console.log('Bot đang hoạt động...');
});
