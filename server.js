import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';

// MongoDB connection string
const dbURI = 'mongodb+srv://nguyenvu99:nguyenvu@dragongame.th1vjjp.mongodb.net/dragon_game?retryWrites=true&w=majority';

// MongoDB model for user data
const User = mongoose.model('User', new mongoose.Schema({
  userId: String,
  firstName: String,
  lastName: String,
  username: String,
  dateAdded: { type: Date, default: Date.now }
}));

// Initialize express app
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// MongoDB connection
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error: ', err));

// /start webhook to handle bot start
app.get('/start', async (req, res) => {
  const { userId, firstName, username } = req.query; // Get user data from query params (Telegram passes these)
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Save user to MongoDB
    const user = new User({ userId, firstName, username });
    await user.save();

    // Send back a response to launch the WebApp
    const webAppUrl = 'https://dragonspiritfarm.vercel.app/';  // Replace with the actual URL of your WebApp
    return res.redirect(webAppUrl); // This will redirect the user to your WebApp
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to handle /start command' });
  }
});

// API endpoint to fetch user data (called from the WebApp)
app.post('/fetchUserData', async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Bot token for your Telegram bot
    const botToken = '8327237691:AAGcQRJQQjtzxhWSZo3JvFE2qOADvidHd1E'; // Replace with your bot's token

    // Fetch user data from Telegram WebApp
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/webAppData`, {
      initData: initData,
    });

    const userData = response.data;

    if (userData.ok) {
      // Save the user to MongoDB (if not already stored)
      const { id, first_name, last_name, username } = userData.result;
      
      // Check if the user already exists
      let user = await User.findOne({ userId: id });

      if (!user) {
        // Create new user if not found
        user = new User({
          userId: id,
          firstName: first_name,
          lastName: last_name,
          username
        });
        await user.save();
      }

      // Return user data if successful
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

// Port and start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
