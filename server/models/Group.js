import mongoose from 'mongoose';
import crypto from 'node:crypto';

const memberSchema = new mongoose.Schema({
  id: { type: String, default: () => crypto.randomUUID() },
  user_id: {
    type: String,
    default: function() {
      return this.id || this.userId || 'student';
    }
  },
  name: { type: String, required: true },
  avatar: { type: String, default: 'ST' },
  hostel: { type: String, default: '' },
  departure_time: { type: String, default: '12:00' },
  role: { type: String, default: 'Member' },
  phone: { type: String, default: '' },
  joined_at: { type: Date, default: Date.now }
}, { _id: false });

const groupSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  destination_id: { type: String, required: true },
  destination_name: { type: String, required: true },
  departure_time: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'Open', enum: ['Open', 'Confirmed', 'Completed', 'Cancelled'] },
  transport: { type: String, default: 'Shared Cab', enum: ['Shared Cab', 'Shared Auto', 'Either'] },
  max_members: { type: Number, default: 4 },
  pickup_point: { type: String, default: 'Main Gate (Near Executive Mess)' },
  match_score: { type: Number, default: 95 },
  admin_id: {
    type: String,
    required: true,
    default: function() {
      return (
        this.adminId ||
        (this.members && this.members[0] && (this.members[0].user_id || this.members[0].userId || this.members[0].id)) ||
        'admin'
      );
    }
  },
  members: [memberSchema],
  created_at: { type: Date, default: Date.now }
});

groupSchema.index({ destination_id: 1, date: 1, status: 1 });
groupSchema.index({ 'members.user_id': 1, status: 1 });

export const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
