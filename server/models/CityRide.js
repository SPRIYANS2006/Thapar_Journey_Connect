import mongoose from 'mongoose';
import crypto from 'node:crypto';

const cityRideMemberSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    user_id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: 'ST' },
    hostel: { type: String, default: '' },
    phone: { type: String, default: '' },
    role: { type: String, default: 'Member', enum: ['Admin', 'Member'] },
    joined_at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const cityRideSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    default: () => `cr_${crypto.randomUUID().slice(0, 8)}`
  },
  community_id: { type: String, required: true, index: true },
  community_name: { type: String, required: true, trim: true },
  creator_id: { type: String, required: true, index: true },
  creator_name: { type: String, required: true, trim: true },
  origin: { type: String, default: 'Thapar Campus (Main Gate)' },
  destination: { type: String, required: true, trim: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String, required: true }, // HH:mm
  mode: {
    type: String,
    required: true,
    enum: ['Cab', 'Train'],
    default: 'Cab'
  },
  pickup_point: {
    type: String,
    default: 'Main Gate (Near Executive Mess)'
  },
  total_fare: { type: Number, default: 0 }, // For Cab: total cab fare to split; for Train: individual ticket fare
  max_capacity: { type: Number, default: 4 }, // For Cab: 4; for Train: 6-10
  current_members_count: { type: Number, default: 1 },
  transit_details: { type: String, default: '', trim: true }, // e.g. "Shatabdi Express #12005"
  notes: { type: String, default: '', trim: true, maxlength: 500 },
  status: {
    type: String,
    default: 'Open',
    enum: ['Open', 'Full', 'Confirmed', 'Completed', 'Cancelled']
  },
  members: [cityRideMemberSchema],
  slot_key: { type: String },
  created_at: { type: Date, default: Date.now }
});

cityRideSchema.index({ community_id: 1, mode: 1, date: 1, status: 1 });
cityRideSchema.index({ 'members.user_id': 1 });
cityRideSchema.index({ slot_key: 1 }, { unique: true, sparse: true });

export const CityRide =
  mongoose.models.CityRide || mongoose.model('CityRide', cityRideSchema);
