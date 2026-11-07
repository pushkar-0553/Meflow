import {
  getUnifiedAssignments,
  computeReportSummary,
  groupAssignmentsByEmployee,
} from '../services/report.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { query } from '../config/db.js';

export const reportController = {
  /**
   * GET /api/reports/daily
   */
  async getDailyReport(req, res, next) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const date = req.query.date || today;

      const {
        employee_id,
        role_id,
        course_id,
        stage,
        status,
        search,
        sort_by = 'time',
        sort_order = 'desc',
      } = req.query;

      const assignments = await getUnifiedAssignments({
        startDate: date,
        endDate: date,
        employeeId: employee_id,
        roleId: role_id,
        courseId: course_id,
        stage,
        status,
        search,
      });

      // Sorting
      assignments.sort((a, b) => {
        if (sort_by === 'employee') {
          return sort_order === 'asc'
            ? a.employee_name.localeCompare(b.employee_name)
            : b.employee_name.localeCompare(a.employee_name);
        }
        if (sort_by === 'status') {
          return sort_order === 'asc'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        }
        if (sort_by === 'video') {
          return sort_order === 'asc'
            ? (a.video_title || '').localeCompare(b.video_title || '')
            : (b.video_title || '').localeCompare(a.video_title || '');
        }
        // Default sort by time
        const timeA = new Date(a.completed_at || a.started_at || a.assigned_date).getTime();
        const timeB = new Date(b.completed_at || b.started_at || b.assigned_date).getTime();
        return sort_order === 'asc' ? timeA - timeB : timeB - timeA;
      });

      const summary = computeReportSummary(assignments);
      const byEmployee = groupAssignmentsByEmployee(assignments);

      return successResponse(res, {
        message: `Daily report for ${date} generated successfully.`,
        data: {
          period: 'DAILY',
          selectedDate: date,
          summary,
          byEmployee,
          assignments,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/weekly
   */
  async getWeeklyReport(req, res, next) {
    try {
      // Default to current week's Monday to Sunday
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const sunday = new Date(now.setDate(diffToMonday + 6));

      const defaultStart = monday.toISOString().slice(0, 10);
      const defaultEnd = sunday.toISOString().slice(0, 10);

      const weekStart = req.query.start_date || defaultStart;
      const weekEnd = req.query.end_date || defaultEnd;

      const {
        employee_id,
        role_id,
        course_id,
        stage,
        status,
        search,
      } = req.query;

      const assignments = await getUnifiedAssignments({
        startDate: weekStart,
        endDate: weekEnd,
        employeeId: employee_id,
        roleId: role_id,
        courseId: course_id,
        stage,
        status,
        search,
      });

      const summary = computeReportSummary(assignments);
      const byEmployee = groupAssignmentsByEmployee(assignments);

      return successResponse(res, {
        message: `Weekly report from ${weekStart} to ${weekEnd} generated successfully.`,
        data: {
          period: 'WEEKLY',
          weekStart,
          weekEnd,
          summary,
          byEmployee,
          totalAssignments: assignments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/monthly
   */
  async getMonthlyReport(req, res, next) {
    try {
      const now = new Date();
      const year = parseInt(req.query.year, 10) || now.getFullYear();
      const month = parseInt(req.query.month, 10) || now.getMonth() + 1; // 1-12

      // First and last day of selected month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const {
        employee_id,
        role_id,
        course_id,
        stage,
        status,
        search,
      } = req.query;

      const assignments = await getUnifiedAssignments({
        startDate,
        endDate,
        employeeId: employee_id,
        roleId: role_id,
        courseId: course_id,
        stage,
        status,
        search,
      });

      const summary = computeReportSummary(assignments);
      const byEmployee = groupAssignmentsByEmployee(assignments);

      // Stage-wise breakdown
      const stageBreakdown = {};
      for (const a of assignments) {
        const sKey = a.stage_name || 'Other';
        if (!stageBreakdown[sKey]) {
          stageBreakdown[sKey] = { stage: sKey, total: 0, completed: 0, in_progress: 0, pending: 0 };
        }
        stageBreakdown[sKey].total += 1;
        if (a.status === 'COMPLETED') stageBreakdown[sKey].completed += 1;
        else if (a.status === 'IN_PROGRESS') stageBreakdown[sKey].in_progress += 1;
        else if (a.status === 'PENDING') stageBreakdown[sKey].pending += 1;
      }

      return successResponse(res, {
        message: `Monthly report for ${year}-${month} generated successfully.`,
        data: {
          period: 'MONTHLY',
          year,
          month,
          startDate,
          endDate,
          summary,
          byEmployee,
          stageBreakdown: Object.values(stageBreakdown),
          totalAssignments: assignments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/annual
   */
  async getAnnualReport(req, res, next) {
    try {
      const now = new Date();
      const year = parseInt(req.query.year, 10) || now.getFullYear();

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const {
        employee_id,
        role_id,
        course_id,
        stage,
        status,
        search,
      } = req.query;

      const assignments = await getUnifiedAssignments({
        startDate,
        endDate,
        employeeId: employee_id,
        roleId: role_id,
        courseId: course_id,
        stage,
        status,
        search,
      });

      const summary = computeReportSummary(assignments);
      const byEmployee = groupAssignmentsByEmployee(assignments);

      // Month-by-month trends for the selected year
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTrends = monthNames.map((name, idx) => ({
        monthIndex: idx + 1,
        monthName: name,
        total: 0,
        completed: 0,
        pending: 0,
        delayed: 0,
      }));

      for (const a of assignments) {
        const d = new Date(a.completed_at || a.started_at || a.assigned_date);
        if (d.getFullYear() === year) {
          const mIdx = d.getMonth();
          monthlyTrends[mIdx].total += 1;
          if (a.status === 'COMPLETED') monthlyTrends[mIdx].completed += 1;
          else if (a.status === 'OVERDUE') monthlyTrends[mIdx].delayed += 1;
          else monthlyTrends[mIdx].pending += 1;
        }
      }

      return successResponse(res, {
        message: `Annual report for ${year} generated successfully.`,
        data: {
          period: 'ANNUAL',
          year,
          startDate,
          endDate,
          summary,
          byEmployee,
          monthlyTrends,
          totalAssignments: assignments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/eod
   * End-of-Day (EOD) Summary for Employees and Management
   */
  async getEodReport(req, res, next) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const date = req.query.date || today;

      const currentUserId = req.user?.id;
      const isAdminOrManager = Boolean(
        req.user?.is_system_admin ||
        req.user?.role_code === 'ADMIN' ||
        req.user?.role_code === 'DM_HEAD' ||
        req.user?.role_code === 'PRODUCTION_MGR'
      );

      // Target employee: if regular employee, force self; if manager, allow employee_id query
      const targetEmployeeId = (!isAdminOrManager)
        ? currentUserId
        : (req.query.employee_id ? parseInt(req.query.employee_id, 10) : null);

      // Fetch assignments active or updated on this date
      const assignments = await getUnifiedAssignments({
        startDate: date,
        endDate: date,
        employeeId: targetEmployeeId,
      });

      // Employee EOD Metrics
      const assignedToday = assignments.filter((a) => {
        const d = a.assigned_date ? new Date(a.assigned_date).toISOString().slice(0, 10) : null;
        return d === date;
      }).length;

      const acceptedToday = assignments.filter((a) => {
        const d = a.started_at ? new Date(a.started_at).toISOString().slice(0, 10) : null;
        return d === date;
      }).length;

      const completedToday = assignments.filter((a) => a.status === 'COMPLETED').length;
      const inProgressToday = assignments.filter((a) => a.status === 'IN_PROGRESS').length;
      const pendingToday = assignments.filter((a) => a.status === 'PENDING').length;
      const delayedToday = assignments.filter((a) => a.status === 'OVERDUE').length;

      // Management specific aggregates
      let managementView = null;
      if (isAdminOrManager && !targetEmployeeId) {
        const allEmployees = await query(
          `SELECT u.id, u.name, u.phone, r.name AS role_name, r.code AS role_code
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.status = 'ACTIVE'
           ORDER BY u.name ASC`
        );

        const completedEmpIds = new Set(
          assignments.filter((a) => a.status === 'COMPLETED').map((a) => a.employee_id)
        );
        const pendingEmpIds = new Set(
          assignments.filter((a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS').map((a) => a.employee_id)
        );
        const delayedEmpIds = new Set(
          assignments.filter((a) => a.status === 'OVERDUE').map((a) => a.employee_id)
        );

        // Videos completed and published today
        const [videosCompleted] = await query(
          `SELECT COUNT(*) AS count FROM video_projects
           WHERE overall_status = 'COMPLETED' AND DATE(completed_at) = ?`,
          [date]
        );
        const [videosPublished] = await query(
          `SELECT COUNT(*) AS count FROM platform_publications
           WHERE status = 'PUBLISHED' AND DATE(published_at) = ?`,
          [date]
        );

        // Stages waiting for pickup / unassigned
        const [unassignedPool] = await query(
          `SELECT COUNT(*) AS count FROM video_projects vp
           WHERE vp.current_stage IN ('CONTENT_WRITING', 'CINEMATOGRAPHY', 'VIDEO_EDITING')
             AND vp.overall_status NOT IN ('COMPLETED', 'CANCELLED')`
        );

        managementView = {
          totalTeamStaff: allEmployees.length,
          employeesCompletedCount: completedEmpIds.size,
          employeesPendingCount: pendingEmpIds.size,
          employeesDelayedCount: delayedEmpIds.size,
          videosCompletedToday: videosCompleted?.count || 0,
          videosPublishedToday: videosPublished?.count || 0,
          unassignedStagesCount: unassignedPool?.count || 0,
          teamBreakdown: groupAssignmentsByEmployee(assignments),
        };
      }

      return successResponse(res, {
        message: `End-of-Day report for ${date} generated successfully.`,
        data: {
          date,
          isManagerView: Boolean(isAdminOrManager && !targetEmployeeId),
          summary: {
            assignedToday,
            acceptedToday,
            completedToday,
            inProgressToday,
            pendingToday,
            delayedToday,
            totalWorkItems: assignments.length,
          },
          assignments,
          managementView,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/employee/:employeeId
   */
  async getEmployeeReport(req, res, next) {
    try {
      const employeeId = parseInt(req.params.employeeId, 10);
      if (isNaN(employeeId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid employee ID.' });
      }

      const { start_date, end_date } = req.query;

      const assignments = await getUnifiedAssignments({
        startDate: start_date,
        endDate: end_date,
        employeeId,
      });

      const summary = computeReportSummary(assignments);

      return successResponse(res, {
        message: 'Employee performance report generated successfully.',
        data: {
          employeeId,
          summary,
          assignments,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

