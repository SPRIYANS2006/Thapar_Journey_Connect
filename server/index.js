import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { setSocketIO } from './services/notifications.js';
import { cleanupExpiredGroups } from './services/groups.js';
import { JWT_SECRET } from './middleware/auth.js';
import { User, Group } from './models/index.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // 1. Connect to MongoDB Atlas (Fail-fast in production)
  await connectDB();

  // 2. Initialize Express application & HTTP server
  const app = createApp();
  const server = http.createServer(app);

  // 3. Configure Socket.io with authenticated handshakes & restricted CORS
  const appOrigin = process.env.APP_ORIGIN;
  const socketCors = appOrigin
    ? {
        origin: appOrigin.split(',').map((o) => o.trim()),
        methods: ['GET', 'POST'],
        credentials: true
      }
    : { origin: '*', methods: ['GET', 'POST'] };

  const io = new Server(server, {
    cors: socketCors,
    transports: ['websocket', 'polling']
  });

  // Authenticate socket handshakes with session token
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '')?.trim();

    if (!token) {
      return next(new Error('Authentication error: Session token required.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ id: decoded.userId });
      if (!user || user.token_version !== decoded.tokenVersion) {
        return next(new Error('Authentication error: Session invalid or expired.'));
      }
      socket.user = user;
      next();
    } catch {
      return next(new Error('Authentication error: Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    // Join private per-user notification room
    socket.join(`user_${socket.user.id}`);

    // Join group room only if verified as a member of that group
    socket.on('join_group', async (groupId) => {
      try {
        if (!groupId) return;
        const group = await Group.findOne({
          id: String(groupId),
          'members.user_id': socket.user.id
        }).lean();

        if (group) {
          socket.join(`group_${groupId}`);
        } else {
          socket.emit('error', {
            message: 'Access denied: You are not a member of this ride group.'
          });
        }
      } catch (e) {
        console.warn('Socket join_group error:', e.message);
      }
    });

    socket.on('leave_group', (groupId) => {
      if (groupId) {
        socket.leave(`group_${groupId}`);
      }
    });

    socket.on('disconnect', () => {});
  });

  // Provide io instance to notifications service
  setSocketIO(io);

  // Initial expired groups cleanup & recurring 60s background task
  cleanupExpiredGroups().catch(() => {});
  setInterval(cleanupExpiredGroups, 60 * 1000);

  server.listen(PORT, () => {
    console.log(`🚀 Thapar Journey Connect Server running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
