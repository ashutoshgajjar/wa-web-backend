let io;

const initializeSocket = (server) => {
  const socketIo = require('socket.io')(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io = socketIo;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join_chat', (waId) => {
      socket.join(`chat_${waId}`);
      console.log(`Client joined chat: ${waId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const emitToChat = (waId, event, data) => {
  if (io) {
    io.to(`chat_${waId}`).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToChat,
  emitToAll,
};
