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
      password_hash TEXT,
      hostel TEXT NOT NULL,
      avatar TEXT NOT NULL,
      phone TEXT,
      degree TEXT DEFAULT 'B.Tech Computer Engineering',
      year TEXT DEFAULT '3rd Year (Batch of 2026)',
      reliability REAL DEFAULT 5.0,
      trips_completed INTEGER DEFAULT 0,
      joined_community TEXT DEFAULT NULL,
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

  // Safe migration for password_hash if updating existing database
  try {
    db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

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
      // Boys Hostels (Official TIET Campus Halls)
      { id: 'HA', name: 'Agira Hall (Previously known as Hostel-A)', gender: 'Boys', cluster: 'North Quad' },
      { id: 'HB', name: 'Amritam Hall (Previously known as Hostel-B)', gender: 'Boys', cluster: 'North Quad' },
      { id: 'HC', name: 'Prithvi Hall (Previously known as Hostel-C)', gender: 'Boys', cluster: 'North Quad' },
      { id: 'HD', name: 'Neeram Hall (Previously known as Hostel-D)', gender: 'Boys', cluster: 'Central Quad' },
      { id: 'HH', name: 'Vyan Hall (Previously known as Hostel-H)', gender: 'Boys', cluster: 'Central Quad' },
      { id: 'HJ', name: 'Tejas Hall (Previously known as Hostel-J)', gender: 'Boys', cluster: 'East Quad' },
      { id: 'HK', name: 'Ambaram Hall (Previously known as Hostel-K)', gender: 'Boys', cluster: 'East Quad' },
      { id: 'HL', name: 'Viyat Hall (Previously known as Hostel-L)', gender: 'Boys', cluster: 'East Quad' },
      { id: 'HM', name: 'Anantam Hall (Previously known as Hostel-M)', gender: 'Boys', cluster: 'West Quad' },
      { id: 'HO', name: 'Vyom Hall (Previously known as Hostel-O)', gender: 'Boys', cluster: 'West Quad' },
      { id: 'FRFG', name: 'Hostel-FRF/G', gender: 'Boys', cluster: 'West Quad' },

      // Girls Hostels (Official TIET Campus Halls)
      { id: 'HE', name: 'Vasudha Hall - Block E (Previously known as Hostel-E)', gender: 'Girls', cluster: 'Vasudha Complex' },
      { id: 'HG', name: 'Vasudha Hall - Block G (Previously known as Hostel-G)', gender: 'Girls', cluster: 'Vasudha Complex' },
      { id: 'HI', name: 'Ira Hall (Previously known as Hostel-I)', gender: 'Girls', cluster: 'Girls Quad' },
      { id: 'HN', name: 'Ananta Hall (Previously known as Hostel-N)', gender: 'Girls', cluster: 'Girls Quad' },
      { id: 'Dhriti', name: 'Dhriti Hall (Hostel-PG)', gender: 'Girls', cluster: 'Girls Quad' },
      { id: 'HQ', name: 'Vahni Hall (Previously known as Hostel-Q)', gender: 'Girls', cluster: 'Girls Quad' },
      { id: 'Pavani', name: 'Hostel-Pavani Hall (Previously Known As PG-2)', gender: 'Girls', cluster: 'Girls Quad' }
    ];

    for (const h of hostels) {
      insertHostel.run(h.id, h.name, h.gender, h.cluster);
    }
  }

  // 3. Dynamic Users - 0 dummy users (starts completely clean)

  // 4. Seed Communities (Clean state with 0 members)
  const commCount = db.prepare('SELECT COUNT(*) as c FROM communities').get().c;
  if (commCount === 0) {
    const insertComm = db.prepare(`
      INSERT INTO communities (id, name, state, icon, members_count, distance_from_thapar, popular_transport, description, tags)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
    `);

    const communities = [
      {
        id: 'jal',
        name: 'Jalandhar',
        state: 'Punjab',
        icon: '🏛️',
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
        c.distance_from_thapar,
        c.popular_transport,
        c.description,
        c.tags
      );
    }
  }

  // 5. Dynamic Community Posts - 0 dummy posts (Real students post their own updates)
  // 6. Dynamic Groups - 0 dummy groups (Real students coordinate their own rides)

  // 6. Dynamic Groups Table - starts completely fresh (0 pre-added groups)
  // New groups are dynamically formed when students coordinate rides
}

export default db;
