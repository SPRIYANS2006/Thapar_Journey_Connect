import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { HttpError } from './errors.js';

const isProduction = process.env.NODE_ENV === 'production';
const rawSecret = process.env.SESSION_SECRET;

if (isProduction && (!rawSecret || rawSecret.trim().length < 32)) {
  throw new Error('FATAL: Valid SESSION_SECRET environment variable (at least 32 characters) is required in production.');
}

export const JWT_SECRET = (rawSecret && rawSecret.trim().length >= 32)
  ? rawSecret.trim()
  : 'thapar_journey_connect_dev_only_jwt_session_secret_key_32chars_long!';

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
      return decodeURIComponent(rest.join('=')).trim();
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
    if (!user) {
      throw new HttpError(401, 'Unauthorized: User account not found.');
    }

    if (user.token_version !== decoded.tokenVersion) {
      throw new HttpError(401, 'Unauthorized: Session invalidated. Please login again.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
