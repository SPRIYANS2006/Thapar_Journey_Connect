// Rate limiting middleware for sensitive auth routes (20 attempts / 15 minutes per IP + normalized email)
// Uses persistent MongoDB collection shared across server instances with fallback to in-memory store.

import mongoose from 'mongoose';
import { RateLimit } from '../models/RateLimit.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

// In-memory fallback map (if DB is temporarily disconnected or unready)
const fallbackAttempts = new Map();

// Periodic cleanup of fallback memory map
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of fallbackAttempts.entries()) {
    if (now - record.startTime > WINDOW_MS) {
      fallbackAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export async function authRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown-ip';

  // Safely extract and normalize the email
  let email = 'anonymous';
  if (typeof req.body?.email === 'string' && req.body.email.trim()) {
    email = req.body.email.toLowerCase().trim();
  } else if (typeof req.body?.credential === 'string' && req.body.credential.trim()) {
    try {
      const parts = req.body.credential.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (payload?.email) {
          email = String(payload.email).toLowerCase().trim();
        }
      }
    } catch {
      email = 'google_token';
    }
  }

  const key = `auth:${ip}:${email}`;
  const now = new Date();

  // Primary: Shared MongoDB persistence
  if (mongoose.connection.readyState === 1) {
    try {
      const windowExpiry = new Date(Date.now() + WINDOW_MS);

      const record = await RateLimit.findOneAndUpdate(
        { key, expireAt: { $gt: now } },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
      );

      if (record) {
        if (record.count > MAX_ATTEMPTS) {
          return res.status(429).json({
            error: 'Too many authentication attempts. Please try again after 15 minutes.'
          });
        }
      } else {
        await RateLimit.findOneAndUpdate(
          { key },
          { $set: { count: 1, expireAt: windowExpiry } },
          { upsert: true }
        );
      }

      return next();
    } catch (err) {
      console.warn('RateLimit MongoDB error, using in-memory fallback:', err.message);
    }
  }

  // Fallback: In-memory store
  const nowMs = Date.now();
  let memRecord = fallbackAttempts.get(key);
  if (!memRecord || nowMs - memRecord.startTime > WINDOW_MS) {
    fallbackAttempts.set(key, { count: 1, startTime: nowMs });
    return next();
  }

  memRecord.count += 1;
  if (memRecord.count > MAX_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many authentication attempts. Please try again after 15 minutes.'
    });
  }

  next();
}
