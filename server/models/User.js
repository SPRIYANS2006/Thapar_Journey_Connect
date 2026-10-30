import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password_hash: { type: String, default: null },
  hostel: { type: String, default: '' },
  avatar: { type: String, default: 'ST' },
  phone: { type: String, default: '' },
  degree: { type: String, default: '' },
  year: { type: String, default: '' },
  hometown: { type: String, default: '' },
  token_version: { type: Number, default: 1 },
  reliability: { type: Number, default: 5.0 },
  trips_completed: { type: Number, default: 0 },
  joined_community: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
