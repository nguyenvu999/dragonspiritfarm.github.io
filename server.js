// server.js
require('dotenv').config(); // npm i dotenv
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MONGO URI from env
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dragon_game';
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=>console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Player schema
const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  gems: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now }
});

const Player = mongoose.model('Player', playerSchema);

// Get player by userId
app.get('/player/:userId', async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.params.userId });
    if (!player) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, player });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false });
  }
});

// Leaderboard top 10
app.get('/leaderboard', async (req, res) => {
  try {
    const top = await Player.find().sort({ gems: -1 }).limit(10).select('username gems userId');
    res.json({ success:true, leaderboard: top });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false });
  }
});

// Update-player (legacy)
app.post('/update-player', async (req, res) => {
  const { userId, username, gems } = req.body;
  try {
    let p = await Player.findOne({ userId });
    if (p) {
      p.gems = gems ?? p.gems;
      p.username = username ?? p.username;
      p.updatedAt = new Date();
      await p.save();
    } else {
      p = new Player({ userId, username, gems: gems || 0 });
      await p.save();
    }
    res.json({ success:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false });
  }
});

/**
 * SYNC endpoint
 * Client sends its userId and gems.
 * Server returns the authoritative gems (server keeps the larger of client vs server)
 */
app.post('/sync', async (req, res) => {
  try {
    const { userId, username, firstName, lastName, gems, level } = req.body;
    if (!userId) return res.status(400).json({ success:false, message: 'Missing userId' });

    let player = await Player.findOne({ userId });

    if (!player) {
      player = new Player({
        userId,
        username: username || `player_${userId.slice(0,6)}`,
        firstName,
        lastName,
        gems: Number(gems) || 0,
        level: Number(level) || 1,
        updatedAt: new Date()
      });
      await player.save();
      return res.json({ success:true, gems: player.gems, message:'Created' });
    }

    // Conflict resolution: keep the maximum gems (server-authoritative)
    const clientGems = Number(gems) || 0;
    if (clientGems > player.gems) {
      player.gems = clientGems;
      player.level = Number(level) || player.level;
      player.username = username || player.username;
      player.updatedAt = new Date();
      await player.save();
    }

    // respond with authoritative gems value
    return res.json({ success:true, gems: player.gems });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false });
  }
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
