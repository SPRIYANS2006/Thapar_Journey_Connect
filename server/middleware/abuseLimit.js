import { RateLimit } from '../models/RateLimit.js';

export async function consumeLimit(key, maximum, milliseconds) {
  const now = new Date();
  const active = { $gt: ['$expireAt', now] };
  const update = [{ $set: {
    count: { $cond: [active, { $add: [{ $ifNull: ['$count', 0] }, 1] }, 1] },
    expireAt: { $cond: [active, '$expireAt', new Date(Date.now() + milliseconds)] }
  } }];
  let record;
  try { record = await RateLimit.findOneAndUpdate({ key }, update, { upsert: true, returnDocument: 'after', updatePipeline: true }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    record = await RateLimit.findOneAndUpdate({ key }, update, { returnDocument: 'after', updatePipeline: true });
  }
  return record.count <= maximum;
}

export async function mutationLimit(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  try {
    if (!await consumeLimit(`writes:${req.user.id}`, 120, 60000)) return res.status(429).json({ error: 'Too many changes. Please wait a minute.' });
    next();
  } catch (error) { next(error); }
}
