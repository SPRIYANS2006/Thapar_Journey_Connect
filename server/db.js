import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'thapar_journey.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      hostel TEXT NOT NULL,
      avatar TEXT NOT NULL,
      phone TEXT,
      degree TEXT DEFAULT 'B.Tech Computer Engineering',
      year TEXT DEFAULT '3rd Year (Batch of 2026)',
      reliability REAL DEFAULT 4.8,
      trips_completed INTEGER DEFAULT 12,
      joined_community TEXT DEFAULT 'jal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT NOT NULL,
      popular_time TEXT NOT NULL,
      distance TEXT NOT NULL,
      avg_cab_fare TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hostels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      cluster TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journeys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      destination_id TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      hostel TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      date TEXT NOT NULL,
      flexibility INTEGER DEFAULT 15,
      transport TEXT DEFAULT 'Either',
      notes TEXT,
      status TEXT DEFAULT 'Searching',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      destination_id TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'Open',
      max_members INTEGER DEFAULT 4,
      pickup_point TEXT NOT NULL,
      match_score INTEGER DEFAULT 95,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      hostel TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      role TEXT DEFAULT 'Member',
      phone TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      icon TEXT NOT NULL,
      members_count INTEGER DEFAULT 0,
      distance_from_thapar TEXT NOT NULL,
      popular_transport TEXT NOT NULL,
      description TEXT NOT NULL,
      tags TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT NOT NULL,
      author_hostel TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(community_id) REFERENCES communities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT NOT NULL,
      author_hostel TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES community_posts(id) ON DELETE CASCADE
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  // 1. Seed Destinations
  const destCount = db.prepare('SELECT COUNT(*) as c FROM destinations').get().c;
  if (destCount === 0) {
    const insertDest = db.prepare(`
      INSERT INTO destinations (id, name, icon, description, popular_time, distance, avg_cab_fare)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const destinations = [
      {
        id: 'railway',
        name: 'Patiala Railway Station',
        icon: '🚆',
        description: 'Find students travelling from campus to Patiala Railway Station.',
        popular_time: 'Peak: 4:00 PM - 8:00 PM',
        distance: '8.5 km from Main Gate',
        avg_cab_fare: '₹150 - ₹200 total'
      },
      {
        id: 'bus_stand',
        name: 'Patiala Bus Stand',
        icon: '🚌',
        description: 'Find students travelling from campus to Patiala Bus Stand for intercity buses.',
        popular_time: 'Peak: 6:00 AM - 10:00 AM',
        distance: '6.2 km from Main Gate',
        avg_cab_fare: '₹120 - ₹160 total'
      },
      {
        id: 'chd_airport',
        name: 'Chandigarh Airport',
        icon: '✈️',
        description: 'Coordinate rides for flights departing from Shaheed Bhagat Singh Airport.',
        popular_time: 'Peak: Morning & Evening Flights',
        distance: '62 km from Main Gate',
        avg_cab_fare: '₹1,200 - ₹1,500 total'
      },
      {
        id: 'del_airport',
        name: 'Delhi Airport',
        icon: '✈️',
        description: 'Connect with students taking long-distance cabs or trains to IGI Airport.',
        popular_time: 'Peak: Overnight & Early Morning',
        distance: '250 km from Main Gate',
        avg_cab_fare: '₹4,500 - ₹5,500 total'
      }
    ];

    for (const d of destinations) {
      insertDest.run(d.id, d.name, d.icon, d.description, d.popular_time, d.distance, d.avg_cab_fare);
    }
  }

  // 2. Seed Hostels
  const hostelCount = db.prepare('SELECT COUNT(*) as c FROM hostels').get().c;
  if (hostelCount === 0) {
    const insertHostel = db.prepare(`
      INSERT INTO hostels (id, name, gender, cluster) VALUES (?, ?, ?, ?)
    `);

    const hostels = [
      { id: 'H1', name: 'Hostel H1', gender: 'Boys', cluster: 'Quad A' },
      { id: 'H2', name: 'Hostel H2', gender: 'Boys', cluster: 'Quad A' },
      { id: 'H3', name: 'Hostel H3', gender: 'Boys', cluster: 'Quad A' },
      { id: 'H4', name: 'Hostel H4', gender: 'Boys', cluster: 'Quad A' },
      { id: 'H5', name: 'Hostel H5', gender: 'Boys', cluster: 'Quad B' },
      { id: 'H6', name: 'Hostel H6', gender: 'Boys', cluster: 'Quad B' },
      { id: 'H7', name: 'Hostel H7', gender: 'Boys', cluster: 'Quad B' },
      { id: 'H8', name: 'Hostel H8', gender: 'Boys', cluster: 'Quad B' },
      { id: 'H9', name: 'Hostel H9', gender: 'Boys', cluster: 'Quad C' },
      { id: 'H10', name: 'Hostel H10', gender: 'Boys', cluster: 'Quad C' },
      { id: 'H11', name: 'Hostel H11', gender: 'Boys', cluster: 'Quad C' },
      { id: 'H12', name: 'Hostel H12', gender: 'Boys', cluster: 'Quad C' },
      { id: 'H13', name: 'Hostel H13', gender: 'Boys', cluster: 'Quad C' },
      { id: 'H14', name: 'Hostel H14', gender: 'Boys', cluster: 'Quad D' },
      { id: 'H15', name: 'Hostel H15', gender: 'Boys', cluster: 'Quad D' },
      { id: 'HA', name: 'Hostel A', gender: 'Boys', cluster: 'Quad D' },
      { id: 'HB', name: 'Hostel B', gender: 'Boys', cluster: 'Quad D' },
      { id: 'HC', name: 'Hostel C', gender: 'Boys', cluster: 'Quad D' },
      { id: 'HD', name: 'Hostel D', gender: 'Girls', cluster: 'Girls Quad 1' },
      { id: 'HE', name: 'Hostel E', gender: 'Girls', cluster: 'Girls Quad 1' },
      { id: 'HF', name: 'Hostel F', gender: 'Girls', cluster: 'Girls Quad 1' },
      { id: 'HG', name: 'Hostel G', gender: 'Girls', cluster: 'Girls Quad 1' },
      { id: 'HI', name: 'Hostel I', gender: 'Girls', cluster: 'Girls Quad 1' },
      { id: 'HJ', name: 'Hostel J', gender: 'Girls', cluster: 'Girls Quad 1' },
      { id: 'HK', name: 'Hostel K', gender: 'Girls', cluster: 'Girls Quad 2' },
      { id: 'HL', name: 'Hostel L', gender: 'Girls', cluster: 'Girls Quad 2' },
      { id: 'HM', name: 'Hostel M', gender: 'Girls', cluster: 'Girls Quad 2' },
      { id: 'HN', name: 'Hostel N', gender: 'Girls', cluster: 'Girls Quad 2' },
      { id: 'HQ', name: 'Hostel Q', gender: 'Girls', cluster: 'Girls Quad 2' },
      { id: 'PG', name: 'PG Hostel', gender: 'Co-ed', cluster: 'PG Quad' },
      { id: 'FRG', name: 'FRG Apartments', gender: 'Co-ed', cluster: 'PG Quad' }
    ];

    for (const h of hostels) {
      insertHostel.run(h.id, h.name, h.gender, h.cluster);
    }
  }

  // 3. Seed Default User (Kartik Arora)
  const defaultUser = db.prepare('SELECT * FROM users WHERE email = ?').get('student@thapar.edu');
  if (!defaultUser) {
    db.prepare(`
      INSERT INTO users (id, name, email, hostel, avatar, phone, degree, year, reliability, trips_completed, joined_community)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'user_main',
      'Kartik Arora',
      'student@thapar.edu',
      'H3',
      'KA',
      '+91 98765 12345',
      'B.Tech Computer Engineering',
      '3rd Year (Batch of 2026)',
      4.8,
      12,
      'jal'
    );
  }

  // 4. Seed Communities
  const commCount = db.prepare('SELECT COUNT(*) as c FROM communities').get().c;
  if (commCount === 0) {
    const insertComm = db.prepare(`
      INSERT INTO communities (id, name, state, icon, members_count, distance_from_thapar, popular_transport, description, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const communities = [
      {
        id: 'jal',
        name: 'Jalandhar',
        state: 'Punjab',
        icon: '🏛️',
        members_count: 142,
        distance_from_thapar: '145 km',
        popular_transport: 'GT Road Cabs, Intercity Trains',
        description: 'Active hub for students from Jalandhar, Phagwara & Doaba region. Regular Friday/Sunday carpools.',
        tags: 'Weekly Commuters, Cab Sharing, GT Road'
      },
      {
        id: 'del',
        name: 'Delhi NCR',
        state: 'Delhi / NCR',
        icon: '🚇',
        members_count: 310,
        distance_from_thapar: '250 km',
        popular_transport: 'Shatabdi Express, Long Cabs, Volvos',
        description: 'Largest student origin community covering South Delhi, Noida, Gurgaon & West Delhi.',
        tags: 'Holiday Rush, Shatabdi Cohort, IGI Airport'
      },
      {
        id: 'ldh',
        name: 'Ludhiana',
        state: 'Punjab',
        icon: '🏭',
        members_count: 185,
        distance_from_thapar: '95 km',
        popular_transport: 'Direct Cabs, Passenger Trains',
        description: 'Fastest commute corridor. Daily & weekend travelers sharing cabs via Nabha/Malerkotla route.',
        tags: 'Weekend Trips, Quick Ride, Day Scholars'
      },
      {
        id: 'chd',
        name: 'Chandigarh & Tri-City',
        state: 'Chandigarh / Mohali / Panchkula',
        icon: '🏙️',
        members_count: 240,
        distance_from_thapar: '65 km',
        popular_transport: 'CTU Buses, Shared Cabs, Personal Cars',
        description: 'Frequent weekend travelers to Mohali, Chandigarh Sector 17/43, and Panchkula.',
        tags: 'Daily/Weekly, Mohali IT, Airport Cabs'
      },
      {
        id: 'asr',
        name: 'Amritsar',
        state: 'Punjab',
        icon: '🛕',
        members_count: 115,
        distance_from_thapar: '225 km',
        popular_transport: 'Express Trains (Shan-e-Punjab), Highway Cabs',
        description: 'Connecting students heading towards the holy city and Majha belt.',
        tags: 'Long Weekend, Festival Travel, Trains'
      },
      {
        id: 'bth',
        name: 'Bathinda',
        state: 'Punjab',
        icon: '⚡',
        members_count: 98,
        distance_from_thapar: '155 km',
        popular_transport: 'PRTC Buses, Local Trains',
        description: 'Malwa region student cohort sharing weekend travel.',
        tags: 'Malwa Cohort, Weekend Trips'
      },
      {
        id: 'jpr',
        name: 'Jaipur & Rajasthan',
        state: 'Rajasthan',
        icon: '🏰',
        members_count: 82,
        distance_from_thapar: '470 km',
        popular_transport: 'Overnight Buses, Intercity Trains',
        description: 'Long-distance cohort coordinating semester start/end and holiday trips to Pink City.',
        tags: 'Semester Breaks, Holiday Trains'
      }
    ];

    for (const c of communities) {
      insertComm.run(
        c.id,
        c.name,
        c.state,
        c.icon,
        c.members_count,
        c.distance_from_thapar,
        c.popular_transport,
        c.description,
        c.tags
      );
    }
  }

  // 5. Seed Community Posts
  const postCount = db.prepare('SELECT COUNT(*) as c FROM community_posts').get().c;
  if (postCount === 0) {
    const insertPost = db.prepare(`
      INSERT INTO community_posts (id, community_id, author_id, author_name, author_avatar, author_hostel, category, title, content, likes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const posts = [
      {
        id: 'p1',
        community_id: 'jal',
        author_id: 's_rahul',
        author_name: 'Rahul Sharma',
        author_avatar: 'RS',
        author_hostel: 'Hostel H3',
        category: 'Ride Sharing',
        title: 'Ertiga Cab to Jalandhar Cantt this Friday 5:00 PM',
        content: 'Booking a 6-seater cab leaving directly from Thapar Main Gate. 2 seats open! Splitting fare equally (~₹350 each). Drop at BMC Chowk / Cantt.',
        likes: 6
      },
      {
        id: 'p2',
        community_id: 'jal',
        author_id: 's_harpreet',
        author_name: 'Harpreet Singh',
        author_avatar: 'HS',
        author_hostel: 'Hostel H7',
        category: 'Train / Bus Cohort',
        title: 'Traveling on Saturday morning via DLI-ASR Express',
        content: 'Anyone catching the 8:15 AM train from Patiala Railway Station to Jalandhar? Let us share an auto to station together from Quad B.',
        likes: 4
      },
      {
        id: 'p3',
        community_id: 'del',
        author_id: 's_tanvi',
        author_name: 'Tanvi Saxena',
        author_avatar: 'TS',
        author_hostel: 'Hostel D',
        category: 'Ride Sharing',
        title: 'Friday Night Cab to Kashmere Gate / South Delhi',
        content: 'Leaving around 9:30 PM post mess dinner. Sedan booked, looking for 2 female co-passengers from Girls Quad for comfortable night ride.',
        likes: 12
      },
      {
        id: 'p4',
        community_id: 'chd',
        author_id: 's_karan',
        author_name: 'Karan Mehra',
        author_avatar: 'KM',
        author_hostel: 'Hostel H2',
        category: 'Travel Tip',
        title: 'Best pickup gate for Chandigarh Airport Cabs',
        content: 'Tip for first-years: Uber/Ola drivers prefer Executive Mess Gate over Gate 1 for Chandigarh highway access because of the bypass signal.',
        likes: 19
      }
    ];

    for (const p of posts) {
      insertPost.run(
        p.id,
        p.community_id,
        p.author_id,
        p.author_name,
        p.author_avatar,
        p.author_hostel,
        p.category,
        p.title,
        p.content,
        p.likes
      );
    }
  }

  // 6. Seed Groups & Group Members
  const groupCount = db.prepare('SELECT COUNT(*) as c FROM groups').get().c;
  if (groupCount === 0) {
    const insertGroup = db.prepare(`
      INSERT INTO groups (id, destination_id, destination_name, departure_time, date, status, max_members, pickup_point, match_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMember = db.prepare(`
      INSERT INTO group_members (id, group_id, user_id, name, avatar, hostel, departure_time, role, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMsg = db.prepare(`
      INSERT INTO group_messages (id, group_id, sender_id, sender_name, avatar, text)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Group 104: Patiala Railway Station (3/4 Open for new student)
    insertGroup.run(
      '104',
      'railway',
      'Patiala Railway Station',
      '17:15',
      'Today',
      'Open',
      4,
      'Main Gate (Near Executive Mess)',
      96
    );

    insertMember.run('gm1', '104', 's1', 'Rahul Sharma', 'RS', 'H3', '17:05', 'Group Admin', '+91 98765 43210');
    insertMember.run('gm2', '104', 's2', 'Aman Verma', 'AV', 'H4', '17:10', 'Member', '+91 98123 45678');
    insertMember.run('gm3', '104', 's3', 'Simran Kaur', 'SK', 'H4', '17:15', 'Member', '+91 97654 32109');

    insertMsg.run('m1', '104', 's1', 'Rahul Sharma', 'RS', 'Hey everyone! I will book an auto from Main Gate at 5:05 PM.');
    insertMsg.run('m2', '104', 's2', 'Aman Verma', 'AV', 'Sounds good, I will walk from Hostel H4 by 5:00 PM.');
    insertMsg.run('m3', '104', 's3', 'Simran Kaur', 'SK', 'Great! I am leaving from H4 too, see you all at Main Gate!');

    // Group 102: Chandigarh Airport
    insertGroup.run(
      '102',
      'chd_airport',
      'Chandigarh Airport',
      '06:30',
      'Tomorrow',
      'Open',
      4,
      'Gate 2 (Opposite COS Complex)',
      92
    );

    insertMember.run('gm4', '102', 's5', 'Neha Patel', 'NP', 'H8', '06:30', 'Group Admin', '+91 98712 34567');
    insertMember.run('gm5', '102', 's6', 'Karan Mehra', 'KM', 'H2', '06:30', 'Member', '+91 99112 33445');

    insertMsg.run('m4', '102', 's5', 'Neha Patel', 'NP', 'Hey guys! Cab fare is around ₹1,350 total. Splitting gives ~₹340/head.');

    // Group 101: Delhi Airport (Confirmed)
    insertGroup.run(
      '101',
      'del_airport',
      'Delhi Airport',
      '22:00',
      'Friday',
      'Confirmed',
      4,
      'Main Gate Security Desk',
      88
    );

    insertMember.run('gm6', '101', 's7', 'Vikas Singla', 'VS', 'H10', '22:00', 'Group Admin', '+91 98888 11223');
    insertMember.run('gm7', '101', 's8', 'Pooja Roy', 'PR', 'HD', '22:00', 'Member', '+91 97777 44332');
    insertMember.run('gm8', '101', 's9', 'Manan Sethi', 'MS', 'H1', '22:00', 'Member', '+91 96666 55443');
    insertMember.run('gm9', '101', 's10', 'Ritika Joshi', 'RJ', 'HM', '22:00', 'Member', '+91 95555 66778');

    insertMsg.run('m5', '101', 's7', 'Vikas Singla', 'VS', 'All 4 confirmed. Driver contact: Sukhdev Singh (+91 98140 XXXXX). Innova leaves sharp at 10 PM.');
  }
}

export default db;
