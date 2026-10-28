import mongoose from 'mongoose';

async function cleanTest() {
  const uri = 'mongodb+srv://psoni1be24_db_user:g1A5fLmc2frxKZtN@thaparclusters.mk83gfu.mongodb.net/test?retryWrites=true&w=majority';
  const conn = await mongoose.createConnection(uri, { tls: true, tlsAllowInvalidCertificates: true }).asPromise();
  
  console.log('Cleaning test DB on Atlas...');
  await conn.collection('users').deleteMany({});
  await conn.collection('groups').deleteMany({});
  await conn.collection('journeys').deleteMany({});
  await conn.collection('communityposts').deleteMany({});
  await conn.collection('communities').updateMany({}, { $set: { members_count: 0 } });
  
  console.log('test DB cleaned successfully!');
  const users = await conn.collection('users').countDocuments();
  const groups = await conn.collection('groups').countDocuments();
  const posts = await conn.collection('communityposts').countDocuments();
  const comms = await conn.collection('communities').find().project({ id: 1, name: 1, members_count: 1 }).toArray();
  console.log('Users:', users, 'Groups:', groups, 'Posts:', posts);
  console.log('Communities:', comms);
  await conn.close();
}

cleanTest().catch(console.error);
