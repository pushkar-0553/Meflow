import { query } from '../config/db.js';
import { successResponse } from '../utils/apiResponse.js';

export const workloadController = {
  /**
   * GET /api/workload/team
   * High-level capacity metrics, bottlenecks, and per-employee load
   */
  async getTeamWorkload(req, res, next) {
    try {
      // Fetch each active user with active task counts
      const users = await query(
        `SELECT u.id, u.name, u.email, u.status, u.department,
                r.id AS role_id, r.name AS role_name, r.code AS role_code,
                COUNT(CASE WHEN tsa.status IN ('ACCEPTED', 'IN_PROGRESS') THEN 1 END) AS active_tasks_count,
                COUNT(CASE WHEN tsa.status = 'COMPLETED' THEN 1 END) AS completed_tasks_count,
                COUNT(CASE WHEN t.scheduled_end < NOW() AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS') THEN 1 END) AS delayed_tasks_count
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN task_stage_assignments tsa ON u.id = tsa.user_id
         LEFT JOIN task_stages ts ON tsa.task_stage_id = ts.id
         LEFT JOIN tasks t ON ts.task_id = t.id
         WHERE u.status = 'ACTIVE'
         GROUP BY u.id, u.name, u.email, u.status, u.department, r.id, r.name, r.code
         ORDER BY active_tasks_count DESC, u.name ASC`
      );

      // Enhance with capacity status
      const formatted = users.map((u) => {
        const count = parseInt(u.active_tasks_count, 10);
        let capacityStatus = 'OPTIMAL';
        if (count === 0) capacityStatus = 'IDLE';
        else if (count >= 4 && count <= 5) capacityStatus = 'HEAVY';
        else if (count > 5) capacityStatus = 'OVERLOADED';

        return {
          ...u,
          active_tasks_count: count,
          completed_tasks_count: parseInt(u.completed_tasks_count, 10),
          delayed_tasks_count: parseInt(u.delayed_tasks_count, 10),
          capacity_status: capacityStatus,
        };
      });

      // Aggregate high-level stats
      const totalWorkers = formatted.length;
      const overloadedCount = formatted.filter((w) => w.capacity_status === 'OVERLOADED').length;
      const idleCount = formatted.filter((w) => w.capacity_status === 'IDLE').length;
      const totalActiveTasks = formatted.reduce((acc, w) => acc + w.active_tasks_count, 0);
      const avgTasksPerWorker = totalWorkers > 0 ? (totalActiveTasks / totalWorkers).toFixed(1) : 0;

      return successResponse(res, {
        message: 'Team workload metrics retrieved successfully.',
        data: formatted,
        meta: {
          totalWorkers,
          totalActiveTasks,
          overloadedCount,
          idleCount,
          avgTasksPerWorker: parseFloat(avgTasksPerWorker),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/workload/role-breakdown
   * Workload categorized by roles
   */
  async getRoleBreakdown(req, res, next) {
    try {
      const breakdown = await query(
        `SELECT r.id AS role_id, r.name AS role_name, r.code AS role_code,
                COUNT(DISTINCT u.id) AS member_count,
                COUNT(CASE WHEN ts.status IN ('READY', 'IN_PROGRESS', 'SUBMITTED') THEN 1 END) AS active_stages_count,
                COUNT(CASE WHEN ts.status = 'READY' THEN 1 END) AS unclaimed_pool_count
         FROM roles r
         LEFT JOIN users u ON r.id = u.role_id AND u.status = 'ACTIVE'
         LEFT JOIN task_stages ts ON r.id = ts.target_role_id
         GROUP BY r.id, r.name, r.code
         ORDER BY active_stages_count DESC`
      );

      return successResponse(res, {
        message: 'Role workload distribution retrieved successfully.',
        data: breakdown,
      });
    } catch (error) {
      next(error);
    }
  },
};

