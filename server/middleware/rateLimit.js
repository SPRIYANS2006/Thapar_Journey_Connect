// Rate limiting middleware for sensitive auth routes (20 attempts / 15 minutes per IP + email)

const attemptsMap = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

// Periodic cleanup of stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attemptsMap.entries()) {
    if (now - record.startTime > WINDOW_MS) {
      attemptsMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
  const email = (req.body?.email || req.body?.credential ? 'auth' : 'anonymous').toLowerCase().trim();
  const key = `${ip}:${email}`;
  const now = Date.now();

  let record = attemptsMap.get(key);
  if (!record || now - record.startTime > WINDOW_MS) {
    record = { count: 1, startTime: now };
    attemptsMap.set(key, record);
    return next();
  }

  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many authentication attempts. Please try again after 15 minutes.'
    });
  }

  next();
}
