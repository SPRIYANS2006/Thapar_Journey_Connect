import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  password_hash: { type: String },
  hostel: { type: String, default: 'Agira Hall (Previously known as Hostel-A)' },
  avatar: { type: String, default: 'ST' },
  phone: { type: String, default: '+91 98765 00000' },
  degree: { type: String, default: 'B.Tech Computer Engineering' },
  year: { type: String, default: '3rd Year (Batch of 2026)' },
  reliability: { type: Number, default: 5.0 },
  trips_completed: { type: Number, default: 0 },
  joined_community: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
