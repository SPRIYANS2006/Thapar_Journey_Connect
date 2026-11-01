import mongoose from 'mongoose';
import { Destination, Hostel, Community, Counter, CommunityGroup, CityRide } from '../models/index.js';

const FALLBACK_MONGODB_URI = 'mongodb+srv://psoni1be24_db_user:g1A5fLmc2frxKZtN@thaparclusters.mk83gfu.mongodb.net/thapar_journey?retryWrites=true&w=majority';

export async function connectDB(customUri) {
  const uri = customUri || process.env.MONGODB_URI || FALLBACK_MONGODB_URI;

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri, {
      dbName: 'thapar_journey',
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20,
      minPoolSize: 5,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB Atlas Cloud (thapar_journey)!');

    await seedDefaultData();
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // Don't crash immediately; allow healthcheck and server to stay up so Render deploy succeeds
    return false;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
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

    // 5. Seed sample community groups if none exist
    const cgCount = await CommunityGroup.countDocuments();
    if (cgCount === 0) {
      const sampleGroups = [
        {
          id: 'cg_delhi_volvo',
          name: 'Delhi NCR Volvo & Cab Cohort',
          description: 'Students coordinating Friday afternoon and Sunday evening shared cabs and Volvos to ISBT Kashmiri Gate & South Delhi.',
          community_id: 'del',
          community_name: 'Delhi NCR',
          category: 'Commute Cohort',
          creator_id: 'thapar_official',
          creator_name: 'TIET Transit Network',
          members_count: 3,
          members: [
            { user_id: 'thapar_official', name: 'TIET Transit Network', role: 'Admin', hostel: 'Campus Central' },
            { user_id: 'sample_student_1', name: 'Aarav Sharma', role: 'Member', hostel: 'Tejas Hall' },
            { user_id: 'sample_student_2', name: 'Diya Verma', role: 'Member', hostel: 'Vasudha Hall' }
          ]
        },
        {
          id: 'cg_chd_daily',
          name: 'Tri-City Daily & Weekend Transit',
          description: 'Regular commuters between Patiala campus and Chandigarh Sec 17/43, Mohali Phase 7, and Zirakpur.',
          community_id: 'chd',
          community_name: 'Chandigarh & Tri-City',
          category: 'Commute Cohort',
          creator_id: 'thapar_official',
          creator_name: 'TIET Transit Network',
          members_count: 2,
          members: [
            { user_id: 'thapar_official', name: 'TIET Transit Network', role: 'Admin', hostel: 'Campus Central' },
            { user_id: 'sample_student_3', name: 'Rohan Mehra', role: 'Member', hostel: 'Agira Hall' }
          ]
        },
        {
          id: 'cg_jpr_fest',
          name: 'Rajasthan Holiday Travel Hub',
          description: 'Coordinating train berths (Intercity & Shatabdi) and long-distance overnight cabs for semester breaks & Diwali holidays to Jaipur, Jodhpur, and Udaipur.',
          community_id: 'jpr',
          community_name: 'Jaipur & Rajasthan',
          category: 'Festivals & Events',
          creator_id: 'thapar_official',
          creator_name: 'TIET Transit Network',
          members_count: 2,
          members: [
            { user_id: 'thapar_official', name: 'TIET Transit Network', role: 'Admin', hostel: 'Campus Central' },
            { user_id: 'sample_student_4', name: 'Ananya Rathore', role: 'Member', hostel: 'Ira Hall' }
          ]
        },
        {
          id: 'cg_jal_gt_road',
          name: 'Jalandhar GT Road Express',
          description: 'Fast weekend cab sharing for Jalandhar, Phagwara and Doaba region students via NH44 GT Road.',
          community_id: 'jal',
          community_name: 'Jalandhar',
          category: 'Weekend Trips',
          creator_id: 'thapar_official',
          creator_name: 'TIET Transit Network',
          members_count: 2,
          members: [
            { user_id: 'thapar_official', name: 'TIET Transit Network', role: 'Admin', hostel: 'Campus Central' },
            { user_id: 'sample_student_5', name: 'Harpreet Singh', role: 'Member', hostel: 'Amritam Hall' }
          ]
        }
      ];

      await CommunityGroup.insertMany(sampleGroups);
    }

    // 6. Seed sample City Community Rides (Cab, Bus, Train) if none exist
    const crCount = await CityRide.countDocuments();
    if (crCount === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];

      const sampleRides = [
        // Delhi Cab
        {
          id: 'cr_del_cab_1',
          community_id: 'del',
          community_name: 'Delhi NCR',
          creator_id: 'sample_student_1',
          creator_name: 'Aarav Sharma',
          origin: 'Thapar Campus (Main Gate)',
          destination: 'Delhi (Kashmiri Gate ISBT & South Extension)',
          date: tomorrowStr,
          time: '17:00',
          mode: 'Cab',
          pickup_point: 'Main Gate (Near Executive Mess)',
          total_fare: 2800,
          max_capacity: 4,
          current_members_count: 3,
          transit_details: 'Sedan AC Cab via NH44 GT Road',
          notes: 'Fast drop at Kashmiri Gate Metro & South Delhi. 1 medium trolley bag allowed per rider.',
          status: 'Open',
          members: [
            { user_id: 'sample_student_1', name: 'Aarav Sharma', role: 'Admin', hostel: 'Tejas Hall' },
            { user_id: 'sample_student_2', name: 'Diya Verma', role: 'Member', hostel: 'Vasudha Hall' },
            { user_id: 'sample_student_3', name: 'Kabir Bedi', role: 'Member', hostel: 'Agira Hall' }
          ]
        },
        // Delhi Train
        {
          id: 'cr_del_train_1',
          community_id: 'del',
          community_name: 'Delhi NCR',
          creator_id: 'sample_student_6',
          creator_name: 'Dev Patel',
          origin: 'Thapar Campus (Gate 2)',
          destination: 'New Delhi Railway Station (NDLS)',
          date: dayAfterStr,
          time: '06:15',
          mode: 'Train',
          pickup_point: 'Campus Gate 2 (Pre-booked cab to Ambala Cantt)',
          total_fare: 380,
          max_capacity: 6,
          current_members_count: 3,
          transit_details: 'Kalka Shatabdi Express #12006 (Ambala Cantt -> NDLS)',
          notes: 'Splitting morning cab to Ambala Cantt, then boarding Executive/CC coach together.',
          status: 'Open',
          members: [
            { user_id: 'sample_student_6', name: 'Dev Patel', role: 'Admin', hostel: 'Prithvi Hall' },
            { user_id: 'sample_student_7', name: 'Ananya Rathore', role: 'Member', hostel: 'Ira Hall' },
            { user_id: 'sample_student_8', name: 'Harpreet Singh', role: 'Member', hostel: 'Amritam Hall' }
          ]
        },
        // Chandigarh Cab
        {
          id: 'cr_chd_cab_1',
          community_id: 'chd',
          community_name: 'Chandigarh & Tri-City',
          creator_id: 'sample_student_2',
          creator_name: 'Diya Verma',
          origin: 'Thapar Campus (Main Gate)',
          destination: 'Chandigarh Sector 17 & Mohali Phase 7',
          date: tomorrowStr,
          time: '16:00',
          mode: 'Cab',
          pickup_point: 'Main Gate (Near Executive Mess)',
          total_fare: 1200,
          max_capacity: 4,
          current_members_count: 2,
          transit_details: 'Sedan Cab directly to Mohali & Sec 17',
          notes: 'Weekend trip home. Splitting ₹1200 total cab fare equally.',
          status: 'Open',
          members: [
            { user_id: 'sample_student_2', name: 'Diya Verma', role: 'Admin', hostel: 'Vasudha Hall' },
            { user_id: 'sample_student_5', name: 'Rohan Mehra', role: 'Member', hostel: 'Amritam Hall' }
          ]
        },
        // Jaipur Train
        {
          id: 'cr_jpr_train_1',
          community_id: 'jpr',
          community_name: 'Jaipur & Rajasthan',
          creator_id: 'sample_student_7',
          creator_name: 'Ananya Rathore',
          origin: 'Thapar Campus (Gate 2)',
          destination: 'Jaipur Junction (JP)',
          date: dayAfterStr,
          time: '14:20',
          mode: 'Train',
          pickup_point: 'Patiala Railway Station',
          total_fare: 450,
          max_capacity: 6,
          current_members_count: 2,
          transit_details: 'Bathinda-Jaipur Express #14732',
          notes: 'Heading home for holiday break. Coordinate coach seating and Patiala station auto.',
          status: 'Open',
          members: [
            { user_id: 'sample_student_7', name: 'Ananya Rathore', role: 'Admin', hostel: 'Ira Hall' },
            { user_id: 'sample_student_6', name: 'Dev Patel', role: 'Member', hostel: 'Prithvi Hall' }
          ]
        },
        // Amritsar Cab
        {
          id: 'cr_asr_cab_1',
          community_id: 'asr',
          community_name: 'Amritsar',
          creator_id: 'sample_student_8',
          creator_name: 'Harpreet Singh',
          origin: 'Thapar Campus (Main Gate)',
          destination: 'Amritsar Golden Temple & Hall Gate',
          date: dayAfterStr,
          time: '07:00',
          mode: 'Cab',
          pickup_point: 'Main Gate (Near Executive Mess)',
          total_fare: 2600,
          max_capacity: 4,
          current_members_count: 2,
          transit_details: 'Ertiga Cab via Jalandhar GT Road',
          notes: 'Early morning highway drive. Spacious vehicle for luggage.',
          status: 'Open',
          members: [
            { user_id: 'sample_student_8', name: 'Harpreet Singh', role: 'Admin', hostel: 'Amritam Hall' },
            { user_id: 'sample_student_5', name: 'Rohan Mehra', role: 'Member', hostel: 'Amritam Hall' }
          ]
        }
      ];

      await CityRide.insertMany(sampleRides);
    }

    console.log('🌱 Seeded default data (Destinations, Hostels, Communities, Counters, Community Groups, City Rides)');
  } catch (err) {
    console.error('Error during default data seed:', err.message);
  }
}
