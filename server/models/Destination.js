import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  description: { type: String, required: true },
  popular_time: { type: String, required: true },
  distance: { type: String, required: true },
  avg_cab_fare: { type: String, required: true }
});

export const Destination = mongoose.models.Destination || mongoose.model('Destination', destinationSchema);
