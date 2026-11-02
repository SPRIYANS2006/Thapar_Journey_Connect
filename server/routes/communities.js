import express from 'express';
import crypto from 'node:crypto';
import { Community, CommunityPost, User, CityRide, Group, getNextGroupId } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { normalizeDateStr, getHoursUntilDeparture } from '../utils/time.js';
import { notifyUser, notifyGroupMembersUpdated } from '../services/notifications.js';
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

// 7. List active rides for a city community (enforces community membership privacy)
router.get('/:id/rides', async (req, res, next) => {
  try {
    const community = await Community.findOne({ id: req.params.id }).lean();
    if (!community) {
      throw new HttpError(404, 'Community not found.');
    }

    if (req.user.joined_community !== req.params.id) {
      throw new HttpError(
        403,
        'Forbidden: You can only access ride groups of your enrolled hometown community.'
      );
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

    if (req.user.joined_community !== req.params.id) {
      throw new HttpError(
        403,
        'Forbidden: You can only create rides within your enrolled hometown community.'
      );
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

    if (mode === 'Bus') {
      throw new HttpError(400, 'Bus feature has been removed. Only Cab and Train modes are supported.');
    }

    // Single-Ride Policy: Check if user is already in an active Group or CityRide
    const activeExistingGroup = await Group.findOne({
      status: { $in: ['Open', 'Confirmed'] },
      'members.user_id': req.user.id
    });
    if (activeExistingGroup) {
      throw new HttpError(
        409,
        `Single-Ride Policy: You are already enrolled in active Group #${activeExistingGroup.id} (${activeExistingGroup.destination_name}). Please leave it before creating a new ride.`
      );
    }

    const activeExistingRide = await CityRide.findOne({
      status: { $in: ['Open', 'Confirmed', 'Full'] },
      'members.user_id': req.user.id
    });
    if (activeExistingRide) {
      throw new HttpError(
        409,
        `Single-Ride Policy: You already belong to an active community ride to ${activeExistingRide.destination}. Please leave it before creating a new ride.`
      );
    }

    const validModes = ['Cab', 'Train'];
    const selectedMode = validModes.includes(mode) ? mode : 'Cab';

    const defaultCapacity = selectedMode === 'Cab' ? 4 : 6;
    const capacityNum = Number(maxCapacity) > 0 ? Number(maxCapacity) : defaultCapacity;
    const fareNum = Number(totalFare) >= 0 ? Number(totalFare) : 0;
    const groupId = await getNextGroupId();

    const newRide = await CityRide.create({
      id: groupId,
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

    await User.updateOne({ id: req.user.id }, { $set: { active_group_id: newRide.id } });

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

    if (req.user.joined_community !== req.params.id) {
      throw new HttpError(
        403,
        'Forbidden: You can only join rides within your enrolled hometown community.'
      );
    }

    const isMember = (ride.members || []).some((m) => m.user_id === req.user.id);
    if (isMember) {
      throw new HttpError(400, 'You are already a member of this ride.');
    }

    if ((ride.members || []).length >= ride.max_capacity) {
      throw new HttpError(400, 'This ride is already full.');
    }

    // Single-Ride Policy: Check if user is already in an active Group or another CityRide
    const activeExistingGroup = await Group.findOne({
      status: { $in: ['Open', 'Confirmed'] },
      'members.user_id': req.user.id
    });
    if (activeExistingGroup) {
      throw new HttpError(
        409,
        `Single-Ride Policy: You are already enrolled in active Group #${activeExistingGroup.id} (${activeExistingGroup.destination_name}). Please leave it first before joining another ride.`
      );
    }

    const otherActiveRide = await CityRide.findOne({
      id: { $ne: req.params.rideId },
      status: { $in: ['Open', 'Confirmed', 'Full'] },
      'members.user_id': req.user.id
    });
    if (otherActiveRide) {
      throw new HttpError(
        409,
        `Single-Ride Policy: You already belong to an active community ride to ${otherActiveRide.destination}. Please leave it first before joining another ride.`
      );
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

    await User.updateOne({ id: req.user.id }, { $set: { active_group_id: ride.id } });

    // Notify all existing members of this group with an in-app popup toast
    const existingMembers = (ride.members || []).filter((m) => m.user_id !== req.user.id);
    for (const em of existingMembers) {
      const memberId = em.user_id || em.userId || em.id;
      if (memberId) {
        notifyUser(memberId, 'member_joined', {
          groupId: ride.id,
          destinationName: `${ride.destination} (${ride.community_name || 'Community'})`,
          joinerId: req.user.id,
          joinerName: req.user.name,
          joinerHostel: req.user.hostel || 'Campus',
          membersCount: ride.members.length,
          maxMembers: ride.max_capacity || (ride.mode === 'Cab' ? 4 : 6)
        });
      }
    }

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
      await User.updateOne(
        { id: req.user.id, active_group_id: req.params.rideId },
        { $set: { active_group_id: null } }
      );
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

    await User.updateOne(
      { id: req.user.id, active_group_id: req.params.rideId },
      { $set: { active_group_id: null } }
    );

    // Notify all remaining members with an on-screen toast popup
    for (const em of ride.members) {
      const memberId = em.user_id || em.userId || em.id;
      if (memberId && memberId !== req.user.id) {
        notifyUser(memberId, 'member_left', {
          groupId: ride.id,
          destinationName: `${ride.destination} (${ride.community_name || 'Community'})`,
          leaverId: req.user.id,
          leaverName: req.user.name,
          remainingMembersCount: ride.members.length,
          maxMembers: ride.max_capacity || (ride.mode === 'Cab' ? 4 : 6)
        });
      }
    }

    notifyGroupMembersUpdated(serializeCityRide(ride, req.user.id));

    res.json({
      success: true,
      message: `Left ${ride.mode} ride to ${ride.destination}.`,
      ride: serializeCityRide(ride, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 11. Complete a city community ride (Admin only; records completed trip history for members)
router.post('/:id/rides/:rideId/complete', async (req, res, next) => {
  try {
    const ride = await CityRide.findOne({
      id: req.params.rideId,
      community_id: req.params.id
    });

    if (!ride) {
      throw new HttpError(404, 'Ride not found in this community.');
    }

    if (ride.creator_id !== req.user.id) {
      throw new HttpError(403, 'Forbidden: Only the ride creator can complete this ride.');
    }

    if (ride.status === 'Completed') {
      throw new HttpError(400, 'This ride has already been marked as completed.');
    }

    ride.status = 'Completed';
    await ride.save();

    const memberUserIds = (ride.members || []).map((m) => m.user_id).filter(Boolean);
    if (memberUserIds.length > 0) {
      await User.updateMany(
        { id: { $in: memberUserIds } },
        { $inc: { trips_completed: 1 }, $set: { active_group_id: null } }
      );
    }

    res.json({
      success: true,
      message: `Completed ${ride.mode} ride to ${ride.destination}!`,
      ride: serializeCityRide(ride, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 12. GET /:id/slots: 15-minute slots for city community travel (Cab only)
router.get('/:id/slots', async (req, res, next) => {
  try {
    const community = await Community.findOne({ id: req.params.id }).lean();
    if (!community) {
      throw new HttpError(404, 'Community not found.');
    }

    if (req.user.joined_community !== req.params.id) {
      throw new HttpError(
        403,
        'Forbidden: You can only access ride slots for your enrolled hometown community.'
      );
    }

    const { date, destination } = req.query;
    const travelDate = normalizeDateStr(date || 'Today');
    const selectedMode = 'Cab';

    // Find active rides for this community on this date
    const rideQuery = {
      community_id: community.id,
      date: travelDate,
      status: { $in: ['Open', 'Confirmed', 'Full'] }
    };

    const existingRides = await CityRide.find(rideQuery).lean();
    const ridesByTime = new Map();
    for (const r of existingRides) {
      if (r.time) ridesByTime.set(r.time, r);
    }

    // Default base fare calculation based on distance
    const distKm = parseInt(community.distance_from_thapar, 10) || 200;
    const defaultCabFare = Math.round(distKm * 12);

    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const hoursLeft = getHoursUntilDeparture(travelDate, timeStr);
        const isPast = hoursLeft < -5 / 60;

        const ride = ridesByTime.get(timeStr);
        const rideMode = 'Cab';
        const maxSeats = 4;
        const seatsFilled = ride?.members ? ride.members.length : 0;
        const isFull = Boolean(seatsFilled >= maxSeats || (ride && (ride.status === 'Full' || ride.status === 'Completed')));
        const isJoined = Boolean(
          ride?.members &&
          ride.members.some((mem) => (mem.user_id || mem.userId || mem.id) === req.user.id)
        );
        const isFillingFast = seatsFilled >= 2 && !isFull;

        const totalFareNum = ride ? ride.total_fare : defaultCabFare;
        const perPersonFare = seatsFilled > 0 ? Math.round(totalFareNum / seatsFilled) : Math.round(totalFareNum / maxSeats);

        const slotDest = ride ? ride.destination : (destination || `${community.name} (City Center)`);
        const slotKey = ride?.slot_key || `${community.id}_${travelDate}_${timeStr}_Cab`;

        slots.push({
          slotKey,
          time: timeStr,
          date: travelDate,
          communityId: community.id,
          communityName: community.name,
          destination: slotDest,
          mode: rideMode,
          maxSeats,
          seatsFilled,
          isFull,
          isJoined,
          isPast,
          isFillingFast,
          estimatedFarePerPerson: perPersonFare,
          totalFare: totalFareNum,
          rideId: ride ? ride.id : null,
          status: ride ? ride.status : 'Open',
          members: (ride?.members || []).map((mem) => ({
            id: mem.user_id || mem.userId || mem.id,
            name: mem.name,
            avatar: mem.avatar || 'ST',
            hostel: mem.hostel || '',
            role: mem.role || 'Member',
            isCompanion: Boolean(mem.is_companion),
            addedBy: mem.added_by || null,
            companionName: mem.companion_name || '',
            reliability: typeof mem.reliability === 'number' ? mem.reliability : 5.0
          }))
        });
      }
    }

    res.json({
      success: true,
      community: serializeCommunity(community),
      date: travelDate,
      mode: selectedMode,
      totalSlots: slots.length,
      availableSlotsCount: slots.filter((s) => !s.isPast && !s.isFull).length,
      slots
    });
  } catch (err) {
    next(err);
  }
});

// 13. POST /:id/slots/join: Atomic join or lazy creation of a city community ride slot
router.post('/:id/slots/join', async (req, res, next) => {
  try {
    const community = await Community.findOne({ id: req.params.id }).lean();
    if (!community) {
      throw new HttpError(404, 'Community not found.');
    }

    if (req.user.joined_community !== req.params.id) {
      throw new HttpError(
        403,
        'Forbidden: You can only join rides within your enrolled hometown community.'
      );
    }

    const { date, time, destination, pickupPoint } = req.body;
    if (!time) {
      throw new HttpError(400, 'Departure time is required.');
    }

    const travelDate = normalizeDateStr(date || 'Today');

    // Departure time cannot be in past
    const hoursLeft = getHoursUntilDeparture(travelDate, time);
    if (hoursLeft < -5 / 60) {
      throw new HttpError(400, 'Cannot book a travel slot in the past.');
    }

    const selectedMode = 'Cab';
    const maxCapacity = 4;
    const resolvedDest = (destination && destination.trim()) || `${community.name} (City Center)`;
    const resolvedPickup = (pickupPoint && pickupPoint.trim()) || 'Main Gate (Near Executive Mess)';

    const distKm = parseInt(community.distance_from_thapar, 10) || 200;
    const defaultFare = Math.round(distKm * 12);

    const slotKey = `${community.id}_${travelDate}_${time}_Cab`;

    // Single-Ride Policy check across regular Group & CityRide
    const activeGroup = await Group.findOne({
      status: { $in: ['Open', 'Confirmed'] },
      'members.user_id': req.user.id
    });
    if (activeGroup) {
      throw new HttpError(
        409,
        `Single-Ride Policy: You are already enrolled in active Group #${activeGroup.id} (${activeGroup.destination_name}). Please leave it before joining another ride.`
      );
    }

    const activeExistingRide = await CityRide.findOne({
      status: { $in: ['Open', 'Confirmed', 'Full'] },
      $or: [
        { 'members.user_id': req.user.id },
        { creator_id: req.user.id }
      ]
    });
    if (activeExistingRide) {
      const isAlreadyInThisSlot =
        activeExistingRide.slot_key === slotKey ||
        (activeExistingRide.community_id === community.id &&
          activeExistingRide.date === travelDate &&
          activeExistingRide.time === time);

      if (isAlreadyInThisSlot) {
        return res.json({
          success: true,
          message: `You are already enrolled in Group #${activeExistingRide.id}.`,
          ride: serializeCityRide(activeExistingRide, req.user.id),
          alreadyMember: true
        });
      }

      throw new HttpError(
        409,
        `Single-Ride Policy: You already belong to an active community ride to ${activeExistingRide.destination}. Please leave it first before joining another ride.`
      );
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

    // Check if CityRide exists for this slot
    let ride = await CityRide.findOne({
      $or: [
        { slot_key: slotKey },
        { community_id: community.id, date: travelDate, time, mode: selectedMode }
      ]
    });

    if (ride) {
      // Atomic join with capacity guard
      const updatedRide = await CityRide.findOneAndUpdate(
        {
          id: ride.id,
          status: 'Open',
          $expr: { $lt: [{ $size: '$members' }, '$max_capacity'] },
          'members.user_id': { $ne: req.user.id }
        },
        {
          $push: { members: newMember },
          $inc: { current_members_count: 1 }
        },
        { returnDocument: 'after' }
      );

      if (!updatedRide) {
        throw new HttpError(
          409,
          `This slot is now full (${ride.members?.length || 4}/${ride.max_capacity || 4} seats filled). Please select another slot.`
        );
      }

      if (updatedRide.members.length >= updatedRide.max_capacity) {
        updatedRide.status = 'Full';
        await updatedRide.save();
      }

      await User.updateOne({ id: req.user.id }, { $set: { active_group_id: updatedRide.id } });

      // Notify existing members
      for (const em of ride.members || []) {
        if (em.user_id && em.user_id !== req.user.id) {
          notifyUser(em.user_id, 'member_joined', {
            groupId: updatedRide.id,
            destinationName: `${updatedRide.destination} (${community.name})`,
            joinerId: req.user.id,
            joinerName: req.user.name,
            joinerHostel: req.user.hostel || 'Campus',
            membersCount: updatedRide.members.length,
            maxMembers: updatedRide.max_capacity
          });
        }
      }

      notifyGroupMembersUpdated(updatedRide);

      return res.json({
        success: true,
        message: `Successfully joined Group #${updatedRide.id} to ${updatedRide.destination} at ${time}.`,
        ride: serializeCityRide(updatedRide, req.user.id),
        created: false
      });
    }

    // Lazy atomic creation with sequential ID
    const groupId = await getNextGroupId();
    newMember.role = 'Admin';

    let createdRide;
    try {
      createdRide = await CityRide.create({
        id: groupId,
        slot_key: slotKey,
        community_id: community.id,
        community_name: community.name,
        creator_id: req.user.id,
        creator_name: req.user.name,
        origin: 'Thapar Campus (Main Gate)',
        destination: resolvedDest,
        date: travelDate,
        time,
        mode: selectedMode,
        pickup_point: resolvedPickup,
        total_fare: defaultFare,
        max_capacity: maxCapacity,
        current_members_count: 1,
        transit_details: 'Sedan AC Cab via Highway',
        notes: '',
        status: 'Open',
        members: [newMember]
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Concurrent race condition fallback
        const raceRide = await CityRide.findOne({ slot_key: slotKey });
        if (raceRide) {
          newMember.role = 'Member';
          const updatedRace = await CityRide.findOneAndUpdate(
            {
              id: raceRide.id,
              status: 'Open',
              $expr: { $lt: [{ $size: '$members' }, '$max_capacity'] },
              'members.user_id': { $ne: req.user.id }
            },
            {
              $push: { members: newMember },
              $inc: { current_members_count: 1 }
            },
            { returnDocument: 'after' }
          );
          if (!updatedRace) {
            throw new HttpError(409, 'This slot is full. Please choose another slot.');
          }
          await User.updateOne({ id: req.user.id }, { $set: { active_group_id: updatedRace.id } });
          notifyGroupMembersUpdated(updatedRace);
          return res.json({
            success: true,
            message: `Successfully joined Group #${updatedRace.id}!`,
            ride: serializeCityRide(updatedRace, req.user.id),
            created: false
          });
        }
      }
      throw createErr;
    }

    await User.updateOne({ id: req.user.id }, { $set: { active_group_id: createdRide.id } });
    notifyGroupMembersUpdated(createdRide);

    res.status(201).json({
      success: true,
      message: `Formed Group #${createdRide.id} to ${createdRide.destination} at ${time}!`,
      ride: serializeCityRide(createdRide, req.user.id),
      created: true
    });
  } catch (err) {
    next(err);
  }
});

// 14. Add a companion/friend to community ride slot
router.post('/:id/rides/:rideId/friends', async (req, res, next) => {
  try {
    const ride = await CityRide.findOne({ id: req.params.rideId, community_id: req.params.id });
    if (!ride) {
      throw new HttpError(404, 'Community ride not found.');
    }

    const isMember = (ride.members || []).some(
      (m) => (m.user_id || m.userId || m.id) === req.user.id
    );
    if (!isMember) {
      throw new HttpError(403, 'Forbidden: You must be a member of this ride to add a companion.');
    }

    if (ride.status !== 'Open' && ride.status !== 'Confirmed') {
      throw new HttpError(400, 'Cannot add a companion to a completed or cancelled ride.');
    }

    const maxCapacity = ride.max_capacity || 4;
    if (ride.members.length >= maxCapacity) {
      throw new HttpError(409, `Ride is at maximum capacity (${ride.members.length}/${maxCapacity} seats filled).`);
    }

    const friendName = (req.body.name && req.body.name.trim()) || `${req.user.name.split(' ')[0]}'s Friend`;
    const friendHostel = (req.body.hostel && req.body.hostel.trim()) || req.user.hostel || 'Campus';

    const companion = {
      id: crypto.randomUUID(),
      user_id: `comp_${crypto.randomUUID().slice(0, 8)}`,
      name: `${friendName} (Friend)`,
      avatar: 'FR',
      hostel: friendHostel,
      role: 'Companion',
      phone: (req.body.phone && req.body.phone.trim()) || '',
      is_companion: true,
      added_by: req.user.id,
      companion_name: friendName,
      joined_at: new Date()
    };

    ride.members.push(companion);
    ride.current_members_count = ride.members.length;
    if (ride.members.length >= maxCapacity) {
      ride.status = 'Full';
    }
    await ride.save();

    notifyGroupMembersUpdated(serializeCityRide(ride, req.user.id));
    for (const m of ride.members) {
      const memberId = m.user_id || m.userId || m.id;
      if (memberId && memberId !== req.user.id && !m.is_companion) {
        notifyUser(memberId, 'member_joined', {
          groupId: ride.id,
          destinationName: `${ride.destination} (${ride.community_name || 'Community'})`,
          joinerId: companion.user_id,
          joinerName: companion.name,
          joinerHostel: companion.hostel,
          membersCount: ride.members.length,
          maxMembers: maxCapacity
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Added ${friendName} to Group #${ride.id}!`,
      ride: serializeCityRide(ride, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 15. Remove a companion/friend from community ride slot
router.delete('/:id/rides/:rideId/friends/:friendId', async (req, res, next) => {
  try {
    const ride = await CityRide.findOne({ id: req.params.rideId, community_id: req.params.id });
    if (!ride) {
      throw new HttpError(404, 'Community ride not found.');
    }

    const companionIndex = (ride.members || []).findIndex(
      (m) =>
        (m.id === req.params.friendId || m.user_id === req.params.friendId) &&
        Boolean(m.is_companion)
    );
    if (companionIndex === -1) {
      throw new HttpError(404, 'Companion not found in this ride.');
    }

    const companion = ride.members[companionIndex];
    const isOwner = companion.added_by === req.user.id;
    const isAdmin = ride.creator_id === req.user.id;
    if (!isOwner && !isAdmin) {
      throw new HttpError(403, 'Forbidden: You can only remove a companion that you added.');
    }

    const removedName = companion.name;
    ride.members.splice(companionIndex, 1);
    ride.current_members_count = ride.members.length;
    if (ride.current_members_count < (ride.max_capacity || 4) && ride.status === 'Full') {
      ride.status = 'Open';
    }
    await ride.save();

    notifyGroupMembersUpdated(serializeCityRide(ride, req.user.id));
    for (const m of ride.members) {
      const memberId = m.user_id || m.userId || m.id;
      if (memberId && memberId !== req.user.id && !m.is_companion) {
        notifyUser(memberId, 'member_left', {
          groupId: ride.id,
          destinationName: `${ride.destination} (${ride.community_name || 'Community'})`,
          leaverId: companion.user_id,
          leaverName: removedName,
          remainingMembersCount: ride.members.length,
          maxMembers: ride.max_capacity || 4
        });
      }
    }

    res.json({
      success: true,
      message: `Removed ${removedName} from Group #${ride.id}.`,
      ride: serializeCityRide(ride, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
