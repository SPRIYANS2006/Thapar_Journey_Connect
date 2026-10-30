import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { HttpError } from './errors.js';

const isProduction = process.env.NODE_ENV === 'production';
const rawSecret = process.env.SESSION_SECRET;

if (isProduction && (!rawSecret || rawSecret.trim().length < 32)) {
  console.error('FATAL: SESSION_SECRET environment variable is missing or less than 32 characters in production.');
  process.exit(1);
}

export const JWT_SECRET = rawSecret && rawSecret.trim().length >= 32
  ? rawSecret.trim()
  : 'thapar_journey_connect_dev_secret_must_be_32_chars_long!';

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

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Unauthorized: Access token required.');
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      throw new HttpError(401, 'Unauthorized: Access token missing.');
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
