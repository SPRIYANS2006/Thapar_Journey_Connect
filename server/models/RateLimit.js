import mongoose from 'mongoose';

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 1 },
  expireAt: { type: Date, required: true }
});

rateLimitSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);
