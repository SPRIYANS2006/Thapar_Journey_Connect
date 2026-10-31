import express from 'express';
import crypto from 'node:crypto';
import { Group, Message } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import {
  createGroupFromJourney,
  joinGroupWithJourney,
  leaveGroup,
  completeGroup,
  cleanupExpiredGroups
} from '../services/groups.js';
import {
  serializeGroup,
  serializeMessage
} from '../services/serializers.js';
import {
  validateChatMessage,
  ALLOWED_PICKUP_POINTS
} from '../middleware/validate.js';
import { notifyGroup, notifyGroupMembersUpdated } from '../services/notifications.js';

const router = express.Router();

// All group routes require authentication
router.use(requireAuth);

// 1. Group list endpoints return ONLY caller's active groups (GET /api/groups/mine & GET /api/groups)
router.get('/', async (req, res, next) => {
  try {
    await cleanupExpiredGroups();
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
    res.json(list.map((g) => serializeGroup(g, req.user.id)));
  } catch (err) {
    next(err);
  }
});

router.get('/mine', async (req, res, next) => {
  try {
    await cleanupExpiredGroups();
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
    res.json(list.map((g) => serializeGroup(g, req.user.id)));
  } catch (err) {
    next(err);
  }
});

// 2. Group detail: MEMBERS ONLY (403 otherwise)
router.get('/:id', async (req, res, next) => {
  try {
    const group = await Group.findOne({ id: req.params.id }).lean();
    if (!group) {
      throw new HttpError(404, 'Group not found.');
    }

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
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

// 4. Join Group: caller must provide their matching journeyId
router.post('/:id/join', async (req, res, next) => {
  try {
    const { journeyId } = req.body;
    if (!journeyId) {
      throw new HttpError(400, 'A valid journeyId is required to join a travel group.');
    }

    const updated = await joinGroupWithJourney(req.user, req.params.id, journeyId);
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
    const result = await leaveGroup(req.user, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 6. Confirm Group: Admin only
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const group = await Group.findOne({ id: req.params.id });
    if (!group) throw new HttpError(404, 'Group not found.');

    if (group.admin_id !== req.user.id) {
      throw new HttpError(403, 'Forbidden: Only the group admin can confirm this journey.');
    }

    group.status = 'Confirmed';
    await group.save();

    notifyGroupMembersUpdated(group);
    res.json({
      success: true,
      group: serializeGroup(group, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 7. Change Pickup Point: Admin only
router.post('/:id/pickup-point', async (req, res, next) => {
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
});

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

// 9. Rate Co-rider Punctuality
router.post('/:id/rate', async (req, res, next) => {
  try {
    const { targetUserId, rating } = req.body;
    const numRating = Number(rating);
    if (!targetUserId || isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new HttpError(400, 'Rating must be an integer between 1 and 5.');
    }

    const group = await Group.findOne({ id: req.params.id });
    if (!group) throw new HttpError(404, 'Group not found.');

    const isCallerMember = group.members.some((m) => m.user_id === req.user.id);
    const isTargetMember = group.members.some((m) => m.user_id === targetUserId);
    if (!isCallerMember || !isTargetMember || req.user.id === targetUserId) {
      throw new HttpError(403, 'You can only rate fellow co-riders from this ride.');
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
    const group = await Group.findOne({ id: req.params.id }).lean();
    if (!group) throw new HttpError(404, 'Group not found.');

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
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
    const group = await Group.findOne({ id: req.params.id }).lean();
    if (!group) throw new HttpError(404, 'Group not found.');

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
    if (!isMember) {
      throw new HttpError(403, 'Forbidden: Only group members can send messages.');
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
    for (const m of group.members) {
      if (m.user_id !== req.user.id) {
        notifyGroup(req.params.id, 'new_chat_message', {
          groupId: req.params.id,
          destinationName: group.destination_name,
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

// 13. Confirmed Ride History: returns past completed/confirmed groups for current user
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

    res.json(list.map((g) => serializeGroup(g, req.user.id)));
  } catch (err) {
    next(err);
  }
});

export default router;
