import crypto from 'crypto';
import { query } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import {
  getUnifiedAssignments,
  computeReportSummary,
  groupAssignmentsByEmployee,
} from '../services/report.service.js';

export const reportShareController = {
  /**
   * POST /api/reports/share
   * Create or update a dynamic report share link
   */
  async createShare(req, res, next) {
    try {
      const userId = req.user?.id;
      const {
        report_name,
        report_type,
        report_configuration = {},
        access_mode = 'PUBLIC_LINK',
        include_contact_details = false,
        expires_in_days = 7, // default 7 days, 0 for no expiry
      } = req.body;

      if (!report_name || !report_type) {
        return errorResponse(res, {
          statusCode: 400,
          message: 'Report name and report type are required.',
        });
      }

      // Generate cryptographically secure unguessable random token (48 chars hex)
      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      let expiresAt = null;
      if (expires_in_days && Number(expires_in_days) > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + Number(expires_in_days));
        expiresAt = expDate;
      }

      const insertRes = await query(
        `INSERT INTO report_shares (
          report_name, share_token_hash, report_type, report_configuration,
          created_by, access_mode, include_contact_details, is_active, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [
          report_name.trim(),
          tokenHash,
          report_type.toUpperCase(),
          JSON.stringify(report_configuration),
          userId,
          access_mode,
          Boolean(include_contact_details),
          expiresAt,
        ]
      );

      const shareId = insertRes.insertId;

      return successResponse(res, {
        statusCode: 201,
        message: 'Dynamic shareable report link generated successfully.',
        data: {
          shareId,
          shareToken: rawToken,
          reportName: report_name,
          reportType: report_type,
          accessMode: access_mode,
          includeContactDetails: Boolean(include_contact_details),
          expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/share/:token
   * Public or Authenticated retrieval of LIVE dynamic report data
   */
  async getSharedReport(req, res, next) {
    try {
      const rawToken = req.params.token;
      if (!rawToken || rawToken.length < 20) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid or missing share token.' });
      }

      // Hash token to look up database record
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const shares = await query(
        `SELECT rs.*, u.name AS creator_name, u.email AS creator_email
         FROM report_shares rs
         JOIN users u ON rs.created_by = u.id
         WHERE rs.share_token_hash = ? AND rs.is_active = TRUE`,
        [tokenHash]
      );

      if (!shares || shares.length === 0) {
        return errorResponse(res, {
          statusCode: 404,
          code: 'REPORT_NOT_FOUND',
          message: 'This shared report does not exist or has been revoked.',
        });
      }

      const share = shares[0];

      // Check expiry date
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        return errorResponse(res, {
          statusCode: 410,
          code: 'REPORT_EXPIRED',
          message: 'This shared report link has expired.',
        });
      }

      // Check authenticated access mode
      if (share.access_mode === 'AUTHENTICATED' && !req.user) {
        return errorResponse(res, {
          statusCode: 401,
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Please sign in to view this report.',
        });
      }

      // Log access event
      const viewerUserId = req.user?.id || null;
      await query(
        `INSERT INTO report_share_access_logs (report_share_id, viewer_user_id, ip_address, user_agent)
         VALUES (?, ?, ?, ?)`,
        [share.id, viewerUserId, req.ip, req.headers['user-agent']?.slice(0, 255) || 'Unknown']
      ).catch((err) => console.warn('Failed to log share access event:', err.message));

      // Parse saved configuration
      let config = {};
      try {
        config = typeof share.report_configuration === 'string'
          ? JSON.parse(share.report_configuration)
          : share.report_configuration || {};
      } catch {
        config = {};
      }

      // DYNAMIC LIVE DATA EXECUTION:
      // Query the live database right now according to the saved filters
      const assignments = await getUnifiedAssignments({
        startDate: config.startDate || config.selectedDate,
        endDate: config.endDate || config.selectedDate,
        employeeId: config.employeeId,
        roleId: config.roleId,
        courseId: config.courseId,
        stage: config.stage,
        status: config.status,
        search: config.search,
      });

      // Privacy enforcement: mask phone numbers and personal emails if disabled
      const sanitizedAssignments = assignments.map((a) => {
        if (!share.include_contact_details) {
          return {
            ...a,
            employee_phone: null,
            employee_email: null,
          };
        }
        return a;
      });

      const summary = computeReportSummary(sanitizedAssignments);
      const byEmployee = groupAssignmentsByEmployee(sanitizedAssignments);

      return successResponse(res, {
        message: 'Live shared report synchronized successfully.',
        data: {
          shareId: share.id,
          reportName: share.report_name,
          reportType: share.report_type,
          accessMode: share.access_mode,
          includeContactDetails: Boolean(share.include_contact_details),
          expiresAt: share.expires_at,
          createdAt: share.created_at,
          lastUpdatedAt: new Date().toISOString(),
          config,
          summary,
          byEmployee,
          assignments: sanitizedAssignments,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/reports/share/:shareId
   * Revoke an active share link
   */
  async revokeShare(req, res, next) {
    try {
      const shareId = parseInt(req.params.shareId, 10);
      const userId = req.user?.id;
      const isAdmin = Boolean(req.user?.is_system_admin || req.user?.role_code === 'ADMIN');

      const shares = await query(`SELECT * FROM report_shares WHERE id = ?`, [shareId]);
      if (!shares || shares.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Share link not found.' });
      }

      if (!isAdmin && shares[0].created_by !== userId) {
        return errorResponse(res, { statusCode: 403, message: 'Not authorized to revoke this link.' });
      }

      await query(
        `UPDATE report_shares SET is_active = FALSE, revoked_at = NOW() WHERE id = ?`,
        [shareId]
      );

      return successResponse(res, { message: 'Shared report link successfully revoked.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/share/:shareId/access-logs
   */
  async getAccessLogs(req, res, next) {
    try {
      const shareId = parseInt(req.params.shareId, 10);
      const logs = await query(
        `SELECT rsal.*, u.name AS viewer_name, u.email AS viewer_email
         FROM report_share_access_logs rsal
         LEFT JOIN users u ON rsal.viewer_user_id = u.id
         WHERE rsal.report_share_id = ?
         ORDER BY rsal.accessed_at DESC
         LIMIT 100`,
        [shareId]
      );

      return successResponse(res, {
        message: 'Share access logs retrieved.',
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  },
};

