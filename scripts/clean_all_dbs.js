import mongoose from 'mongoose';

async function cleanBothDatabases() {
  const baseUri = 'mongodb+srv://psoni1be24_db_user:g1A5fLmc2frxKZtN@thaparclusters.mk83gfu.mongodb.net';
  
  for (const dbName of ['test', 'thapar_journey']) {
    console.log(`\n--- Cleaning Atlas Database: ${dbName} ---`);
    const conn = await mongoose.createConnection(`${baseUri}/${dbName}?retryWrites=true&w=majority`, {
      tls: true,
      tlsAllowInvalidCertificates: true
    }).asPromise();
    
    await conn.collection('users').deleteMany({});
    await conn.collection('groups').deleteMany({});
    await conn.collection('journeys').deleteMany({});
    await conn.collection('communityposts').deleteMany({});
    await conn.collection('communities').updateMany({}, { $set: { members_count: 0 } });
    
    const users = await conn.collection('users').countDocuments();
    const groups = await conn.collection('groups').countDocuments();
    const posts = await conn.collection('communityposts').countDocuments();
    const journeys = await conn.collection('journeys').countDocuments();
    const comms = await conn.collection('communities').find().project({ id: 1, name: 1, members_count: 1 }).toArray();

    console.log(`[${dbName}] Users: ${users}, Groups: ${groups}, Journeys: ${journeys}, Posts: ${posts}`);
    console.log(`[${dbName}] Communities:`, comms.map(c => `${c.name} (${c.members_count})`).join(', '));
    await conn.close();
  }
  console.log('\nAll databases are 100% spotless!');
  process.exit(0);
}

cleanBothDatabases().catch((err) => {
  console.error('Clean error:', err);
  process.exit(1);
});
