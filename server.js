require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/database');
const { initializeSocket } = require('./utils/socketManager');
const webhookRoutes = require('./routes/webhook');
const chatRoutes = require('./routes/chat');
const corsConfig = require('./config/cors')
const app = express();

const server = http.createServer(app);

const io = initializeSocket(server);

connectDB();

app.use(cors(corsConfig));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/webhook', webhookRoutes);
app.use('/api/chats', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
