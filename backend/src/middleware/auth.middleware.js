import { errorResponse } from '../utils/apiResponse.js';
import { query } from '../config/db.js';

/**
 * Middleware ensuring request originates from an active authenticated session
 */
export async function requireAuth(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return errorResponse(res, {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required. Please sign in to access this resource.',
    });
  }

  try {
    // Verify user is still active in database (not suspended or deleted)
    const users = await query(
      `SELECT u.id, u.role_id, u.status, r.code AS role_code, r.is_system_admin
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.session.user.id]
    );

    if (!users || users.length === 0) {
      req.session.destroy();
      return errorResponse(res, {
        statusCode: 401,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account no longer exists. Session terminated.',
      });
    }

    const currentUser = users[0];
    if (currentUser.status !== 'ACTIVE') {
      req.session.destroy();
      return errorResponse(res, {
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: `Account is currently ${currentUser.status.toLowerCase()}. Please contact administrator.`,
      });
    }

    // Attach verified user context to request
    req.user = {
      ...req.session.user,
      role_id: currentUser.role_id,
      role_code: currentUser.role_code,
      is_system_admin: Boolean(currentUser.is_system_admin),
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware ensuring user has system administrator privileges
 */
export function requireAdmin(req, res, next) {
  if (!req.user || (!req.user.is_system_admin && req.user.role_code !== 'ADMIN')) {
    return errorResponse(res, {
      statusCode: 403,
      code: 'FORBIDDEN_ADMIN_ONLY',
      message: 'Access restricted to system administrators only.',
    });
  }
  next();
}
