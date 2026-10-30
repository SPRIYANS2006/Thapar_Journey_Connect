import mongoose from 'mongoose';

const journeySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  user_id: { type: String, required: true, index: true },
  destination_id: { type: String, required: true },
  destination_name: { type: String, required: true },
  hostel: { type: String, required: true },
  departure_time: { type: String, required: true },
  date: { type: String, required: true },
  flexibility: { type: Number, default: 15, enum: [10, 15, 20, 30] },
  transport: { type: String, default: 'Either', enum: ['Shared Cab', 'Shared Auto', 'Either'] },
  notes: { type: String, default: '', maxlength: 500 },
  status: { type: String, default: 'Searching', enum: ['Searching', 'Grouped', 'Cancelled'] },
  created_at: { type: Date, default: Date.now }
});

journeySchema.index({ destination_id: 1, date: 1, status: 1 });
journeySchema.index({ user_id: 1, status: 1 });

export const Journey = mongoose.models.Journey || mongoose.model('Journey', journeySchema);
