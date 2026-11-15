import express from 'express';
import { Group, CityRide, TravelGroup } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeGroup, serializeCityRide, serializeTravelGroup } from '../services/serializers.js';
import { getHoursUntilDeparture } from '../utils/time.js';

const router = express.Router();
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const membership = { 'members.user_id': req.user.id };
    const [rides, cityRides, travelGroups] = await Promise.all([
      Group.find(membership).lean(), CityRide.find(membership).lean(), TravelGroup.find(membership).lean()
    ]);
    const journeys = [
      ...rides.map(ride => ({ ...serializeGroup(ride, req.user.id), kind: 'ride', mode: ride.transport === 'Shared Auto' ? 'Auto' : 'Cab', destination: ride.destination_name })),
      ...cityRides.map(ride => ({ ...serializeCityRide(ride, req.user.id), kind: 'ride', isCommunityRide: true, mode: ride.mode, departureTime: ride.time, destinationName: ride.destination, maxMembers: ride.max_capacity, adminId: ride.creator_id, transport: ride.mode === 'Cab' ? 'Shared Cab' : ride.mode, completionVerified: Boolean(ride.completed_by && ride.completed_by !== 'system_scheduler') })),
      ...travelGroups.map(group => ({ ...serializeTravelGroup(group, req.user.id), kind: 'travel', mode: group.type, origin: group.boarding_point, destinationName: group.destination }))
    ];
    const upcoming = [], past = [];
    for (const journey of journeys) {
      const hours = getHoursUntilDeparture(journey.date, journey.departureTime);
      const isPast = ['Completed', 'Cancelled'].includes(journey.status) || hours <= 0;
      (isPast ? past : upcoming).push(journey);
    }
    const chronological = (a, b) => `${a.date}T${a.departureTime}`.localeCompare(`${b.date}T${b.departureTime}`) || String(a.id).localeCompare(String(b.id));
    upcoming.sort(chronological); past.sort((a, b) => chronological(b, a));
    res.setHeader('Cache-Control', 'no-store');
    res.json({ upcoming, past });
  } catch (error) { next(error); }
});
export default router;
