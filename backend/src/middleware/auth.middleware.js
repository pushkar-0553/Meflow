import { errorResponse } from '../utils/apiResponse.js';
import { query } from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware ensuring request originates from an active authenticated session or valid Bearer JWT
 */
export async function requireAuth(req, res, next) {
  let userId = req.session?.user?.id;

  // If no session cookie, check for Authorization Bearer token (resilient for cross-domain Vercel -> Render)
  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        userId = decoded.id;
      }
    }
  }

  if (!userId) {
    return errorResponse(res, {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required. Please sign in to access this resource.',
    });
  }

  try {
    // Verify user is still active in database (not suspended or deleted)
    const users = await query(
      `SELECT u.id, u.role_id, u.name, u.email, u.department, u.status, u.profile_image_url,
              r.name AS role_name, r.code AS role_code, r.is_system_admin
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      if (req.session) req.session.destroy(() => {});
      return errorResponse(res, {
        statusCode: 401,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account no longer exists. Session terminated.',
      });
    }

    const currentUser = users[0];
    if (currentUser.status !== 'ACTIVE') {
      if (req.session) req.session.destroy(() => {});
      return errorResponse(res, {
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: `Account is currently ${currentUser.status.toLowerCase()}. Please contact administrator.`,
      });
    }

    // Attach verified user context to request
    req.user = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      department: currentUser.department,
      role_id: currentUser.role_id,
      role_code: currentUser.role_code,
      role_name: currentUser.role_name,
      is_system_admin: Boolean(currentUser.is_system_admin),
      profile_image_url: currentUser.profile_image_url,
      role: {
        id: currentUser.role_id,
        code: currentUser.role_code,
        name: currentUser.role_name,
        is_system_admin: Boolean(currentUser.is_system_admin),
      },
    };

    // Keep session user synchronized if session exists
    if (req.session) {
      req.session.user = req.user;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication: populates req.user if valid token/session exists,
 * but allows request to proceed unauthenticated if absent.
 */
export async function optionalAuth(req, res, next) {
  let userId = req.session?.user?.id;
  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        userId = decoded.id;
      }
    }
  }

  if (!userId) {
    return next();
  }

  try {
    const users = await query(
      `SELECT u.id, u.role_id, u.name, u.email, u.department, u.status, u.profile_image_url,
              r.name AS role_name, r.code AS role_code, r.is_system_admin
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.status = 'ACTIVE'`,
      [userId]
    );

    if (users && users.length > 0) {
      const currentUser = users[0];
      req.user = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        department: currentUser.department,
        role_id: currentUser.role_id,
        role_code: currentUser.role_code,
        role_name: currentUser.role_name,
        is_system_admin: Boolean(currentUser.is_system_admin),
        profile_image_url: currentUser.profile_image_url,
        role: {
          id: currentUser.role_id,
          code: currentUser.role_code,
          name: currentUser.role_name,
          is_system_admin: Boolean(currentUser.is_system_admin),
        },
      };
    }
    next();
  } catch {
    next();
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
