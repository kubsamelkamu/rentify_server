import jwt from 'jsonwebtoken';
import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import app, { prisma } from './app.js'; 

dotenv.config();

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

const JWT_SECRET = process.env.JWT_SECRET;

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: token required'));

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = { id: payload.userId };
    next();
  } catch (err) {
    console.error('Socket auth error:', err);
    next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', async (socket) => {
  console.log(`🔌 User connected (socket): ${socket.user.id}`);
  try {
    const myProps = await prisma.property.findMany({
      where: { landlordId: socket.user.id },
      select: { id: true },
    });
    myProps.forEach(({ id }) => {
      socket.join(`property_${id}`);
    });
  } catch (err) {
    console.error('Auto-join landlord rooms failed:', err);
  }

  socket.on('joinRoom', (propertyId) => {
    const room = `property_${propertyId}`;
    socket.join(room);
    io.to(room).emit('presence', {
      userId: socket.user.id,
      status: 'online',
    });
  });

  socket.on('leaveRoom', (propertyId) => {
    const room = `property_${propertyId}`;
    socket.leave(room);
    io.to(room).emit('presence', {
      userId: socket.user.id,
      status: 'offline',
    });
  });

  socket.on('typing', ({ propertyId, isTyping }) => {
    const room = `property_${propertyId}`;
    socket.to(room).emit('typingStatus', {
      userId: socket.user.id,
      isTyping,
    });
  });

  socket.on('sendMessage', async ({ propertyId, content }, callback) => {
    const room = `property_${propertyId}`;
    try {
      const prop = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { landlordId: true },
      });
      if (!prop) {
        socket.emit('error', 'Property not found');
        return callback && callback(null);
      }

      const message = await prisma.message.create({
        data: {
          content,
          property: { connect: { id: propertyId } },
          sender: { connect: { id: socket.user.id } },
          receiver: { connect: { id: prop.landlordId } },
        },
        include: { sender: { select: { id: true, name: true } } },
      });

      io.to(room).emit('newMessage', message);
      callback && callback(message);
    } catch (err) {
      console.error('sendMessage error:', err);
      socket.emit('error', 'Could not send message');
      callback && callback(null);
    }
  });

  socket.on('deleteMessage', async ({ propertyId, messageId }, callback) => {
    const room = `property_${propertyId}`;
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
      io.to(room).emit('messageDeleted', { messageId });
      callback && callback({ success: true });
    } catch (err) {
      console.error('deleteMessage error:', err);
      callback && callback({ success: false, error: 'Server error' });
    }
  });

  socket.on('editMessage', async ({ propertyId, messageId, newContent }, callback) => {
    const room = `property_${propertyId}`;
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

      io.to(room).emit('messageEdited', updated);
      callback && callback({ success: true });
    } catch (err) {
      console.error('editMessage error:', err);
      callback && callback({ success: false, error: 'Server error' });
    }
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room.startsWith('property_')) {
        io.to(room).emit('presence', {
          userId: socket.user.id,
          status: 'offline',
        });
      }
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