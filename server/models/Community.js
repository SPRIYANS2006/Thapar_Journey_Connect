import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  post_id: { type: String, required: true },
  author_id: { type: String, required: true },
  author_name: { type: String, required: true },
  author_avatar: { type: String, default: 'ST' },
  author_hostel: { type: String, default: '' },
  text: { type: String, required: true, maxlength: 500 },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

const postSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  community_id: { type: String, required: true, index: true },
  author_id: { type: String, required: true },
  author_name: { type: String, required: true },
  author_avatar: { type: String, default: 'ST' },
  author_hostel: { type: String, default: '' },
  category: { type: String, default: 'Ride Sharing' },
  title: { type: String, required: true, maxlength: 120 },
  content: { type: String, required: true, maxlength: 2000 },
  likes: { type: [String], default: [] },
  comments: [commentSchema],
  created_at: { type: Date, default: Date.now, index: true }
});

postSchema.index({ community_id: 1, created_at: -1 });

const communitySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  state: { type: String, required: true },
  icon: { type: String, default: '🏙️' },
  members_count: { type: Number, default: 0 },
  distance_from_thapar: { type: String, default: '' },
  popular_transport: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: { type: [String], default: [] },
  created_by: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

export const Community = mongoose.models.Community || mongoose.model('Community', communitySchema);
export const CommunityPost = mongoose.models.CommunityPost || mongoose.model('CommunityPost', postSchema);
