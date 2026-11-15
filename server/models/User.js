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
  roll_number: { type: String, default: '' },
  preferred_transport: { type: String, default: 'Cab' },
  time_window: { type: String, default: 'Every 15 Minutes' },
  frequent_routes: { type: [String], default: [] },
  ride_notifications: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  muted_users: { type: [String], default: [] },
  token_version: { type: Number, default: 1 },
  reliability: { type: Number, default: 5.0 },
  trips_completed: { type: Number, default: 0 },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  active_group_id: { type: String, default: null },
  joined_community: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

userSchema.index({ active_group_id: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
