import mongoose from 'mongoose';
import { Destination, Hostel, Community, Counter } from '../models/index.js';

let isConnected = false;

const DEFAULT_MONGODB_URI = 'mongodb+srv://psoni1be24_db_user:g1A5fLmc2frxKZtN@thaparclusters.mk83gfu.mongodb.net/thapar_journey?retryWrites=true&w=majority';

export async function connectDB(customUri) {
  const uri = customUri || process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: MONGODB_URI environment variable is required in production.');
      process.exit(1);
    }
    console.warn('⚠️ Warning: MONGODB_URI not provided. Running without database connection.');
    return false;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri, {
      dbName: 'thapar_journey',
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas Cloud (thapar_journey)!');

    await seedDefaultData();
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: Database connection failed in production. Exiting.');
      process.exit(1);
    }
    isConnected = false;
    throw err;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function seedDefaultData() {
  try {
    // 1. Destinations (Official TIET transit hubs) - Idempotent upsert via bulkWrite
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

    await Destination.bulkWrite(
      destinations.map((d) => ({
        updateOne: {
          filter: { id: d.id },
          update: { $set: d },
          upsert: true
        }
      }))
    );

    // 2. 18 Official TIET Hostels - Idempotent upsert via bulkWrite
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

    await Hostel.bulkWrite(
      hostels.map((h) => ({
        updateOne: {
          filter: { id: h.id },
          update: { $set: h },
          upsert: true
        }
      }))
    );

    // 3. Official Hometown Communities - Idempotent upsert via bulkWrite
    const communities = [
      {
        id: 'jal',
        name: 'Jalandhar',
        state: 'Punjab',
        icon: '🏛️',
        distance_from_thapar: '145 km',
        popular_transport: 'GT Road Cabs, Intercity Trains',
        description: 'Student hub for Jalandhar, Phagwara & Doaba region travelers.',
        tags: ['Weekly Commuters', 'Cab Sharing', 'GT Road']
      },
      {
        id: 'del',
        name: 'Delhi NCR',
        state: 'Delhi / NCR',
        icon: '🚇',
        distance_from_thapar: '250 km',
        popular_transport: 'Shatabdi Express, Long Cabs, Volvos',
        description: 'Student network for South Delhi, Noida, Gurgaon, West Delhi & IGI Airport transit.',
        tags: ['Holiday Rush', 'Shatabdi Cohort', 'IGI Airport']
      },
      {
        id: 'ldh',
        name: 'Ludhiana',
        state: 'Punjab',
        icon: '🏭',
        distance_from_thapar: '95 km',
        popular_transport: 'Direct Cabs, Passenger Trains',
        description: 'Commute corridor for Ludhiana travelers sharing cabs via GT Road.',
        tags: ['Weekend Trips', 'Quick Ride', 'Day Scholars']
      },
      {
        id: 'chd',
        name: 'Chandigarh & Tri-City',
        state: 'Chandigarh / Mohali / Panchkula',
        icon: '🏙️',
        distance_from_thapar: '65 km',
        popular_transport: 'CTU Buses, Shared Cabs, Personal Cars',
        description: 'Travelers heading towards Mohali, Chandigarh Sector 17/43, and Panchkula.',
        tags: ['Daily/Weekly', 'Mohali IT', 'Airport Cabs']
      },
      {
        id: 'asr',
        name: 'Amritsar',
        state: 'Punjab',
        icon: '🛕',
        distance_from_thapar: '225 km',
        popular_transport: 'Express Trains (Shan-e-Punjab), Highway Cabs',
        description: 'Connecting students heading towards Amritsar and Majha belt.',
        tags: ['Long Weekend', 'Festival Travel', 'Trains']
      },
      {
        id: 'bth',
        name: 'Bathinda',
        state: 'Punjab',
        icon: '⚡',
        distance_from_thapar: '155 km',
        popular_transport: 'PRTC Buses, Local Trains',
        description: 'Malwa region student cohort sharing weekend travel.',
        tags: ['Malwa Cohort', 'Weekend Trips']
      },
      {
        id: 'jpr',
        name: 'Jaipur & Rajasthan',
        state: 'Rajasthan',
        icon: '🏰',
        distance_from_thapar: '470 km',
        popular_transport: 'Overnight Buses, Intercity Trains',
        description: 'Long-distance cohort coordinating semester breaks and Diwali holiday trips to Pink City.',
        tags: ['Semester Breaks', 'Holiday Trains']
      }
    ];

    await Community.bulkWrite(
      communities.map((c) => ({
        updateOne: {
          filter: { id: c.id },
          update: {
            $set: {
              name: c.name,
              state: c.state,
              icon: c.icon,
              distance_from_thapar: c.distance_from_thapar,
              popular_transport: c.popular_transport,
              description: c.description,
              tags: c.tags
            },
            $setOnInsert: {
              id: c.id,
              members_count: 0
            }
          },
          upsert: true
        }
      }))
    );

    // 4. Ensure atomic counter for group sequence exists
    await Counter.updateOne(
      { id: 'group_id' },
      { $setOnInsert: { id: 'group_id', seq: 0 } },
      { upsert: true }
    );

    console.log('🌱 Seeded default data (Destinations, Hostels, Communities, Counters)');
  } catch (err) {
    console.error('Error during default data seed:', err.message);
  }
}
