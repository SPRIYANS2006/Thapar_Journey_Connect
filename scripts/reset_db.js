import 'dotenv/config';
import mongoose from 'mongoose';
import { User, Group, Journey, Message, CommunityPost, Counter } from '../server/models/index.js';
import { seedDefaultData } from '../server/config/db.js';

async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    console.error('REFUSING TO RUN: Database reset cannot be executed in production environment.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in environment.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB for non-production reset...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  console.log('Clearing dynamic collections (Users, Groups, Journeys, Messages, Posts, Counters)...');
  await Promise.all([
    User.deleteMany({}),
    Group.deleteMany({}),
    Journey.deleteMany({}),
    Message.deleteMany({}),
    CommunityPost.deleteMany({}),
    Counter.deleteMany({})
  ]);

  console.log('Re-seeding static data (Destinations, Hostels, Communities)...');
  await seedDefaultData();

  console.log('✅ Database reset complete.');
  await mongoose.disconnect();
}

resetDatabase().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
