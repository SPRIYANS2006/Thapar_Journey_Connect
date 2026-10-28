import mongoose from 'mongoose';

const journeySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  user_id: { type: String, required: true },
  destination_id: { type: String, required: true },
  destination_name: { type: String, required: true },
  hostel: { type: String, required: true },
  departure_time: { type: String, required: true },
  date: { type: String, default: 'Today' },
  flexibility: { type: Number, default: 15 },
  transport: { type: String, default: 'Either' },
  notes: { type: String, default: '' },
  status: { type: String, default: 'Searching' },
  created_at: { type: Date, default: Date.now }
});

export const Journey = mongoose.models.Journey || mongoose.model('Journey', journeySchema);
