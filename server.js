import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import { Telegraf } from 'telegraf';

const app = express();
app.use(express.json());  // Middleware để parse JSON requests

// Cấu hình MongoDB
mongoose.connect('mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Kết nối MongoDB Atlas thành công');
}).catch((error) => {
  console.error('Lỗi kết nối MongoDB:', error);
});

// Cấu hình schema cho người chơi
const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  gems: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
});

// Tạo model cho người chơi
const Player = mongoose.model('Player', playerSchema, 'player');

// Khởi tạo bot với token
const bot = new Telegraf('8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E');  // Token bot của bạn

// Lệnh /start
bot.start(async (ctx) => {
  const user = ctx.from;  // Lấy thông tin người dùng
  console.log('Thông tin người dùng:', user);

  // Kiểm tra và lưu thông tin người chơi vào cơ sở dữ liệu MongoDB
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
        [{ text: 'Mở Mini App', web_app: { url: 'https://nguyenvu999.github.io/dragonspiritfarm.github.io/' } }],
      ]
    }
  });
});

// Lệnh /leaderboard - Bảng xếp hạng
bot.command('leaderboard', async (ctx) => {
  try {
    const response = await fetch('http://localhost:3000/leaderboard');
    const leaderboard = await response.json();

    // Tạo bảng xếp hạng
    let leaderboardContent = '<b>Bảng Xếp Hạng:</b>\n';
    leaderboard.forEach((player, index) => {
      leaderboardContent += `#${index + 1} - ${player.username}: ${player.gems} linh thạch\n`;
    });

    ctx.reply(leaderboardContent, { parse_mode: 'HTML' });
  } catch (error) {
    ctx.reply('Không thể tải bảng xếp hạng.');
  }
});

// API endpoint để nhận dữ liệu từ WebApp Telegram
app.post('/fetchUserData', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Token bot Telegram
    const botToken = '8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E';
    
    // Fetch dữ liệu người dùng từ Telegram WebApp
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/webAppData`, {
      initData: initData,
    });

    const userData = response.data;
    console.log('Telegram API response:', userData);

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
        error: userData.description,
      });
    }
  } catch (error) {
    console.error('Error in fetching user data:', error);
    res.status(500).json({
      success: false,
      message: 'Error occurred',
    });
  }
});

// Khởi động bot
bot.launch().then(() => {
  console.log('Bot đang hoạt động...');
});

// Port và bắt đầu server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
