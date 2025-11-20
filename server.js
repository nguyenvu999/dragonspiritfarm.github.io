const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Sử dụng middleware
app.use(express.json());
app.use(cors());

// Kết nối đến MongoDB Atlas
mongoose.connect('mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Đã kết nối đến MongoDB Atlas');
}).catch((error) => {
  console.error('Lỗi kết nối MongoDB:', error);
});

// Cấu hình schema cho dữ liệu người chơi
const playerSchema = new mongoose.Schema({
  username: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  gems: { type: Number, default: 0 },
  rank: { type: Number, default: 0 }
});

// Tạo model cho người chơi
const Player = mongoose.model('Player', playerSchema);

// API để cập nhật thông tin người chơi
app.post('/update-player', async (req, res) => {
  const { userId, username, gems } = req.body;

  try {
    let player = await Player.findOne({ userId });

    if (player) {
      // Cập nhật thông tin người chơi hiện có
      player.gems = gems;
      player.username = username;
      await player.save();
    } else {
      // Tạo người chơi mới
      player = new Player({ userId, username, gems });
      await player.save();
    }

    res.status(200).send('Thông tin người chơi đã được cập nhật');
  } catch (error) {
    res.status(500).send('Lỗi server');
  }
});

// API để lấy bảng xếp hạng
app.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Player.find().sort({ gems: -1 }).limit(10);
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).send('Lỗi server');
  }
});

// API để lấy thông tin của một người chơi theo userId
app.get('/player/:userId', async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.params.userId });
    if (!player) {
      return res.status(404).send('Không tìm thấy người chơi');
    }
    res.status(200).json(player);
  } catch (error) {
    res.status(500).send('Lỗi server');
  }
});

// Khởi chạy server
app.listen(3000, () => {
  console.log('Server đang chạy tại http://localhost:3000');
});
