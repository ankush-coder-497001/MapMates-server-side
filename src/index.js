require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const slowDown = require('express-slow-down');

const app = express();
const server = http.createServer(app);

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests before slowing down
  delayMs: () => 500,   // Add 500ms delay per request above the limit
});
// Middlewares
// app.use(speedLimiter);
app.use(cors({
  origin: process.env.ORIGIN || ['http://localhost:5173', 'http://localhost:4173'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use(helmet());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log(' MongoDB connected'))
  .catch(err => console.error(' MongoDB connection error:', err));

// Models for initialization
require('./models/user.model');
require('./models/message.model');
require('./models/report.model');
require('./models/helpRequest.model');

//socket initialization
const initSocket = require('./socket/socket');
initSocket(server);


// API Routes
const userRouter = require('./routes/user.route');
const reportRouter = require('./routes/report.route');
const chatRouter = require('./routes/chat.route');

app.use('/api/users', userRouter);
app.use('/api/report', reportRouter);
app.use('/api/chat', chatRouter);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
