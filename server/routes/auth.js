import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/index.js';
import { generateSessionToken, requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { serializeUser } from '../services/serializers.js';

const router = express.Router();
export const googleClient = new OAuth2Client();

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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID environment variable is missing.');
      return res.status(500).json({
        error: 'Server configuration error: Google Client ID is not set.'
      });
    }

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

    const token = generateSessionToken(user);
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
    if (!user || !user.password_hash) {
      return res.status(401).json({
        error: 'Invalid email or password. If you haven\'t set a password yet, please sign in with Google first.'
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateSessionToken(user);
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
    const { password } = req.body;
    if (!password || typeof password !== 'string' || password.trim().length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.'
      });
    }

    const hash = await bcrypt.hash(password.trim(), 12);
    req.user.password_hash = hash;
    req.user.token_version = (req.user.token_version || 1) + 1;
    await req.user.save();

    const freshToken = generateSessionToken(req.user);
    res.json({
      success: true,
      message: 'Password set successfully. You can now login with either Google or password.',
      token: freshToken
    });
  } catch (err) {
    next(err);
  }
});

// 4. Get Current User Session (strictly from session token)
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: serializeUser(req.user)
  });
});

// 5. Update Profile
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, hostel, phone, degree, year, hometown } = req.body;
    const user = req.user;

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

    await user.save();
    res.json({
      success: true,
      user: serializeUser(user)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
