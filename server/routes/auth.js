import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { User, Group, CityRide, TravelGroup } from '../models/index.js';
import { generateSessionToken, requireAuth, parseCookieToken, JWT_SECRET } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { serializeUser } from '../services/serializers.js';

import { runCommittedTransaction } from '../services/transactions.js';
import { disconnectUserSessions, notifyGroupMembersUpdated } from '../services/notifications.js';

const router = express.Router();
export const googleClient = new OAuth2Client();

function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieFlags = [
    `token=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`
  ];
  if (isProd) {
    cookieFlags.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieFlags.join('; '));
}

function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieFlags = [
    'token=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];
  if (isProd) {
    cookieFlags.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieFlags.join('; '));
}

// 1. Official Google Sign-In verification with real ID token verification
router.post('/google', authRateLimiter, async (req, res, next) => {
  try {
    const { credential } = req.body;

    // Must accept ONLY credential. No fallback trusting client-provided email or name.
    if (!credential || typeof credential !== 'string' || !credential.trim()) {
      return res.status(400).json({
        error: 'Missing Google ID token credential in request body.'
      });
    }

    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      '629250761631-k5eo83notfq2e1vuu3qvimbf1jq3lueo.apps.googleusercontent.com';

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential.trim(),
        audience: clientId
      });
    } catch {
      return res.status(401).json({
        error: 'Authentication failed: Invalid or forged Google ID token.'
      });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({
        error: 'Authentication failed: Unable to decode Google token payload.'
      });
    }

    const email = (payload.email || '').toLowerCase().trim();
    const isVerified = payload.email_verified === true;
    const hd = (payload.hd || '').toLowerCase().trim();

    // Enforce @thapar.edu institutional requirements
    if (!isVerified || hd !== 'thapar.edu' || !email.endsWith('@thapar.edu')) {
      return res.status(400).json({
        error: 'Access Denied: Only official @thapar.edu Google accounts from TIET are permitted. Personal Google accounts (@gmail.com) are rejected.'
      });
    }

    // Upsert student account in MongoDB
    let user = await User.findOne({ email });
    if (!user) {
      const displayName = (payload.name || email.split('@')[0].replace(/[._]/g, ' ')).trim();
      const initials = displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'ST';

      user = await User.create({
        id: crypto.randomUUID(),
        name: displayName,
        email,
        avatar: payload.picture || initials,
        token_version: 1,
        reliability: 5.0,
        trips_completed: 0
      });
    } else if (payload.picture && (!user.avatar || user.avatar === 'ST')) {
      user.avatar = payload.picture;
      await user.save();
    }

    if (user.disabled) return res.status(403).json({ error: 'This account is disabled.' });
    const token = generateSessionToken(user);
    setSessionCookie(res, token);
    res.json({
      success: true,
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    next(err);
  }
});

// 2. Password Login - only for existing Google-verified users who set a password
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.endsWith('@thapar.edu')) {
      return res.status(400).json({ error: 'Only official @thapar.edu email addresses are permitted.' });
    }

    // Must NOT auto-create account and must NOT set the first submitted password
    const user = await User.findOne({ email: cleanEmail });
    if (!user || user.disabled || !user.password_hash) {
      return res.status(401).json({
        error: 'Invalid email or password. If you haven\'t set a password yet, please sign in with Google first.'
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.disabled) return res.status(403).json({ error: 'This account is disabled.' });
    const token = generateSessionToken(user);
    setSessionCookie(res, token);
    res.json({
      success: true,
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    next(err);
  }
});

// 3. Set or update password (authenticated users only)
router.post('/password', requireAuth, async (req, res, next) => {
  try {
    const { password, currentPassword } = req.body;
    if (!password || typeof password !== 'string' || password.trim().length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.'
      });
    }

    if (req.user.password_hash) {
      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({
          error: 'Current password is required to change your password.'
        });
      }
      const isMatch = await bcrypt.compare(currentPassword, req.user.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          error: 'Current password is incorrect.'
        });
      }
    }

    const hash = await bcrypt.hash(password.trim(), 12);
    req.user.password_hash = hash;
    req.user.token_version = (req.user.token_version || 1) + 1;
    await req.user.save();

    disconnectUserSessions(req.user.id);
    const freshToken = generateSessionToken(req.user);
    setSessionCookie(res, freshToken);
    res.json({
      success: true,
      message: 'Password saved.',
      token: freshToken,
      user: serializeUser(req.user)
    });
  } catch (err) {
    next(err);
  }
});

// 4. Get Current User Session (strictly from session token)
router.get('/me', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    success: true,
    token: req.sessionToken,
    user: serializeUser(req.user)
  });
});

// 5. Update Profile
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, hostel, phone, degree, year, hometown } = req.body;
    const profile = await runCommittedTransaction(async () => {
      const user = await User.findOne({ id: req.user.id });

      if (typeof phone === 'string' && phone.trim() && !/^\+?[\d ()-]{7,20}$/.test(phone.trim())) {
        const error = new Error('Enter a valid contact phone number.');
        error.status = 400;
        throw error;
      }

      if (typeof name === 'string' && name.trim()) {
        user.name = name.trim().slice(0, 100);
      }
      if (typeof hostel === 'string') {
        user.hostel = hostel.trim().slice(0, 100);
      }
      if (typeof phone === 'string') {
        user.phone = phone.trim().slice(0, 30);
      }
      if (typeof degree === 'string') {
        user.degree = degree.trim().slice(0, 100);
      }
      if (typeof year === 'string') {
        user.year = year.trim().slice(0, 50);
      }
      if (typeof hometown === 'string') {
        user.hometown = hometown.trim().slice(0, 100);
      }

      for (const [input, field] of [['rollNumber', 'roll_number'], ['preferredTransport', 'preferred_transport'], ['timeWindow', 'time_window']]) {
        if (typeof req.body[input] === 'string') user[field] = req.body[input].trim().slice(0, 100);
      }
      if (Array.isArray(req.body.frequentRoutes)) user.frequent_routes = req.body.frequentRoutes.filter(v => typeof v === 'string').slice(0, 10).map(v => v.trim().slice(0, 100));
      if (typeof req.body.rideNotifications === 'boolean') user.ride_notifications = req.body.rideNotifications;
      await user.save();
      const fields = {};
      if (typeof hostel === 'string') fields['members.$[member].hostel'] = user.hostel;
      if (typeof phone === 'string') fields['members.$[member].phone'] = user.phone;
      if (Object.keys(fields).length) {
        for (const Model of [Group, CityRide, TravelGroup]) {
          await Model.updateMany(
            { 'members.user_id': user.id },
            { $set: fields },
            { arrayFilters: [{ 'member.user_id': user.id }] }
          );
          const groups = await Model.find({ 'members.user_id': user.id }).lean();
          for (const group of groups) notifyGroupMembersUpdated(group);
        }
      }
      return serializeUser(user);
    });
    res.json({ success: true, user: profile });
  } catch (err) {
    next(err);
  }
});

// 6. Logout - Clear HttpOnly Session Cookie and invalidate token version
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : parseCookieToken(req);
  let decoded;
  if (token) {
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      // Expired or invalid tokens have no session to revoke.
    }
  }
  if (decoded?.userId && Number.isInteger(decoded.tokenVersion)) {
    const result = await User.updateOne(
      { id: decoded.userId, token_version: decoded.tokenVersion },
      { $inc: { token_version: 1 } }
    );
    if (result.modifiedCount) disconnectUserSessions(decoded.userId);
  }
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
