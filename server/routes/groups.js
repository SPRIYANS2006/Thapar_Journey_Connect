import express from 'express';
import crypto from 'node:crypto';
import { Group, Message, User, CityRide } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import {
  createGroupFromJourney,
  joinGroupWithJourney,
  leaveGroup,
  completeGroup,
  cleanupExpiredGroups,
  scheduleBackgroundCleanup
} from '../services/groups.js';
import {
  serializeGroup,
  serializeMessage
} from '../services/serializers.js';
import {
  validateChatMessage,
  ALLOWED_PICKUP_POINTS
} from '../middleware/validate.js';
import { notifyGroup, notifyUser, notifyGroupMembersUpdated } from '../services/notifications.js';
import { rescheduleGroupSlot } from './slots.js';

function serializeCityRideAsGroup(ride, viewingUserId) {
  const membersCount = ride.current_members_count || (ride.members ? ride.members.length : 1);
  const farePerPerson =
    ride.mode === 'Cab' && ride.total_fare > 0 && membersCount > 0
      ? Math.round(ride.total_fare / membersCount)
      : (ride.total_fare || 0);

  const isMember = Boolean(
    viewingUserId &&
    ride.members &&
    ride.members.some((m) => (m.user_id || m.userId || m.id) === viewingUserId)
  );

  const isConfirmed = ride.status === 'Confirmed' || ride.status === 'Completed';
  const canSeePhone = isMember && isConfirmed;

  return {
    id: ride.id,
    destinationId: `comm_${ride.community_id}`,
    destinationName: `${ride.destination} (${ride.community_name})`,
    departureTime: ride.time,
    date: ride.date,
    status: ride.status || 'Open',
    transport: ride.mode === 'Cab' ? 'Shared Cab' : 'Train',
    maxMembers: ride.max_capacity || 4,
    pickupPoint: ride.pickup_point,
    adminId: ride.creator_id,
    creatorId: ride.creator_id,
    isCommunityRide: true,
    communityId: ride.community_id,
    communityName: ride.community_name,
    farePerPerson,
    totalFare: ride.total_fare,
    transitDetails: ride.transit_details,
    notes: ride.notes,
    members: (ride.members || []).map((m) => ({
      id: m.user_id || m.userId || m.id,
      user_id: m.user_id || m.userId || m.id,
      userId: m.user_id || m.userId || m.id,
      name: m.name,
      avatar: m.avatar || 'ST',
      hostel: m.hostel || '',
      phone: canSeePhone ? (m.phone || '') : '',
      role: m.role === 'Admin' ? 'Group Admin' : 'Member'
    })),
    createdAt: ride.created_at ? new Date(ride.created_at).toISOString() : new Date().toISOString()
  };
}

async function findGroupOrCityRide(id) {
  if (String(id).startsWith('cr_')) {
    const cityRide = await CityRide.findOne({ id });
    return { group: null, cityRide };
  }
  const group = await Group.findOne({ id });
  if (group) return { group, cityRide: null };
  const cityRide = await CityRide.findOne({ id });
  return { group: null, cityRide };
}

const router = express.Router();

// All group routes require authentication
router.use(requireAuth);

// 1. Group list endpoints return caller's active groups & joined community rides (GET /api/groups/mine & GET /api/groups)
router.get('/', async (req, res, next) => {
  try {
    scheduleBackgroundCleanup();
    const list = await Group.find({
      $or: [
        { 'members.user_id': req.user.id },
        { 'members.userId': req.user.id },
        { 'members.id': req.user.id }
      ],
      status: { $in: ['Open', 'Confirmed'] }
    })
      .sort({ created_at: -1 })
      .lean();

    const cityRides = await CityRide.find({
      $or: [
        { 'members.user_id': req.user.id },
        { 'members.userId': req.user.id },
        { 'members.id': req.user.id },
        { creator_id: req.user.id }
      ],
      status: { $in: ['Open', 'Full'] }
    })
      .sort({ created_at: -1 })
      .lean();

    const merged = [
      ...list.map((g) => serializeGroup(g, req.user.id)),
      ...cityRides.map((r) => serializeCityRideAsGroup(r, req.user.id))
    ];

    res.json(merged);
  } catch (err) {
    next(err);
  }
});

router.get('/mine', async (req, res, next) => {
  try {
    scheduleBackgroundCleanup();
    const list = await Group.find({
      $or: [
        { 'members.user_id': req.user.id },
        { 'members.userId': req.user.id },
        { 'members.id': req.user.id }
      ],
      status: { $in: ['Open', 'Confirmed'] }
    })
      .sort({ created_at: -1 })
      .lean();

    const cityRides = await CityRide.find({
      $or: [
        { 'members.user_id': req.user.id },
        { 'members.userId': req.user.id },
        { 'members.id': req.user.id },
        { creator_id: req.user.id }
      ],
      status: { $in: ['Open', 'Full'] }
    })
      .sort({ created_at: -1 })
      .lean();

    const merged = [
      ...list.map((g) => serializeGroup(g, req.user.id)),
      ...cityRides.map((r) => serializeCityRideAsGroup(r, req.user.id))
    ];

    res.json(merged);
  } catch (err) {
    next(err);
  }
});

// 2. Group detail: MEMBERS ONLY (403 otherwise)
router.get('/:id', async (req, res, next) => {
  try {
    const { group, cityRide } = await findGroupOrCityRide(req.params.id);
    if (!group && !cityRide) {
      throw new HttpError(404, 'Group not found.');
    }

    if (cityRide) {
      const isMember = (cityRide.members || []).some(
        (m) => (m.user_id || m.userId || m.id) === req.user.id
      );
      if (!isMember) {
        throw new HttpError(
          403,
          'Forbidden: Group details and rider contacts are restricted to enrolled group members.'
        );
      }
      return res.json(serializeCityRideAsGroup(cityRide, req.user.id));
    }

    const isMember = (group.members || []).some(
      (m) => (m.user_id || m.userId || m.id) === req.user.id
    );
    if (!isMember) {
      throw new HttpError(
        403,
        'Forbidden: Group details and rider contacts are restricted to enrolled group members.'
      );
    }

    res.json(serializeGroup(group, req.user.id));
  } catch (err) {
    next(err);
  }
});

// 3. Create Group from caller's matching Journey: accepts { journeyId, pickupPoint } ONLY
router.post('/', async (req, res, next) => {
  try {
    const { journeyId, pickupPoint } = req.body;
    if (!journeyId) {
      throw new HttpError(400, 'A valid journeyId is required to create a group.');
    }

    const group = await createGroupFromJourney(req.user, journeyId, pickupPoint);
    res.status(201).json({
      success: true,
      group: serializeGroup(group, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 4. Join Group: caller must provide their matching journeyId (or joins community ride directly)
router.post('/:id/join', async (req, res, next) => {
  try {
    const { group, cityRide } = await findGroupOrCityRide(req.params.id);
    if (!group && !cityRide) {
      throw new HttpError(404, 'Group not found.');
    }

    if (cityRide) {
      if (req.user.joined_community !== cityRide.community_id) {
        throw new HttpError(
          403,
          'Forbidden: You can only join rides within your enrolled hometown community.'
        );
      }

      const isMember = (cityRide.members || []).some(
        (m) => (m.user_id || m.userId || m.id) === req.user.id
      );
      if (isMember) {
        throw new HttpError(400, 'You are already a member of this ride.');
      }

      if ((cityRide.members || []).length >= cityRide.max_capacity) {
        throw new HttpError(400, 'This ride is already full.');
      }

      // Single-Ride Policy: Check if user is already in an active Group or another CityRide
      const activeExistingGroup = await Group.findOne({
        status: { $in: ['Open', 'Confirmed'] },
        $or: [
          { 'members.user_id': req.user.id },
          { 'members.userId': req.user.id },
          { 'members.id': req.user.id }
        ]
      });
      if (activeExistingGroup) {
        throw new HttpError(
          409,
          `Single-Ride Policy: You are already enrolled in active Group #${activeExistingGroup.id} (${activeExistingGroup.destination_name}). Please leave it first before joining another ride.`
        );
      }

      const otherActiveRide = await CityRide.findOne({
        id: { $ne: cityRide.id },
        status: { $in: ['Open', 'Confirmed', 'Full'] },
        $or: [
          { 'members.user_id': req.user.id },
          { 'members.userId': req.user.id },
          { 'members.id': req.user.id }
        ]
      });
      if (otherActiveRide) {
        throw new HttpError(
          409,
          `Single-Ride Policy: You already belong to an active community ride to ${otherActiveRide.destination}. Please leave it first before joining another ride.`
        );
      }

      const existingMembers = [...(cityRide.members || [])];

      cityRide.members.push({
        id: crypto.randomUUID(),
        user_id: req.user.id,
        name: req.user.name,
        avatar: req.user.avatar || 'ST',
        hostel: req.user.hostel || '',
        phone: req.user.phone || '',
        role: 'Member',
        joined_at: new Date()
      });
      cityRide.current_members_count = cityRide.members.length;
      if (cityRide.members.length >= cityRide.max_capacity) {
        cityRide.status = 'Full';
      }
      await cityRide.save();

      await User.updateOne({ id: req.user.id }, { $set: { active_group_id: cityRide.id } });

      // Notify existing members
      for (const m of existingMembers) {
        const memberId = m.user_id || m.userId || m.id;
        if (memberId && memberId !== req.user.id) {
          notifyUser(memberId, 'member_joined', {
            groupId: cityRide.id,
            destinationName: `${cityRide.destination} (${cityRide.community_name})`,
            joinerId: req.user.id,
            joinerName: req.user.name,
            joinerHostel: req.user.hostel || 'Hostel',
            membersCount: cityRide.members.length,
            maxMembers: cityRide.max_capacity
          });
        }
      }

      return res.json({
        success: true,
        group: serializeCityRideAsGroup(cityRide, req.user.id)
      });
    }

    const { journeyId } = req.body;
    if (!journeyId) {
      throw new HttpError(400, 'A valid journeyId is required to join a travel group.');
    }

    const updated = await joinGroupWithJourney(req.user, group.id, journeyId);
    res.json({
      success: true,
      group: serializeGroup(updated, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 5. Leave Group (with late cancellation reliability penalty)
router.post('/:id/leave', async (req, res, next) => {
  try {
    const { group, cityRide } = await findGroupOrCityRide(req.params.id);
    if (!group && !cityRide) {
      throw new HttpError(404, 'Group not found.');
    }

    if (cityRide) {
      const memberIdx = (cityRide.members || []).findIndex(
        (m) => (m.user_id || m.userId || m.id) === req.user.id
      );
      if (memberIdx === -1) {
        throw new HttpError(400, 'You are not a member of this travel group.');
      }
      cityRide.members.splice(memberIdx, 1);
      cityRide.current_members_count = cityRide.members.length;
      if (cityRide.members.length === 0) {
        await CityRide.deleteOne({ id: cityRide.id });
        await User.updateOne({ id: req.user.id, active_group_id: cityRide.id }, { $set: { active_group_id: null } });
        return res.json({ message: 'Ride vacated and removed.', removed: true });
      }
      if (cityRide.creator_id === req.user.id && cityRide.members.length > 0) {
        cityRide.creator_id = cityRide.members[0].user_id || cityRide.members[0].userId || cityRide.members[0].id;
        cityRide.creator_name = cityRide.members[0].name;
        cityRide.members[0].role = 'Admin';
      }
      if (cityRide.status === 'Full' && cityRide.members.length < cityRide.max_capacity) {
        cityRide.status = 'Open';
      }
      await cityRide.save();
      await User.updateOne({ id: req.user.id, active_group_id: cityRide.id }, { $set: { active_group_id: null } });

      // Notify remaining members with an on-screen toast popup
      for (const m of cityRide.members) {
        const memberId = m.user_id || m.userId || m.id;
        if (memberId && memberId !== req.user.id) {
          notifyUser(memberId, 'member_left', {
            groupId: cityRide.id,
            destinationName: `${cityRide.destination} (${cityRide.community_name || 'Community'})`,
            leaverId: req.user.id,
            leaverName: req.user.name,
            remainingMembersCount: cityRide.members.length,
            maxMembers: cityRide.max_capacity || 4
          });
        }
      }

      notifyGroupMembersUpdated(serializeCityRideAsGroup(cityRide, req.user.id));

      return res.json({ message: 'Successfully left the ride.' });
    }

    const result = await leaveGroup(req.user, group.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 6. Confirm Group: Admin only
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const { group, cityRide } = await findGroupOrCityRide(req.params.id);
    if (!group && !cityRide) throw new HttpError(404, 'Group not found.');

    if (cityRide) {
      const isAdmin =
        cityRide.creator_id === req.user.id ||
        (cityRide.members || []).some(
          (m) => (m.user_id || m.userId || m.id) === req.user.id && m.role === 'Admin'
        );
      if (!isAdmin) {
        throw new HttpError(403, 'Forbidden: Only the group admin can confirm this journey.');
      }
      cityRide.status = 'Confirmed';
      cityRide.confirmed_at = new Date();
      cityRide.confirmed_by = req.user.id;
      await cityRide.save();

      const serializedRide = serializeCityRideAsGroup(cityRide, req.user.id);

      // Notify all other members that journey is confirmed and numbers are now visible
      for (const m of cityRide.members || []) {
        const memberId = m.user_id || m.userId || m.id;
        if (memberId && memberId !== req.user.id) {
          notifyUser(memberId, 'group_confirmed', {
            groupId: cityRide.id,
            destinationName: `${cityRide.destination} (${cityRide.community_name || 'Community'})`
          });
        }
      }

      notifyGroup(cityRide.id, 'group_confirmed', {
        groupId: cityRide.id,
        group: serializedRide
      });
      notifyGroupMembersUpdated(serializedRide);

      return res.json({
        success: true,
        group: serializedRide
      });
    }

    if (group.admin_id !== req.user.id) {
      throw new HttpError(403, 'Forbidden: Only the group admin can confirm this journey.');
    }

    group.status = 'Confirmed';
    group.confirmed_at = new Date();
    group.confirmed_by = req.user.id;
    await group.save();

    const serialized = serializeGroup(group, req.user.id);

    // Notify all other members that journey is confirmed and numbers are now visible
    for (const m of group.members || []) {
      const memberId = m.user_id || m.userId || m.id;
      if (memberId && memberId !== req.user.id) {
        notifyUser(memberId, 'group_confirmed', {
          groupId: group.id,
          destinationName: group.destination_name
        });
      }
    }

    notifyGroup(group.id, 'group_confirmed', {
      groupId: group.id,
      group: serialized
    });
    notifyGroupMembersUpdated(group);

    res.json({
      success: true,
      group: serialized
    });
  } catch (err) {
    next(err);
  }
});

// 7. Change Pickup Point: Admin only (Supports both POST and PATCH for API consistency)
const handlePickupPointUpdate = async (req, res, next) => {
  try {
    const { pickupPoint } = req.body;
    if (!pickupPoint || !ALLOWED_PICKUP_POINTS.includes(pickupPoint.trim())) {
      throw new HttpError(
        400,
        `Invalid pickup point. Allowed points: ${ALLOWED_PICKUP_POINTS.join(', ')}`
      );
    }

    const group = await Group.findOne({ id: req.params.id });
    if (!group) throw new HttpError(404, 'Group not found.');

    if (group.admin_id !== req.user.id) {
      throw new HttpError(403, 'Forbidden: Only the group admin can update the pickup point.');
    }

    group.pickup_point = pickupPoint.trim();
    await group.save();

    notifyGroup(group.id, 'pickup_point_updated', {
      groupId: group.id,
      pickupPoint: group.pickup_point
    });
    notifyGroupMembersUpdated(group);

    res.json({
      success: true,
      pickupPoint: group.pickup_point,
      group: serializeGroup(group, req.user.id)
    });
  } catch (err) {
    next(err);
  }
};

router.post('/:id/pickup-point', handlePickupPointUpdate);
router.patch('/:id/pickup-point', handlePickupPointUpdate);

// 8. Complete Group: Admin only, on/after departure time
router.post('/:id/complete', async (req, res, next) => {
  try {
    const group = await completeGroup(req.user, req.params.id);
    res.json({
      success: true,
      message: 'Ride marked as completed. Trips incremented for all members.',
      group: serializeGroup(group, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 9. Rate Co-rider Punctuality (Strict 1 rating per co-rider per completed ride)
router.post('/:id/rate', async (req, res, next) => {
  try {
    const { targetUserId, rating } = req.body;
    const numRating = Number(rating);
    if (!targetUserId || isNaN(numRating) || numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
      throw new HttpError(400, 'Rating must be an integer between 1 and 5.');
    }

    const group = await Group.findOne({ id: req.params.id });
    if (!group) throw new HttpError(404, 'Group not found.');

    if (group.status !== 'Completed') {
      throw new HttpError(400, 'Ratings can only be submitted for completed rides.');
    }

    const isCallerMember = group.members.some((m) => m.user_id === req.user.id);
    const isTargetMember = group.members.some((m) => m.user_id === targetUserId);
    if (!isCallerMember || !isTargetMember || req.user.id === targetUserId) {
      throw new HttpError(403, 'You can only rate fellow co-riders from this ride.');
    }

    // Check if caller already rated this target co-rider for this ride
    const alreadyRated = group.ratings && group.ratings.some(
      (r) => r.rater_id === req.user.id && r.target_user_id === targetUserId
    );
    if (alreadyRated) {
      throw new HttpError(409, 'You have already rated this co-rider for this ride.');
    }

    // Atomic update to ensure no concurrent requests can duplicate rating
    const updatedGroup = await Group.findOneAndUpdate(
      {
        id: req.params.id,
        status: 'Completed',
        'members.user_id': { $all: [req.user.id, targetUserId] },
        ratings: {
          $not: {
            $elemMatch: { rater_id: req.user.id, target_user_id: targetUserId }
          }
        }
      },
      {
        $push: {
          ratings: {
            rater_id: req.user.id,
            target_user_id: targetUserId,
            rating: numRating,
            rated_at: new Date()
          }
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedGroup) {
      throw new HttpError(409, 'You have already rated this co-rider for this ride.');
    }

    const targetUser = await User.findOne({ id: targetUserId });
    if (!targetUser) throw new HttpError(404, 'Target rider not found.');

    // Running average update
    const currentRel = targetUser.reliability ?? 5.0;
    const updatedRel = Math.max(1.0, Math.min(5.0, +((currentRel * 4 + numRating) / 5).toFixed(1)));
    targetUser.reliability = updatedRel;
    await targetUser.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully.'
    });
  } catch (err) {
    next(err);
  }
});

// 10. Group Messages: MEMBERS ONLY (403 otherwise), paginated last 100
router.get('/:id/messages', async (req, res, next) => {
  try {
    const { group, cityRide } = await findGroupOrCityRide(req.params.id);
    if (!group && !cityRide) {
      throw new HttpError(404, 'Group not found.');
    }

    let isMember = false;
    if (cityRide) {
      isMember = (cityRide.members || []).some(
        (m) => (m.user_id || m.userId || m.id) === req.user.id
      );
    } else {
      isMember = (group.members || []).some(
        (m) => (m.user_id || m.userId || m.id) === req.user.id
      );
    }

    if (!isMember) {
      throw new HttpError(403, 'Forbidden: Group chat is restricted to enrolled members.');
    }

    const msgs = await Message.find({ group_id: req.params.id })
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    // Reverse to chronological order
    msgs.reverse();
    res.json(msgs.map(serializeMessage));
  } catch (err) {
    next(err);
  }
});

// 11. Send Message: MEMBERS ONLY, 1-500 chars
router.post('/:id/messages', validateChatMessage, async (req, res, next) => {
  try {
    const { group, cityRide } = await findGroupOrCityRide(req.params.id);
    if (!group && !cityRide) {
      throw new HttpError(404, 'Group not found.');
    }

    let destinationName = '';
    let members = [];
    if (cityRide) {
      const isMember = (cityRide.members || []).some(
        (m) => (m.user_id || m.userId || m.id) === req.user.id
      );
      if (!isMember) {
        throw new HttpError(403, 'Forbidden: Only group members can send messages.');
      }
      destinationName = `${cityRide.destination} (${cityRide.community_name})`;
      members = cityRide.members || [];
    } else {
      const isMember = (group.members || []).some(
        (m) => (m.user_id || m.userId || m.id) === req.user.id
      );
      if (!isMember) {
        throw new HttpError(403, 'Forbidden: Only group members can send messages.');
      }
      destinationName = group.destination_name;
      members = group.members || [];
    }

    const newMsg = await Message.create({
      id: crypto.randomUUID(),
      group_id: req.params.id,
      sender_id: req.user.id,
      sender_name: req.user.name,
      avatar: req.user.avatar || 'ST',
      text: req.body.text
    });

    const serialized = serializeMessage(newMsg);

    // Notify room
    notifyGroup(req.params.id, 'new_message', {
      groupId: req.params.id,
      message: serialized
    });

    // Notify each member for in-app toast
    for (const m of members) {
      const memberId = m.user_id || m.userId || m.id;
      if (memberId && memberId !== req.user.id) {
        notifyUser(memberId, 'new_chat_message', {
          groupId: req.params.id,
          destinationName,
          senderId: req.user.id,
          senderName: req.user.name,
          avatar: req.user.avatar,
          text: newMsg.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    res.status(201).json({
      success: true,
      message: serialized
    });
  } catch (err) {
    next(err);
  }
});

// 12. Fare Split Calculator: Members only
router.post('/:id/fare-split', async (req, res, next) => {
  try {
    const group = await Group.findOne({ id: req.params.id }).lean();
    if (!group) throw new HttpError(404, 'Group not found.');

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
    if (!isMember) {
      throw new HttpError(403, 'Forbidden: Fare split is restricted to group members.');
    }

    const totalAmount = Number(req.body.totalAmount);
    const tip = Number(req.body.tip) || 0;
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new HttpError(400, 'Please enter a valid total fare amount.');
    }

    const memberCount = Math.max(1, (group.members || []).length);
    const total = totalAmount + tip;
    const perRider = Math.ceil(total / memberCount);

    res.json({
      success: true,
      totalAmount,
      tip,
      totalWithTip: total,
      memberCount,
      splitPerPerson: perRider,
      summary: `Total ₹${total} split equally among ${memberCount} riders = ₹${perRider} each.`
    });
  } catch (err) {
    next(err);
  }
});

// 13. Confirmed Ride History: returns past completed groups and completed community rides for current user
router.get('/history/mine', async (req, res, next) => {
  try {
    await cleanupExpiredGroups();
    const list = await Group.find({
      $or: [
        { 'members.user_id': req.user.id },
        { 'members.userId': req.user.id },
        { 'members.id': req.user.id }
      ],
      status: 'Completed'
    })
      .sort({ created_at: -1 })
      .lean();

    const completedCityRides = await CityRide.find({
      $or: [
        { 'members.user_id': req.user.id },
        { 'members.userId': req.user.id },
        { 'members.id': req.user.id },
        { creator_id: req.user.id }
      ],
      status: 'Completed'
    })
      .sort({ created_at: -1 })
      .lean();

    const merged = [
      ...list.map((g) => serializeGroup(g, req.user.id)),
      ...completedCityRides.map((r) => serializeCityRideAsGroup(r, req.user.id))
    ];

    res.json(merged);
  } catch (err) {
    next(err);
  }
});

// 14. Reschedule Group Slot: atomically change travel slot
router.post('/:id/reschedule', requireAuth, async (req, res, next) => {
  try {
    const result = await rescheduleGroupSlot({
      user: req.user,
      oldGroupId: req.params.id,
      ...req.body
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
