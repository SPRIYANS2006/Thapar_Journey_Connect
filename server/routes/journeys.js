import express from 'express';
import crypto from 'node:crypto';
import { Journey, User, Group } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { validateTravelDateTime } from '../utils/time.js';
import { calculateMatchScore, scoreOpenGroupForJourney } from '../services/matching.js';
import { serializeJourney, serializeGroup } from '../services/serializers.js';

const router = express.Router();

// All journey routes require authentication
router.use(requireAuth);

// 1. Create or update Journey request & compute algorithmic matches
router.post('/', async (req, res, next) => {
  try {
    const {
      destinationId,
      destinationName,
      hostel,
      departureTime,
      date,
      flexibility,
      transport,
      notes
    } = req.body;

    if (!destinationId || !departureTime) {
      throw new HttpError(400, 'Destination and departure time are required.');
    }

    // Validate travel date & time
    const validation = validateTravelDateTime(date, departureTime);
    if (!validation.valid) {
      throw new HttpError(400, validation.error);
    }
    const travelDate = validation.normalizedDate;

    // Caller identity is derived exclusively from req.user
    const studentHostel = (hostel || req.user.hostel || 'Hostel').trim();
    const studentTransport = ['Shared Cab', 'Shared Auto', 'Either'].includes(transport)
      ? transport
      : 'Either';
    const studentFlex = [10, 15, 20, 30].includes(Number(flexibility))
      ? Number(flexibility)
      : 15;

    // Create or update Searching journey for user
    const journey = await Journey.findOneAndUpdate(
      { user_id: req.user.id, status: 'Searching' },
      {
        $set: {
          destination_id: destinationId,
          destination_name: destinationName || destinationId,
          hostel: studentHostel,
          departure_time: departureTime,
          date: travelDate,
          flexibility: studentFlex,
          transport: studentTransport,
          notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
          status: 'Searching'
        },
        $setOnInsert: {
          id: crypto.randomUUID()
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 2. Query candidates: same destination, same date, Searching status, exclude self
    const candidates = await Journey.find({
      destination_id: destinationId,
      date: travelDate,
      status: 'Searching',
      user_id: { $ne: req.user.id }
    }).lean();

    const candidateUserIds = candidates.map((c) => c.user_id);
    const candidateUsers = await User.find({ id: { $in: candidateUserIds } }).lean();
    const userMap = new Map(candidateUsers.map((u) => [u.id, u]));

    const matchedStudents = [];
    for (const c of candidates) {
      const u = userMap.get(c.user_id) || {};
      const candidateStudent = {
        id: u.id || c.user_id,
        name: u.name || 'Student',
        avatar: u.avatar || 'ST',
        hostel: c.hostel || u.hostel || '',
        destinationId: c.destination_id,
        departureTime: c.departure_time,
        date: c.date,
        flexibility: c.flexibility,
        transport: c.transport,
        reliability: typeof u.reliability === 'number' ? +u.reliability.toFixed(1) : 5.0,
        trips: u.trips_completed || 0
        // Never return phone numbers in matches
      };

      const matchInfo = calculateMatchScore(journey, candidateStudent);
      if (matchInfo.score > 0) {
        matchedStudents.push({
          student: candidateStudent,
          matchInfo,
          journeyId: c.id
        });
      }
    }
    matchedStudents.sort(
      (a, b) =>
        (b.matchInfo.score - a.matchInfo.score) ||
        (a.matchInfo.timeDiff - b.matchInfo.timeDiff) ||
        String(a.student.id).localeCompare(String(b.student.id))
    );

    // 3. Find open matching groups for this journey
    const openGroups = await Group.find({
      destination_id: destinationId,
      date: travelDate,
      status: 'Open'
    }).lean();

    const matchingGroups = [];
    for (const g of openGroups) {
      // User must not already be in this group
      const alreadyMember = (g.members || []).some((m) => m.user_id === req.user.id);
      if (alreadyMember) continue;

      const scored = scoreOpenGroupForJourney(journey, g);
      if (scored && scored.matchScore > 0) {
        matchingGroups.push({
          group: serializeGroup(g, req.user.id),
          matchScore: scored.matchScore,
          timeDiff: scored.timeDiff,
          reasons: scored.reasons
        });
      }
    }
    matchingGroups.sort(
      (a, b) =>
        (b.matchScore - a.matchScore) ||
        (a.timeDiff - b.timeDiff) ||
        (Number(a.group.id) - Number(b.group.id))
    );

    res.status(201).json({
      success: true,
      journey: serializeJourney(journey),
      matchedStudents,
      matchingGroups
    });
  } catch (err) {
    next(err);
  }
});

// 2. Get caller's active journeys
router.get('/mine', async (req, res, next) => {
  try {
    const list = await Journey.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean();
    res.json(list.map(serializeJourney));
  } catch (err) {
    next(err);
  }
});

export default router;
