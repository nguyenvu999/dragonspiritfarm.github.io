const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const app = express();

// Middleware để parse JSON requests
app.use(express.json());

// Cấu hình token bot Telegram và WebApp URL
const BOT_TOKEN = '8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E'; // Thay bằng Bot Token của bạn
const WEB_APP_URL = 'https://dragonspiritfarm.vercel.app/'; // Thay bằng URL WebApp của bạn

// Tạo bot Telegram từ token
const bot = new Telegraf(BOT_TOKEN);

// Lắng nghe lệnh /start từ người dùng
bot.start((ctx) => {
  // Gửi thông báo có nút để mở WebApp
  ctx.reply("Chào bạn! Hãy bắt đầu trò chơi. Nhấn vào nút dưới đây để bắt đầu.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Mở ứng dụng", web_app: { url: WEB_APP_URL } }] // Đưa vào URL WebApp
        ]
      }
    });
});

// Lắng nghe sự kiện webhook và khởi chạy bot
bot.launch()
  .then(() => console.log('Bot is running...'))
  .catch((err) => console.error('Error starting the bot:', err));

// API endpoint để nhận dữ liệu từ WebApp Telegram
app.post('/fetchUserData', async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Fetch thông tin người dùng từ Telegram WebApp
    const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/webAppData`, {
      initData: initData,
    });

    const userData = response.data;

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
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data',
    });
  }
});

// Chạy server trên port 5000
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
