import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { HttpError } from './errors.js';

const isProduction = process.env.NODE_ENV === 'production';
const rawSecret = process.env.SESSION_SECRET;

let resolvedSecret = (rawSecret && rawSecret.trim().length >= 32) ? rawSecret.trim() : null;

if (!resolvedSecret) {
  if (isProduction) {
    throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
  } else {
    resolvedSecret = 'thapar_dev_session_secret_at_least_32_chars_testing_entropy_token';
  }
}

export const JWT_SECRET = resolvedSecret;

export function generateSessionToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tokenVersion: user.token_version || 1
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function parseCookieToken(req) {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return null;
  for (const item of cookieHeader.split(';')) {
    const [name, ...rest] = item.trim().split('=');
    if (name === 'token') {
      try {
        return decodeURIComponent(rest.join('=')).trim();
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]?.trim();
    } else {
      token = parseCookieToken(req);
    }

    if (!token) {
      throw new HttpError(401, 'Unauthorized: Access token required.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      throw new HttpError(401, 'Unauthorized: Invalid or expired session token.');
    }

    const user = await User.findOne({ id: decoded.userId });
    if (!user || user.disabled) {
      throw new HttpError(401, 'Unauthorized: User account not found.');
    }

    if (user.token_version !== decoded.tokenVersion) {
      throw new HttpError(401, 'Unauthorized: Session invalidated. Please login again.');
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuth(req, res, next) {
  if (!req.headers.authorization && !parseCookieToken(req)) return next();
  return requireAuth(req, res, next);
}
