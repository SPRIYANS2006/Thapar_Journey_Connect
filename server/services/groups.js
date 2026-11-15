import { completionUpdate } from './memberProfiles.js';
import { evictUserFromRoom } from './notifications.js';
import crypto from 'node:crypto';
import { runCommittedTransaction } from './transactions.js';
import { Group, User, Message, RideRecord, CityRide } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';
import { getHoursUntilDeparture } from '../utils/time.js';
import { notifyUser, notifyGroupMembersUpdated } from './notifications.js';

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

    evictUserFromRoom(user.id, `group_${groupId}`);
  if (!['Open', 'Confirmed'].includes(group.status)) throw new HttpError(409, 'This ride is closed.');

  // Calculate hours left until departure
  const hoursLeft = getHoursUntilDeparture(group.date, group.departure_time);
  let penalty = 0.0;
  if (hoursLeft >= 0 && hoursLeft <= 0.5) {
    penalty = 0.8;
  } else if (hoursLeft >= 0 && hoursLeft <= 4.0) {
    penalty = 0.3;
  }

  let newReliability = user.reliability ?? 5.0;
  if (penalty > 0) {
    newReliability = Math.max(1.0, +(newReliability - penalty).toFixed(1));
    await User.updateOne({ id: user.id }, { $set: { reliability: newReliability } });
    user.reliability = newReliability;
  }

  // Remove user and any companions added by this user from group members
  group.members = group.members.filter(
    (m) =>
      m.user_id !== user.id &&
      m.userId !== user.id &&
      m.id !== user.id &&
      m.added_by !== user.id
  );

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
      ? ` (Departure plans changed)`
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

    // Notify all remaining members with an on-screen toast popup
    for (const em of group.members) {
      const memberId = em.user_id || em.userId || em.id;
      if (memberId && memberId !== user.id) {
        notifyUser(memberId, 'member_left', {
          groupId: group.id,
          destinationName: group.destination_name,
          leaverId: user.id,
          leaverName: user.name,
          remainingMembersCount: group.members.length,
          maxMembers: group.max_members || 4
        });
      }
    }
  }


  // Release user's active ride reservation
  await User.updateOne({ id: user.id }, { $set: { active_group_id: null } });

  return {
    success: true,
    penaltyApplied: penalty > 0,
    penaltyAmount: penalty,
    newReliability,
    hoursLeft
  };
}

let lastCleanupTime = 0;

// Non-blocking throttled scheduler for API routes (runs at most once every 30s in background)
export function scheduleBackgroundCleanup() {
  const now = Date.now();
  if (now - lastCleanupTime > 30 * 1000) {
    lastCleanupTime = now;
    cleanupExpiredGroups().catch(() => {});
  }
}

// Automatically cleans up expired groups:
// 1. Confirmed groups whose departure time has passed -> transition to 'Completed' (kept as ride history).
// 2. Unconfirmed Open groups whose departure time has passed -> removed from campus.
export async function cleanupExpiredGroups() {
  return runCommittedTransaction(cleanupExpiredGroupsInternal);
}

async function cleanupExpiredGroupsInternal() {
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
            {
              $set: {
                status: 'Completed',
                completed_at: new Date(),
                completed_by: 'system_scheduler'
              }
            },
            { returnDocument: 'after' }
          );

          if (updated) {
            // Immutable auditable ride completion record
            await RideRecord.create({
              group_id: updated.id,
              destination_id: updated.destination_id,
              destination_name: updated.destination_name,
              departure_time: updated.departure_time,
              date: updated.date,
              transport: updated.transport,
              pickup_point: updated.pickup_point,
              admin_id: updated.admin_id,
              confirmed_at: updated.confirmed_at || new Date(),
              completed_at: updated.completed_at || new Date(),
              completed_by: 'system_scheduler',
              members: (updated.members || []).map((m) => ({
                user_id: m.user_id || m.userId || m.id,
                name: m.name,
                hostel: m.hostel || '',
                phone: m.phone || '',
                role: m.role || 'Member',
                joined_at: m.joined_at
              }))
            }).catch((err) => console.warn('RideRecord create error:', err.message));

            const memberUserIds = (updated.members || [])
              .map((m) => m.user_id || m.userId || m.id)
              .filter(Boolean);

            if (memberUserIds.length > 0) {
              await User.updateMany(
                { id: { $in: memberUserIds } },
                { $set: { active_group_id: null } }
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

            if (memberUserIds.length > 0) {
              await User.updateMany(
                { id: { $in: memberUserIds } },
                { $set: { active_group_id: null } }
              );
            }


            await Message.deleteMany({ group_id: deleted.id });
          }
        }
      }
    }

    // Also process City Community Rides whose departure time has passed
    const activeCityRides = await CityRide.find({
      status: { $in: ['Open', 'Confirmed', 'Full'] }
    });

    for (const ride of activeCityRides) {
      const hoursLeft = getHoursUntilDeparture(ride.date, ride.time);
      if (hoursLeft < 0) {
        if ((ride.members && ride.members.length > 0) || ride.status === 'Full' || ride.status === 'Confirmed') {
          ride.status = 'Completed';
          ride.completed_at = new Date();
          ride.completed_by = 'system_scheduler';
          await ride.save();

          const memberUserIds = (ride.members || [])
            .map((m) => m.user_id || m.userId || m.id)
            .filter(Boolean);

          if (memberUserIds.length > 0) {
            await User.updateMany(
              { id: { $in: memberUserIds } },
              { $set: { active_group_id: null } }
            );
          }
        } else {
          await CityRide.deleteOne({ id: ride.id });
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

  if (group.status === 'Completed') {
    throw new HttpError(400, 'This group has already been marked as completed.');
  }

  if (group.status !== 'Confirmed') {
    throw new HttpError(400, 'Only Confirmed groups can be marked as completed.');
  }

  const hoursLeft = getHoursUntilDeparture(group.date, group.departure_time);
  if (hoursLeft > 0) {
    throw new HttpError(400, 'Cannot complete a ride before its scheduled departure time.');
  }

  // Atomic transition from 'Confirmed' to 'Completed' to prevent race condition or duplicate increments
  const updatedGroup = await Group.findOneAndUpdate(
    { id: groupId, admin_id: adminUser.id, status: 'Confirmed' },
    {
      $set: {
        status: 'Completed',
        completed_at: new Date(),
        completed_by: adminUser.id
      }
    },
    { returnDocument: 'after' }
  );

  if (!updatedGroup) {
    throw new HttpError(409, 'Group was already completed or modified by another request.');
  }

  // Immutable auditable ride completion record
  await RideRecord.create({
    group_id: updatedGroup.id,
    destination_id: updatedGroup.destination_id,
    destination_name: updatedGroup.destination_name,
    departure_time: updatedGroup.departure_time,
    date: updatedGroup.date,
    transport: updatedGroup.transport,
    pickup_point: updatedGroup.pickup_point,
    admin_id: updatedGroup.admin_id,
    confirmed_at: updatedGroup.confirmed_at || new Date(),
    completed_at: updatedGroup.completed_at || new Date(),
    completed_by: adminUser.id,
    members: (updatedGroup.members || []).map((m) => ({
      user_id: m.user_id || m.userId || m.id,
      name: m.name,
      hostel: m.hostel || '',
      phone: m.phone || '',
      role: m.role || 'Member',
      joined_at: m.joined_at
    }))
  }).catch((err) => console.warn('RideRecord create error:', err.message));

  // Increment trips_completed for all members ONLY once on successful atomic transition
  const memberUserIds = (updatedGroup.members || [])
    .map((m) => m.user_id || m.userId || m.id)
    .filter(Boolean);

  if (memberUserIds.length > 0) {
    await User.updateMany(
      { id: { $in: memberUserIds } },
      completionUpdate, { updatePipeline: true }
    );

  }

  notifyGroupMembersUpdated(updatedGroup);
  return Group.findOne({ id: updatedGroup.id });
}
