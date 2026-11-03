import { errorResponse } from '../utils/apiResponse.js';
import { getEffectivePermissions } from '../services/authz.service.js';

/**
 * Authorization middleware ensuring user possesses the required permission(s).
 * @param {string | string[]} requiredPermissions - A single permission key or array of keys
 * @param {'AND' | 'OR'} mode - Whether user must have ALL permissions ('AND') or AT LEAST ONE ('OR')
 */
export function requirePermission(requiredPermissions, mode = 'OR') {
  const permList = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return errorResponse(res, {
          statusCode: 401,
          code: 'UNAUTHENTICATED',
          message: 'Authentication required to access this resource.',
        });
      }

      // 1. Admin Master Bypass
      if (req.user.is_system_admin || req.user.role_code === 'ADMIN') {
        return next();
      }

      // 2. Resolve Live Effective Permissions
      const effectivePerms = await getEffectivePermissions(req.user.id);

      let hasAccess = false;
      if (mode === 'AND') {
        hasAccess = permList.every((p) => effectivePerms.has(p));
      } else {
        hasAccess = permList.some((p) => effectivePerms.has(p));
      }

      if (!hasAccess) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
          message: `Access denied. You lack the required permission: [${permList.join(', ')}]`,
          details: {
            required: permList,
            mode,
          },
        });
      }

      // Attach resolved permissions to req for downstream usage
      req.effectivePermissions = effectivePerms;
      next();
    } catch (error) {
      next(error);
    }
  };
}

