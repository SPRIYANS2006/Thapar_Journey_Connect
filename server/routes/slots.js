import express from 'express';
import crypto from 'node:crypto';
import { Group, Destination, User, CityRide, Message, getNextGroupId } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { normalizeDateStr, getHoursUntilDeparture } from '../utils/time.js';
import { serializeGroup } from '../services/serializers.js';
import { notifyUser, notifyGroupMembersUpdated } from '../services/notifications.js';

const router = express.Router();

export function generateTenMinuteSlots(dateStr, destObj, vehicle, existingGroups = [], currentUserId = null) {
  const slots = [];
  const normalizedDate = normalizeDateStr(dateStr);
  const groupsByTime = new Map();

  for (const g of existingGroups) {
    if (g.departure_time) {
      groupsByTime.set(g.departure_time, g);
    }
  }

  // Parse destination base fare
  let baseFareNum = 200;
  if (destObj?.avg_cab_fare) {
    const match = String(destObj.avg_cab_fare).match(/\d[\d,]*/);
    if (match) {
      baseFareNum = parseInt(match[0].replace(/,/g, ''), 10) || 200;
    }
  }

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 10) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const hoursLeft = getHoursUntilDeparture(normalizedDate, timeStr);
      const isPast = hoursLeft < -5 / 60;

      const group = groupsByTime.get(timeStr);
      const slotVehicle = group ? group.transport : (vehicle === 'Either' || !vehicle ? 'Shared Cab' : vehicle);
      const slotKey = group?.slot_key || `${destObj.id}_${normalizedDate}_${timeStr}_${slotVehicle}`;

      const maxSeats = group?.max_members || (slotVehicle === 'Shared Auto' ? 3 : 4);
      const seatsFilled = group?.members ? group.members.length : 0;
      const isFull = Boolean(seatsFilled >= maxSeats || (group && (group.status === 'Full' || group.status === 'Completed')));
      const isJoined = Boolean(
        currentUserId &&
        group?.members &&
        group.members.some((mem) => (mem.user_id || mem.userId || mem.id) === currentUserId)
      );

      const isFillingFast = seatsFilled >= 2 && !isFull;
      const perPersonFare = seatsFilled > 0
        ? Math.round(baseFareNum / seatsFilled)
        : Math.round(baseFareNum / maxSeats);

      slots.push({
        slotKey,
        time: timeStr,
        date: normalizedDate,
        destinationId: destObj.id,
        destinationName: destObj.name,
        vehicle: slotVehicle,
        maxSeats,
        seatsFilled,
        isFull,
        isJoined,
        isPast,
        isFillingFast,
        estimatedFarePerPerson: perPersonFare,
        totalFare: baseFareNum,
        groupId: group ? group.id : null,
        status: group ? group.status : 'Open',
        members: (group?.members || []).map((mem) => ({
          id: mem.user_id || mem.userId || mem.id,
          name: mem.name,
          avatar: mem.avatar || 'ST',
          hostel: mem.hostel || '',
          role: mem.role || 'Member',
          reliability: typeof mem.reliability === 'number' ? mem.reliability : 5.0
        }))
      });
    }
  }

  return slots;
}

// 1. GET /api/slots: Returns merged list of 10-minute slots (virtual and real)
router.get('/', async (req, res, next) => {
  try {
    const { destinationId, date, vehicle } = req.query;

    if (!destinationId) {
      throw new HttpError(400, 'Destination ID is required.');
    }

    let destination = await Destination.findOne({ id: destinationId }).lean();
    if (!destination) {
      destination = {
        id: destinationId,
        name: destinationId.replace(/^dest_/, '').replace(/_/g, ' ').toUpperCase(),
        avg_cab_fare: '₹200 total'
      };
    }

    const travelDate = normalizeDateStr(date || 'Today');

    // Query active groups for this destination & date
    const groupQuery = {
      destination_id: destinationId,
      date: travelDate,
      status: { $in: ['Open', 'Confirmed'] }
    };
    if (vehicle && vehicle !== 'Either') {
      groupQuery.transport = vehicle;
    }

    const existingGroups = await Group.find(groupQuery).lean();

    // Authenticated user ID (optional on GET for personalization)
    const currentUserId = req.user?.id || null;

    const slots = generateTenMinuteSlots(
      travelDate,
      destination,
      vehicle || 'Shared Cab',
      existingGroups,
      currentUserId
    );

    res.json({
      success: true,
      destination: {
        id: destination.id,
        name: destination.name,
        avgCabFare: destination.avg_cab_fare
      },
      date: travelDate,
      vehicle: vehicle || 'Either',
      totalSlots: slots.length,
      availableSlotsCount: slots.filter((s) => !s.isPast && !s.isFull).length,
      slots
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/slots/join: Atomic join or lazy group creation with strict capacity & single-ride enforcement
router.post('/join', requireAuth, async (req, res, next) => {
  try {
    const { destinationId, date, time, vehicle, pickupPoint } = req.body;
    if (!destinationId || !time) {
      throw new HttpError(400, 'Destination and departure time are required.');
    }

    const selectedVehicle = ['Shared Cab', 'Shared Auto'].includes(vehicle) ? vehicle : 'Shared Cab';
    const travelDate = normalizeDateStr(date || 'Today');

    // Departure time cannot be in the past
    const hoursLeft = getHoursUntilDeparture(travelDate, time);
    if (hoursLeft < -5 / 60) {
      throw new HttpError(400, 'Cannot book a travel slot in the past.');
    }

    // Lookup destination
    let destination = await Destination.findOne({ id: destinationId }).lean();
    if (!destination) {
      destination = {
        id: destinationId,
        name: destinationId.replace(/^dest_/, '').replace(/_/g, ' ').toUpperCase()
      };
    }

    const slotKey = `${destinationId}_${travelDate}_${time}_${selectedVehicle}`;
    const maxCapacity = selectedVehicle === 'Shared Auto' ? 3 : 4;
    const resolvedPickupPoint = pickupPoint || 'Main Gate (Near Executive Mess)';

    // Single-Ride Policy check across regular Groups & City Community Rides
    const activeGroup = await Group.findOne({
      status: { $in: ['Open', 'Confirmed'] },
      $or: [
        { 'members.user_id': req.user.id },
        { 'members.userId': req.user.id },
        { 'members.id': req.user.id }
      ]
    });

    if (activeGroup) {
      const isAlreadyInThisSlot =
        activeGroup.slot_key === slotKey ||
        (activeGroup.destination_id === destinationId &&
          activeGroup.date === travelDate &&
          activeGroup.departure_time === time);

      if (isAlreadyInThisSlot) {
        return res.json({
          success: true,
          message: `You are already enrolled in Group #${activeGroup.id}.`,
          group: serializeGroup(activeGroup, req.user.id),
          alreadyMember: true
        });
      }

      throw new HttpError(
        409,
        `Single-Ride Policy: You are already enrolled in active Group #${activeGroup.id} (${activeGroup.destination_name}). Please leave or reschedule it before joining another ride.`
      );
    }

    const otherActiveRide = await CityRide.findOne({
      status: { $in: ['Open', 'Confirmed', 'Full'] },
      $or: [
        { 'members.user_id': req.user.id },
        { 'members.userId': req.user.id },
        { 'members.id': req.user.id },
        { creator_id: req.user.id }
      ]
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
      departure_time: time,
      role: 'Member',
      phone: req.user.phone || '',
      joined_at: new Date()
    };

    // Check if group already exists for this slot
    let group = await Group.findOne({
      $or: [
        { slot_key: slotKey },
        { destination_id: destinationId, date: travelDate, departure_time: time, transport: selectedVehicle }
      ]
    });

    if (group) {
      // Existing group -> Atomic join with capacity guard
      const updatedGroup = await Group.findOneAndUpdate(
        {
          id: group.id,
          status: 'Open',
          $expr: { $lt: [{ $size: '$members' }, '$max_members'] },
          'members.user_id': { $ne: req.user.id }
        },
        {
          $push: { members: newMember }
        },
        { returnDocument: 'after' }
      );

      if (!updatedGroup) {
        throw new HttpError(
          409,
          `This slot is now full (${group.members?.length || 4}/${group.max_members || 4} seats filled). Please select another slot.`
        );
      }

      await User.updateOne({ id: req.user.id }, { $set: { active_group_id: updatedGroup.id } });

      // Notify existing members
      const existingMembers = (group.members || []).filter(
        (m) => (m.user_id || m.userId || m.id) !== req.user.id
      );
      for (const em of existingMembers) {
        const memberId = em.user_id || em.userId || em.id;
        if (memberId) {
          notifyUser(memberId, 'member_joined', {
            groupId: updatedGroup.id,
            destinationName: updatedGroup.destination_name,
            joinerId: req.user.id,
            joinerName: req.user.name,
            joinerHostel: req.user.hostel || 'Campus',
            membersCount: updatedGroup.members.length,
            maxMembers: updatedGroup.max_members
          });
        }
      }

      notifyGroupMembersUpdated(updatedGroup);

      return res.json({
        success: true,
        message: `Successfully joined Group #${updatedGroup.id} for ${updatedGroup.destination_name} at ${time}.`,
        group: serializeGroup(updatedGroup, req.user.id),
        created: false
      });
    }

    // No group exists -> Lazy atomic group creation with sequential ID!
    const groupId = await getNextGroupId();
    newMember.role = 'Group Admin';

    let createdGroup;
    try {
      createdGroup = await Group.create({
        id: groupId,
        slot_key: slotKey,
        destination_id: destinationId,
        destination_name: destination.name || destinationId,
        departure_time: time,
        date: travelDate,
        status: 'Open',
        transport: selectedVehicle,
        max_members: maxCapacity,
        pickup_point: resolvedPickupPoint,
        match_score: 100,
        admin_id: req.user.id,
        members: [newMember]
      });
    } catch (err) {
      // Race condition handling if another user created with the same slot_key concurrently
      if (err.code === 11000) {
        const raceGroup = await Group.findOne({ slot_key: slotKey });
        if (raceGroup) {
          newMember.role = 'Member';
          const updatedRace = await Group.findOneAndUpdate(
            {
              id: raceGroup.id,
              status: 'Open',
              $expr: { $lt: [{ $size: '$members' }, '$max_members'] },
              'members.user_id': { $ne: req.user.id }
            },
            { $push: { members: newMember } },
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
            group: serializeGroup(updatedRace, req.user.id),
            created: false
          });
        }
      }
      throw err;
    }

    await User.updateOne({ id: req.user.id }, { $set: { active_group_id: createdGroup.id } });

    // Initial group welcome message
    await Message.create({
      id: crypto.randomUUID(),
      group_id: groupId,
      sender_id: req.user.id,
      sender_name: req.user.name,
      avatar: req.user.avatar || 'ST',
      text: `Group #${groupId} formed for ${createdGroup.destination_name} at ${time}. Welcome co-riders!`
    });

    notifyGroupMembersUpdated(createdGroup);

    res.status(201).json({
      success: true,
      message: `Formed Group #${createdGroup.id} for ${createdGroup.destination_name} at ${time}!`,
      group: serializeGroup(createdGroup, req.user.id),
      created: true
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/slots/reschedule/preview: Check if moving will incur a reliability penalty
router.post('/reschedule/preview', requireAuth, async (req, res, next) => {
  try {
    const { oldGroupId } = req.body;
    if (!oldGroupId) {
      throw new HttpError(400, 'Current group ID is required.');
    }
    const oldGroup = await Group.findOne({ id: oldGroupId }).lean();
    if (!oldGroup) {
      throw new HttpError(404, 'Current group not found.');
    }
    const hoursLeft = getHoursUntilDeparture(oldGroup.date, oldGroup.departure_time);
    let penalty = 0.0;
    if (hoursLeft <= 0.5) {
      penalty = 0.8;
    } else if (hoursLeft <= 4.0) {
      penalty = 0.3;
    }
    res.json({
      success: true,
      hoursLeft: Math.max(0, +hoursLeft.toFixed(2)),
      penalty,
      willIncurPenalty: penalty > 0,
      oldDepartureTime: oldGroup.departure_time,
      oldDate: oldGroup.date
    });
  } catch (err) {
    next(err);
  }
});

// 4. POST /api/slots/reschedule: Atomic reschedule between slots with penalty enforcement & rollback safety
export async function rescheduleGroupSlot({
  user,
  oldGroupId,
  targetDestinationId,
  targetDate,
  targetTime,
  targetVehicle,
  targetPickupPoint
}) {
  if (!oldGroupId || !targetTime) {
    throw new HttpError(400, 'Current group ID and target departure time are required.');
  }

  const oldGroup = await Group.findOne({ id: oldGroupId });
  if (!oldGroup) {
    throw new HttpError(404, 'Current group not found.');
  }

  // Must be a member of oldGroup
  const memberIndex = (oldGroup.members || []).findIndex(
    (m) => (m.user_id || m.userId || m.id) === user.id
  );
  if (memberIndex === -1) {
    throw new HttpError(403, 'You are not a member of this travel group.');
  }

  const destId = targetDestinationId || oldGroup.destination_id;
  const destDoc = await Destination.findOne({ id: destId }).lean();
  const destName = destDoc?.name || oldGroup.destination_name || destId;

  const normalizedDate = normalizeDateStr(targetDate || oldGroup.date);
  const selectedVehicle = ['Shared Cab', 'Shared Auto'].includes(targetVehicle)
    ? targetVehicle
    : (oldGroup.transport || 'Shared Cab');

  const slotKey = `${destId}_${normalizedDate}_${targetTime}_${selectedVehicle}`;

  // Cannot reschedule to the exact same slot
  if (
    (oldGroup.slot_key && oldGroup.slot_key === slotKey) ||
    (oldGroup.destination_id === destId &&
      oldGroup.date === normalizedDate &&
      oldGroup.departure_time === targetTime &&
      oldGroup.transport === selectedVehicle)
  ) {
    throw new HttpError(400, 'You are already in this travel slot.');
  }

  // Departure time cannot be in the past
  const hoursToTarget = getHoursUntilDeparture(normalizedDate, targetTime);
  if (hoursToTarget < -5 / 60) {
    throw new HttpError(400, 'Cannot move to a travel slot in the past.');
  }

  // Check penalty on oldGroup departure
  const hoursLeftOld = getHoursUntilDeparture(oldGroup.date, oldGroup.departure_time);
  let penalty = 0.0;
  if (hoursLeftOld <= 0.5) {
    penalty = 0.8;
  } else if (hoursLeftOld <= 4.0) {
    penalty = 0.3;
  }

  const maxCapacity = selectedVehicle === 'Shared Auto' ? 3 : 4;
  const resolvedPickup = targetPickupPoint || oldGroup.pickup_point || 'Main Gate (Near Executive Mess)';

  // Step 1: Join or create target slot ATOMICALLY first
  let targetGroup = await Group.findOne({
    $or: [
      { slot_key: slotKey },
      { destination_id: destId, date: normalizedDate, departure_time: targetTime, transport: selectedVehicle }
    ]
  });

  const newMember = {
    id: crypto.randomUUID(),
    user_id: user.id,
    name: user.name,
    avatar: user.avatar || 'ST',
    hostel: user.hostel || '',
    departure_time: targetTime,
    role: 'Member',
    phone: user.phone || '',
    joined_at: new Date()
  };

  let finalTargetGroup;

  if (targetGroup) {
    // Slot exists -> atomic capacity check and push
    finalTargetGroup = await Group.findOneAndUpdate(
      {
        id: targetGroup.id,
        status: 'Open',
        $expr: { $lt: [{ $size: '$members' }, '$max_members'] },
        'members.user_id': { $ne: user.id }
      },
      { $push: { members: newMember } },
      { returnDocument: 'after' }
    );

    if (!finalTargetGroup) {
      throw new HttpError(
        409,
        `The selected slot is full (${targetGroup.members?.length || 4}/${targetGroup.max_members || 4} seats). You remain safely in your current group.`
      );
    }
  } else {
    // Virtual slot -> lazy atomic group creation
    const newGroupId = await getNextGroupId();
    newMember.role = 'Group Admin';
    try {
      finalTargetGroup = await Group.create({
        id: newGroupId,
        slot_key: slotKey,
        destination_id: destId,
        destination_name: destName,
        departure_time: targetTime,
        date: normalizedDate,
        status: 'Open',
        transport: selectedVehicle,
        max_members: maxCapacity,
        pickup_point: resolvedPickup,
        match_score: 100,
        admin_id: user.id,
        members: [newMember]
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Concurrent race condition handling
        const raceGroup = await Group.findOne({ slot_key: slotKey });
        if (raceGroup) {
          newMember.role = 'Member';
          finalTargetGroup = await Group.findOneAndUpdate(
            {
              id: raceGroup.id,
              status: 'Open',
              $expr: { $lt: [{ $size: '$members' }, '$max_members'] },
              'members.user_id': { $ne: user.id }
            },
            { $push: { members: newMember } },
            { returnDocument: 'after' }
          );
          if (!finalTargetGroup) {
            throw new HttpError(409, 'Target slot was just filled. You remain safely in your current group.');
          }
        } else {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }
  }

  // Step 2: Now safely remove member from oldGroup
  oldGroup.members.splice(memberIndex, 1);

  if (oldGroup.members.length === 0) {
    await Group.deleteOne({ id: oldGroup.id });
    await Message.deleteMany({ group_id: oldGroup.id });
  } else {
    // Reassign admin if leaver was admin
    const wasAdmin = oldGroup.admin_id === user.id || !oldGroup.admin_id;
    if (wasAdmin) {
      const nextMember = oldGroup.members[0];
      const nextAdminId = nextMember.user_id || nextMember.userId || nextMember.id;
      oldGroup.admin_id = nextAdminId;
      nextMember.role = 'Group Admin';
    }
    await oldGroup.save();

    // Post notice in old group chat
    const penaltyNotice = penalty > 0 ? ` (Late rescheduling penalty: -${penalty}⭐)` : '';
    await Message.create({
      id: crypto.randomUUID(),
      group_id: oldGroup.id,
      sender_id: 'system',
      sender_name: 'Policy Alert',
      avatar: 'PA',
      text: `⚠️ Notice: ${user.name} rescheduled their journey to another travel slot.${penaltyNotice}`
    });

    notifyGroupMembersUpdated(oldGroup);

    // Notify remaining members of oldGroup
    for (const em of oldGroup.members) {
      const mId = em.user_id || em.userId || em.id;
      if (mId && mId !== user.id) {
        notifyUser(mId, 'member_left', {
          groupId: oldGroup.id,
          destinationName: oldGroup.destination_name,
          leaverId: user.id,
          leaverName: user.name,
          remainingMembersCount: oldGroup.members.length,
          maxMembers: oldGroup.max_members || 4
        });
      }
    }
  }

  // Step 3: Update user reliability & active group
  let newReliability = user.reliability ?? 5.0;
  if (penalty > 0) {
    newReliability = Math.max(1.0, +(newReliability - penalty).toFixed(1));
  }
  await User.updateOne(
    { id: user.id },
    { $set: { active_group_id: finalTargetGroup.id, reliability: newReliability } }
  );

  // Step 4: Notify new group
  const targetExistingMembers = (finalTargetGroup.members || []).filter(
    (m) => (m.user_id || m.userId || m.id) !== user.id
  );
  for (const em of targetExistingMembers) {
    const mId = em.user_id || em.userId || em.id;
    if (mId) {
      notifyUser(mId, 'member_joined', {
        groupId: finalTargetGroup.id,
        destinationName: finalTargetGroup.destination_name,
        joinerId: user.id,
        joinerName: user.name,
        joinerHostel: user.hostel || 'Campus',
        membersCount: finalTargetGroup.members.length,
        maxMembers: finalTargetGroup.max_members
      });
    }
  }

  // Message in new group
  await Message.create({
    id: crypto.randomUUID(),
    group_id: finalTargetGroup.id,
    sender_id: user.id,
    sender_name: user.name,
    avatar: user.avatar || 'ST',
    text: `Hi co-riders! Rescheduled my ride to this slot.`
  });

  notifyGroupMembersUpdated(finalTargetGroup);

  return {
    success: true,
    message: `Successfully rescheduled your journey to ${finalTargetGroup.destination_name} at ${targetTime}!`,
    group: serializeGroup(finalTargetGroup, user.id),
    penaltyApplied: penalty > 0,
    penaltyAmount: penalty,
    newReliability
  };
}

router.post('/reschedule', requireAuth, async (req, res, next) => {
  try {
    const result = await rescheduleGroupSlot({
      user: req.user,
      ...req.body
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
