import express from 'express';
import crypto from 'node:crypto';
import { Luggage, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { normalizeDateStr, getHoursUntilDeparture } from '../utils/time.js';
import { serializeLuggage } from '../services/serializers.js';
import {
  calculateLuggageFare,
  DEFAULT_SLOT_CAPACITY,
  VEHICLE_CONFIG
} from '../config/luggagePricing.js';
import { notifyUser } from '../services/notifications.js';

const router = express.Router();

// Helper to notify vendor & student over sockets
function notifyLuggageUpdate(luggageDoc) {
  // Notify student
  notifyUser(luggageDoc.user_id, 'luggage_updated', {
    id: luggageDoc.id,
    status: luggageDoc.status,
    driverName: luggageDoc.driver_name,
    vehicleNumber: luggageDoc.vehicle_number,
    slotTime: luggageDoc.slot_time,
    date: luggageDoc.date
  });
}

// 1. GET /api/luggage/quote: Instant fare calculation with pooling discount
router.get('/quote', async (req, res, next) => {
  try {
    const { destination, date, time, vehicleType, items: rawItems } = req.query;

    let parsedItems = [];
    if (typeof rawItems === 'string') {
      try {
        parsedItems = JSON.parse(rawItems);
      } catch {
        parsedItems = [{ size: 'Medium', count: 1 }];
      }
    } else if (Array.isArray(rawItems)) {
      parsedItems = rawItems;
    } else {
      parsedItems = [{ size: 'Medium', count: 1 }];
    }

    const travelDate = normalizeDateStr(date || 'Today');
    const selectedVehicle = VEHICLE_CONFIG[vehicleType] ? vehicleType : 'Tempo/Mini-truck';

    // Count existing active orders for same destination + date + time for pooling
    let poolCount = 1;
    if (destination && time) {
      const existingInSlot = await Luggage.countDocuments({
        destination: new RegExp(destination.trim(), 'i'),
        date: travelDate,
        slot_time: time,
        status: { $in: ['Requested', 'Vendor Assigned', 'Picked Up', 'In Transit'] }
      });
      // Current user will be the (existingInSlot + 1)th in this pool
      poolCount = existingInSlot + 1;
    }

    const fareResult = calculateLuggageFare({
      destination: destination || '',
      vehicleType: selectedVehicle,
      items: parsedItems,
      poolCount
    });

    res.json({
      success: true,
      quote: fareResult
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/luggage/slots: 10-minute slot list with vendor capacity & pooling signals
router.get('/slots', async (req, res, next) => {
  try {
    const { destination, date, vehicleType: _vehicleType } = req.query;
    const travelDate = normalizeDateStr(date || 'Today');

    // Fetch existing active bookings for this date
    const query = {
      date: travelDate,
      status: { $in: ['Requested', 'Vendor Assigned', 'Picked Up', 'In Transit'] }
    };
    if (destination) {
      query.destination = new RegExp(destination.trim(), 'i');
    }

    const activeBookings = await Luggage.find(query).lean();

    // Map by slot_time
    const countByTime = new Map();
    for (const b of activeBookings) {
      countByTime.set(b.slot_time, (countByTime.get(b.slot_time) || 0) + 1);
    }

    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 10) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const hoursLeft = getHoursUntilDeparture(travelDate, timeStr);
        const isPast = hoursLeft < -5 / 60;

        const bookedCount = countByTime.get(timeStr) || 0;
        const capacity = DEFAULT_SLOT_CAPACITY;
        const isFull = bookedCount >= capacity;
        const hasPooling = bookedCount > 0 && !isFull;

        slots.push({
          time: timeStr,
          date: travelDate,
          capacity,
          bookedCount,
          isFull,
          isPast,
          hasPooling,
          poolMembersCount: bookedCount,
          message: isFull
            ? 'Capacity Reached'
            : hasPooling
            ? `Pool & Save: ${bookedCount} other student${bookedCount > 1 ? 's' : ''} sending luggage`
            : 'Available'
        });
      }
    }

    res.json({
      success: true,
      date: travelDate,
      destination: destination || 'Any Destination',
      totalSlots: slots.length,
      availableSlotsCount: slots.filter((s) => !s.isPast && !s.isFull).length,
      slots
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/luggage: Create a new luggage transport booking
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      pickupLocation,
      destination,
      destinationAddress,
      date,
      slotTime,
      items,
      notes,
      photoUrl,
      vehicleType
    } = req.body;

    if (!pickupLocation || !destination || !slotTime) {
      throw new HttpError(400, 'Pickup location, destination, and pickup slot are required.');
    }

    const travelDate = normalizeDateStr(date || 'Today');

    // Verify slot is not in the past
    const hoursLeft = getHoursUntilDeparture(travelDate, slotTime);
    if (hoursLeft < -5 / 60) {
      throw new HttpError(400, 'Cannot book a pickup slot in the past.');
    }

    // Verify slot capacity
    const currentSlotBookings = await Luggage.countDocuments({
      date: travelDate,
      slot_time: slotTime,
      status: { $in: ['Requested', 'Vendor Assigned', 'Picked Up', 'In Transit'] }
    });

    if (currentSlotBookings >= DEFAULT_SLOT_CAPACITY) {
      throw new HttpError(
        409,
        `Vendor capacity for slot ${slotTime} is fully booked (${currentSlotBookings}/${DEFAULT_SLOT_CAPACITY}). Please choose an adjacent 10-minute slot.`
      );
    }

    const selectedVehicle = VEHICLE_CONFIG[vehicleType] ? vehicleType : 'Tempo/Mini-truck';
    const parsedItems = Array.isArray(items) && items.length > 0
      ? items
      : [{ size: 'Medium', count: 1, notes: '' }];

    let totalItems = 0;
    for (const it of parsedItems) {
      totalItems += parseInt(it.count, 10) || 1;
    }

    // Calculate fare with pooling
    const poolCount = currentSlotBookings + 1;
    const fareDetails = calculateLuggageFare({
      destination,
      vehicleType: selectedVehicle,
      items: parsedItems,
      poolCount
    });

    const slotKey = `${destination.trim().toLowerCase()}_${travelDate}_${slotTime}`;
    const pickupOtp = String(Math.floor(1000 + Math.random() * 9000));
    const luggageId = 'LUG-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    const newLuggage = await Luggage.create({
      id: luggageId,
      user_id: req.user.id,
      user_name: req.user.name,
      user_phone: req.user.phone || '',
      user_hostel: req.user.hostel || '',
      pickup_location: pickupLocation,
      destination,
      destination_address: destinationAddress || '',
      date: travelDate,
      slot_time: slotTime,
      slot_key: slotKey,
      items: parsedItems,
      total_items_count: totalItems,
      notes: notes || '',
      photo_url: photoUrl || '',
      vehicle_type: selectedVehicle,
      estimated_fare: fareDetails.estimatedFare,
      base_fare: fareDetails.baseFare,
      pooled_savings: fareDetails.pooledSavings,
      pool_count: poolCount,
      payment_mode: 'Cash/UPI to Driver on Pickup',
      status: 'Requested',
      pickup_otp: pickupOtp,
      timeline: [
        {
          status: 'Requested',
          timestamp: new Date(),
          note: `Booking created for ${selectedVehicle}. Pick up at ${pickupLocation}.`,
          updated_by: req.user.name
        }
      ]
    });

    notifyLuggageUpdate(newLuggage);

    res.status(201).json({
      success: true,
      message: `Luggage transport request ${newLuggage.id} booked successfully!`,
      luggage: serializeLuggage(newLuggage, req.user.id, req.user.role)
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET /api/luggage/mine: Student's active & past luggage transport requests
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const list = await Luggage.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .lean();

    const serialized = list.map((item) =>
      serializeLuggage(item, req.user.id, req.user.role)
    );

    const active = serialized.filter(
      (it) => !['Delivered', 'Cancelled'].includes(it.status)
    );
    const past = serialized.filter((it) =>
      ['Delivered', 'Cancelled'].includes(it.status)
    );

    res.json({
      success: true,
      all: serialized,
      active,
      past
    });
  } catch (err) {
    next(err);
  }
});

// 5. GET /api/luggage/:id: Single request tracking details
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const luggage = await Luggage.findOne({ id: req.params.id }).lean();
    if (!luggage) {
      throw new HttpError(404, 'Luggage transport request not found.');
    }

    const isOwner = luggage.user_id === req.user.id;
    const isVendorOrAdmin = req.user.role === 'vendor' || req.user.role === 'admin';
    if (!isOwner && !isVendorOrAdmin) {
      throw new HttpError(403, 'You do not have permission to view this luggage order.');
    }

    res.json({
      success: true,
      luggage: serializeLuggage(luggage, req.user.id, req.user.role)
    });
  } catch (err) {
    next(err);
  }
});

// 6. POST /api/luggage/:id/cancel: Student can cancel before "Picked Up"
router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const luggage = await Luggage.findOne({ id: req.params.id });
    if (!luggage) {
      throw new HttpError(404, 'Luggage transport request not found.');
    }

    if (luggage.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new HttpError(403, 'You can only cancel your own luggage requests.');
    }

    if (['Picked Up', 'In Transit', 'Delivered'].includes(luggage.status)) {
      throw new HttpError(
        400,
        `Cannot cancel request in status "${luggage.status}". Belongings have already been collected by driver.`
      );
    }

    if (luggage.status === 'Cancelled') {
      return res.json({
        success: true,
        message: 'Request is already cancelled.',
        luggage: serializeLuggage(luggage, req.user.id, req.user.role)
      });
    }

    // Check hours left until slot
    const hoursLeft = getHoursUntilDeparture(luggage.date, luggage.slot_time);
    let penalty = 0.0;
    if (hoursLeft <= 0.5) {
      penalty = 0.5;
    } else if (hoursLeft <= 4.0) {
      penalty = 0.2;
    }

    luggage.status = 'Cancelled';
    luggage.timeline.push({
      status: 'Cancelled',
      timestamp: new Date(),
      note: `Cancelled by student.${penalty > 0 ? ` Late cancellation penalty (-${penalty}⭐)` : ''}`,
      updated_by: req.user.name
    });

    await luggage.save();

    if (penalty > 0) {
      const currentRel = req.user.reliability ?? 5.0;
      const newRel = Math.max(1.0, +(currentRel - penalty).toFixed(1));
      await User.updateOne({ id: req.user.id }, { $set: { reliability: newRel } });
    }

    notifyLuggageUpdate(luggage);

    res.json({
      success: true,
      message: `Luggage request ${luggage.id} has been cancelled.${penalty > 0 ? ` (Late penalty -${penalty}⭐ applied)` : ''}`,
      penaltyApplied: penalty > 0,
      penaltyAmount: penalty,
      luggage: serializeLuggage(luggage, req.user.id, req.user.role)
    });
  } catch (err) {
    next(err);
  }
});

// 7. POST /api/luggage/:id/reschedule: Reschedule date/slot before pickup
router.post('/:id/reschedule', requireAuth, async (req, res, next) => {
  try {
    const { targetDate, targetSlotTime } = req.body;
    if (!targetSlotTime) {
      throw new HttpError(400, 'Target pickup slot time is required.');
    }

    const luggage = await Luggage.findOne({ id: req.params.id });
    if (!luggage) {
      throw new HttpError(404, 'Luggage transport request not found.');
    }

    if (luggage.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new HttpError(403, 'You can only reschedule your own luggage requests.');
    }

    if (['Picked Up', 'In Transit', 'Delivered'].includes(luggage.status)) {
      throw new HttpError(
        400,
        `Cannot reschedule request in status "${luggage.status}". Luggage is already in transit.`
      );
    }

    const normalizedDate = normalizeDateStr(targetDate || luggage.date);

    // Verify not in past
    const hoursLeft = getHoursUntilDeparture(normalizedDate, targetSlotTime);
    if (hoursLeft < -5 / 60) {
      throw new HttpError(400, 'Cannot reschedule to a pickup slot in the past.');
    }

    // Check capacity
    const currentBookings = await Luggage.countDocuments({
      date: normalizedDate,
      slot_time: targetSlotTime,
      status: { $in: ['Requested', 'Vendor Assigned', 'Picked Up', 'In Transit'] }
    });

    if (currentBookings >= DEFAULT_SLOT_CAPACITY) {
      throw new HttpError(
        409,
        `Slot ${targetSlotTime} on ${normalizedDate} is at full vendor capacity. Please choose another slot.`
      );
    }

    const oldDate = luggage.date;
    const oldSlot = luggage.slot_time;
    luggage.date = normalizedDate;
    luggage.slot_time = targetSlotTime;
    luggage.slot_key = `${luggage.destination.trim().toLowerCase()}_${normalizedDate}_${targetSlotTime}`;

    luggage.timeline.push({
      status: luggage.status,
      timestamp: new Date(),
      note: `Pickup slot changed from ${oldSlot} (${oldDate}) to ${targetSlotTime} (${normalizedDate}).`,
      updated_by: req.user.name
    });

    await luggage.save();
    notifyLuggageUpdate(luggage);

    res.json({
      success: true,
      message: `Pickup rescheduled to ${targetSlotTime} on ${normalizedDate}.`,
      luggage: serializeLuggage(luggage, req.user.id, req.user.role)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
