import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  seq: { type: Number, default: 0 }
});

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

export async function getNextGroupId() {
  const counter = await Counter.findOneAndUpdate(
    { id: 'group_id' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return String(counter.seq);
}
