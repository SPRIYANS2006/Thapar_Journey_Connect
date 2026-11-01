import express from 'express';
import crypto from 'node:crypto';
import {
  CommunityGroup,
  CommunityGroupMessage,
  Community,
  ALLOWED_COMMUNITY_GROUP_CATEGORIES
} from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import {
  serializeCommunityGroup,
  serializeCommunityGroupMessage
} from '../services/serializers.js';
import { getSocketIO } from '../services/notifications.js';

const router = express.Router();

// All community group operations require authentication
router.use(requireAuth);

// 1. List and search community groups with optional community and category filters
router.get('/', async (req, res, next) => {
  try {
    const { communityId, category, search } = req.query;
    const filter = {};

    if (communityId && communityId !== 'All') {
      filter.community_id = communityId;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { community_name: searchRegex }
      ];
    }

    const groups = await CommunityGroup.find(filter)
      .sort({ created_at: -1 })
      .lean();

    res.json(groups.map((g) => serializeCommunityGroup(g, req.user.id)));
  } catch (err) {
    next(err);
  }
});

// 2. Get single community group detail
router.get('/:id', async (req, res, next) => {
  try {
    const group = await CommunityGroup.findOne({ id: req.params.id }).lean();
    if (!group) {
      throw new HttpError(404, 'Community group not found.');
    }

    res.json(serializeCommunityGroup(group, req.user.id));
  } catch (err) {
    next(err);
  }
});

// 3. Create a new community group
router.post('/', async (req, res, next) => {
  try {
    const { name, description, communityId, category } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      throw new HttpError(400, 'Group name must be at least 3 characters long.');
    }
    if (name.trim().length > 100) {
      throw new HttpError(400, 'Group name cannot exceed 100 characters.');
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      throw new HttpError(400, 'Description must be at least 5 characters long.');
    }
    if (description.trim().length > 500) {
      throw new HttpError(400, 'Description cannot exceed 500 characters.');
    }

    if (!communityId || typeof communityId !== 'string') {
      throw new HttpError(400, 'Please select a valid hometown community.');
    }

    const community = await Community.findOne({ id: communityId }).lean();
    if (!community) {
      throw new HttpError(400, 'The selected hometown community does not exist.');
    }

    const selectedCategory = category || 'Commute Cohort';
    if (!ALLOWED_COMMUNITY_GROUP_CATEGORIES.includes(selectedCategory)) {
      throw new HttpError(
        400,
        `Invalid category. Allowed: ${ALLOWED_COMMUNITY_GROUP_CATEGORIES.join(', ')}`
      );
    }

    // Check for duplicate group name within the same community
    const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await CommunityGroup.findOne({
      community_id: community.id,
      name: new RegExp(`^${escapedName}$`, 'i')
    });
    if (existing) {
      throw new HttpError(
        400,
        `A group named "${name.trim()}" already exists in ${community.name}.`
      );
    }

    const newGroup = await CommunityGroup.create({
      id: `cg_${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      description: description.trim(),
      community_id: community.id,
      community_name: community.name,
      category: selectedCategory,
      creator_id: req.user.id,
      creator_name: req.user.name,
      members_count: 1,
      members: [
        {
          id: crypto.randomUUID(),
          user_id: req.user.id,
          name: req.user.name,
          avatar: req.user.avatar || 'ST',
          hostel: req.user.hostel || '',
          role: 'Admin',
          joined_at: new Date()
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Community group created successfully.',
      group: serializeCommunityGroup(newGroup, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 4. Join an existing community group (atomic duplicate-join prevention)
router.post('/:id/join', async (req, res, next) => {
  try {
    const group = await CommunityGroup.findOne({ id: req.params.id });
    if (!group) {
      throw new HttpError(404, 'Community group not found.');
    }

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
    if (isMember) {
      throw new HttpError(400, 'You are already a member of this community group.');
    }

    const newMember = {
      id: crypto.randomUUID(),
      user_id: req.user.id,
      name: req.user.name,
      avatar: req.user.avatar || 'ST',
      hostel: req.user.hostel || '',
      role: 'Member',
      joined_at: new Date()
    };

    const updated = await CommunityGroup.findOneAndUpdate(
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
      throw new HttpError(400, 'Unable to join group: already joined or group closed.');
    }

    res.json({
      success: true,
      message: `Joined ${updated.name}!`,
      group: serializeCommunityGroup(updated, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 5. Leave an existing community group
router.post('/:id/leave', async (req, res, next) => {
  try {
    const group = await CommunityGroup.findOne({ id: req.params.id });
    if (!group) {
      throw new HttpError(404, 'Community group not found.');
    }

    const memberIndex = (group.members || []).findIndex((m) => m.user_id === req.user.id);
    if (memberIndex === -1) {
      throw new HttpError(400, 'You are not a member of this community group.');
    }

    const leavingWasAdmin = group.members[memberIndex].role === 'Admin';
    group.members.splice(memberIndex, 1);
    group.members_count = group.members.length;

    // If leaving member was admin and other members remain, designate next member as Admin
    if (leavingWasAdmin && group.members.length > 0) {
      group.members[0].role = 'Admin';
    }

    if (group.members.length === 0) {
      await CommunityGroup.deleteOne({ id: req.params.id });
      await CommunityGroupMessage.deleteMany({ group_id: req.params.id });
      return res.json({
        success: true,
        message: 'You left the group. Since no members remained, the group has been archived.',
        group: null
      });
    }

    await group.save();

    res.json({
      success: true,
      message: `Left ${group.name}.`,
      group: serializeCommunityGroup(group, req.user.id)
    });
  } catch (err) {
    next(err);
  }
});

// 6. Get discussion messages for a community group (members only)
router.get('/:id/messages', async (req, res, next) => {
  try {
    const group = await CommunityGroup.findOne({ id: req.params.id }).lean();
    if (!group) {
      throw new HttpError(404, 'Community group not found.');
    }

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
    if (!isMember) {
      throw new HttpError(
        403,
        'Forbidden: You must join this community group to view and participate in discussions.'
      );
    }

    const messages = await CommunityGroupMessage.find({ group_id: group.id })
      .sort({ created_at: 1 })
      .limit(300)
      .lean();

    res.json(messages.map(serializeCommunityGroupMessage));
  } catch (err) {
    next(err);
  }
});

// 7. Post a discussion message in a community group (members only)
router.post('/:id/messages', async (req, res, next) => {
  try {
    const group = await CommunityGroup.findOne({ id: req.params.id });
    if (!group) {
      throw new HttpError(404, 'Community group not found.');
    }

    const isMember = (group.members || []).some((m) => m.user_id === req.user.id);
    if (!isMember) {
      throw new HttpError(
        403,
        'Forbidden: You must join this community group before posting messages.'
      );
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new HttpError(400, 'Message text cannot be empty.');
    }
    if (text.trim().length > 1000) {
      throw new HttpError(400, 'Message cannot exceed 1000 characters.');
    }

    const newMsg = await CommunityGroupMessage.create({
      id: `cgm_${crypto.randomUUID()}`,
      group_id: group.id,
      sender_id: req.user.id,
      sender_name: req.user.name,
      sender_avatar: req.user.avatar || 'ST',
      sender_hostel: req.user.hostel || '',
      text: text.trim(),
      created_at: new Date()
    });

    const serialized = serializeCommunityGroupMessage(newMsg);

    // Notify connected socket clients in group room if socket server available
    const io = getSocketIO();
    if (io) {
      io.to(`cg_${group.id}`).emit('new_community_group_message', {
        groupId: group.id,
        message: serialized
      });
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
