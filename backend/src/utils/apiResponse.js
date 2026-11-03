/**
 * Consistent API success response formatter
 */
export const successResponse = (res, {
  statusCode = 200,
  message = 'Operation successful',
  data = null,
  meta = null,
}) => {
  const payload = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };
  return res.status(statusCode).json(payload);
};

/**
 * Consistent API error response formatter
 */
export const errorResponse = (res, {
  statusCode = 500,
  message = 'Internal server error',
  code = 'INTERNAL_ERROR',
  details = null,
}) => {
  const payload = {
    success: false,
    message,
    code,
    ...(details !== null && { details }),
  };
  return res.status(statusCode).json(payload);
};
