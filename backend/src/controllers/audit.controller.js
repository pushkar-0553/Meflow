import { query } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const auditController = {
  /**
   * GET /api/audit
   * Query immutable activity logs with multi-parameter filtering & pagination
   */
  async getAuditLogs(req, res, next) {
    try {
      const {
        actor_id,
        action,
        entity,
        search,
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(10, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      const whereConditions = [];
      const params = [];

      if (actor_id) {
        whereConditions.push('al.actor_id = ?');
        params.push(parseInt(actor_id, 10));
      }

      if (action) {
        whereConditions.push('al.action = ?');
        params.push(action);
      }

      if (entity) {
        whereConditions.push('al.entity = ?');
        params.push(entity);
      }

      if (search && search.trim()) {
        whereConditions.push('(al.action LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
        const searchPattern = `%${search.trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count total matching logs
      const countRows = await query(
        `SELECT COUNT(*) AS total_count
         FROM activity_logs al
         LEFT JOIN users u ON al.actor_id = u.id
         ${whereClause}`,
        params
      );
      const totalCount = countRows[0]?.total_count || 0;

      // Fetch paginated logs
      const logs = await query(
        `SELECT al.id, al.actor_id, al.action, al.entity, al.entity_id,
                al.metadata, al.ip_address, al.created_at,
                u.name AS actor_name, u.email AS actor_email,
                r.name AS actor_role_name, r.code AS actor_role_code
         FROM activity_logs al
         LEFT JOIN users u ON al.actor_id = u.id
         LEFT JOIN roles r ON u.role_id = r.id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      return successResponse(res, {
        message: 'Audit logs retrieved successfully.',
        data: logs,
        meta: {
          totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/audit/actions-catalog
   * Retrieve distinct action types and entities recorded in the audit trail
   */
  async getActionsCatalog(req, res, next) {
    try {
      const actions = await query(`SELECT DISTINCT action FROM activity_logs ORDER BY action ASC`);
      const entities = await query(`SELECT DISTINCT entity FROM activity_logs ORDER BY entity ASC`);

      return successResponse(res, {
        message: 'Actions catalog retrieved successfully.',
        data: {
          actions: actions.map((a) => a.action),
          entities: entities.map((e) => e.entity),
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
