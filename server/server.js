import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './db.js';
import { calculateMatchScore } from './matchingEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

// Initialize SQLite database & default records
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Standard mock student candidate pool for matching algorithm
const POOL_STUDENTS = [
  {
    id: 's1',
    name: 'Rahul Sharma',
    avatar: 'RS',
    email: 'rsharma_be22@thapar.edu',
    hostel: 'H3',
    destinationId: 'railway',
    departureTime: '17:05',
    flexibility: 15,
    transport: 'Shared Cab',
    reliability: 4.9,
    trips: 14,
    phone: '+91 98765 43210'
  },
  {
    id: 's2',
    name: 'Aman Verma',
    avatar: 'AV',
    email: 'averma_be22@thapar.edu',
    hostel: 'H4',
    destinationId: 'railway',
    departureTime: '17:10',
    flexibility: 15,
    transport: 'Shared Auto',
    reliability: 4.8,
    trips: 9,
    phone: '+91 98123 45678'
  },
  {
    id: 's3',
    name: 'Simran Kaur',
    avatar: 'SK',
    email: 'skaur_be23@thapar.edu',
    hostel: 'H4',
    destinationId: 'railway',
    departureTime: '17:15',
    flexibility: 20,
    transport: 'Either',
    reliability: 4.7,
    trips: 11,
    phone: '+91 97654 32109'
  },
  {
    id: 's4',
    name: 'Arjun Gupta',
    avatar: 'AG',
    email: 'agupta_be22@thapar.edu',
    hostel: 'H7',
    destinationId: 'railway',
    departureTime: '17:20',
    flexibility: 15,
    transport: 'Shared Cab',
    reliability: 4.9,
    trips: 18,
    phone: '+91 99887 76655'
  },
  {
    id: 's5',
    name: 'Neha Patel',
    avatar: 'NP',
    email: 'npatel_be23@thapar.edu',
    hostel: 'H8',
    destinationId: 'railway',
    departureTime: '17:25',
    flexibility: 30,
    transport: 'Either',
    reliability: 4.6,
    trips: 5,
    phone: '+91 98712 34567'
  },
  {
    id: 's6',
    name: 'Karan Mehra',
    avatar: 'KM',
    email: 'kmehra_be22@thapar.edu',
    hostel: 'H2',
    destinationId: 'chd_airport',
    departureTime: '06:30',
    flexibility: 20,
    transport: 'Shared Cab',
    reliability: 4.9,
    trips: 16,
    phone: '+91 99112 33445'
  },
  {
    id: 's7',
    name: 'Vikas Singla',
    avatar: 'VS',
    email: 'vsingla_be21@thapar.edu',
    hostel: 'H10',
    destinationId: 'del_airport',
    departureTime: '22:00',
    flexibility: 30,
    transport: 'Shared Cab',
    reliability: 4.8,
    trips: 22,
    phone: '+91 98888 11223'
  },
  {
    id: 's8',
    name: 'Pooja Roy',
    avatar: 'PR',
    email: 'proy_be23@thapar.edu',
    hostel: 'Hostel D',
    destinationId: 'bus_stand',
    departureTime: '08:00',
    flexibility: 15,
    transport: 'Shared Auto',
    reliability: 4.9,
    trips: 10,
    phone: '+91 97777 44332'
  }
];

// Helper to assemble full group object with members & messages
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

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Thapar Journey Connect API', timestamp: new Date() });
});

// 2. Authentication: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim().endsWith('@thapar.edu')) {
    return res.status(400).json({ error: 'Only @thapar.edu email addresses are allowed.' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Please enter your password.' });
  }

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

  if (!user) {
    // Auto-create user for demo/testing convenience if valid @thapar.edu
    const displayName = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
    const userId = `user_${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, name, email, hostel, avatar, phone, degree, year, reliability, trips_completed, joined_community)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      displayName,
      email.trim().toLowerCase(),
      'H3',
      initials,
      '+91 98765 00000',
      'B.Tech Computer Engineering',
      '3rd Year (Batch of 2026)',
      4.8,
      12,
      'jal'
    );

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
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
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, hostel, phone, degree, year } = req.body;

  if (!email || !email.trim().endsWith('@thapar.edu')) {
    return res.status(400).json({ error: 'Only official @thapar.edu emails are allowed.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this Thapar email already exists. Please login.' });
  }

  const displayName = name?.trim() || email.split('@')[0].replace('.', ' ');
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
  const userId = `user_${Date.now()}`;

  db.prepare(`
    INSERT INTO users (id, name, email, hostel, avatar, phone, degree, year, reliability, trips_completed, joined_community)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    displayName,
    email.trim().toLowerCase(),
    hostel || 'H3',
    initials,
    phone || '+91 98765 43210',
    degree || 'B.Tech Computer Engineering',
    year || '3rd Year (Batch of 2026)',
    5.0,
    1,
    'jal'
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

// 4. Current user profile
app.get('/api/auth/me', (req, res) => {
  const userId = req.query.userId || 'user_main';
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
app.put('/api/auth/profile', (req, res) => {
  const { id, name, hostel, phone, degree, year, joinedCommunity } = req.body;
  const userId = id || 'user_main';

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
app.get('/api/destinations', (req, res) => {
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
app.get('/api/hostels', (req, res) => {
  const rows = db.prepare('SELECT * FROM hostels').all();
  res.json(rows);
});

// 8. Create Journey Request & Run Matching Engine
app.post('/api/journeys', (req, res) => {
  const {
    userId = 'user_main',
    destinationId,
    destinationName,
    hostel,
    departureTime,
    date = 'Today',
    flexibility = 15,
    transport = 'Either',
    notes = ''
  } = req.body;

  const journeyId = `j_${Date.now()}`;

  db.prepare(`
    INSERT INTO journeys (id, user_id, destination_id, destination_name, hostel, departure_time, date, flexibility, transport, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    journeyId,
    userId,
    destinationId,
    destinationName,
    hostel,
    departureTime,
    date,
    flexibility,
    transport,
    notes
  );

  // Run compatibility algorithm against student candidate pool
  const userReq = {
    destinationId,
    departureTime,
    flexibility: Number(flexibility),
    hostel,
    transport
  };

  const matchedStudents = POOL_STUDENTS
    .map((student) => {
      const matchInfo = calculateMatchScore(userReq, student);
      return { student, matchInfo };
    })
    .filter((item) => item.matchInfo.score > 0)
    .sort((a, b) => b.matchInfo.score - a.matchInfo.score);

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
app.get('/api/groups', (req, res) => {
  const groupRows = db.prepare('SELECT id FROM groups ORDER BY created_at DESC').all();
  const groups = groupRows.map(r => getFullGroup(r.id)).filter(Boolean);
  res.json(groups);
});

// 10. Groups: Get single group
app.get('/api/groups/:id', (req, res) => {
  const group = getFullGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
});

// 11. Groups: Create group
app.post('/api/groups', (req, res) => {
  const {
    destinationId,
    destinationName,
    departureTime,
    date = 'Today',
    pickupPoint = 'Main Gate (Near Executive Mess)',
    matchScore = 96,
    initialMembers = []
  } = req.body;

  const groupId = `${Math.floor(100 + Math.random() * 900)}`;

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
      m.id || 'user_main',
      m.name,
      m.avatar || 'ST',
      m.hostel,
      m.departureTime || departureTime,
      m.role || 'Member',
      m.phone || '+91 98765 00000'
    );
  }

  // Add initial greeting message
  db.prepare(`
    INSERT INTO group_messages (id, group_id, sender_id, sender_name, avatar, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `msg_${Date.now()}`,
    groupId,
    initialMembers[0]?.id || 'user_main',
    initialMembers[0]?.name || 'Group Admin',
    initialMembers[0]?.avatar || 'GA',
    `Hey everyone! Group #${groupId} created for ${destinationName}. Let's coordinate pickup time and ride details!`
  );

  const created = getFullGroup(groupId);
  res.json({ success: true, group: created });
});

// 12. Groups: Join group
app.post('/api/groups/:id/join', (req, res) => {
  const groupId = req.params.id;
  const { userId = 'user_main', name, avatar, hostel, departureTime, phone } = req.body;

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

  // Add automated join message
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
  res.json({ success: true, group: updatedGroup });
});

// 13. Groups: Leave group
app.post('/api/groups/:id/leave', (req, res) => {
  const groupId = req.params.id;
  const { userId = 'user_main' } = req.body;

  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
  res.json({ success: true, group: getFullGroup(groupId) });
});

// 14. Groups: Confirm journey
app.post('/api/groups/:id/confirm', (req, res) => {
  const groupId = req.params.id;
  db.prepare("UPDATE groups SET status = 'Confirmed' WHERE id = ?").run(groupId);

  db.prepare(`
    INSERT INTO group_messages (id, group_id, sender_id, sender_name, avatar, text)
    VALUES (?, ?, 'system', 'System Bot', '🤖', '🎉 Journey confirmed! All members please be at the pickup point 5 minutes early.')
  `).run(`m_sys_${Date.now()}`, groupId);

  res.json({ success: true, group: getFullGroup(groupId) });
});

// 15. Groups: Reset dynamic join simulation
app.post('/api/groups/:id/reset', (req, res) => {
  const groupId = req.params.id;
  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = 's4_simulated'").run(groupId);
  res.json({ success: true, group: getFullGroup(groupId) });
});

// 16. Groups: Messages
app.get('/api/groups/:id/messages', (req, res) => {
  const messages = db.prepare(`
    SELECT id, sender_id as senderId, sender_name as senderName, avatar, text,
           time(timestamp, 'localtime') as time
    FROM group_messages WHERE group_id = ? ORDER BY timestamp ASC
  `).all(req.params.id);
  res.json(messages);
});

app.post('/api/groups/:id/messages', (req, res) => {
  const groupId = req.params.id;
  const { senderId = 'user_main', senderName = 'Kartik Arora', avatar = 'KA', text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
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

  res.json({ success: true, messages });
});

// 17. Fare split calculation utility
app.post('/api/groups/:id/fare-split', (req, res) => {
  const groupId = req.params.id;
  const { totalAmount = 1400, tip = 0 } = req.body;

  const group = getFullGroup(groupId);
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
app.get('/api/communities', (req, res) => {
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
app.post('/api/communities/:id/join', (req, res) => {
  const communityId = req.params.id;
  const { userId = 'user_main' } = req.body;

  const target = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
  if (!target) return res.status(404).json({ error: 'Community not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (user && user.joined_community && user.joined_community !== communityId) {
    const curr = db.prepare('SELECT name FROM communities WHERE id = ?').get(user.joined_community);
    return res.status(400).json({
      error: `Single-Community Rule: You are already a registered member of ${curr?.name || 'another'} Community. Please leave your current hometown community first.`
    });
  }

  // Update user joined_community
  db.prepare('UPDATE users SET joined_community = ? WHERE id = ?').run(communityId, userId);
  // Increment members count
  db.prepare('UPDATE communities SET members_count = members_count + 1 WHERE id = ?').run(communityId);

  res.json({ success: true, joinedCommunity: communityId, communityName: target.name });
});

// 20. Communities: Leave
app.post('/api/communities/:id/leave', (req, res) => {
  const communityId = req.params.id;
  const { userId = 'user_main' } = req.body;

  db.prepare('UPDATE users SET joined_community = NULL WHERE id = ? AND joined_community = ?').run(userId, communityId);
  db.prepare('UPDATE communities SET members_count = MAX(0, members_count - 1) WHERE id = ?').run(communityId);

  res.json({ success: true, message: 'Left community successfully' });
});

// 21. Communities: Posts & Discussion Notice Board
app.get('/api/communities/:id/posts', (req, res) => {
  const communityId = req.params.id;
  const posts = db.prepare(`
    SELECT id, community_id as communityId, author_id as authorId, author_name as author,
           author_avatar as authorAvatar, author_hostel as authorHostel, category, title,
           content, likes, datetime(created_at, 'localtime') as createdAt
    FROM community_posts
    WHERE community_id = ?
    ORDER BY created_at DESC
  `).all(communityId);

  // Fetch comments for each post
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
app.post('/api/communities/:id/posts', (req, res) => {
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
app.post('/api/communities/posts/:postId/like', (req, res) => {
  const postId = req.params.postId;
  db.prepare('UPDATE community_posts SET likes = likes + 1 WHERE id = ?').run(postId);
  const post = db.prepare('SELECT likes FROM community_posts WHERE id = ?').get(postId);
  res.json({ success: true, likes: post?.likes || 0 });
});

// 24. Communities: Comment on Post
app.post('/api/communities/posts/:postId/comments', (req, res) => {
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
app.get('/api/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c + POOL_STUDENTS.length;
  const activeGroups = db.prepare('SELECT COUNT(*) as c FROM groups').get().c;
  const totalTrips = db.prepare('SELECT SUM(trips_completed) as s FROM users').get().s || 84;
  const communityMembers = db.prepare('SELECT SUM(members_count) as s FROM communities').get().s || 1174;
  
  // Approximate money saved (average ₹900 saved per ride share vs solo cab)
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

// Start Express Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Thapar Journey Connect API Server running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`💾 Database: SQLite (thapar_journey.db)`);
  console.log(`===============================================`);
});
