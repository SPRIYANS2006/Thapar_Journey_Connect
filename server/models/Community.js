import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  id: String,
  post_id: String,
  author_id: String,
  author_name: String,
  author_avatar: String,
  author_hostel: String,
  content: String,
  created_at: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  community_id: { type: String, required: true },
  author_id: { type: String, required: true },
  author_name: { type: String, required: true },
  author_avatar: String,
  author_hostel: String,
  category: { type: String, default: 'General' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  comments: [commentSchema],
  created_at: { type: Date, default: Date.now }
});

const communitySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  state: { type: String, required: true },
  icon: { type: String, required: true },
  members_count: { type: Number, default: 0 },
  distance_from_thapar: String,
  popular_transport: String,
  description: String,
  tags: [String]
});

export const Community = mongoose.models.Community || mongoose.model('Community', communitySchema);
export const CommunityPost = mongoose.models.CommunityPost || mongoose.model('CommunityPost', postSchema);
