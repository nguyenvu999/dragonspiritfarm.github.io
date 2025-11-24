import express from 'express';
import mongoose from 'mongoose';
import fetch from 'node-fetch';  
import { Telegraf } from 'telegraf';

// Khởi tạo bot với token
const bot = new Telegraf('8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E'); 

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
  gems: { type: Number, default: 0 },  
  level: { type: Number, default: 1 }
});

// Tạo model cho người chơi
const Player = mongoose.model('Player', playerSchema, 'player');

// API endpoint để nhận dữ liệu từ WebApp Telegram
const app = express();
app.use(express.json()); 

app.post('/fetchUserData', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Bot token và URL cho Telegram bot
    const botToken = '8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E'; 

    // Fetch user data từ Telegram WebApp
    const response = await fetch(`https://api.telegram.org/bot${botToken}/webAppData`, {
      method: 'POST',
      body: JSON.stringify({ initData }),
      headers: { 'Content-Type': 'application/json' }
    });

    const userData = await response.json();
    console.log('Dữ liệu người dùng từ Telegram:', userData);

    if (userData.ok) {
      const user = userData.result;

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
