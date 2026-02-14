const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.enable('trust proxy');

// Routes
app.get('/', (req, res) => {
    res.status(200).send('Music Hub Node.js Backend 🎵');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');
const streamRoutes = require('./routes/stream');
const userRoutes = require('./routes/user');
const playlistRoutes = require('./routes/playlist');
const recommendationRoutes = require('./routes/recommendations');
const homeRoutes = require('./routes/home');

app.use('/auth', authRoutes);
app.use('/search', searchRoutes);
app.use('/stream', streamRoutes);
app.use('/user', userRoutes);
app.use('/playlist', playlistRoutes);
app.use('/recommendations', recommendationRoutes);
app.use('/home', homeRoutes);
const queueRoutes = require('./routes/queue');
app.use('/queue', queueRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

module.exports = app;
