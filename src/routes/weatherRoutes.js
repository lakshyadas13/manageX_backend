const express = require('express');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const city = req.query.city || 'London'; // Default fallback
    const apiKey = process.env.WEATHER_API_KEY || process.env.VITE_WEATHER_API_KEY;
    
    if (!apiKey) {
      console.error('Weather API Error: WEATHER_API_KEY is missing from environment variables');
      return res.status(500).json({ error: 'Weather API key is not configured in .env' });
    }

    const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Weather API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Normalize condition text for frontend Lucide icons
    const conditionText = data.current.condition.text.toLowerCase();
    let normalizedCondition = 'clouds';
    if (conditionText.includes('sun') || conditionText.includes('clear')) {
      normalizedCondition = 'clear';
    } else if (conditionText.includes('rain') || conditionText.includes('drizzle') || conditionText.includes('shower')) {
      normalizedCondition = 'rain';
    }
    
    res.json({
      temp: data.current.temp_c,
      condition: normalizedCondition,
      description: data.current.condition.text,
      icon: data.current.condition.icon,
      city: data.location.name
    });
  } catch (error) {
    console.error('Weather API Error:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

module.exports = router;
