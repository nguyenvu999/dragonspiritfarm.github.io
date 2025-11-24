// Import express using ES module syntax
import express from 'express';
import axios from 'axios';

// Initialize express app
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// API endpoint to fetch user data
app.post('/fetchUserData', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Bot token and URL for your Telegram bot
    const botToken = 'YOUR_BOT_TOKEN'; // Replace with your bot's token
    const apiUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;

    // Fetch user data from Telegram WebApp
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/webAppData`, {
      initData: initData,
    });

    const userData = response.data;

    if (userData.ok) {
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
