// Import Telegraf library
const { Telegraf } = require('telegraf');

// Khởi tạo bot với token
const bot = new Telegraf('8347563664:AAGHVOfLRid7CQHDC0HHcvpFZZvhfxenpCQ');  // Thay 'YOUR_BOT_TOKEN' bằng token bot của bạn

// Lệnh /start
bot.start((ctx) => ctx.reply('bấm /play để tiếp tục'));

// Lệnh /play
bot.command('play', (ctx) => {
  ctx.reply('Chào mừng bạn đến với Nuôi Rồng Linh Thạch! 🎉\n\nNhấn nút dưới đây để bắt đầu trò chơi.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Mở Mini App', web_app: { url: 'https://stellular-frangollo-9bfc86.netlify.app/' } }]
      ]
    }
  });
});

// Bắt đầu bot
bot.launch().then(() => {
  console.log("Bot đang hoạt động...");
});
