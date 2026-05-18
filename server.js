require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust proxy for correct IP logging when deployed
app.set('trust proxy', true);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(hpp());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', generalLimiter);

// Routes
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/console/admin', require('./routes/adminRoutes'));
app.use('/api/team', require('./routes/teamRoutes'));
app.use('/api/volunteer', require('./routes/volunteerRoutes'));
app.use('/api/judge', require('./routes/judgeRoutes'));

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is running', timestamp: new Date() }));

// Root route
app.get('/', (req, res) => res.json({ success: true, message: 'TCE Hackathon API is running!' }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`));
  };
  startServer().catch((err) => { console.error('Failed to start server:', err); process.exit(1); });
} else {
  // In production (Vercel), we just connect to the DB and export the app
  connectDB().catch(console.error);
}

module.exports = app;
