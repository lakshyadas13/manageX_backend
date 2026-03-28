const express = require('express');
const router = express.Router();

const FALLBACK_QUOTES = [
  { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
  { q: "It does not matter how slowly you go as long as you do not stop.", a: "Confucius" },
  { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
  { q: "Success is not final, failure is not fatal: it is the courage to continue that counts.", a: "Winston Churchill" },
  { q: "Your time is limited, don't waste it living someone else's life.", a: "Steve Jobs" }
];

router.get('/random', async (req, res, next) => {
  try {
    const response = await fetch('https://zenquotes.io/api/random');
    if (!response.ok) {
        throw new Error(`ZenQuotes API error: ${response.statusText}`);
    }
    const data = await response.json();
    
    if (data && data.length > 0) {
      return res.json({
        quote: data[0].q,
        author: data[0].a
      });
    } else {
      throw new Error('Invalid response from Quotes API');
    }
  } catch (error) {
    console.error('Quotes API Error:', error);
    // Use fallback quote
    const randomFallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    res.json({ quote: randomFallback.q, author: randomFallback.a });
  }
});

module.exports = router;
