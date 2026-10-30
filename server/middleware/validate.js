import { HttpError } from './errors.js';

export const ALLOWED_TRANSPORTS = ['Shared Cab', 'Shared Auto', 'Either'];
export const ALLOWED_FLEXIBILITIES = [10, 15, 20, 30];
export const ALLOWED_PICKUP_POINTS = [
  'Main Gate (Near Executive Mess)',
  'Gate 1',
  'Gate 2',
  'Gate 3',
  'Hostels Quad',
  'Executive Mess Gate'
];
export const ALLOWED_POST_CATEGORIES = [
  'Ride Sharing',
  'Travel Tip',
  'Train / Bus Cohort',
  'General Query'
];

export function sanitizeString(val, maxLength = 255) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLength);
}

export function validateChatMessage(req, res, next) {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    return next(new HttpError(400, 'Chat message text cannot be empty.'));
  }
  if (text.length > 500) {
    return next(new HttpError(400, 'Chat message cannot exceed 500 characters.'));
  }
  req.body.text = text;
  next();
}

export function validateCommunityPost(req, res, next) {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  let category = typeof req.body?.category === 'string' ? req.body.category.trim() : 'Ride Sharing';

  if (!title) {
    return next(new HttpError(400, 'Post title is required.'));
  }
  if (title.length > 120) {
    return next(new HttpError(400, 'Post title cannot exceed 120 characters.'));
  }

  if (!content) {
    return next(new HttpError(400, 'Post content is required.'));
  }
  if (content.length > 2000) {
    return next(new HttpError(400, 'Post content cannot exceed 2000 characters.'));
  }

  if (!ALLOWED_POST_CATEGORIES.includes(category)) {
    category = 'Ride Sharing';
  }

  req.body.title = title;
  req.body.content = content;
  req.body.category = category;
  next();
}

export function validatePostComment(req, res, next) {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    return next(new HttpError(400, 'Comment text cannot be empty.'));
  }
  if (text.length > 500) {
    return next(new HttpError(400, 'Comment cannot exceed 500 characters.'));
  }
  req.body.text = text;
  next();
}
