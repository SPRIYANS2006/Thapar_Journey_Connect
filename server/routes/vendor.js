import express from 'express';
import { Luggage } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { normalizeDateStr } from '../utils/time.js';
import { serializeLuggage } from '../services/serializers.js';
import { notifyUser } from '../services/notifications.js';
import { DEFAULT_SLOT_CAPACITY, VEHICLE_CONFIG } from '../config/luggagePricing.js';

const router = express.Router();

// Role-based authorization middleware
function requireVendorOrAdmin(req, res, next) {
  if (!req.user || !['vendor', 'admin'].includes(req.user.role)) {
    throw new HttpError(403, 'Access restricted. Vendor or admin role required.');
  }
  next();
}

router.use(requireAuth);
router.use(requireVendorOrAdmin);

// 1. GET /api/vendor/requests: All requests grouped by date, slot, and destination
router.get('/requests', async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const query = {};

    if (date) {
      query.date = normalizeDateStr(date);
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const requests = await Luggage.find(query).sort({ created_at: -1 }).lean();
    const serialized = requests.map((r) => serializeLuggage(r, req.user.id, req.user.role));

    // Group pooled requests by date + slot_time + destination
    const groupedMap = new Map();
    for (const r of serialized) {
      const groupKey = `${r.date}__${r.slotTime}__${r.destination.toLowerCase()}`;
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          groupKey,
          date: r.date,
          slotTime: r.slotTime,
          destination: r.destination,
          totalOrders: 0,
          totalBags: 0,
          totalFare: 0,
          orders: []
        });
      }
      const g = groupedMap.get(groupKey);
      g.totalOrders += 1;
      g.totalBags += r.totalItemsCount || 1;
      g.totalFare += r.estimatedFare || 0;
      g.orders.push(r);
    }

    const groupedBatches = Array.from(groupedMap.values()).sort((a, b) =>
      a.slotTime.localeCompare(b.slotTime)
    );

    res.json({
      success: true,
      totalCount: serialized.length,
      groupedBatches,
      allRequests: serialized
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/vendor/requests/:id/assign: Assign driver, vehicle, and phone
router.post('/requests/:id/assign', async (req, res, next) => {
  try {
    const { driverName, driverPhone, vehicleNumber, note } = req.body;
    if (!driverName || !driverPhone || !vehicleNumber) {
      throw new HttpError(400, 'Driver name, phone number, and vehicle registration are required.');
    }

    const luggage = await Luggage.findOne({ id: req.params.id });
    if (!luggage) {
      throw new HttpError(404, 'Luggage request not found.');
    }

    if (luggage.status === 'Cancelled' || luggage.status === 'Delivered') {
      throw new HttpError(400, `Cannot assign driver to request in status "${luggage.status}".`);
    }

    luggage.driver_name = driverName.trim();
    luggage.driver_phone = driverPhone.trim();
    luggage.vehicle_number = vehicleNumber.trim().toUpperCase();
    luggage.vendor_id = req.user.id;
    luggage.vendor_name = req.user.name || 'Patiala Campus Express';
    luggage.status = 'Vendor Assigned';

    luggage.timeline.push({
      status: 'Vendor Assigned',
      timestamp: new Date(),
      note: note || `Driver ${driverName} (${vehicleNumber}) assigned for pickup.`,
      updated_by: req.user.name
    });

    await luggage.save();

    // Notify student over socket
    notifyUser(luggage.user_id, 'luggage_driver_assigned', {
      id: luggage.id,
      driverName: luggage.driver_name,
      driverPhone: luggage.driver_phone,
      vehicleNumber: luggage.vehicle_number,
      pickupOtp: luggage.pickup_otp,
      status: 'Vendor Assigned'
    });

    res.json({
      success: true,
      message: `Driver ${driverName} assigned to request ${luggage.id}!`,
      luggage: serializeLuggage(luggage, req.user.id, req.user.role)
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/vendor/requests/:id/verify-pickup: Validate 4-digit student OTP and confirm pickup
router.post('/requests/:id/verify-pickup', async (req, res, next) => {
  try {
    const { otp, note } = req.body;
    if (!otp) {
      throw new HttpError(400, '4-digit pickup OTP is required for driver handover.');
    }

    const luggage = await Luggage.findOne({ id: req.params.id });
    if (!luggage) {
      throw new HttpError(404, 'Luggage request not found.');
    }

    if (luggage.status === 'Cancelled') {
      throw new HttpError(400, 'This request has already been cancelled.');
    }

    if (String(otp).trim() !== String(luggage.pickup_otp).trim()) {
      throw new HttpError(400, 'Invalid 4-digit pickup OTP provided by student. Please verify with student.');
    }

    luggage.status = 'Picked Up';
    luggage.timeline.push({
      status: 'Picked Up',
      timestamp: new Date(),
      note: note || 'Pickup OTP verified successfully. Belongings securely received by driver.',
      updated_by: req.user.name
    });

    await luggage.save();

    notifyUser(luggage.user_id, 'luggage_picked_up', {
      id: luggage.id,
      status: 'Picked Up',
      message: 'Driver has verified your OTP and collected your luggage!'
    });

    res.json({
      success: true,
      message: `Pickup verified with OTP for request ${luggage.id}! Status is now Picked Up.`,
      luggage: serializeLuggage(luggage, req.user.id, req.user.role)
    });
  } catch (err) {
    next(err);
  }
});

// 4. POST /api/vendor/requests/:id/status: Transition to 'In Transit' or 'Delivered'
router.post('/requests/:id/status', async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const allowed = ['In Transit', 'Delivered'];
    if (!allowed.includes(status)) {
      throw new HttpError(400, `Status must be one of: ${allowed.join(', ')}.`);
    }

    const luggage = await Luggage.findOne({ id: req.params.id });
    if (!luggage) {
      throw new HttpError(404, 'Luggage request not found.');
    }

    luggage.status = status;
    luggage.timeline.push({
      status,
      timestamp: new Date(),
      note: note || (status === 'Delivered' ? 'Luggage safely delivered to destination address.' : 'Order is in transit to destination.'),
      updated_by: req.user.name
    });

    await luggage.save();

    notifyUser(luggage.user_id, 'luggage_status_changed', {
      id: luggage.id,
      status,
      message: status === 'Delivered' ? 'Your luggage has arrived safely!' : 'Your luggage is on the way!'
    });

    res.json({
      success: true,
      message: `Status updated to "${status}" for request ${luggage.id}!`,
      luggage: serializeLuggage(luggage, req.user.id, req.user.role)
    });
  } catch (err) {
    next(err);
  }
});

// 5. GET /api/vendor/config: Pricing and slot capacity overview
router.get('/config', async (_req, res) => {
  res.json({
    success: true,
    defaultSlotCapacity: DEFAULT_SLOT_CAPACITY,
    vehicles: VEHICLE_CONFIG
  });
});

export default router;
