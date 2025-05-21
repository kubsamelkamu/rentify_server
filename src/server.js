import jwt from 'jsonwebtoken';
import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import app, { prisma } from './app.js';

dotenv.config();

const httpServer = http.createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

const JWT_SECRET = process.env.JWT_SECRET;

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: token required'));

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = { id: payload.userId };
    next();
  } catch {
    next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.id}`);
  socket.on('joinRoom', (propertyId) => {
    socket.join(propertyId);
    io.to(propertyId).emit('presence', {
      userId: socket.user.id,
      status: 'online',
    });
  });

  socket.on('leaveRoom', (propertyId) => {
    socket.leave(propertyId);
    io.to(propertyId).emit('presence', {
      userId: socket.user.id,
      status: 'offline',
    });
  });

  socket.on('typing', ({ propertyId, isTyping }) => {
    socket.to(propertyId).emit('typingStatus', {
      userId: socket.user.id,
      isTyping,
    });
  });

  socket.on('sendMessage', async ({ propertyId, content }, callback) => {
    try {
      const prop = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { landlordId: true },
      });
      if (!prop) {
        socket.emit('error', 'Property not found');
        return callback && callback(null);
      }

      const senderId = socket.user.id;
      const receiverId = prop.landlordId;

      const message = await prisma.message.create({
        data: {
          content,
          property: { connect: { id: propertyId } },
          sender: { connect: { id: senderId } },
          receiver: { connect: { id: receiverId } },
        },
        include: {
          sender: { select: { id: true, name: true } },
        },
      });

      io.to(propertyId).emit('newMessage', message);
      if (typeof callback === 'function') {
        callback(message);
      }
    } catch (err) {
      console.error('sendMessage error:', err);
      socket.emit('error', 'Could not send message');
      if (typeof callback === 'function') {
        callback(null);
      }
    }
  });

  socket.on('deleteMessage', async ({ propertyId, messageId }, callback) => {
    try {
      const msg = await prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true },
      });
      if (!msg || msg.senderId !== socket.user.id) {
        return callback && callback({ success: false, error: 'Not authorized' });
      }
      await prisma.message.update({
        where: { id: messageId },
        data: { deleted: true },
      });
      io.to(propertyId).emit('messageDeleted', { messageId });
      callback && callback({ success: true });
    } catch{
      callback && callback({ success: false, error: 'Server error' });
    }
  });

  socket.on(
    'editMessage',
    async ({ propertyId, messageId, newContent }, callback) => {
      try {
        const msg = await prisma.message.findUnique({
          where: { id: messageId },
          select: { senderId: true },
        });
        if (!msg || msg.senderId !== socket.user.id) {
          return callback && callback({ success: false, error: 'Not authorized' });
        }

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { content: newContent, editedAt: new Date() },
          include: { sender: { select: { id: true, name: true } } },
        });

        io.to(propertyId).emit('messageEdited', updated);
        callback && callback({ success: true });
      } catch{
        callback && callback({ success: false, error: 'Server error' });
      }
    }
  );

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      io.to(room).emit('presence', {
        userId: socket.user.id,
        status: 'offline',
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.user.id} (${reason})`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
