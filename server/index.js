import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { setSocketIO } from './services/notifications.js';
import { cleanupExpiredGroups } from './services/groups.js';
import { JWT_SECRET } from './middleware/auth.js';
import { User, Group, CityRide } from './models/index.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // 1. Connect to MongoDB Atlas (Fail-fast in production)
  await connectDB();

  // 2. Initialize Express application & HTTP server
  const app = createApp();
  const server = http.createServer(app);

  // 3. Configure Socket.io with authenticated handshakes & flexible origin handling
  const appOrigin = process.env.APP_ORIGIN;
  const renderUrl = process.env.RENDER_EXTERNAL_URL;

  const socketOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000'
  ];
  if (appOrigin && appOrigin.trim()) {
    socketOrigins.push(...appOrigin.split(',').map((o) => o.trim()).filter(Boolean));
  }
  if (renderUrl && renderUrl.trim()) {
    socketOrigins.push(renderUrl.trim());
  }

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || socketOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
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

    // Join group room only if verified as a member of that group or community ride
    socket.on('join_group', async (groupId) => {
      try {
        if (!groupId) return;
        const sGroupId = String(groupId);
        let isMember = false;

        if (sGroupId.startsWith('cr_')) {
          const ride = await CityRide.findOne({
            id: sGroupId,
            $or: [
              { 'members.user_id': socket.user.id },
              { 'members.userId': socket.user.id },
              { 'members.id': socket.user.id },
              { creator_id: socket.user.id }
            ]
          }).lean();
          isMember = Boolean(ride);
        } else {
          const group = await Group.findOne({
            id: sGroupId,
            'members.user_id': socket.user.id
          }).lean();
          isMember = Boolean(group);
        }

        if (isMember) {
          socket.join(`group_${sGroupId}`);
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
        socket.leave(`group_${String(groupId)}`);
      }
    });

    // Community Group discussion rooms
    socket.on('join_community_group', (groupId) => {
      if (groupId) {
        socket.join(`cg_${groupId}`);
      }
    });

    socket.on('leave_community_group', (groupId) => {
      if (groupId) {
        socket.leave(`cg_${groupId}`);
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
