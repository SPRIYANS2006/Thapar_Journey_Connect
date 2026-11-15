import mongoose from 'mongoose';
import { memberProfiles } from '../services/memberProfiles.js';
import crypto from 'node:crypto';

const travelGroupMemberSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    user_id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: 'ST' },
    reliability: { type: Number, default: 4.5 },
    hostel: { type: String, default: '' },
    phone: { type: String, default: '' },
    role: { type: String, default: 'Member', enum: ['Admin', 'Member'] },
    joined_at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const travelGroupSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    default: () => `tg_${crypto.randomUUID().slice(0, 8)}`
  },
  type: {
    type: String,
    required: true,
    enum: ['Train', 'Bus']
  },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  community_id: { type: String, required: true, index: true },
  community_name: { type: String, required: true, trim: true },
  creator_id: { type: String, required: true, index: true },
  creator_name: { type: String, required: true, trim: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  departure_time: { type: String, required: true }, // HH:mm
  boarding_point: { type: String, required: true, trim: true }, // Station for train, stop for bus
  destination: { type: String, required: true, trim: true },
  // Train-specific
  train_number: { type: String, default: '', trim: true },
  travel_class: { type: String, default: '', trim: true }, // e.g. CC, EC, 3A, 2A, SL, 2S
  // Bus-specific
  bus_operator: { type: String, default: '', trim: true }, // e.g. PRTC, Zingbus, IntrCity
  description: { type: String, default: '', trim: true, maxlength: 500 },
  members_count: { type: Number, default: 1 },
  members: [travelGroupMemberSchema],
  status: {
    type: String,
    enum: ['Open', 'Completed', 'Cancelled'],
    default: 'Open'
  },
  created_at: { type: Date, default: Date.now }
});

travelGroupSchema.index({ community_id: 1, type: 1, date: 1, status: 1 });
travelGroupSchema.index({ 'members.user_id': 1 });

const travelGroupMessageSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    default: () => `tgm_${crypto.randomUUID()}`
  },
  group_id: { type: String, required: true, index: true },
  sender_id: { type: String, required: true },
  sender_name: { type: String, required: true, trim: true },
  sender_avatar: { type: String, default: 'ST' },
  sender_hostel: { type: String, default: '' },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  created_at: { type: Date, default: Date.now, index: true }
});

travelGroupMessageSchema.index({ group_id: 1, created_at: 1 });

memberProfiles(travelGroupSchema);

export const TravelGroup =
  mongoose.models.TravelGroup || mongoose.model('TravelGroup', travelGroupSchema);

export const TravelGroupMessage =
  mongoose.models.TravelGroupMessage ||
  mongoose.model('TravelGroupMessage', travelGroupMessageSchema);
