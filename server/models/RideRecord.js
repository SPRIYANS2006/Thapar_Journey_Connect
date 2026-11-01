import mongoose from 'mongoose';

const rideRecordMemberSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  name: { type: String, required: true },
  hostel: { type: String, default: '' },
  phone: { type: String, default: '' },
  role: { type: String, default: 'Member' },
  joined_at: { type: Date }
}, { _id: false });

const rideRecordSchema = new mongoose.Schema({
  group_id: { type: String, required: true, index: true },
  destination_id: { type: String, required: true },
  destination_name: { type: String, required: true },
  departure_time: { type: String, required: true },
  date: { type: String, required: true },
  transport: { type: String, default: 'Shared Cab' },
  pickup_point: { type: String },
  admin_id: { type: String, required: true },
  members: [rideRecordMemberSchema],
  ratings_count: { type: Number, default: 0 },
  confirmed_at: { type: Date },
  completed_at: { type: Date, default: Date.now },
  completed_by: { type: String, default: 'admin' },
  created_at: { type: Date, default: Date.now }
});

rideRecordSchema.index({ 'members.user_id': 1, completed_at: -1 });

export const RideRecord = mongoose.models.RideRecord || mongoose.model('RideRecord', rideRecordSchema);
