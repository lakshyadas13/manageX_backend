const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const quotesRoutes = require('./routes/quotesRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const errorHandler = require('./middleware/errorHandler');

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in environment variables');
  process.exit(1);
}

connectDB();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/', taskRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
