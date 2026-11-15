import { mutationLimit } from '../middleware/abuseLimit.js';
import { transactionalRouter, afterCommit } from '../services/transactions.js';
import { evictUserFromRoom } from '../services/notifications.js';
import express from 'express';
import crypto from 'node:crypto';
import {
  TravelGroup,
  TravelGroupMessage,
  Community
} from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import {
  serializeTravelGroup,
  serializeTravelGroupMessage
} from '../services/serializers.js';
import { notifyUser, notifyGroupMembersUpdated, getSocketIO } from '../services/notifications.js';
import { normalizeDateStr, validateTravelDateTime, getHoursUntilDeparture } from '../utils/time.js';

const router = transactionalRouter(express.Router());

// All travel group operations require authentication
router.use(requireAuth, mutationLimit);

// 1. List and search travel groups (Train / Bus) across all or specific communities
router.get('/', async (req, res, next) => {
  try {
    const { type, communityId, search, date, excludeJoined } = req.query;
    const filter = { status: 'Open' };
    if (excludeJoined === 'true') filter['members.user_id'] = { $ne: req.user.id };

    if (type && type !== 'All') {
      filter.type = type;
    }

    if (communityId && communityId !== 'All') {
      filter.community_id = communityId;
    }

    if (date && date !== 'All') {
      filter.date = date;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$or = [
        { title: searchRegex },
        { train_number: searchRegex },
        { bus_operator: searchRegex },
        { boarding_point: searchRegex },
        { destination: searchRegex },
        { community_name: searchRegex },
        { description: searchRegex }
      ];
    }

    const groups = await TravelGroup.find(filter)
      .sort({ date: 1, departure_time: 1, created_at: -1 })
      .lean();

    res.json(groups.filter(g => getHoursUntilDeparture(g.date, g.departure_time) > 0).map(g => serializeTravelGroup(g, req.user.id)));
  } catch (err) {
    next(err);
  }
});

// 2. Get travel groups joined by the current user
router.get('/mine', async (req, res, next) => {
  try {
    const groups = await TravelGroup.find({
      'members.user_id': req.user.id,
      status: { $ne: 'Cancelled' }
    })
      .sort({ date: 1, departure_time: 1 })
      .lean();

    res.json(groups.map((g) => serializeTravelGroup(g, req.user.id)));
  } catch (err) {
    next(err);
  }
});

// 3. Get single travel group detail
router.get('/:id', async (req, res, next) => {
  try {
    const group = await TravelGroup.findOne({ id: req.params.id }).lean();
    if (!group) {
      throw new HttpError(404, 'Travel group not found.');
    }

    res.json(serializeTravelGroup(group, req.user.id));
  } catch (err) {
    next(err);
  }
});

// 4. Create a new Travel Group (Train or Bus)
router.post('/', async (req, res, next) => {
  try {
    const {
      type,
      title,
      communityId,
      date,
      departureTime,
      boardingPoint,
      destination,
      trainNumber,
      travelClass,
      busOperator,
      description
    } = req.body;

    // Validate type
    if (!type || !['Train', 'Bus'].includes(type)) {
      throw new HttpError(400, 'Travel group type must be either "Train" or "Bus".');
    }

    // Validate community
    if (!communityId || typeof communityId !== 'string') {
      throw new HttpError(400, 'Please select a valid destination community.');
    }
    const community = await Community.findOne({ id: communityId }).lean();
    if (!community) {
      throw new HttpError(400, 'The selected destination community does not exist.');
    }

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      throw new HttpError(400, 'Group title must be at least 3 characters long.');
    }
    if (title.trim().length > 120) {
      throw new HttpError(400, 'Group title cannot exceed 120 characters.');
    }

    // Validate date & time
    if (!date) {
      throw new HttpError(400, 'Travel date is required.');
    }
    const normalizedDate = normalizeDateStr(date);
    if (!normalizedDate) {
      throw new HttpError(400, 'Invalid travel date format. Please use YYYY-MM-DD.');
    }

    if (!departureTime || typeof departureTime !== 'string' || !/^\d{1,2}:\d{2}$/.test(departureTime.trim())) {
      throw new HttpError(400, 'Valid departure time in HH:mm format is required.');
    }
    const cleanTime = departureTime.trim();
    const validation = validateTravelDateTime(normalizedDate, cleanTime);
    if (!validation.valid) throw new HttpError(400, validation.error);

    // Validate boardingPoint & destination
    if (!boardingPoint || typeof boardingPoint !== 'string' || !boardingPoint.trim()) {
      throw new HttpError(400, type === 'Train' ? 'Boarding station is required.' : 'Boarding point is required.');
    }
    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      throw new HttpError(400, 'Destination is required.');
    }

    // Type-specific validation
    let cleanTrainNumber = '';
    let cleanTravelClass = '';
    let cleanBusOperator = '';

    if (type === 'Train') {
      if (!trainNumber || typeof trainNumber !== 'string' || !trainNumber.trim()) {
        throw new HttpError(400, 'Train number / name is required for train travel groups.');
      }
      cleanTrainNumber = trainNumber.trim().slice(0, 100);
      cleanTravelClass = (travelClass || 'CC').trim().slice(0, 20);
    } else {
      if (!busOperator || typeof busOperator !== 'string' || !busOperator.trim()) {
        throw new HttpError(400, 'Bus operator name is required for bus travel groups.');
      }
      cleanBusOperator = busOperator.trim().slice(0, 100);
    }

    const newGroup = await TravelGroup.create({
      id: `tg_${crypto.randomUUID().slice(0, 8)}`,
      type,
      title: title.trim(),
      community_id: community.id,
      community_name: community.name,
      creator_id: req.user.id,
      creator_name: req.user.name,
      date: normalizedDate,
      departure_time: cleanTime,
      boarding_point: boardingPoint.trim().slice(0, 150),
      destination: destination.trim().slice(0, 150),
      train_number: cleanTrainNumber,
      travel_class: cleanTravelClass,
      bus_operator: cleanBusOperator,
      description: (description || '').trim().slice(0, 500),
      members_count: 1,
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

    notifyGroupMembersUpdated(newGroup);
    res.status(201).json({
      success: true,
      message: `${type} travel group created!`,
      group: serializeTravelGroup(newGroup, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 5. Join a Travel Group (Train / Bus)
// Cross-community discovery: students can join any travel group without changing hometown
router.post('/:id/join', async (req, res, next) => {
  try {
    const group = await TravelGroup.findOne({ id: req.params.id });
    if (!group) {
      throw new HttpError(404, 'Travel group not found.');
    }

    if (group.status !== 'Open' || getHoursUntilDeparture(group.date, group.departure_time) <= 0) throw new HttpError(409, 'This departure is closed. Choose an upcoming group.');

    // Prevent duplicate membership
    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
    if (isMember) {
      throw new HttpError(400, 'You are already a member of this travel group.');
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

    const updated = await TravelGroup.findOneAndUpdate(
      {
        id: req.params.id,
        'members.user_id': { $ne: req.user.id }
      },
      {
        $push: { members: newMember },
        $inc: { members_count: 1 }
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw new HttpError(400, 'Unable to join travel group: already joined.');
    }

    notifyGroupMembersUpdated(updated);
    res.json({
      success: true,
      message: `Joined ${updated.title}!`,
      group: serializeTravelGroup(updated, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 6. Leave a Travel Group
router.post('/:id/leave', async (req, res, next) => {
  try {
    const group = await TravelGroup.findOne({ id: req.params.id });
    if (!group) {
      throw new HttpError(404, 'Travel group not found.');
    }

    const memberIndex = (group.members || []).findIndex((m) => m.user_id === req.user.id);
    if (memberIndex === -1) {
      throw new HttpError(400, 'You are not a member of this travel group.');
    }

    const leavingWasAdmin = group.members[memberIndex].role === 'Admin';
    evictUserFromRoom(req.user.id, `tg_${group.id}`);
    group.members.splice(memberIndex, 1);
    notifyUser(req.user.id, 'journeys_updated', { groupId: group.id });
    group.members_count = group.members.length;

    // Admin succession if admin left
    if (leavingWasAdmin && group.members.length > 0) {
      group.members[0].role = 'Admin';
      group.creator_id = group.members[0].user_id;
      group.creator_name = group.members[0].name;
    }

    // Clean up if no members left
    if (group.members.length === 0) {
      await TravelGroup.deleteOne({ id: req.params.id });
      await TravelGroupMessage.deleteMany({ group_id: req.params.id });
      return res.json({
        success: true,
        message: 'You left the travel group. As no members remain, the group has been archived.',
        group: null
      });
    }

    await group.save();
    notifyGroupMembersUpdated(group);

    res.json({
      success: true,
      message: `Left ${group.title}.`,
      group: serializeTravelGroup(group, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 7. Get discussion messages for a Travel Group (Members only)
router.get('/:id/messages', async (req, res, next) => {
  try {
    const group = await TravelGroup.findOne({ id: req.params.id }).lean();
    if (!group) {
      throw new HttpError(404, 'Travel group not found.');
    }

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
    if (!isMember) {
      throw new HttpError(
        403,
        'Forbidden: You must join this travel group to view and participate in discussions.'
      );
    }

    const messages = await TravelGroupMessage.find({ group_id: group.id })
      .sort({ created_at: -1, _id: -1 })
      .limit(300)
      .lean();

    res.json(messages.reverse().map(serializeTravelGroupMessage));
  } catch (err) {
    next(err);
  }
});

// 8. Post a message in Travel Group chat (Members only)
router.post('/:id/messages', async (req, res, next) => {
  try {
    const group = await TravelGroup.findOne({ id: req.params.id });
    if (!group) {
      throw new HttpError(404, 'Travel group not found.');
    }

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
    if (!isMember) {
      throw new HttpError(
        403,
        'Forbidden: You must join this travel group before posting messages.'
      );
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new HttpError(400, 'Message text cannot be empty.');
    }
    if (text.trim().length > 1000) {
      throw new HttpError(400, 'Message cannot exceed 1000 characters.');
    }

    const newMsg = await TravelGroupMessage.create({
      id: `tgm_${crypto.randomUUID()}`,
      group_id: group.id,
      sender_id: req.user.id,
      sender_name: req.user.name,
      sender_avatar: req.user.avatar || 'ST',
      sender_hostel: req.user.hostel || '',
      text: text.trim(),
      created_at: new Date()
    });

    const serialized = serializeTravelGroupMessage(newMsg);

    // Broadcast to travel group room via Socket.IO
    const io = getSocketIO();
    if (io) {
      afterCommit(() => io.to(`tg_${group.id}`).emit('new_travel_group_message', {
        groupId: group.id,
        message: serialized
      }));
    }

    res.status(201).json({
      success: true,
      message: serialized
    });
  } catch (err) {
    next(err);
  }
});

export default router;
