import { query } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const notificationController = {
  /**
   * GET /api/notifications
   * List user notifications with unread count
   */
  async listNotifications(req, res, next) {
    try {
      const userId = req.user?.id;
      const { unread_only = 'false' } = req.query;

      let whereClause = 'WHERE user_id = ?';
      if (unread_only === 'true') {
        whereClause += ' AND is_read = FALSE';
      }

      const notifications = await query(
        `SELECT id, type, title, message, reference_entity, reference_id,
                is_read, read_at, created_at
         FROM notifications
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );

      const unreadCountRows = await query(
        `SELECT COUNT(*) AS unread_count
         FROM notifications
         WHERE user_id = ? AND is_read = FALSE`,
        [userId]
      );
      const unreadCount = unreadCountRows[0]?.unread_count || 0;

      return successResponse(res, {
        message: 'Notifications retrieved successfully.',
        data: notifications,
        meta: {
          unreadCount,
          count: notifications.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read
   */
  async markAsRead(req, res, next) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      const userId = req.user?.id;

      if (isNaN(notificationId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Notification ID.' });
      }

      const result = await query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [notificationId, userId]
      );

      if (result.affectedRows === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Notification not found.' });
      }

      return successResponse(res, {
        message: 'Notification marked as read.',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/notifications/read-all
   * Mark all notifications for the authenticated user as read
   */
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user?.id;

      await query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = NOW()
         WHERE user_id = ? AND is_read = FALSE`,
        [userId]
      );

      return successResponse(res, {
        message: 'All notifications marked as read.',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/notifications/:id
   * Dismiss/delete a notification
   */
  async deleteNotification(req, res, next) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      const userId = req.user?.id;

      if (isNaN(notificationId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Notification ID.' });
      }

      const result = await query(
        `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
        [notificationId, userId]
      );

      if (result.affectedRows === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Notification not found.' });
      }

      return successResponse(res, {
        message: 'Notification dismissed successfully.',
      });
    } catch (error) {
      next(error);
    }
  },
};

