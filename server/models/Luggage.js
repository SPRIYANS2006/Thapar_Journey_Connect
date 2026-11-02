import mongoose from 'mongoose';
import crypto from 'node:crypto';

const luggageItemSchema = new mongoose.Schema({
  size: {
    type: String,
    enum: ['Small', 'Medium', 'Large', 'Trunk-Box'],
    required: true
  },
  count: { type: Number, default: 1, min: 1 },
  notes: { type: String, default: '' }
}, { _id: false });

const timelineEventSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Requested', 'Vendor Assigned', 'Picked Up', 'In Transit', 'Delivered', 'Cancelled'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  updated_by: { type: String, default: 'System' }
}, { _id: false });

const luggageSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    default: () => 'LUG-' + crypto.randomBytes(3).toString('hex').toUpperCase()
  },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  user_phone: { type: String, default: '' },
  user_hostel: { type: String, default: '' },

  pickup_location: { type: String, required: true },
  destination: { type: String, required: true },
  destination_address: { type: String, default: '' },

  date: { type: String, required: true },
  slot_time: { type: String, required: true },
  slot_key: { type: String },

  items: [luggageItemSchema],
  total_items_count: { type: Number, default: 1 },
  notes: { type: String, default: '' },
  photo_url: { type: String, default: '' },

  vehicle_type: {
    type: String,
    enum: ['Bike/Scooter', 'Auto/e-rickshaw', 'Tempo/Mini-truck'],
    default: 'Tempo/Mini-truck'
  },

  estimated_fare: { type: Number, required: true },
  base_fare: { type: Number, default: 0 },
  pooled_savings: { type: Number, default: 0 },
  pool_count: { type: Number, default: 1 },
  payment_mode: { type: String, default: 'Cash/UPI to Driver on Pickup' },

  status: {
    type: String,
    enum: ['Requested', 'Vendor Assigned', 'Picked Up', 'In Transit', 'Delivered', 'Cancelled'],
    default: 'Requested'
  },

  pickup_otp: {
    type: String,
    default: () => String(Math.floor(1000 + Math.random() * 9000))
  },

  driver_name: { type: String, default: '' },
  driver_phone: { type: String, default: '' },
  vehicle_number: { type: String, default: '' },
  vendor_id: { type: String, default: '' },
  vendor_name: { type: String, default: 'Patiala Campus Express Logistics' },

  timeline: [timelineEventSchema],

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

luggageSchema.index({ user_id: 1, status: 1 });
luggageSchema.index({ date: 1, slot_time: 1 });
luggageSchema.index({ slot_key: 1 });
luggageSchema.index({ status: 1 });

export const Luggage = mongoose.models.Luggage || mongoose.model('Luggage', luggageSchema);
