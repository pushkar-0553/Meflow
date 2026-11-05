import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { env } from '../config/env.js';
import { emailService } from '../services/email.service.js';
import { getEffectivePermissions } from '../services/authz.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { signToken, verifyToken } from '../utils/jwt.js';

// Input Validation Schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

const inviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  role_id: z.number().int().positive('Role ID must be a positive integer'),
  department: z.string().default('Marketing'),
  phone: z.string().optional().nullable(),
});

const completeInviteSchema = z.object({
  token: z.string().min(10, 'Invitation token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const authController = {
  /**
   * POST /api/auth/login
   * Authenticate employee/admin credentials and initialize persistent session
   */
  async login(req, res, next) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const users = await query(
        `SELECT u.id, u.role_id, u.name, u.email, u.password_hash, u.department, u.status, u.profile_image_url,
                r.name AS role_name, r.code AS role_code, r.is_system_admin
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE LOWER(u.email) = LOWER(?)`,
        [email.trim()]
      );

      if (!users || users.length === 0) {
        return errorResponse(res, {
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        });
      }

      const user = users[0];

      if (user.status === 'INVITED' || !user.password_hash) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'INVITATION_PENDING',
          message: 'Your account has not yet completed setup. Please check your invitation email to set your password.',
        });
      }

      if (user.status === 'SUSPENDED') {
        return errorResponse(res, {
          statusCode: 403,
          code: 'ACCOUNT_SUSPENDED',
          message: 'This account has been suspended by an administrator. Please contact your manager.',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return errorResponse(res, {
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        });
      }

      // Update last login timestamp
      await query(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [user.id]);

      // Calculate effective permissions
      const effectivePerms = await getEffectivePermissions(user.id);

      // Establish session
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        role_id: user.role_id,
        role_code: user.role_code,
        role_name: user.role_name,
        is_system_admin: Boolean(user.is_system_admin),
        profile_image_url: user.profile_image_url,
        role: {
          id: user.role_id,
          code: user.role_code,
          name: user.role_name,
          is_system_admin: Boolean(user.is_system_admin),
        },
      };

      // Generate signed JWT access token for cross-domain Bearer auth
      const token = signToken({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        role_code: user.role_code,
      });

      // Record activity
      await query(
        `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
         VALUES (?, 'USER_LOGIN', 'USER', ?, ?, ?)`,
        [user.id, user.id, JSON.stringify({ email: user.email }), req.ip]
      );

      return successResponse(res, {
        message: 'Signed in successfully.',
        data: {
          token,
          user: req.session.user,
          permissions: Array.from(effectivePerms),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * Retrieve active session user context and live effective permissions
   */
  async getMe(req, res, next) {
    try {
      let userId = req.session?.user?.id || req.user?.id;

      // Fallback: check Authorization Bearer header if session is empty (cross-domain support)
      if (!userId && req.headers.authorization?.startsWith('Bearer ')) {
        const rawToken = req.headers.authorization.split(' ')[1];
        const decoded = verifyToken(rawToken);
        if (decoded && decoded.id) {
          userId = decoded.id;
        }
      }

      if (!userId) {
        return errorResponse(res, {
          statusCode: 401,
          code: 'UNAUTHENTICATED',
          message: 'No active session or valid authorization token found.',
        });
      }

      const users = await query(
        `SELECT u.id, u.role_id, u.name, u.email, u.department, u.status, u.phone, u.profile_image_url, u.last_login_at,
                r.name AS role_name, r.code AS role_code, r.is_system_admin
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [userId]
      );

      if (!users || users.length === 0 || users[0].status !== 'ACTIVE') {
        if (req.session) req.session.destroy(() => {});
        return errorResponse(res, {
          statusCode: 401,
          code: 'SESSION_INVALID',
          message: 'Active account record not found.',
        });
      }

      const user = users[0];
      const effectivePerms = await getEffectivePermissions(user.id);

      const userContext = {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        role_id: user.role_id,
        role_code: user.role_code,
        role_name: user.role_name,
        is_system_admin: Boolean(user.is_system_admin),
        profile_image_url: user.profile_image_url,
        role: {
          id: user.role_id,
          code: user.role_code,
          name: user.role_name,
          is_system_admin: Boolean(user.is_system_admin),
        },
      };

      // Refresh session object if session exists
      if (req.session) {
        req.session.user = userContext;
      }

      return successResponse(res, {
        message: 'Current authenticated user profile',
        data: {
          user: {
            ...userContext,
            phone: user.phone,
            last_login_at: user.last_login_at,
          },
          permissions: Array.from(effectivePerms),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/logout
   * Terminate persistent session and invalidate cookie
   */
  async logout(req, res, next) {
    try {
      const userId = req.session?.user?.id;
      if (userId) {
        await query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, ip_address)
           VALUES (?, 'USER_LOGOUT', 'USER', ?, ?)`,
          [userId, userId, req.ip]
        );
      }

      req.session.destroy((err) => {
        if (err) {
          logger.error('Session destruction error:', err.message);
        }
        res.clearCookie('meflow_sid');
        return successResponse(res, {
          message: 'Signed out successfully.',
        });
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/invite
   * Admin/Manager invites an employee and dispatches Brevo onboarding link
   */
  async inviteEmployee(req, res, next) {
    try {
      const data = inviteSchema.parse(req.body);

      // Verify role exists
      const roles = await query(`SELECT id, name, code FROM roles WHERE id = ? AND is_active = TRUE`, [data.role_id]);
      if (!roles || roles.length === 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'ROLE_NOT_FOUND',
          message: 'Selected role does not exist or is inactive.',
        });
      }
      const role = roles[0];

      // Check if email already registered
      const existing = await query(`SELECT id, status FROM users WHERE LOWER(email) = LOWER(?)`, [data.email.trim()]);
      if (existing && existing.length > 0) {
        return errorResponse(res, {
          statusCode: 409,
          code: 'EMAIL_ALREADY_EXISTS',
          message: `An employee account with email '${data.email}' already exists.`,
        });
      }

      // Generate cryptographically secure single-use token (256-bit entropy)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 Hours

      let createdUserId;

      await transaction(async (conn) => {
        // 1. Create user with status='INVITED'
        const [userResult] = await conn.query(
          `INSERT INTO users (role_id, name, email, department, phone, status)
           VALUES (?, ?, ?, ?, ?, 'INVITED')`,
          [data.role_id, data.name.trim(), data.email.trim().toLowerCase(), data.department, data.phone || null]
        );
        createdUserId = userResult.insertId;

        // 2. Insert hashed token into invitation_tokens
        await conn.query(
          `INSERT INTO invitation_tokens (user_id, token_hash, expires_at)
           VALUES (?, ?, ?)`,
          [createdUserId, tokenHash, expiresAt]
        );

        // 3. Log audit event
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'USER_INVITED', 'USER', ?, ?, ?)`,
          [req.user?.id || null, createdUserId, JSON.stringify({ email: data.email, role: role.name }), req.ip]
        );
      });

      // Construct onboarding link
      const inviteUrl = `${env.FRONTEND_URL}/set-password?token=${rawToken}`;

      // Dispatch invitation email via Brevo HTTPS API
      const emailResult = await emailService.sendInvitationEmail({
        to: data.email,
        name: data.name,
        roleName: role.name,
        inviteUrl,
      });

      return successResponse(res, {
        statusCode: 201,
        message: `Invitation successfully created and sent to ${data.email}.`,
        data: {
          user: {
            id: createdUserId,
            name: data.name,
            email: data.email,
            role_id: data.role_id,
            role_name: role.name,
            department: data.department,
            status: 'INVITED',
          },
          inviteUrl, // Exposed in response for rapid testing/clicking in development
          emailDispatched: emailResult.success,
          emailProvider: emailResult.provider,
          emailError: emailResult.error || null,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/test-email
   * Admin-only utility to test Brevo transactional email delivery
   */
  async testEmail(req, res, next) {
    try {
      const targetEmail = req.body.email || req.user?.email;
      if (!targetEmail) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'MISSING_EMAIL',
          message: 'Target email is required for delivery test.',
        });
      }

      const result = await emailService.sendTestEmail({
        to: targetEmail,
        requestedBy: req.user?.name || 'Administrator',
      });

      return successResponse(res, {
        message: result.success
          ? `Test email sent successfully to ${targetEmail} via ${result.provider}.`
          : `Email test completed with fallback: ${result.error}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/verify-invite
   * Validate raw token before rendering Set Password screen
   */
  async verifyInvite(req, res, next) {
    try {
      const rawToken = req.query.token;
      if (!rawToken || typeof rawToken !== 'string') {
        return errorResponse(res, {
          statusCode: 400,
          code: 'MISSING_TOKEN',
          message: 'Invitation token is required.',
        });
      }

      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const records = await query(
        `SELECT it.id, it.user_id, it.expires_at, it.used_at,
                u.name, u.email, u.status, r.name AS role_name
         FROM invitation_tokens it
         JOIN users u ON it.user_id = u.id
         JOIN roles r ON u.role_id = r.id
         WHERE it.token_hash = ?`,
        [tokenHash]
      );

      if (!records || records.length === 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'INVALID_TOKEN',
          message: 'Invitation link is invalid.',
        });
      }

      const record = records[0];

      if (record.used_at !== null) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'TOKEN_ALREADY_USED',
          message: 'This invitation has already been used. Please log in with your credentials.',
        });
      }

      if (new Date() > new Date(record.expires_at)) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'TOKEN_EXPIRED',
          message: 'This invitation link has expired. Please request a new invitation from your administrator.',
        });
      }

      return successResponse(res, {
        message: 'Invitation token is valid.',
        data: {
          user: {
            name: record.name,
            email: record.email,
            role_name: record.role_name,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/complete-invite
   * Set employee password and activate account
   */
  async completeInvite(req, res, next) {
    try {
      const { token: rawToken, password } = completeInviteSchema.parse(req.body);

      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const records = await query(
        `SELECT it.id, it.user_id, it.expires_at, it.used_at, u.email, u.name
         FROM invitation_tokens it
         JOIN users u ON it.user_id = u.id
         WHERE it.token_hash = ?`,
        [tokenHash]
      );

      if (!records || records.length === 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'INVALID_TOKEN',
          message: 'Invalid invitation link.',
        });
      }

      const record = records[0];

      if (record.used_at !== null) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'TOKEN_ALREADY_USED',
          message: 'Invitation has already been consumed.',
        });
      }

      if (new Date() > new Date(record.expires_at)) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'TOKEN_EXPIRED',
          message: 'Invitation link has expired.',
        });
      }

      // Hash password (12 salt rounds)
      const passwordHash = await bcrypt.hash(password, 12);

      await transaction(async (conn) => {
        // Activate user and save password
        await conn.query(
          `UPDATE users SET password_hash = ?, status = 'ACTIVE' WHERE id = ?`,
          [passwordHash, record.user_id]
        );

        // Mark token as consumed
        await conn.query(
          `UPDATE invitation_tokens SET used_at = NOW() WHERE id = ?`,
          [record.id]
        );

        // Log audit event
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, ip_address)
           VALUES (?, 'USER_ACTIVATED', 'USER', ?, ?)`,
          [record.user_id, record.user_id, req.ip]
        );
      });

      logger.success(`User onboarding completed for ${record.email}`);

      return successResponse(res, {
        message: 'Password successfully set. Your account is now active. Please sign in.',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const users = await query(`SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
      if (!users || users.length === 0) {
        // Return generic success to prevent email enumeration attacks
        return successResponse(res, {
          message: 'If an account exists with this email, a password reset link has been dispatched.',
        });
      }

      const user = users[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Hour

      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
        [user.id, tokenHash, expiresAt]
      );

      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });

      return successResponse(res, {
        message: 'If an account exists with this email, a password reset link has been dispatched.',
        data: env.isDev ? { resetUrl } : null,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token: rawToken, password } = resetPasswordSchema.parse(req.body);
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const records = await query(
        `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`,
        [tokenHash]
      );

      if (!records || records.length === 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'INVALID_TOKEN',
          message: 'Password reset link is invalid.',
        });
      }

      const record = records[0];
      if (record.used_at !== null || new Date() > new Date(record.expires_at)) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'TOKEN_EXPIRED',
          message: 'Password reset link has expired or has already been used.',
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await transaction(async (conn) => {
        await conn.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, record.user_id]);
        await conn.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`, [record.id]);
        // Terminate any existing sessions for this user for security
        await conn.query(
          `DELETE FROM sessions WHERE JSON_EXTRACT(sess, '$.user.id') = ?`,
          [record.user_id]
        );
      });

      return successResponse(res, {
        message: 'Password has been reset successfully. Please sign in with your new password.',
      });
    } catch (error) {
      next(error);
    }
  },
};

