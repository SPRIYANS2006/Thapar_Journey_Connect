import mongoose from 'mongoose';
import { User, Group, Journey, Community, CommunityPost, Destination, Hostel } from './models/index.js';

let isConnected = false;

export async function connectMongoDB(uri, maxRetries = 3) {
  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('ℹ️ No MONGODB_URI found, using SQLite database.');
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Connecting to MongoDB Atlas Cloud (attempt ${attempt}/${maxRetries})...`);
      await mongoose.connect(mongoUri, {
        tls: true,
        tlsAllowInvalidCertificates: true,
        serverSelectionTimeoutMS: 5000
      });
      isConnected = true;
      console.log('✅ Connected to MongoDB Atlas Cloud (thapar_journey)!');

      await seedMongoDefaultData();
      return true;
    } catch (err) {
      console.warn(`⚠️ MongoDB Atlas attempt ${attempt} notice: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  }

  console.log('ℹ️ Falling back to SQLite local database.');
  isConnected = false;
  return false;
}

export function isMongo() {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function seedMongoDefaultData() {
  try {
    // 1. Destinations (Official TIET transit hubs)
    const destCount = await Destination.countDocuments();
    if (destCount === 0) {
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
      await Destination.insertMany(destinations);
      console.log('🌱 Seeded Official TIET Destinations');
    }

    // 2. Hostels (Official TIET residence halls)
    const hostelCount = await Hostel.countDocuments();
    if (hostelCount === 0) {
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
      await Hostel.insertMany(hostels);
      console.log('🌱 Seeded Official TIET Hostels');
    }

    // 3. Communities (Regional student hubs - initialized with 0 members for pure real deployment)
    const commCount = await Community.countDocuments();
    if (commCount === 0) {
      const communities = [
        {
          id: 'jal',
          name: 'Jalandhar',
          state: 'Punjab',
          icon: '🏛️',
          members_count: 0,
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
          members_count: 0,
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
          members_count: 0,
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
          members_count: 0,
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
          members_count: 0,
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
          members_count: 0,
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
          members_count: 0,
          distance_from_thapar: '470 km',
          popular_transport: 'Overnight Buses, Intercity Trains',
          description: 'Long-distance cohort coordinating semester breaks and Diwali holiday trips to Pink City.',
          tags: ['Semester Breaks', 'Holiday Trains']
        }
      ];
      await Community.insertMany(communities);
      console.log('🌱 Seeded Clean Communities (0 members)');
    }

    // Dynamic Collections: Clean Slate (0 dummy records)
    // - 0 Users (Real students create their own profiles upon login/registration)
    // - 0 Groups (Formed organically by students coordinating rides)
    // - 0 Journeys (Created dynamically when students search)
    // - 0 Community Posts (Posted by real students on the notice boards)
  } catch (err) {
    console.error('Error during Mongo seed:', err.message);
  }
}
