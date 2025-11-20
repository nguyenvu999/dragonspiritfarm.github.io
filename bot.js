const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

// Khởi tạo bot với token
const bot = new Telegraf('8347563664:AAGHVOfLRid7CQHDC0HHcvpFZZvhfxenpCQ');  // Thay 'YOUR_BOT_TOKEN' bằng token bot của bạn

// Kết nối MongoDB với cơ sở dữ liệu dragon_game
mongoose.connect('mongodb://localhost:27017/dragon_game', {
  useNewUrlParser: true,
  useUnifiedTopology: true
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

// Đảm bảo lưu vào collection 'player'
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
        [{ text: 'Mở Mini App', web_app: { url: 'https://stellular-frangollo-9bfc86.netlify.app/' } }],
      ]
    }
  });
});

// Xử lý callback từ bảng xếp hạng
bot.on('callback_query', (ctx) => {
  if (ctx.callbackQuery.data === 'leaderboard') {
    ctx.answerCbQuery('Bảng xếp hạng sẽ được hiển thị!');
    // Thêm logic để hiển thị bảng xếp hạng (Có thể từ API hoặc cơ sở dữ liệu của bạn)
  }
});

// Bắt đầu bot
bot.launch().then(() => {
  console.log("Bot đang hoạt động...");
});
