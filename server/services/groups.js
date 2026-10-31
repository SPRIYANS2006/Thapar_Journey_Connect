import crypto from 'node:crypto';
import { Group, Journey, User, Message, getNextGroupId } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';
import { getHoursUntilDeparture, normalizeDateStr, validateTravelDateTime } from '../utils/time.js';
import { notifyGroup, notifyGroupMembersUpdated } from './notifications.js';

export async function createGroupFromJourney(creatorUser, journeyId, pickupPoint) {
  // 1. Verify caller has an active searching journey
  const journey = await Journey.findOne({ id: journeyId, user_id: creatorUser.id });
  if (!journey) {
    throw new HttpError(404, 'Journey request not found or does not belong to you.');
  }

  // Verify departure time is not in the past today
  const timeValidation = validateTravelDateTime(journey.date, journey.departure_time);
  if (!timeValidation.valid) {
    throw new HttpError(400, timeValidation.error);
  }

  // 2. Enforce Single-Ride Policy
  const activeExisting = await Group.findOne({
    status: { $in: ['Open', 'Confirmed'] },
    'members.user_id': creatorUser.id
  });
  if (activeExisting) {
    throw new HttpError(
      409,
      `Single-Ride Policy: You are already a member of active Group #${activeExisting.id} (${activeExisting.destination_name}). Please leave it before creating a new ride.`
    );
  }

  // 3. Determine vehicle capacity
  const maxMembers = journey.transport === 'Shared Auto' ? 3 : 4;
  const groupId = await getNextGroupId();

  const newGroup = await Group.create({
    id: groupId,
    destination_id: journey.destination_id,
    destination_name: journey.destination_name,
    departure_time: journey.departure_time,
    date: normalizeDateStr(journey.date),
    status: 'Open',
    transport: journey.transport || 'Shared Cab',
    max_members: maxMembers,
    pickup_point: pickupPoint || 'Main Gate (Near Executive Mess)',
    match_score: 100,
    admin_id: creatorUser.id,
    members: [
      {
        id: crypto.randomUUID(),
        user_id: creatorUser.id,
        name: creatorUser.name,
        avatar: creatorUser.avatar || 'ST',
        hostel: creatorUser.hostel || '',
        departure_time: journey.departure_time,
        role: 'Group Admin',
        phone: creatorUser.phone || '',
        joined_at: new Date()
      }
    ]
  });

  // 4. Update journey status
  journey.status = 'Grouped';
  await journey.save();

  // 5. Initial welcome message
  await Message.create({
    id: crypto.randomUUID(),
    group_id: groupId,
    sender_id: creatorUser.id,
    sender_name: creatorUser.name,
    avatar: creatorUser.avatar || 'ST',
    text: `Hey everyone! Group #${groupId} created for ${journey.destination_name}. Let's coordinate pickup time!`
  });

  notifyGroupMembersUpdated(newGroup);
  return newGroup;
}

export async function joinGroupWithJourney(user, groupId, journeyId) {
  // 1. Caller must provide their matching journey
  const journey = await Journey.findOne({ id: journeyId, user_id: user.id });
  if (!journey) {
    throw new HttpError(404, 'Journey request not found or does not belong to you.');
  }

  // 2. Fetch target group
  const group = await Group.findOne({ id: groupId });
  if (!group) {
    throw new HttpError(404, 'Group not found.');
  }

  // 3. Prevent duplicate join
  const isAlreadyMember = group.members.some((m) => m.user_id === user.id);
  if (isAlreadyMember) {
    throw new HttpError(400, 'You are already a member of this ride group.');
  }

  // 4. Enforce Single-Ride Policy across all groups
  const otherActive = await Group.findOne({
    id: { $ne: groupId },
    status: { $in: ['Open', 'Confirmed'] },
    'members.user_id': user.id
  });
  if (otherActive) {
    throw new HttpError(
      409,
      `Single-Ride Policy: You already belong to active Group #${otherActive.id} (${otherActive.destination_name}). Please leave it first before joining another.`
    );
  }

  // 5. Check capacity
  if (group.members.length >= (group.max_members || 4)) {
    throw new HttpError(409, 'Group is already at full capacity.');
  }

  // 5. Destination and date compatibility
  if (group.destination_id !== journey.destination_id) {
    throw new HttpError(400, 'Journey destination does not match group destination.');
  }
  if (normalizeDateStr(group.date) !== normalizeDateStr(journey.date)) {
    throw new HttpError(400, 'Journey date does not match group departure date.');
  }

  // 6. Atomic capacity and status check
  const newMember = {
    id: crypto.randomUUID(),
    user_id: user.id,
    name: user.name,
    avatar: user.avatar || 'ST',
    hostel: user.hostel || '',
    departure_time: journey.departure_time || group.departure_time,
    role: 'Member',
    phone: user.phone || '',
    joined_at: new Date()
  };

  const updatedGroup = await Group.findOneAndUpdate(
    {
      id: groupId,
      status: 'Open',
      $expr: { $lt: [{ $size: '$members' }, '$max_members'] },
      'members.user_id': { $ne: user.id }
    },
    {
      $push: { members: newMember }
    },
    { new: true }
  );

  if (!updatedGroup) {
    throw new HttpError(400, 'Unable to join group: group is full, closed, or already joined.');
  }

  // 7. Update journey status
  journey.status = 'Grouped';
  await journey.save();

  // 8. Add join announcement message
  const joinMsg = await Message.create({
    id: crypto.randomUUID(),
    group_id: groupId,
    sender_id: user.id,
    sender_name: user.name,
    avatar: user.avatar || 'ST',
    text: `Hi everyone! Just joined Group #${groupId}. Excited to share the ride!`
  });

  notifyGroup(groupId, 'new_message', {
    groupId,
    message: {
      id: joinMsg.id,
      groupId,
      senderId: user.id,
      senderName: user.name,
      avatar: user.avatar,
      text: joinMsg.text,
      time: joinMsg.created_at.toISOString()
    }
  });

  notifyGroupMembersUpdated(updatedGroup);
  return updatedGroup;
}

export async function leaveGroup(user, groupId) {
  const group = await Group.findOne({ id: groupId });
  if (!group) {
    throw new HttpError(404, 'Group not found.');
  }

  const memberIndex = group.members.findIndex(
    (m) =>
      (m.user_id && m.user_id === user.id) ||
      (m.userId && m.userId === user.id) ||
      (m.id && m.id === user.id)
  );
  if (memberIndex === -1) {
    throw new HttpError(400, 'You are not a member of this travel group.');
  }

  // Calculate hours left until departure
  const hoursLeft = getHoursUntilDeparture(group.date, group.departure_time);
  let penalty = 0.0;
  if (hoursLeft <= 0.5) {
    penalty = 0.8;
  } else if (hoursLeft <= 4.0) {
    penalty = 0.3;
  }

  let newReliability = user.reliability ?? 5.0;
  if (penalty > 0) {
    newReliability = Math.max(1.0, +(newReliability - penalty).toFixed(1));
    await User.updateOne({ id: user.id }, { $set: { reliability: newReliability } });
    user.reliability = newReliability;
  }

  // Remove user from group members
  group.members.splice(memberIndex, 1);

  if (group.members.length === 0) {
    // Clean up empty group and messages
    await Group.deleteOne({ id: groupId });
    await Message.deleteMany({ group_id: groupId });
  } else {
    // If leaving member was admin or admin_id is missing, reassign to next rider
    const wasAdmin = group.admin_id === user.id || !group.admin_id;
    if (wasAdmin) {
      const nextMember = group.members[0];
      const nextAdminId = nextMember.user_id || nextMember.userId || nextMember.id;
      group.admin_id = nextAdminId;
      nextMember.user_id = nextAdminId;
      nextMember.role = 'Group Admin';
    }

    // Ensure admin_id is strictly a valid string before saving
    if (!group.admin_id && group.members.length > 0) {
      const fallbackMember = group.members[0];
      group.admin_id = fallbackMember.user_id || fallbackMember.userId || fallbackMember.id || 'admin';
    }

    await group.save();

    // Post policy notice in group chat
    const penaltyNotice = penalty > 0
      ? ` (Late cancellation penalty of -${penalty}⭐ applied)`
      : '';
    await Message.create({
      id: crypto.randomUUID(),
      group_id: groupId,
      sender_id: 'system',
      sender_name: 'Policy Alert',
      avatar: 'PA',
      text: `⚠️ Notice: ${user.name} left Group #${groupId}.${penaltyNotice}`
    });

    notifyGroupMembersUpdated(group);
  }

  // Restore any journey associated with this user back to Searching
  await Journey.updateMany(
    { user_id: user.id, destination_id: group.destination_id, status: 'Grouped' },
    { $set: { status: 'Searching' } }
  );

  return {
    success: true,
    penaltyApplied: penalty > 0,
    penaltyAmount: penalty,
    newReliability,
    hoursLeft
  };
}

// Automatically cleans up expired groups:
// 1. Confirmed groups whose departure time has passed -> transition to 'Completed' (kept as ride history).
// 2. Unconfirmed Open groups whose departure time has passed -> removed from campus.
export async function cleanupExpiredGroups() {
  try {
    const activeGroups = await Group.find({
      status: { $in: ['Open', 'Confirmed'] }
    });

    for (const group of activeGroups) {
      const hoursLeft = getHoursUntilDeparture(group.date, group.departure_time);
      if (hoursLeft < 0) {
        if (group.status === 'Confirmed') {
          // Atomically mark Confirmed group as Completed for history
          const updated = await Group.findOneAndUpdate(
            { id: group.id, status: 'Confirmed' },
            { $set: { status: 'Completed' } },
            { returnDocument: 'after' }
          );

          if (updated) {
            const memberUserIds = (updated.members || [])
              .map((m) => m.user_id || m.userId || m.id)
              .filter(Boolean);

            if (memberUserIds.length > 0) {
              await User.updateMany(
                { id: { $in: memberUserIds } },
                { $inc: { trips_completed: 1 } }
              );

              await Journey.updateMany(
                { user_id: { $in: memberUserIds }, destination_id: updated.destination_id, status: 'Grouped' },
                { $set: { status: 'Completed' } }
              );
            }

            notifyGroupMembersUpdated(updated);
          }
        } else if (group.status === 'Open') {
          // Unconfirmed open group whose departure time has passed -> Remove it
          const deleted = await Group.findOneAndDelete({ id: group.id, status: 'Open' });
          if (deleted) {
            const memberUserIds = (deleted.members || [])
              .map((m) => m.user_id || m.userId || m.id)
              .filter(Boolean);

            await Journey.updateMany(
              { user_id: { $in: memberUserIds }, destination_id: deleted.destination_id, status: 'Grouped' },
              { $set: { status: 'Expired' } }
            );

            await Message.deleteMany({ group_id: deleted.id });
          }
        }
      }
    }
  } catch (err) {
    console.warn('cleanupExpiredGroups error:', err.message);
  }
}

export async function completeGroup(adminUser, groupId) {
  const group = await Group.findOne({ id: groupId });
  if (!group) throw new HttpError(404, 'Group not found.');

  if (group.admin_id !== adminUser.id) {
    throw new HttpError(403, 'Forbidden: Only the group admin can mark this ride as completed.');
  }

  const hoursLeft = getHoursUntilDeparture(group.date, group.departure_time);
  if (hoursLeft > 0) {
    throw new HttpError(400, 'Cannot complete a ride before its scheduled departure time.');
  }

  group.status = 'Completed';
  await group.save();

  // Increment trips_completed for all members
  const memberUserIds = group.members.map((m) => m.user_id);
  await User.updateMany({ id: { $in: memberUserIds } }, { $inc: { trips_completed: 1 } });

  notifyGroupMembersUpdated(group);
  return group;
}
