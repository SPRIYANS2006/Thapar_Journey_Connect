import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  id: String,
  user_id: String,
  name: String,
  avatar: String,
  hostel: String,
  departure_time: String,
  departureTime: String,
  role: { type: String, default: 'Member' },
  phone: String,
  joined_at: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  id: String,
  sender_id: String,
  senderId: String,
  sender_name: String,
  senderName: String,
  avatar: String,
  text: String,
  time: String,
  timestamp: { type: Date, default: Date.now }
});

const groupSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  destination_id: { type: String, required: true },
  destinationId: String,
  destination_name: { type: String, required: true },
  destinationName: String,
  departure_time: { type: String, required: true },
  departureTime: String,
  date: { type: String, default: 'Today' },
  status: { type: String, default: 'Open' },
  max_members: { type: Number, default: 4 },
  maxMembers: { type: Number, default: 4 },
  pickup_point: { type: String, default: 'Main Gate (Near Executive Mess)' },
  pickupPoint: String,
  match_score: { type: Number, default: 96 },
  matchScore: Number,
  members: [memberSchema],
  chat_messages: [messageSchema],
  created_at: { type: Date, default: Date.now }
});

export const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
