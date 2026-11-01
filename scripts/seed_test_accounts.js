import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../server/models/index.js';

async function seedTestLogins() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in environment.');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB to seed test accounts...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, dbName: 'thapar_journey' });

  const password = 'Thapar@123';
  const passwordHash = await bcrypt.hash(password, 10);

  const testAccounts = [
    {
      id: 'student_aarav',
      name: 'Aarav Sharma',
      email: 'student1@thapar.edu',
      password_hash: passwordHash,
      hostel: 'Tejas Hall (Hostel-J)',
      avatar: 'AS',
      phone: '9876543210',
      degree: 'B.E. Computer Engineering',
      year: '3rd Year',
      hometown: 'Delhi NCR',
      reliability: 5.0,
      trips_completed: 4,
      joined_community: 'del'
    },
    {
      id: 'student_diya',
      name: 'Diya Verma',
      email: 'student2@thapar.edu',
      password_hash: passwordHash,
      hostel: 'Vasudha Hall (Hostel-E)',
      avatar: 'DV',
      phone: '9876543211',
      degree: 'B.E. Electronics & Communication',
      year: '2nd Year',
      hometown: 'Delhi NCR',
      reliability: 4.9,
      trips_completed: 2,
      joined_community: 'del'
    },
    {
      id: 'student_aarav_alias',
      name: 'Aarav Sharma',
      email: 'test.student1@thapar.edu',
      password_hash: passwordHash,
      hostel: 'Tejas Hall (Hostel-J)',
      avatar: 'AS',
      phone: '9876543210',
      degree: 'B.E. Computer Engineering',
      year: '3rd Year',
      hometown: 'Delhi NCR',
      reliability: 5.0,
      trips_completed: 4,
      joined_community: 'del'
    },
    {
      id: 'student_diya_alias',
      name: 'Diya Verma',
      email: 'test.student2@thapar.edu',
      password_hash: passwordHash,
      hostel: 'Vasudha Hall (Hostel-E)',
      avatar: 'DV',
      phone: '9876543211',
      degree: 'B.E. Electronics & Communication',
      year: '2nd Year',
      hometown: 'Delhi NCR',
      reliability: 4.9,
      trips_completed: 2,
      joined_community: 'del'
    }
  ];

  for (const acc of testAccounts) {
    await User.updateOne(
      { email: acc.email },
      { $set: acc },
      { upsert: true }
    );
    console.log(`✅ Upserted test account: ${acc.email} (${acc.name})`);
  }

  console.log('🎉 Successfully seeded test accounts into MongoDB Atlas!');
  await mongoose.disconnect();
}

seedTestLogins().catch((err) => {
  console.error('❌ Failed to seed test accounts:', err);
  process.exit(1);
});
