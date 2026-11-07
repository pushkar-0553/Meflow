import { query } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { getUnifiedAssignments, computeReportSummary } from '../services/report.service.js';

export const employeeController = {
  /**
   * GET /api/employees/directory
   * Centralized employee workforce directory
   */
  async getDirectory(req, res, next) {
    try {
      const {
        search,
        role_id,
        department,
        reporting_manager_id,
        status = 'ACTIVE', // default to ACTIVE, or 'ALL', 'INVITED', 'SUSPENDED'
      } = req.query;

      const conditions = [];
      const params = [];

      if (status && status !== 'ALL') {
        conditions.push('u.status = ?');
        params.push(status);
      }

      if (role_id) {
        conditions.push('u.role_id = ?');
        params.push(parseInt(role_id, 10));
      }

      if (department && department !== 'ALL') {
        conditions.push('u.department = ?');
        params.push(department);
      }

      if (reporting_manager_id) {
        conditions.push('u.reporting_manager_id = ?');
        params.push(parseInt(reporting_manager_id, 10));
      }

      if (search && search.trim()) {
        const q = `%${search.trim().toLowerCase()}%`;
        conditions.push(`(
          LOWER(u.name) LIKE ? OR
          LOWER(u.email) LIKE ? OR
          LOWER(COALESCE(u.phone, '')) LIKE ? OR
          LOWER(COALESCE(u.employee_id, '')) LIKE ?
        )`);
        params.push(q, q, q, q);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const users = await query(
        `SELECT u.id, u.name, u.email, u.phone, u.department, u.status, u.profile_image_url,
                COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_id,
                u.reporting_manager_id, u.created_at, u.last_login_at,
                r.id AS role_id, r.name AS role_name, r.code AS role_code,
                m.name AS reporting_manager_name, m.email AS reporting_manager_email,
                -- Count currently active assignments across task stages and video stages
                (
                  (SELECT COUNT(*) FROM task_stage_assignments tsa WHERE tsa.user_id = u.id AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS')) +
                  (SELECT COUNT(*) FROM content_scripts cs WHERE cs.writer_id = u.id AND cs.status IN ('ACCEPTED', 'IN_PROGRESS', 'SCRIPT_READY', 'SUBMITTED')) +
                  (SELECT COUNT(*) FROM cinematography_shoots csh WHERE csh.lead_cinematographer_id = u.id AND csh.status IN ('ACCEPTED', 'IN_PROGRESS')) +
                  (SELECT COUNT(*) FROM editing_assignments ea WHERE ea.editor_id = u.id AND ea.status IN ('ACCEPTED', 'EDITING_STARTED', 'EDITING_IN_PROGRESS', 'FIRST_CUT_READY', 'UNDER_REVIEW')) +
                  (SELECT COUNT(*) FROM thumbnails tn WHERE tn.designer_id = u.id AND tn.status IN ('DRAFT', 'SUBMITTED'))
                ) AS active_assignments_count
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN users m ON u.reporting_manager_id = m.id
         ${whereClause}
         ORDER BY u.name ASC`,
        params
      );

      // Distinct departments and roles for filters
      const [departments] = await query(
        `SELECT DISTINCT department FROM users WHERE department IS NOT NULL ORDER BY department ASC`
      );
      const [managers] = await query(
        `SELECT DISTINCT m.id, m.name, r.name AS role_name
         FROM users m
         JOIN roles r ON m.role_id = r.id
         WHERE m.id IN (SELECT DISTINCT reporting_manager_id FROM users WHERE reporting_manager_id IS NOT NULL)
            OR r.code IN ('ADMIN', 'DM_HEAD', 'PRODUCTION_MGR')
         ORDER BY m.name ASC`
      );

      return successResponse(res, {
        message: 'Employee directory synchronized successfully.',
        data: {
          employees: users,
          filterMeta: {
            departments: departments.map((d) => d.department),
            managers,
          },
          totalCount: users.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/employees/:employeeId
   * Individual employee full profile and live workload inspection
   */
  async getEmployeeById(req, res, next) {
    try {
      const employeeId = parseInt(req.params.employeeId, 10);
      if (isNaN(employeeId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid employee ID.' });
      }

      const users = await query(
        `SELECT u.id, u.name, u.email, u.phone, u.department, u.status, u.profile_image_url,
                COALESCE(u.employee_id, CONCAT('VME-', LPAD(u.id, 3, '0'))) AS employee_id,
                u.reporting_manager_id, u.created_at, u.last_login_at,
                r.id AS role_id, r.name AS role_name, r.code AS role_code,
                m.name AS reporting_manager_name, m.email AS reporting_manager_email, m.phone AS reporting_manager_phone
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN users m ON u.reporting_manager_id = m.id
         WHERE u.id = ?`,
        [employeeId]
      );

      if (!users || users.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Employee not found.' });
      }

      const employee = users[0];

      // Fetch all assignments for this employee
      const assignments = await getUnifiedAssignments({ employeeId });
      const summary = computeReportSummary(assignments);

      // Separate active assignments from completed
      const activeAssignments = assignments.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'PENDING' || a.status === 'OVERDUE');
      const recentCompleted = assignments.filter((a) => a.status === 'COMPLETED').slice(0, 10);

      return successResponse(res, {
        message: `Employee details for ${employee.name} retrieved.`,
        data: {
          profile: employee,
          summary,
          activeAssignments,
          recentCompleted,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/employees/:employeeId
   * Update employee metadata (Reporting manager, department, phone, employee_id)
   */
  async updateEmployee(req, res, next) {
    try {
      const employeeId = parseInt(req.params.employeeId, 10);
      const isSelf = req.user?.id === employeeId;
      const isAdminOrManager = Boolean(
        req.user?.is_system_admin ||
        req.user?.role_code === 'ADMIN' ||
        req.user?.role_code === 'DM_HEAD'
      );

      if (!isSelf && !isAdminOrManager) {
        return errorResponse(res, { statusCode: 403, message: 'Not authorized to modify this employee profile.' });
      }

      const {
        phone,
        department,
        reporting_manager_id,
        employee_id,
        profile_image_url,
      } = req.body;

      const updates = [];
      const params = [];

      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone ? phone.trim() : null);
      }

      if (profile_image_url !== undefined) {
        updates.push('profile_image_url = ?');
        params.push(profile_image_url ? profile_image_url.trim() : null);
      }

      // Only admins/managers can update department, manager, or employee_id
      if (isAdminOrManager) {
        if (department !== undefined) {
          updates.push('department = ?');
          params.push(department ? department.trim() : 'Marketing');
        }
        if (reporting_manager_id !== undefined) {
          updates.push('reporting_manager_id = ?');
          params.push(reporting_manager_id ? parseInt(reporting_manager_id, 10) : null);
        }
        if (employee_id !== undefined) {
          updates.push('employee_id = ?');
          params.push(employee_id ? employee_id.trim() : null);
        }
      }

      if (updates.length === 0) {
        return errorResponse(res, { statusCode: 400, message: 'No fields provided for update.' });
      }

      params.push(employeeId);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

      return successResponse(res, {
        message: 'Employee record successfully updated.',
      });
    } catch (error) {
      next(error);
    }
  },
};

