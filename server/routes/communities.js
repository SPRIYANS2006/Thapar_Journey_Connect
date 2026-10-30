import express from 'express';
import { Community, CommunityPost, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import {
  validateCommunityPost,
  validatePostComment
} from '../middleware/validate.js';
import {
  serializeCommunity,
  serializePost
} from '../services/serializers.js';

const router = express.Router();

// All community routes require authentication
router.use(requireAuth);

// 1. List all communities
router.get('/', async (req, res, next) => {
  try {
    const list = await Community.find()
      .sort({ members_count: -1, name: 1 })
      .lean();
    res.json(list.map(serializeCommunity));
  } catch (err) {
    next(err);
  }
});

// 2. Propose or create new Hometown Community Hub
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      state,
      icon,
      distanceFromThapar,
      popularTransport,
      description,
      tags
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new HttpError(400, 'Community / City name is required.');
    }

    if (!state || typeof state !== 'string' || !state.trim()) {
      throw new HttpError(400, 'State / Province is required.');
    }

    const cleanName = name.trim().slice(0, 100);
    const cleanState = state.trim().slice(0, 100);
    const idSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) || `comm_${Date.now() % 10000}`;

    const existing = await Community.findOne({
      $or: [{ id: idSlug }, { name: new RegExp(`^${cleanName}$`, 'i') }]
    });

    if (existing) {
      throw new HttpError(
        400,
        `A hometown hub for "${cleanName}" already exists.`
      );
    }

    const comm = await Community.create({
      id: idSlug,
      name: cleanName,
      state: cleanState,
      icon: (icon || '🏙️').trim().slice(0, 10),
      members_count: 0,
      distance_from_thapar: (distanceFromThapar || '250 km').trim(),
      popular_transport: (popularTransport || 'Trains, Shared Cabs, Express Buses').trim(),
      description: (description || `Official student community for Thapar students hailing from ${cleanName}.`).trim().slice(0, 500),
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean) : [cleanName],
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      community: serializeCommunity(comm)
    });
  } catch (err) {
    next(err);
  }
});

// 3. Join Community (Enforces Single-Community Rule)
router.post('/:id/join', async (req, res, next) => {
  try {
    const communityId = req.params.id;
    const comm = await Community.findOne({ id: communityId });
    if (!comm) throw new HttpError(404, 'Community hub not found.');

    const user = req.user;
    if (user.joined_community && user.joined_community !== communityId) {
      const currentComm = await Community.findOne({ id: user.joined_community });
      throw new HttpError(
        400,
        `Single-Community Rule: You are currently enrolled in the ${currentComm?.name || 'another'} Community. You must leave it before joining ${comm.name}.`
      );
    }

    if (user.joined_community !== communityId) {
      user.joined_community = communityId;
      user.hometown = comm.name;
      await user.save();

      // Recalculate true member count
      const trueCount = await User.countDocuments({ joined_community: communityId });
      comm.members_count = trueCount;
      await comm.save();
    }

    res.json({
      success: true,
      message: `Enrolled into ${comm.name} Community Hub!`,
      community: serializeCommunity(comm)
    });
  } catch (err) {
    next(err);
  }
});

// 4. Leave Community
router.post('/:id/leave', async (req, res, next) => {
  try {
    const communityId = req.params.id;
    const comm = await Community.findOne({ id: communityId });

    const user = req.user;
    if (user.joined_community === communityId) {
      user.joined_community = null;
      await user.save();

      if (comm) {
        const trueCount = await User.countDocuments({ joined_community: communityId });
        comm.members_count = trueCount;
        await comm.save();
      }
    }

    res.json({
      success: true,
      message: 'Left community successfully.',
      membersCount: comm ? comm.members_count : 0
    });
  } catch (err) {
    next(err);
  }
});

// 5. Get Posts for Community
router.get('/:id/posts', async (req, res, next) => {
  try {
    const posts = await CommunityPost.find({ community_id: req.params.id })
      .sort({ created_at: -1 })
      .lean();
    res.json(posts.map((p) => serializePost(p, req.user.id)));
  } catch (err) {
    next(err);
  }
});

// 6. Create Post: Members only (403 otherwise)
router.post('/:id/posts', validateCommunityPost, async (req, res, next) => {
  try {
    const communityId = req.params.id;
    const comm = await Community.findOne({ id: communityId });
    if (!comm) throw new HttpError(404, 'Community not found.');

    if (req.user.joined_community !== communityId) {
      throw new HttpError(
        403,
        `Access Denied: Under Thapar hometown privacy policy, only verified members of ${comm.name} Community can create notices or posts.`
      );
    }

    const post = await CommunityPost.create({
      id: `post-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      community_id: communityId,
      author_id: req.user.id,
      author_name: req.user.name,
      author_avatar: req.user.avatar || 'ST',
      author_hostel: req.user.hostel || 'Hostel',
      category: req.body.category,
      title: req.body.title,
      content: req.body.content,
      likes: [],
      comments: []
    });

    res.status(201).json({
      success: true,
      post: serializePost(post, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 7. Toggle Like on Post: Stored per user
router.post('/posts/:postId/like', async (req, res, next) => {
  try {
    const post = await CommunityPost.findOne({ id: req.params.postId });
    if (!post) throw new HttpError(404, 'Post not found.');

    const userId = req.user.id;
    let isLiked = false;

    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((id) => id !== userId);
      isLiked = false;
    } else {
      post.likes.push(userId);
      isLiked = true;
    }

    await post.save();

    res.json({
      success: true,
      likes: post.likes.length,
      isLiked
    });
  } catch (err) {
    next(err);
  }
});

// 8. Comment on Post: Members of that community only (403 otherwise)
router.post('/posts/:postId/comments', validatePostComment, async (req, res, next) => {
  try {
    const post = await CommunityPost.findOne({ id: req.params.postId });
    if (!post) throw new HttpError(404, 'Post not found.');

    if (req.user.joined_community !== post.community_id) {
      throw new HttpError(
        403,
        'Access Denied: Only enrolled members of this community can reply to notices.'
      );
    }

    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      post_id: post.id,
      author_id: req.user.id,
      author_name: req.user.name,
      author_avatar: req.user.avatar || 'ST',
      author_hostel: req.user.hostel || 'Hostel',
      text: req.body.text,
      created_at: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    res.status(201).json({
      success: true,
      comment: {
        id: newComment.id,
        postId: post.id,
        authorId: req.user.id,
        author: req.user.name,
        authorAvatar: req.user.avatar || 'ST',
        authorHostel: req.user.hostel || 'Hostel',
        text: newComment.text,
        createdAt: newComment.created_at.toISOString()
      },
      commentsCount: post.comments.length
    });
  } catch (err) {
    next(err);
  }
});

export default router;
