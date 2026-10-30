import express from 'express';
import { Destination, Hostel, Group, User, Community } from '../models/index.js';
import { isDbConnected } from '../config/db.js';

const router = express.Router();

// 1. Health check - reports DB readiness
router.get('/health', (req, res) => {
  const dbReady = isDbConnected();
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    database: dbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 2. Client configuration (exposing Google Client ID without hardcoding in frontend)
router.get('/config', (req, res) => {
  res.json({
    googleClientId:
      process.env.GOOGLE_CLIENT_ID ||
      '629250761631-k5eo83notfq2e1vuu3qvimbf1jq3lueo.apps.googleusercontent.com'
  });
});

// 3. Official TIET transit destinations
router.get('/destinations', async (req, res, next) => {
  try {
    const list = await Destination.find().sort({ id: 1 }).lean();
    res.json(
      list.map((d) => ({
        id: d.id,
        name: d.name,
        icon: d.icon,
        description: d.description,
        popularTime: d.popular_time,
        distance: d.distance,
        avgCabFare: d.avg_cab_fare
      }))
    );
  } catch (err) {
    next(err);
  }
});

// 4. Official TIET hostels
router.get('/hostels', async (req, res, next) => {
  try {
    const list = await Hostel.find().sort({ cluster: 1, name: 1 }).lean();
    res.json(
      list.map((h) => ({
        id: h.id,
        name: h.name,
        gender: h.gender,
        cluster: h.cluster
      }))
    );
  } catch (err) {
    next(err);
  }
});

// 5. High-level campus stats
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, activeGroups, communitiesCount] = await Promise.all([
      User.countDocuments(),
      Group.countDocuments({ status: { $in: ['Open', 'Confirmed'] } }),
      Community.countDocuments()
    ]);

    res.json({
      verifiedStudentsCount: totalUsers,
      activeRidesCount: activeGroups,
      communitiesCount: communitiesCount,
      carbonSavedKg: activeGroups * 14
    });
  } catch (err) {
    next(err);
  }
});

export default router;
