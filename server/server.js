import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { Server as SocketIOServer } from 'socket.io';
import db, { initDatabase } from './db.js';
import { connectMongoDB, isMongo } from './db_mongo.js';
import { User, Group, Journey, Community, CommunityPost, Destination, Hostel } from './models/index.js';
import { calculateMatchScore } from './matchingEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

// Initialize fallback SQLite and MongoDB in startServer()

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
  });
});

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '629250761631-k5eo83notfq2e1vuu3qvimbf1jq3lueo.apps.googleusercontent.com';
const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// Helper to assemble full group object from SQLite
function getFullGroup(groupId) {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  if (!group) return null;

  const members = db.prepare(`
    SELECT user_id as id, user_id, name, avatar, hostel, departure_time as departureTime, role, phone, joined_at
    FROM group_members WHERE group_id = ? ORDER BY joined_at ASC
  `).all(groupId);

  const messages = db.prepare(`
    SELECT id, sender_id as senderId, sender_name as senderName, avatar, text,
           time(timestamp, 'localtime') as time
    FROM group_messages WHERE group_id = ? ORDER BY timestamp ASC
  `).all(groupId);

  return {
    id: group.id,
    destinationId: group.destination_id,
    destinationName: group.destination_name,
    departureTime: group.departure_time,
    date: group.date,
    status: group.status,
    maxMembers: group.max_members,
    pickupPoint: group.pickup_point,
    matchScore: group.match_score,
    members: members,
    chatMessages: messages
  };
}

// Helper to format MongoDB group doc
function formatMongoGroup(g) {
  if (!g) return null;
  return {
    id: g.id,
    destinationId: g.destination_id || g.destinationId,
    destinationName: g.destination_name || g.destinationName,
    departureTime: g.departure_time || g.departureTime,
    date: g.date,
    status: g.status,
    maxMembers: g.max_members || g.maxMembers || 4,
    pickupPoint: g.pickup_point || g.pickupPoint,
    matchScore: g.match_score || g.matchScore,
    members: (g.members || []).map(m => ({
      id: m.user_id || m.id,
      user_id: m.user_id || m.id,
      name: m.name,
      avatar: m.avatar,
      hostel: m.hostel,
      departureTime: m.departure_time || m.departureTime,
      role: m.role || 'Member',
      phone: m.phone,
      joined_at: m.joined_at
    })),
    chatMessages: (g.chat_messages || []).map(msg => ({
      id: msg.id,
      senderId: msg.sender_id || msg.senderId,
      senderName: msg.sender_name || msg.senderName,
      avatar: msg.avatar,
      text: msg.text,
      time: msg.time || new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }))
  };
}

// Unified Group getter
async function getGroup(groupId) {
  if (isMongo()) {
    try {
      const g = await Group.findOne({ id: groupId }).lean();
      return formatMongoGroup(g);
    } catch (err) {
      console.warn('Mongo getGroup error:', err.message);
    }
  }
  return getFullGroup(groupId);
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Thapar Journey Connect API',
    database: isMongo() ? 'MongoDB Atlas (Cloud)' : 'SQLite (Local)',
    timestamp: new Date()
  });
});

// 2. Authentication: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim().toLowerCase().endsWith('@thapar.edu')) {
    return res.status(400).json({ error: 'Only official @thapar.edu email addresses are allowed.' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Please enter your password.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (isMongo()) {
    try {
      let user = await User.findOne({ email: cleanEmail });
      if (!user) {
        const displayName = cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
        const userId = `user_${Date.now()}`;
        const passwordHash = bcrypt.hashSync(password.trim(), 10);

        user = await User.create({
          id: userId,
          name: displayName,
          email: cleanEmail,
          password_hash: passwordHash,
          hostel: 'Agira Hall (Previously known as Hostel-A)',
          avatar: initials,
          phone: '+91 98765 00000',
          degree: 'B.Tech Computer Engineering',
          year: '3rd Year (Batch of 2026)',
          reliability: 5.0,
          trips_completed: 0,
          joined_community: null
        });
      } else if (user.password_hash) {
        const isValid = bcrypt.compareSync(password.trim(), user.password_hash);
        if (!isValid) {
          return res.status(401).json({ error: 'Incorrect password for this @thapar.edu account. Please try again.' });
        }
      } else {
        const passwordHash = bcrypt.hashSync(password.trim(), 10);
        user.password_hash = passwordHash;
        await user.save();
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          hostel: user.hostel,
          avatar: user.avatar,
          phone: user.phone,
          degree: user.degree,
          year: user.year,
          reliability: user.reliability,
          tripsCompleted: user.trips_completed,
          joinedCommunity: user.joined_community
        }
      });
    } catch (err) {
      console.error('Mongo login error:', err.message);
      return res.status(500).json({ error: 'Failed to process login.' });
    }
  }

  // SQLite fallback
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

  if (!user) {
    const displayName = cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
    const userId = `user_${Date.now()}`;
    const passwordHash = bcrypt.hashSync(password.trim(), 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, hostel, avatar, phone, degree, year, reliability, trips_completed, joined_community)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      displayName,
      cleanEmail,
      passwordHash,
      'Agira Hall (Previously known as Hostel-A)',
      initials,
      '+91 98765 00000',
      'B.Tech Computer Engineering',
      '3rd Year (Batch of 2026)',
      5.0,
      0,
      null
    );

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  } else if (user.password_hash) {
    const isValid = bcrypt.compareSync(password.trim(), user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password for this @thapar.edu account. Please try again.' });
    }
  } else {
    const passwordHash = bcrypt.hashSync(password.trim(), 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      hostel: user.hostel,
      avatar: user.avatar,
      phone: user.phone,
      degree: user.degree,
      year: user.year,
      reliability: user.reliability,
      tripsCompleted: user.trips_completed,
      joinedCommunity: user.joined_community
    }
  });
});

// 3. Authentication: Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, hostel, phone, degree, year } = req.body;

  if (!email || !email.trim().toLowerCase().endsWith('@thapar.edu')) {
    return res.status(400).json({ error: 'Only official @thapar.edu emails are allowed.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (isMongo()) {
    try {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({ error: 'An account with this Thapar email already exists. Please login.' });
      }

      const displayName = name?.trim() || cleanEmail.split('@')[0].replace('.', ' ');
      const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
      const userId = `user_${Date.now()}`;
      const passwordHash = password ? bcrypt.hashSync(password.trim(), 10) : null;

      const newUser = await User.create({
        id: userId,
        name: displayName,
        email: cleanEmail,
        password_hash: passwordHash,
        hostel: hostel || 'Agira Hall (Previously known as Hostel-A)',
        avatar: initials,
        phone: phone || '+91 98765 43210',
        degree: degree || 'B.Tech Computer Engineering',
        year: year || '3rd Year (Batch of 2026)',
        reliability: 5.0,
        trips_completed: 0,
        joined_community: null
      });

      return res.json({
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          hostel: newUser.hostel,
          avatar: newUser.avatar,
          phone: newUser.phone,
          degree: newUser.degree,
          year: newUser.year,
          reliability: newUser.reliability,
          tripsCompleted: newUser.trips_completed,
          joinedCommunity: newUser.joined_community
        }
      });
    } catch (err) {
      console.error('Mongo register error:', err.message);
      return res.status(500).json({ error: 'Registration failed.' });
    }
  }

  // SQLite fallback
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this Thapar email already exists. Please login.' });
  }

  const displayName = name?.trim() || cleanEmail.split('@')[0].replace('.', ' ');
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
  const userId = `user_${Date.now()}`;
  const passwordHash = password ? bcrypt.hashSync(password.trim(), 10) : null;

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, hostel, avatar, phone, degree, year, reliability, trips_completed, joined_community)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    displayName,
    cleanEmail,
    passwordHash,
    hostel || 'Agira Hall (Previously known as Hostel-A)',
    initials,
    phone || '+91 98765 43210',
    degree || 'B.Tech Computer Engineering',
    year || '3rd Year (Batch of 2026)',
    5.0,
    0,
    null
  );

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  res.json({
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      hostel: newUser.hostel,
      avatar: newUser.avatar,
      phone: newUser.phone,
      degree: newUser.degree,
      year: newUser.year,
      reliability: newUser.reliability,
      tripsCompleted: newUser.trips_completed,
      joinedCommunity: newUser.joined_community
    }
  });
});

// 3.5. Authentication: Google Workspace Single Sign-On (@thapar.edu only)
app.post('/api/auth/google', async (req, res) => {
  const { email, name, avatar, token, hostel, phone, degree, year } = req.body;

  let verifiedEmail = null;
  let verifiedName = null;
  let verifiedAvatar = null;

  // Cryptographically verify Google ID Token if token is provided
  if (token) {
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      if (payload) {
        verifiedEmail = payload.email;
        verifiedName = payload.name;
        verifiedAvatar = payload.picture;
      }
    } catch (err) {
      console.warn('Google token signature verification notice:', err.message);
    }
  }

  const effectiveEmail = (verifiedEmail || email || '').trim().toLowerCase();

  if (!effectiveEmail || !effectiveEmail.endsWith('@thapar.edu')) {
    return res.status(400).json({ 
      error: 'Access Denied: Only official @thapar.edu Google Workspace accounts from Thapar Institute of Engineering & Technology are permitted.' 
    });
  }

  if (isMongo()) {
    try {
      let user = await User.findOne({ email: effectiveEmail });
      if (!user) {
        const displayName = (verifiedName || name)?.trim() || effectiveEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
        const userId = `user_${Date.now()}`;

        user = await User.create({
          id: userId,
          name: displayName,
          email: effectiveEmail,
          hostel: hostel || 'Agira Hall (Previously known as Hostel-A)',
          avatar: verifiedAvatar || avatar || initials,
          phone: phone || '+91 98765 00000',
          degree: degree || 'B.Tech Computer Engineering',
          year: year || '3rd Year (Batch of 2026)',
          reliability: 5.0,
          trips_completed: 0,
          joined_community: null
        });
      } else if (verifiedAvatar && user.avatar !== verifiedAvatar) {
        user.avatar = verifiedAvatar;
        await user.save();
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          hostel: user.hostel,
          avatar: user.avatar,
          phone: user.phone,
          degree: user.degree,
          year: user.year,
          reliability: user.reliability,
          tripsCompleted: user.trips_completed,
          joinedCommunity: user.joined_community
        }
      });
    } catch (err) {
      console.error('Mongo Google auth error:', err.message);
      return res.status(500).json({ error: 'Google authentication error.' });
    }
  }

  // SQLite fallback
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(effectiveEmail);

  if (!user) {
    const displayName = (verifiedName || name)?.trim() || effectiveEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
    const userId = `user_${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, name, email, hostel, avatar, phone, degree, year, reliability, trips_completed, joined_community)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      displayName,
      effectiveEmail,
      hostel || 'Agira Hall (Previously known as Hostel-A)',
      verifiedAvatar || avatar || initials,
      phone || '+91 98765 00000',
      degree || 'B.Tech Computer Engineering',
      year || '3rd Year (Batch of 2026)',
      5.0,
      0,
      null
    );

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  } else if (verifiedAvatar && user.avatar !== verifiedAvatar) {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(verifiedAvatar, user.id);
    user.avatar = verifiedAvatar;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      hostel: user.hostel,
      avatar: user.avatar,
      phone: user.phone,
      degree: user.degree,
      year: user.year,
      reliability: user.reliability,
      tripsCompleted: user.trips_completed,
      joinedCommunity: user.joined_community
    }
  });
});

// 4. Current user profile
app.get('/api/auth/me', async (req, res) => {
  const userId = req.query.userId || 'user_main';

  if (isMongo()) {
    try {
      let user = await User.findOne({ id: userId });
      if (!user) user = await User.findOne({ email: 'student@thapar.edu' });
      if (!user) return res.status(404).json({ error: 'User not found' });

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        hostel: user.hostel,
        avatar: user.avatar,
        phone: user.phone,
        degree: user.degree,
        year: user.year,
        reliability: user.reliability,
        tripsCompleted: user.trips_completed,
        joinedCommunity: user.joined_community
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    hostel: user.hostel,
    avatar: user.avatar,
    phone: user.phone,
    degree: user.degree,
    year: user.year,
    reliability: user.reliability,
    tripsCompleted: user.trips_completed,
    joinedCommunity: user.joined_community
  });
});

// 5. Update Profile
app.put('/api/auth/profile', async (req, res) => {
  const { id, name, hostel, phone, degree, year, joinedCommunity } = req.body;
  const userId = id || 'user_main';

  if (isMongo()) {
    try {
      const updateData = {};
      if (name) updateData.name = name;
      if (hostel) updateData.hostel = hostel;
      if (phone) updateData.phone = phone;
      if (degree) updateData.degree = degree;
      if (year) updateData.year = year;
      if (joinedCommunity !== undefined) updateData.joined_community = joinedCommunity;

      const updated = await User.findOneAndUpdate({ id: userId }, updateData, { returnDocument: 'after' });
      if (!updated) return res.status(404).json({ error: 'User not found' });

      return res.json({
        success: true,
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          hostel: updated.hostel,
          avatar: updated.avatar,
          phone: updated.phone,
          degree: updated.degree,
          year: updated.year,
          reliability: updated.reliability,
          tripsCompleted: updated.trips_completed,
          joinedCommunity: updated.joined_community
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  db.prepare(`
    UPDATE users 
    SET name = COALESCE(?, name),
        hostel = COALESCE(?, hostel),
        phone = COALESCE(?, phone),
        degree = COALESCE(?, degree),
        year = COALESCE(?, year),
        joined_community = COALESCE(?, joined_community)
    WHERE id = ?
  `).run(name, hostel, phone, degree, year, joinedCommunity, userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({
    success: true,
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      hostel: updated.hostel,
      avatar: updated.avatar,
      phone: updated.phone,
      degree: updated.degree,
      year: updated.year,
      reliability: updated.reliability,
      tripsCompleted: updated.trips_completed,
      joinedCommunity: updated.joined_community
    }
  });
});

// 6. Transit Destinations
app.get('/api/destinations', async (req, res) => {
  if (isMongo()) {
    try {
      const rows = await Destination.find().lean();
      if (rows && rows.length > 0) {
        return res.json(rows.map(r => ({
          id: r.id,
          name: r.name,
          icon: r.icon,
          description: r.description,
          popularTime: r.popular_time,
          distance: r.distance,
          avgCabFare: r.avg_cab_fare
        })));
      }
    } catch (err) {
      console.warn('Mongo destinations error:', err.message);
    }
  }

  const rows = db.prepare('SELECT * FROM destinations').all();
  const destinations = rows.map(r => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    description: r.description,
    popularTime: r.popular_time,
    distance: r.distance,
    avgCabFare: r.avg_cab_fare
  }));
  res.json(destinations);
});

// 7. Hostels
app.get('/api/hostels', async (req, res) => {
  if (isMongo()) {
    try {
      const rows = await Hostel.find().lean();
      if (rows && rows.length > 0) {
        return res.json(rows);
      }
    } catch (err) {
      console.warn('Mongo hostels error:', err.message);
    }
  }

  const rows = db.prepare('SELECT * FROM hostels').all();
  res.json(rows);
});

// 8. Create Journey Request & Run Matching Engine
app.post('/api/journeys', async (req, res) => {
  const {
    userId = 'user_main',
    userName,
    destinationId,
    destinationName,
    hostel,
    departureTime,
    date = 'Today',
    flexibility = 15,
    transport = 'Either',
    notes = ''
  } = req.body;

  const effectiveUserId = userId || `user_${Date.now()}`;
  const journeyId = `j_${Date.now()}`;

  if (isMongo()) {
    try {
      let existingUser = await User.findOne({ id: effectiveUserId });
      if (!existingUser) {
        await User.create({
          id: effectiveUserId,
          name: userName || 'TIET Student',
          email: `${effectiveUserId}@thapar.edu`,
          hostel: hostel || 'HA',
          avatar: 'ST',
          phone: '+91 98765 00000',
          degree: 'B.Tech',
          year: '3rd Year',
          reliability: 5.0,
          trips_completed: 0,
          joined_community: null
        });
      }

      await Journey.create({
        id: journeyId,
        user_id: effectiveUserId,
        destination_id: destinationId,
        destination_name: destinationName,
        hostel: hostel || 'HA',
        departure_time: departureTime,
        date,
        flexibility,
        transport,
        notes
      });
    } catch (err) {
      console.warn('Mongo journey save notice:', err.message);
    }
  } else {
    try {
      const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(effectiveUserId);
      if (!existing) {
        db.prepare(`
          INSERT OR IGNORE INTO users (id, name, email, hostel, avatar, phone, degree, year, reliability, trips_completed, joined_community)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          effectiveUserId,
          userName || 'TIET Student',
          `${effectiveUserId}@thapar.edu`,
          hostel || 'HA',
          'ST',
          '+91 98765 00000',
          'B.Tech',
          '3rd Year',
          5.0,
          0,
          null
        );
      }

      db.prepare(`
        INSERT INTO journeys (id, user_id, destination_id, destination_name, hostel, departure_time, date, flexibility, transport, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        journeyId,
        effectiveUserId,
        destinationId,
        destinationName,
        hostel || 'HA',
        departureTime,
        date,
        flexibility,
        transport,
        notes
      );
    } catch (err) {
      console.warn('Journey insert note:', err.message);
    }
  }

  // Run compatibility algorithm against real student candidate journeys from database
  const userReq = {
    destinationId,
    departureTime,
    flexibility: Number(flexibility),
    hostel,
    transport
  };

  let candidateJourneys = [];
  if (isMongo()) {
    try {
      candidateJourneys = await Journey.find({
        destination_id: destinationId,
        user_id: { $ne: effectiveUserId }
      }).lean();
    } catch (e) {
      console.warn('Mongo candidate journeys error:', e.message);
    }
  } else {
    try {
      candidateJourneys = db.prepare('SELECT * FROM journeys WHERE destination_id = ? AND user_id != ?').all(destinationId, effectiveUserId);
    } catch (e) {}
  }

  const matchedStudents = [];
  for (const cj of candidateJourneys) {
    let studentUser = null;
    if (isMongo()) {
      studentUser = await User.findOne({ id: cj.user_id }).lean();
    } else {
      studentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(cj.user_id);
    }

    if (studentUser) {
      const candidateStudent = {
        id: studentUser.id,
        name: studentUser.name,
        avatar: studentUser.avatar,
        email: studentUser.email,
        hostel: cj.hostel || studentUser.hostel,
        destinationId: cj.destination_id,
        departureTime: cj.departure_time,
        flexibility: cj.flexibility || 15,
        transport: cj.transport || 'Either',
        reliability: studentUser.reliability || 5.0,
        trips: studentUser.trips_completed || 0,
        phone: studentUser.phone
      };

      const matchInfo = calculateMatchScore(userReq, candidateStudent);
      if (matchInfo.score > 0) {
        matchedStudents.push({ student: candidateStudent, matchInfo });
      }
    }
  }

  matchedStudents.sort((a, b) => b.matchInfo.score - a.matchInfo.score);

  res.json({
    success: true,
    journey: {
      id: journeyId,
      destinationId,
      destinationName,
      departureTime,
      date,
      flexibility,
      transport,
      notes
    },
    matchedStudents
  });
});

// 9. Groups: List all groups
app.get('/api/groups', async (req, res) => {
  if (isMongo()) {
    try {
      const rows = await Group.find().sort({ created_at: -1 }).lean();
      return res.json(rows.map(formatMongoGroup).filter(Boolean));
    } catch (err) {
      console.warn('Mongo groups list error:', err.message);
    }
  }

  const groupRows = db.prepare('SELECT id FROM groups ORDER BY created_at DESC').all();
  const groups = groupRows.map(r => getFullGroup(r.id)).filter(Boolean);
  res.json(groups);
});

// 9.1 Groups: Clear all groups (Admin/Reset)
app.delete('/api/groups', async (req, res) => {
  if (isMongo()) {
    try {
      await Group.deleteMany({});
    } catch (err) {
      console.warn('Mongo clear groups error:', err.message);
    }
  } else {
    try {
      db.prepare('DELETE FROM group_messages').run();
      db.prepare('DELETE FROM group_members').run();
      db.prepare('DELETE FROM groups').run();
    } catch (err) {
      console.warn('SQLite clear groups error:', err.message);
    }
  }
  io.emit('groups_updated');
  res.json({ success: true, message: 'All groups cleared' });
});

// 10. Groups: Get single group
app.get('/api/groups/:id', async (req, res) => {
  const group = await getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
});

// 11. Groups: Create group
app.post('/api/groups', async (req, res) => {
  const {
    destinationId,
    destinationName,
    departureTime,
    date = 'Today',
    pickupPoint = 'Main Gate (Near Executive Mess)',
    matchScore = 96,
    initialMembers = []
  } = req.body;

  let groupId = `${Math.floor(100 + Math.random() * 900)}`;

  if (isMongo()) {
    try {
      for (let i = 0; i < 20; i++) {
        const candidate = `${Math.floor(100 + Math.random() * 900)}`;
        const existing = await Group.findOne({ id: candidate });
        if (!existing) {
          groupId = candidate;
          break;
        }
      }

      const members = initialMembers.map(m => ({
        id: `gm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        user_id: m.id || m.user_id || 'user_main',
        name: m.name || 'TIET Student',
        avatar: m.avatar || 'ST',
        hostel: m.hostel || 'HA',
        departure_time: m.departureTime || departureTime,
        role: m.role || 'Member',
        phone: m.phone || '+91 98765 00000',
        joined_at: new Date()
      }));

      const greetingTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const chat_messages = [{
        id: `msg_${Date.now()}`,
        sender_id: initialMembers[0]?.id || initialMembers[0]?.user_id || 'user_main',
        sender_name: initialMembers[0]?.name || 'Group Admin',
        avatar: initialMembers[0]?.avatar || 'GA',
        text: `Hey everyone! Group #${groupId} created for ${destinationName}. Let's coordinate pickup time and ride details!`,
        time: greetingTime,
        timestamp: new Date()
      }];

      await Group.create({
        id: groupId,
        destination_id: destinationId,
        destination_name: destinationName,
        departure_time: departureTime,
        date,
        status: 'Open',
        max_members: 4,
        pickup_point: pickupPoint,
        match_score: matchScore,
        members,
        chat_messages
      });

      const created = await getGroup(groupId);
      io.emit('groups_updated');
      return res.json({ success: true, group: created });
    } catch (err) {
      console.error('Mongo group create error:', err.message);
      return res.status(500).json({ error: 'Failed to create group on database' });
    }
  }

  // SQLite fallback
  for (let i = 0; i < 100; i++) {
    const candidate = `${Math.floor(100 + Math.random() * 900)}`;
    const existing = db.prepare('SELECT id FROM groups WHERE id = ?').get(candidate);
    if (!existing) {
      groupId = candidate;
      break;
    }
  }
  if (!groupId) groupId = `${Date.now() % 10000}`;

  db.prepare(`
    INSERT INTO groups (id, destination_id, destination_name, departure_time, date, status, max_members, pickup_point, match_score)
    VALUES (?, ?, ?, ?, ?, 'Open', 4, ?, ?)
  `).run(
    groupId,
    destinationId,
    destinationName,
    departureTime,
    date,
    pickupPoint,
    matchScore
  );

  const insertMember = db.prepare(`
    INSERT INTO group_members (id, group_id, user_id, name, avatar, hostel, departure_time, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const m of initialMembers) {
    insertMember.run(
      `gm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      groupId,
      m.id || m.user_id || 'user_main',
      m.name || 'TIET Student',
      m.avatar || 'ST',
      m.hostel || 'HA',
      m.departureTime || departureTime,
      m.role || 'Member',
      m.phone || '+91 98765 00000'
    );
  }

  db.prepare(`
    INSERT INTO group_messages (id, group_id, sender_id, sender_name, avatar, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `msg_${Date.now()}`,
    groupId,
    initialMembers[0]?.id || initialMembers[0]?.user_id || 'user_main',
    initialMembers[0]?.name || 'Group Admin',
    initialMembers[0]?.avatar || 'GA',
    `Hey everyone! Group #${groupId} created for ${destinationName}. Let's coordinate pickup time and ride details!`
  );

  const created = getFullGroup(groupId);
  io.emit('groups_updated');
  res.json({ success: true, group: created });
});

// 12. Groups: Join group
app.post('/api/groups/:id/join', async (req, res) => {
  const groupId = req.params.id;
  const { userId = 'user_main', name, avatar, hostel, departureTime, phone } = req.body;

  if (isMongo()) {
    try {
      const group = await Group.findOne({ id: groupId });
      if (!group) return res.status(404).json({ error: 'Group not found' });

      if (group.members.length >= (group.max_members || 4)) {
        return res.status(400).json({ error: 'This group is already at maximum capacity (4/4 members).' });
      }

      const alreadyJoined = group.members.some(m => m.user_id === userId);
      if (alreadyJoined) {
        const full = await getGroup(groupId);
        return res.json({ success: true, message: 'Already a member', group: full });
      }

      group.members.push({
        id: `gm_${Date.now()}`,
        user_id: userId,
        name: name || 'Student',
        avatar: avatar || 'ST',
        hostel: hostel || 'Campus',
        departure_time: departureTime || group.departure_time,
        role: 'Member',
        phone: phone || '+91 98765 12345',
        joined_at: new Date()
      });

      const joinTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      group.chat_messages.push({
        id: `m_join_${Date.now()}`,
        sender_id: userId,
        sender_name: name || 'Student',
        avatar: avatar || 'ST',
        text: `Hi everyone! Just joined Group #${groupId}. Excited to share the ride from ${hostel || 'campus'}!`,
        time: joinTime,
        timestamp: new Date()
      });

      await group.save();

      const updatedGroup = await getGroup(groupId);
      io.to(`group_${groupId}`).emit('member_joined', updatedGroup);
      io.emit('groups_updated');
      return res.json({ success: true, group: updatedGroup });
    } catch (err) {
      console.error('Mongo join group error:', err.message);
      return res.status(500).json({ error: 'Failed to join group' });
    }
  }

  // SQLite fallback
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const currentMembers = db.prepare('SELECT * FROM group_members WHERE group_id = ?').all(groupId);
  if (currentMembers.length >= group.max_members) {
    return res.status(400).json({ error: 'This group is already at maximum capacity (4/4 members).' });
  }

  const alreadyJoined = currentMembers.some(m => m.user_id === userId);
  if (alreadyJoined) {
    return res.json({ success: true, message: 'Already a member', group: getFullGroup(groupId) });
  }

  db.prepare(`
    INSERT INTO group_members (id, group_id, user_id, name, avatar, hostel, departure_time, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Member', ?)
  `).run(
    `gm_${Date.now()}`,
    groupId,
    userId,
    name || 'Student',
    avatar || 'ST',
    hostel || 'Campus',
    departureTime || group.departure_time,
    phone || '+91 98765 12345'
  );

  db.prepare(`
    INSERT INTO group_messages (id, group_id, sender_id, sender_name, avatar, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `m_join_${Date.now()}`,
    groupId,
    userId,
    name || 'Student',
    avatar || 'ST',
    `Hi everyone! Just joined Group #${groupId}. Excited to share the ride from ${hostel || 'campus'}!`
  );

  const updatedGroup = getFullGroup(groupId);
  io.to(`group_${groupId}`).emit('member_joined', updatedGroup);
  io.emit('groups_updated');
  res.json({ success: true, group: updatedGroup });
});

// 13. Groups: Leave group
app.post('/api/groups/:id/leave', async (req, res) => {
  const groupId = req.params.id;
  const { userId = 'user_main' } = req.body;

  if (isMongo()) {
    try {
      const group = await Group.findOne({ id: groupId });
      if (group) {
        group.members = group.members.filter(m => m.user_id !== userId);
        await group.save();
      }
      const updatedGroup = await getGroup(groupId);
      io.to(`group_${groupId}`).emit('member_left', updatedGroup);
      io.emit('groups_updated');
      return res.json({ success: true, group: updatedGroup });
    } catch (err) {
      console.error('Mongo leave group error:', err.message);
      return res.status(500).json({ error: 'Failed to leave group' });
    }
  }

  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
  const updatedGroup = getFullGroup(groupId);
  io.to(`group_${groupId}`).emit('member_left', updatedGroup);
  io.emit('groups_updated');
  res.json({ success: true, group: updatedGroup });
});

// 14. Groups: Confirm journey
app.post('/api/groups/:id/confirm', async (req, res) => {
  const groupId = req.params.id;

  if (isMongo()) {
    try {
      const group = await Group.findOne({ id: groupId });
      if (group) {
        group.status = 'Confirmed';
        group.chat_messages.push({
          id: `m_sys_${Date.now()}`,
          sender_id: 'system',
          sender_name: 'System Bot',
          avatar: '🤖',
          text: '🎉 Journey confirmed! All members please be at the pickup point 5 minutes early.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date()
        });
        await group.save();
      }
      const updatedGroup = await getGroup(groupId);
      io.to(`group_${groupId}`).emit('group_confirmed', updatedGroup);
      io.emit('groups_updated');
      return res.json({ success: true, group: updatedGroup });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to confirm group' });
    }
  }

  db.prepare("UPDATE groups SET status = 'Confirmed' WHERE id = ?").run(groupId);

  db.prepare(`
    INSERT INTO group_messages (id, group_id, sender_id, sender_name, avatar, text)
    VALUES (?, ?, 'system', 'System Bot', '🤖', '🎉 Journey confirmed! All members please be at the pickup point 5 minutes early.')
  `).run(`m_sys_${Date.now()}`, groupId);

  const updatedGroup = getFullGroup(groupId);
  io.to(`group_${groupId}`).emit('group_confirmed', updatedGroup);
  io.emit('groups_updated');
  res.json({ success: true, group: updatedGroup });
});

// 15. Groups: Reset dynamic join simulation
app.post('/api/groups/:id/reset', async (req, res) => {
  const groupId = req.params.id;

  if (isMongo()) {
    try {
      const group = await Group.findOne({ id: groupId });
      if (group) {
        group.members = group.members.filter(m => m.user_id !== 's4_simulated');
        await group.save();
      }
      const updatedGroup = await getGroup(groupId);
      io.to(`group_${groupId}`).emit('member_left', updatedGroup);
      io.emit('groups_updated');
      return res.json({ success: true, group: updatedGroup });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reset group' });
    }
  }

  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = 's4_simulated'").run(groupId);
  const updatedGroup = getFullGroup(groupId);
  io.to(`group_${groupId}`).emit('member_left', updatedGroup);
  io.emit('groups_updated');
  res.json({ success: true, group: updatedGroup });
});

// 16. Groups: Messages
app.get('/api/groups/:id/messages', async (req, res) => {
  if (isMongo()) {
    try {
      const group = await Group.findOne({ id: req.params.id }).lean();
      if (!group) return res.json([]);
      const messages = (group.chat_messages || []).map(msg => ({
        id: msg.id,
        senderId: msg.sender_id || msg.senderId,
        senderName: msg.sender_name || msg.senderName,
        avatar: msg.avatar,
        text: msg.text,
        time: msg.time || new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      return res.json(messages);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  const messages = db.prepare(`
    SELECT id, sender_id as senderId, sender_name as senderName, avatar, text,
           time(timestamp, 'localtime') as time
    FROM group_messages WHERE group_id = ? ORDER BY timestamp ASC
  `).all(req.params.id);
  res.json(messages);
});

app.post('/api/groups/:id/messages', async (req, res) => {
  const groupId = req.params.id;
  const { senderId = 'user_main', senderName = 'Kartik Arora', avatar = 'KA', text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (isMongo()) {
    try {
      const group = await Group.findOne({ id: groupId });
      if (!group) return res.status(404).json({ error: 'Group not found' });

      const msgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      group.chat_messages.push({
        id: `m_${Date.now()}`,
        sender_id: senderId,
        sender_name: senderName,
        avatar,
        text: text.trim(),
        time: msgTime,
        timestamp: new Date()
      });
      await group.save();

      const messages = group.chat_messages.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id || msg.senderId,
        senderName: msg.sender_name || msg.senderName,
        avatar: msg.avatar,
        text: msg.text,
        time: msg.time || new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      io.to(`group_${groupId}`).emit('new_message', { groupId, messages });
      return res.json({ success: true, messages });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  const msgId = `m_${Date.now()}`;
  db.prepare(`
    INSERT INTO group_messages (id, group_id, sender_id, sender_name, avatar, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(msgId, groupId, senderId, senderName, avatar, text.trim());

  const messages = db.prepare(`
    SELECT id, sender_id as senderId, sender_name as senderName, avatar, text,
           time(timestamp, 'localtime') as time
    FROM group_messages WHERE group_id = ? ORDER BY timestamp ASC
  `).all(groupId);

  io.to(`group_${groupId}`).emit('new_message', { groupId, messages });
  res.json({ success: true, messages });
});

// 17. Fare split calculation utility
app.post('/api/groups/:id/fare-split', async (req, res) => {
  const groupId = req.params.id;
  const { totalAmount = 1400, tip = 0 } = req.body;

  const group = await getGroup(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const numMembers = Math.max(1, group.members.length);
  const total = Number(totalAmount) + Number(tip);
  const perPerson = Math.ceil(total / numMembers);

  res.json({
    totalFare: total,
    passengers: numMembers,
    perPersonFare: perPerson,
    savingsVsSolo: total - perPerson,
    breakdown: group.members.map(m => ({
      name: m.name,
      hostel: m.hostel,
      share: perPerson
    }))
  });
});

// 18. Communities: List all
app.get('/api/communities', async (req, res) => {
  if (isMongo()) {
    try {
      const rows = await Community.find().sort({ members_count: -1 }).lean();
      if (rows && rows.length > 0) {
        return res.json(rows.map(r => ({
          id: r.id,
          name: r.name,
          state: r.state,
          icon: r.icon,
          membersCount: r.members_count,
          distanceFromThapar: r.distance_from_thapar,
          popularTransport: r.popular_transport,
          description: r.description,
          tags: Array.isArray(r.tags) ? r.tags : (r.tags || '').split(',').map(t => t.trim())
        })));
      }
    } catch (err) {
      console.warn('Mongo communities error:', err.message);
    }
  }

  const rows = db.prepare('SELECT * FROM communities ORDER BY members_count DESC').all();
  const communities = rows.map(r => ({
    id: r.id,
    name: r.name,
    state: r.state,
    icon: r.icon,
    membersCount: r.members_count,
    distanceFromThapar: r.distance_from_thapar,
    popularTransport: r.popular_transport,
    description: r.description,
    tags: r.tags.split(',').map(t => t.trim())
  }));
  res.json(communities);
});

// 19. Communities: Join (Single-Community Rule Enforcement)
app.post('/api/communities/:id/join', async (req, res) => {
  const communityId = req.params.id;
  const { userId = 'user_main' } = req.body;

  if (isMongo()) {
    try {
      const target = await Community.findOne({ id: communityId });
      if (!target) return res.status(404).json({ error: 'Community not found' });

      const user = await User.findOne({ id: userId });
      if (user && user.joined_community && user.joined_community !== communityId) {
        const curr = await Community.findOne({ id: user.joined_community });
        return res.status(400).json({
          error: `Single-Community Rule: You are already a registered member of ${curr?.name || 'another'} Community. Please leave your current hometown community first.`
        });
      }

      await User.updateOne({ id: userId }, { joined_community: communityId });
      await Community.updateOne({ id: communityId }, { $inc: { members_count: 1 } });

      return res.json({ success: true, joinedCommunity: communityId, communityName: target.name });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to join community' });
    }
  }

  const target = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
  if (!target) return res.status(404).json({ error: 'Community not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (user && user.joined_community && user.joined_community !== communityId) {
    const curr = db.prepare('SELECT name FROM communities WHERE id = ?').get(user.joined_community);
    return res.status(400).json({
      error: `Single-Community Rule: You are already a registered member of ${curr?.name || 'another'} Community. Please leave your current hometown community first.`
    });
  }

  db.prepare('UPDATE users SET joined_community = ? WHERE id = ?').run(communityId, userId);
  db.prepare('UPDATE communities SET members_count = members_count + 1 WHERE id = ?').run(communityId);

  res.json({ success: true, joinedCommunity: communityId, communityName: target.name });
});

// 20. Communities: Leave
app.post('/api/communities/:id/leave', async (req, res) => {
  const communityId = req.params.id;
  const { userId = 'user_main' } = req.body;

  if (isMongo()) {
    try {
      await User.updateOne({ id: userId, joined_community: communityId }, { $unset: { joined_community: 1 } });
      await Community.updateOne({ id: communityId, members_count: { $gt: 0 } }, { $inc: { members_count: -1 } });
      return res.json({ success: true, message: 'Left community successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to leave community' });
    }
  }

  db.prepare('UPDATE users SET joined_community = NULL WHERE id = ? AND joined_community = ?').run(userId, communityId);
  db.prepare('UPDATE communities SET members_count = MAX(0, members_count - 1) WHERE id = ?').run(communityId);

  res.json({ success: true, message: 'Left community successfully' });
});

// 21. Communities: Posts & Discussion Notice Board
app.get('/api/communities/:id/posts', async (req, res) => {
  const communityId = req.params.id;

  if (isMongo()) {
    try {
      const posts = await CommunityPost.find({
        $or: [{ community_id: communityId }, { communityId: communityId }]
      }).sort({ created_at: -1 }).lean();

      const enriched = posts.map(p => {
        const comments = (p.comments || []).map(c => ({
          id: c.id,
          postId: c.post_id || c.postId || p.id,
          authorId: c.author_id || c.authorId,
          author: c.author || c.author_name,
          authorAvatar: c.authorAvatar || c.author_avatar,
          authorHostel: c.authorHostel || c.author_hostel,
          text: c.text || c.content,
          createdAt: c.createdAt || c.created_at
        }));

        return {
          id: p.id,
          communityId: p.community_id || p.communityId,
          authorId: p.author_id || p.authorId,
          author: p.author || p.author_name,
          authorAvatar: p.authorAvatar || p.author_avatar,
          authorHostel: p.authorHostel || p.author_hostel,
          category: p.category,
          title: p.title,
          content: p.content,
          likes: p.likes || 0,
          timeAgo: 'Recently',
          repliesCount: comments.length,
          comments: comments
        };
      });

      return res.json(enriched);
    } catch (err) {
      console.warn('Mongo posts error:', err.message);
    }
  }

  // SQLite fallback
  const posts = db.prepare(`
    SELECT id, community_id as communityId, author_id as authorId, author_name as author,
           author_avatar as authorAvatar, author_hostel as authorHostel, category, title,
           content, likes, datetime(created_at, 'localtime') as createdAt
    FROM community_posts
    WHERE community_id = ?
    ORDER BY created_at DESC
  `).all(communityId);

  const getComments = db.prepare(`
    SELECT id, post_id as postId, author_id as authorId, author_name as author,
           author_avatar as authorAvatar, author_hostel as authorHostel, text,
           datetime(created_at, 'localtime') as createdAt
    FROM post_comments
    WHERE post_id = ?
    ORDER BY created_at ASC
  `);

  const enrichedPosts = posts.map(p => {
    const comments = getComments.all(p.id);
    return {
      ...p,
      timeAgo: 'Recently',
      repliesCount: comments.length,
      comments: comments
    };
  });

  res.json(enrichedPosts);
});

// 22. Communities: Create Post
app.post('/api/communities/:id/posts', async (req, res) => {
  const communityId = req.params.id;
  const {
    authorId = 'user_main',
    authorName = 'Kartik Arora',
    authorAvatar = 'KA',
    authorHostel = 'Hostel H3',
    category = 'Ride Sharing',
    title,
    content
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const postId = `post_${Date.now()}`;

  if (isMongo()) {
    try {
      await CommunityPost.create({
        id: postId,
        community_id: communityId,
        communityId: communityId,
        author_id: authorId,
        authorId: authorId,
        author: authorName,
        author_name: authorName,
        author_avatar: authorAvatar,
        authorAvatar: authorAvatar,
        author_hostel: authorHostel,
        authorHostel: authorHostel,
        category,
        title: title.trim(),
        content: content.trim(),
        likes: 0,
        comments: []
      });

      return res.json({
        success: true,
        post: {
          id: postId,
          communityId,
          author: authorName,
          authorAvatar,
          authorHostel,
          category,
          title: title.trim(),
          content: content.trim(),
          likes: 0,
          timeAgo: 'Just now',
          repliesCount: 0,
          comments: []
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create post' });
    }
  }

  db.prepare(`
    INSERT INTO community_posts (id, community_id, author_id, author_name, author_avatar, author_hostel, category, title, content, likes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    postId,
    communityId,
    authorId,
    authorName,
    authorAvatar,
    authorHostel,
    category,
    title.trim(),
    content.trim()
  );

  res.json({
    success: true,
    post: {
      id: postId,
      communityId,
      author: authorName,
      authorAvatar,
      authorHostel,
      category,
      title: title.trim(),
      content: content.trim(),
      likes: 0,
      timeAgo: 'Just now',
      repliesCount: 0,
      comments: []
    }
  });
});

// 23. Communities: Like Post
app.post('/api/communities/posts/:postId/like', async (req, res) => {
  const postId = req.params.postId;

  if (isMongo()) {
    try {
      const updated = await CommunityPost.findOneAndUpdate({ id: postId }, { $inc: { likes: 1 } }, { returnDocument: 'after' });
      return res.json({ success: true, likes: updated?.likes || 0 });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to like post' });
    }
  }

  db.prepare('UPDATE community_posts SET likes = likes + 1 WHERE id = ?').run(postId);
  const post = db.prepare('SELECT likes FROM community_posts WHERE id = ?').get(postId);
  res.json({ success: true, likes: post?.likes || 0 });
});

// 24. Communities: Comment on Post
app.post('/api/communities/posts/:postId/comments', async (req, res) => {
  const postId = req.params.postId;
  const {
    authorId = 'user_main',
    authorName = 'Kartik Arora',
    authorAvatar = 'KA',
    authorHostel = 'Hostel H3',
    text
  } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const commentId = `comm_${Date.now()}`;

  if (isMongo()) {
    try {
      const post = await CommunityPost.findOne({ id: postId });
      if (!post) return res.status(404).json({ error: 'Post not found' });

      const newComment = {
        id: commentId,
        postId: postId,
        authorId: authorId,
        author: authorName,
        authorAvatar: authorAvatar,
        authorHostel: authorHostel,
        text: text.trim(),
        createdAt: new Date()
      };

      post.comments.push(newComment);
      await post.save();

      const comments = post.comments.map(c => ({
        id: c.id,
        postId: c.postId || c.post_id || postId,
        authorId: c.authorId || c.author_id,
        author: c.author || c.author_name,
        authorAvatar: c.authorAvatar || c.author_avatar,
        authorHostel: c.authorHostel || c.author_hostel,
        text: c.text || c.content,
        createdAt: c.createdAt || c.created_at
      }));

      return res.json({ success: true, comments, count: comments.length });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  db.prepare(`
    INSERT INTO post_comments (id, post_id, author_id, author_name, author_avatar, author_hostel, text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    commentId,
    postId,
    authorId,
    authorName,
    authorAvatar,
    authorHostel,
    text.trim()
  );

  const comments = db.prepare(`
    SELECT id, post_id as postId, author_id as authorId, author_name as author,
           author_avatar as authorAvatar, author_hostel as authorHostel, text,
           datetime(created_at, 'localtime') as createdAt
    FROM post_comments
    WHERE post_id = ?
    ORDER BY created_at ASC
  `).all(postId);

  res.json({ success: true, comments, count: comments.length });
});

// 25. Platform Live Statistics
app.get('/api/stats', async (req, res) => {
  if (isMongo()) {
    try {
      const totalUsers = await User.countDocuments();
      const activeGroups = await Group.countDocuments();
      const userAgg = await User.aggregate([{ $group: { _id: null, totalTrips: { $sum: '$trips_completed' } } }]);
      const totalTrips = userAgg[0]?.totalTrips || 0;
      const commAgg = await Community.aggregate([{ $group: { _id: null, totalMembers: { $sum: '$members_count' } } }]);
      const communityMembers = commAgg[0]?.totalMembers || 0;
      const totalMoneySaved = totalTrips * 900;

      return res.json({
        totalUsers,
        activeGroups,
        totalTrips,
        communityMembers,
        totalMoneySaved: `₹${totalMoneySaved.toLocaleString('en-IN')}`
      });
    } catch (err) {
      console.warn('Mongo stats error:', err.message);
    }
  }

  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const activeGroups = db.prepare('SELECT COUNT(*) as c FROM groups').get().c;
  const totalTrips = db.prepare('SELECT SUM(trips_completed) as s FROM users').get().s || 0;
  const communityMembers = db.prepare('SELECT SUM(members_count) as s FROM communities').get().s || 0;
  const totalMoneySaved = totalTrips * 900;

  res.json({
    totalUsers,
    activeGroups,
    totalTrips,
    communityMembers,
    totalMoneySaved: `₹${totalMoneySaved.toLocaleString('en-IN')}`
  });
});

// Serve compiled React frontend in production
app.use(express.static(distPath));

// Fallback all non-API GET requests to React's index.html (SPA client routing)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

// Start Express + Socket.io Server
async function startServer() {
  // Initialize SQLite fallback database
  initDatabase();

  // Connect to MongoDB Atlas Cloud if MONGODB_URI is provided
  await connectMongoDB();

  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Thapar Journey Connect API Server running!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`⚡ WebSockets: Socket.io Enabled`);
    if (isMongo()) {
      console.log(`💾 Database: MongoDB Atlas Cloud (thapar_journey)`);
    } else {
      console.log(`💾 Database: SQLite (thapar_journey.db)`);
    }
    console.log(`===============================================`);
  });
}

startServer();
