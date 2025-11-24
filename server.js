import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto'; // Cần import module crypto để xác thực initData
import { Telegraf } from 'telegraf';

// LƯU Ý QUAN TRỌNG: Bot token của bạn
const BOT_TOKEN = '8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E'; 

// URL CỦA MINI APP CỦA BẠN (CẦN THAY THẾ bằng URL triển khai thực tế của bạn)
const MINI_APP_URL = 'https://dragonspiritfarm-git-main-nguyenvu999s-projects.vercel.app/'; 

// Khởi tạo bot
const bot = new Telegraf(BOT_TOKEN); 

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
  gems: { type: Number, default: 0 }, // Giữ lại trạng thái game
  level: { type: Number, default: 1 },
  rate: { type: Number, default: 1 }, // Tốc độ tạo linh thạch
  cost: { type: Number, default: 100 }, // Chi phí nâng cấp tiếp theo
  // Thêm các trường liên quan đến trạng thái farm
  isFarming: { type: Boolean, default: false },
  farmEndTime: { type: Number, default: 0 },
});

// Tạo model cho người chơi
const Player = mongoose.model('Player', playerSchema, 'player');


/**
 * Hàm xác thực initData của Telegram WebApp
 * @param {string} initData - Chuỗi query parameter từ frontend
 * @returns {object|null} - Thông tin user đã được xác thực, hoặc null nếu không hợp lệ
 */
const validateInitData = (initData, botToken) => {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  // Sắp xếp các parameter theo thứ tự chữ cái và tạo chuỗi kiểm tra
  const dataCheckString = Array.from(urlParams.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Tạo secret key bằng HMAC SHA256 với 'WebAppData' và token bot
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  
  // Tạo hash cục bộ từ dataCheckString và secretKey
  const calculatedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  if (calculatedHash === hash) {
    // Nếu hash khớp, trích xuất user data
    const userJson = urlParams.get('user');
    if (userJson) {
      return JSON.parse(userJson);
    }
  }
  
  return null;
};

// --- LOGIC LỆNH BOT ---

/**
 * Hàm gửi tin nhắn với nút "Mở Mini App"
 * @param {object} ctx - Đối tượng ngữ cảnh Telegraf
 */
const sendWebAppLink = (ctx) => {
    const user = ctx.from;
    console.log('Thông tin người dùng:', user);

    ctx.reply('Chào mừng bạn đến với Nuôi Rồng Linh Thạch! 🎉\n\nNhấn nút dưới đây để bắt đầu trò chơi.', {
        reply_markup: {
            inline_keyboard: [
                // Sử dụng MINI_APP_URL đã định nghĩa
                [{ text: 'Mở Mini App', web_app: { url: MINI_APP_URL } }],
            ]
        }
    });
};

// Đăng ký lệnh /start
bot.start(sendWebAppLink);

// Đăng ký lệnh /play
bot.command('play', sendWebAppLink);

// --- END LOGIC LỆNH BOT ---


// API endpoint để nhận dữ liệu từ WebApp Telegram
const app = express();
app.use(express.json()); 

app.post('/fetchUserData', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // 1. Xác thực initData
    const telegramUser = validateInitData(initData, BOT_TOKEN);

    if (!telegramUser) {
      console.error('Xác thực initData thất bại!');
      return res.status(401).json({ success: false, message: 'Invalid Telegram data signature' });
    }

    // 2. Kiểm tra và lưu/lấy thông tin người chơi vào cơ sở dữ liệu
    const userId = String(telegramUser.id);
    let player = await Player.findOne({ userId });
    
    if (!player) {
      // Người chơi mới, tạo bản ghi mới với trạng thái mặc định
      player = new Player({
        userId,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        // Các giá trị mặc định sẽ được áp dụng
      });
      await player.save();
      console.log('Người chơi mới đã được lưu:', player.firstName);
    }

    // 3. Trả về toàn bộ thông tin người chơi (bao gồm trạng thái game)
    res.json({
      success: true,
      user: telegramUser, // Thông tin từ Telegram
      gameState: { // Trạng thái game từ DB
        level: player.level,
        gems: player.gems,
        rate: player.rate,
        cost: player.cost,
        isFarming: player.isFarming,
        farmEndTime: player.farmEndTime,
      }
    });

  } catch (error) {
    console.error('Lỗi khi fetch user data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data',
    });
  }
});

// API endpoint để cập nhật trạng thái game khi nâng cấp hoặc bắt đầu farm
app.post('/updateGameState', async (req, res) => {
    try {
        const { initData, updates } = req.body;

        if (!initData || !updates) {
            return res.status(400).json({ error: 'Missing initData or updates' });
        }

        const telegramUser = validateInitData(initData, BOT_TOKEN);
        if (!telegramUser) {
            return res.status(401).json({ success: false, message: 'Invalid Telegram data signature' });
        }

        const userId = String(telegramUser.id);
        const player = await Player.findOne({ userId });

        if (!player) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        // Cập nhật các trường được gửi từ frontend
        Object.assign(player, updates);
        await player.save();

        res.json({ success: true, gameState: player.toObject() });

    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái game:', error);
        res.status(500).json({ success: false, message: 'Server error during update' });
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
