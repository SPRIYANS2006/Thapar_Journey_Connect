import dotenv from 'dotenv';
dotenv.config();
import { connectMongoDB } from '../server/db_mongo.js';
import { User, Group, Journey, Community, CommunityPost, Destination, Hostel } from '../server/models/index.js';

async function main() {
  await connectMongoDB();

  console.log('--- PURGING DUMMY DATA FROM MONGODB ATLAS ---');
  await User.deleteMany({});
  await Group.deleteMany({});
  await Journey.deleteMany({});
  await CommunityPost.deleteMany({});
  await Community.updateMany({}, { $set: { members_count: 0 } });

  console.log('Users remaining:', await User.countDocuments());
  console.log('Groups remaining:', await Group.countDocuments());
  console.log('Journeys remaining:', await Journey.countDocuments());
  console.log('Posts remaining:', await CommunityPost.countDocuments());
  console.log('Destinations remaining:', await Destination.countDocuments());
  console.log('Hostels remaining:', await Hostel.countDocuments());
  
  const comms = await Community.find();
  console.log('Communities member counts:');
  comms.forEach(c => console.log(`  - ${c.name}: ${c.members_count} members`));
  
  process.exit(0);
}

main();
