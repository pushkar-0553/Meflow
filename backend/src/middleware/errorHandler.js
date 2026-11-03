import { errorResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err.stack || err.message);

  // JSON Body Parser Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, {
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'Malformed JSON payload in request body.',
    });
  }

  // Zod Schema Validation Error
  if (err.name === 'ZodError') {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(res, {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Input validation failed.',
      details: formattedErrors,
    });
  }

  // MySQL / TiDB Duplicate Key Error
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return errorResponse(res, {
      statusCode: 409,
      code: 'DUPLICATE_RESOURCE',
      message: 'A resource with this identifier already exists.',
    });
  }

  // Custom App Status Code
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal error occurred.';
  const code = err.code || 'INTERNAL_ERROR';

  return errorResponse(res, {
    statusCode,
    code,
    message,
    ...(env.isDev && { details: err.stack }),
  });
}

