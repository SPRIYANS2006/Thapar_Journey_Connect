import { mutationLimit } from '../middleware/abuseLimit.js';
import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { User } from '../models/User.js';

const schema = new mongoose.Schema({
  reporterId: { type: String, required: true, index: true },
  targetUserId: { type: String, default: '' },
  groupId: { type: String, default: '' },
  category: { type: String, enum: ['Safety', 'Privacy / deletion', 'Rating appeal', 'Other'], required: true },
  details: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['Open', 'Reviewed'], default: 'Open' }
}, { timestamps: true });
export const SafetyReport = mongoose.models.SafetyReport || mongoose.model('SafetyReport', schema);
const router = express.Router();
router.use(requireAuth, mutationLimit);
router.put('/mute', async (req, res, next) => {
  try {
    const { userId, muted } = req.body || {};
    if (typeof userId !== 'string' || userId === req.user.id || typeof muted !== 'boolean') throw new HttpError(400, 'Choose another user and a mute setting.');
    if (!await User.exists({ id: userId })) throw new HttpError(404, 'User not found.');
    await User.updateOne({ id: req.user.id }, muted ? { $addToSet: { muted_users: userId } } : { $pull: { muted_users: userId } });
    res.json({ success: true });
  } catch (error) { next(error); }
});
router.post('/reports', async (req, res, next) => {
  try {
    const { category, details, targetUserId, groupId } = req.body || {};
    if (!['Safety', 'Privacy / deletion', 'Rating appeal', 'Other'].includes(category) ||
        typeof details !== 'string' || !details.trim() || details.length > 2000) {
      throw new HttpError(400, 'Choose a category and provide 1–2000 characters of detail.');
    }
    const count = await SafetyReport.countDocuments({ reporterId: req.user.id, createdAt: { $gte: new Date(Date.now() - 3600000) } });
    if (count >= 10) throw new HttpError(429, 'Please wait before submitting another report.');
    const report = await SafetyReport.create({ reporterId: req.user.id, category, details: details.trim(),
      targetUserId: typeof targetUserId === 'string' ? targetUserId.slice(0, 100) : '',
      groupId: typeof groupId === 'string' ? groupId.slice(0, 100) : '' });
    res.status(201).json({ id: report.id, status: report.status });
  } catch (error) { next(error); }
});
router.get('/reports', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { reporterId: req.user.id };
    res.json(await SafetyReport.find(filter).sort({ createdAt: -1 }).limit(100).lean());
  } catch (error) { next(error); }
});
router.patch('/reports/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid report ID.');
    const result = await SafetyReport.findByIdAndUpdate(req.params.id, { status: 'Reviewed' }, { returnDocument: 'after' });
    if (!result) throw new HttpError(404, 'Report not found.');
    res.json(result);
  } catch (error) { next(error); }
});
export default router;
