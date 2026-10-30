import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  group_id: { type: String, required: true, index: true },
  sender_id: { type: String, required: true },
  sender_name: { type: String, required: true },
  avatar: { type: String, default: 'ST' },
  text: { type: String, required: true, maxlength: 500 },
  created_at: { type: Date, default: Date.now, index: true }
});

messageSchema.index({ group_id: 1, created_at: 1 });

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
