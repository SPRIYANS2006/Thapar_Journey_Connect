import mongoose from 'mongoose';

const hostelSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  gender: { type: String, required: true },
  cluster: { type: String, required: true }
});

export const Hostel = mongoose.models.Hostel || mongoose.model('Hostel', hostelSchema);
