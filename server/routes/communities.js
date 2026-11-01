import express from 'express';
import crypto from 'node:crypto';
import { Community, CommunityPost, User, CityRide } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import {
  validateCommunityPost,
  validatePostComment
} from '../middleware/validate.js';
import {
  serializeCommunity,
  serializePost,
  serializeCityRide
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

    const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Community.findOne({
      $or: [{ id: idSlug }, { name: new RegExp(`^${escapedName}$`, 'i') }]
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

// 7. Toggle Like on Post: Stored per user atomically (cannot be spammed)
router.post('/posts/:postId/like', async (req, res, next) => {
  try {
    const post = await CommunityPost.findOne({ id: req.params.postId });
    if (!post) throw new HttpError(404, 'Post not found.');

    // Under Thapar community rules, only verified members can react/like posts in their community
    if (req.user.joined_community !== post.community_id) {
      throw new HttpError(
        403,
        'Access Denied: Only verified members of this community can react to posts.'
      );
    }

    const userId = req.user.id;
    const isCurrentlyLiked = Array.isArray(post.likes) && post.likes.includes(userId);

    // Atomic MongoDB toggle: $pull to unlike, $addToSet to like (ensures zero spam / duplicate likes)
    const update = isCurrentlyLiked
      ? { $pull: { likes: userId } }
      : { $addToSet: { likes: userId } };

    const updatedPost = await CommunityPost.findOneAndUpdate(
      { id: req.params.postId },
      update,
      { returnDocument: 'after' }
    );

    const isLiked = !isCurrentlyLiked;
    res.json({
      success: true,
      likes: updatedPost.likes.length,
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

// ==========================================
// City Community Rides (Cab, Bus, Train)
// ==========================================

// 7. List active rides for a city community
router.get('/:id/rides', async (req, res, next) => {
  try {
    const community = await Community.findOne({ id: req.params.id }).lean();
    if (!community) {
      throw new HttpError(404, 'Community not found.');
    }

    const { mode, date } = req.query;
    const filter = { community_id: community.id };

    if (mode && mode !== 'All') {
      filter.mode = mode;
    }
    if (date) {
      filter.date = date;
    }

    const rides = await CityRide.find(filter)
      .sort({ date: 1, time: 1 })
      .lean();

    res.json(rides.map((r) => serializeCityRide(r, req.user.id)));
  } catch (err) {
    next(err);
  }
});

// 8. Create a new ride from Thapar to this city community
router.post('/:id/rides', async (req, res, next) => {
  try {
    const community = await Community.findOne({ id: req.params.id }).lean();
    if (!community) {
      throw new HttpError(404, 'Community not found.');
    }

    const {
      date,
      time,
      mode,
      destination,
      pickupPoint,
      totalFare,
      maxCapacity,
      transitDetails,
      notes
    } = req.body;

    if (!date || typeof date !== 'string') {
      throw new HttpError(400, 'Departure date is required (YYYY-MM-DD).');
    }
    if (!time || typeof time !== 'string') {
      throw new HttpError(400, 'Departure time is required (HH:mm).');
    }

    const validModes = ['Cab', 'Bus', 'Train'];
    const selectedMode = validModes.includes(mode) ? mode : 'Cab';

    const defaultCapacity = selectedMode === 'Cab' ? 4 : 6;
    const capacityNum = Number(maxCapacity) > 0 ? Number(maxCapacity) : defaultCapacity;
    const fareNum = Number(totalFare) >= 0 ? Number(totalFare) : 0;

    const newRide = await CityRide.create({
      id: `cr_${crypto.randomUUID().slice(0, 8)}`,
      community_id: community.id,
      community_name: community.name,
      creator_id: req.user.id,
      creator_name: req.user.name,
      origin: 'Thapar Campus (Main Gate)',
      destination: (destination && destination.trim()) || `${community.name} (City Center)`,
      date: date.trim(),
      time: time.trim(),
      mode: selectedMode,
      pickup_point: (pickupPoint && pickupPoint.trim()) || 'Main Gate (Near Executive Mess)',
      total_fare: fareNum,
      max_capacity: capacityNum,
      current_members_count: 1,
      transit_details: (transitDetails || '').trim(),
      notes: (notes || '').trim(),
      status: 'Open',
      members: [
        {
          id: crypto.randomUUID(),
          user_id: req.user.id,
          name: req.user.name,
          avatar: req.user.avatar || 'ST',
          hostel: req.user.hostel || '',
          phone: req.user.phone || '',
          role: 'Admin',
          joined_at: new Date()
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: `Created ${selectedMode} ride to ${community.name}!`,
      ride: serializeCityRide(newRide, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 9. Join an existing ride for this city community
router.post('/:id/rides/:rideId/join', async (req, res, next) => {
  try {
    const ride = await CityRide.findOne({
      id: req.params.rideId,
      community_id: req.params.id
    });

    if (!ride) {
      throw new HttpError(404, 'Ride not found in this community.');
    }

    const isMember = (ride.members || []).some((m) => m.user_id === req.user.id);
    if (isMember) {
      throw new HttpError(400, 'You are already a member of this ride.');
    }

    if ((ride.members || []).length >= ride.max_capacity) {
      throw new HttpError(400, 'This ride is already full.');
    }

    const newMember = {
      id: crypto.randomUUID(),
      user_id: req.user.id,
      name: req.user.name,
      avatar: req.user.avatar || 'ST',
      hostel: req.user.hostel || '',
      phone: req.user.phone || '',
      role: 'Member',
      joined_at: new Date()
    };

    ride.members.push(newMember);
    ride.current_members_count = ride.members.length;
    if (ride.current_members_count >= ride.max_capacity) {
      ride.status = 'Full';
    }

    await ride.save();

    res.json({
      success: true,
      message: `Successfully joined ${ride.mode} ride to ${ride.destination}!`,
      ride: serializeCityRide(ride, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 10. Leave an existing ride for this city community
router.post('/:id/rides/:rideId/leave', async (req, res, next) => {
  try {
    const ride = await CityRide.findOne({
      id: req.params.rideId,
      community_id: req.params.id
    });

    if (!ride) {
      throw new HttpError(404, 'Ride not found in this community.');
    }

    const memberIndex = (ride.members || []).findIndex((m) => m.user_id === req.user.id);
    if (memberIndex === -1) {
      throw new HttpError(400, 'You are not a member of this ride.');
    }

    const leavingWasAdmin = ride.members[memberIndex].role === 'Admin';
    ride.members.splice(memberIndex, 1);
    ride.current_members_count = ride.members.length;

    if (leavingWasAdmin && ride.members.length > 0) {
      ride.members[0].role = 'Admin';
    }

    if (ride.members.length === 0) {
      await CityRide.deleteOne({ id: req.params.rideId });
      return res.json({
        success: true,
        message: 'You left the ride. Since no riders remained, the ride was cancelled.',
        ride: null
      });
    }

    if (ride.current_members_count < ride.max_capacity && ride.status === 'Full') {
      ride.status = 'Open';
    }

    await ride.save();

    res.json({
      success: true,
      message: `Left ${ride.mode} ride to ${ride.destination}.`,
      ride: serializeCityRide(ride, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
