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
  } catch{
    next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', (socket) => {

  socket.on('joinRoom', (propertyId) => {
    socket.join(propertyId);
  });

  socket.on('leaveRoom', (propertyId) => {
    socket.leave(propertyId);
  });

  socket.on(
    'sendMessage',
    async ({ propertyId, content }, callback) => {
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
            sender:   { connect: { id: senderId } },
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
      } catch{
        socket.emit('error', 'Could not send message');
        if (typeof callback === 'function') {
          callback(null);
        }
      }
    }
  );

  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.user.id} (${reason})`);
  });
});


const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
