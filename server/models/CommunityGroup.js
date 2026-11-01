import mongoose from 'mongoose';
import crypto from 'node:crypto';

export const ALLOWED_COMMUNITY_GROUP_CATEGORIES = [
  'Commute Cohort',
  'Weekend Trips',
  'Festivals & Events',
  'General Meetups',
  'Study & Projects',
  'Hostel Connect'
];

const communityGroupMemberSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    user_id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: 'ST' },
    hostel: { type: String, default: '' },
    role: { type: String, default: 'Member', enum: ['Admin', 'Member'] },
    joined_at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const communityGroupSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    default: () => `cg_${crypto.randomUUID().slice(0, 8)}`
  },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  community_id: { type: String, required: true, index: true },
  community_name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ALLOWED_COMMUNITY_GROUP_CATEGORIES,
    default: 'Commute Cohort'
  },
  creator_id: { type: String, required: true, index: true },
  creator_name: { type: String, required: true, trim: true },
  members_count: { type: Number, default: 1 },
  members: [communityGroupMemberSchema],
  created_at: { type: Date, default: Date.now }
});

communityGroupSchema.index({ community_id: 1, category: 1 });
communityGroupSchema.index({ 'members.user_id': 1 });

const communityGroupMessageSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    default: () => `cgm_${crypto.randomUUID()}`
  },
  group_id: { type: String, required: true, index: true },
  sender_id: { type: String, required: true },
  sender_name: { type: String, required: true, trim: true },
  sender_avatar: { type: String, default: 'ST' },
  sender_hostel: { type: String, default: '' },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  created_at: { type: Date, default: Date.now, index: true }
});

communityGroupMessageSchema.index({ group_id: 1, created_at: 1 });

export const CommunityGroup =
  mongoose.models.CommunityGroup || mongoose.model('CommunityGroup', communityGroupSchema);

export const CommunityGroupMessage =
  mongoose.models.CommunityGroupMessage ||
  mongoose.model('CommunityGroupMessage', communityGroupMessageSchema);
