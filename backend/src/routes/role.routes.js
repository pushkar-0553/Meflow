import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { successResponse } from '../utils/apiResponse.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const roles = await query(
      `SELECT id, name, code, description, is_system_role, is_system_admin, is_active
       FROM roles
       WHERE is_active = TRUE
       ORDER BY id ASC`
    );
    return successResponse(res, {
      message: 'Active organizational roles',
      data: roles,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
