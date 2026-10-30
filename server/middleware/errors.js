export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

export function notFoundHandler(req, res, _next) {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler for Express 5
export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('Unhandled server error:', err);
  }

  res.status(status).json({
    error: message
  });
}
