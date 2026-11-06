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
  email: z.string().email('Invalid email address format'),
  phone: z.string().min(4, 'Registered phone number is required'),
});

const verifyResetOtpSchema = z.object({
  email: z.string().email('Invalid email address format'),
  otp: z.string().length(6, 'Verification code must be 6 digits'),
});

const resendResetOtpSchema = z.object({
  email: z.string().email('Invalid email address format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
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
   * Step 1 & 2: Account Verification via Registered Email & Registered Phone
   * Dispatches 6-digit OTP to the registered email via Brevo
   */
  async forgotPassword(req, res, next) {
    try {
      const { email, phone } = forgotPasswordSchema.parse(req.body);

      const users = await query(
        `SELECT id, name, email, phone, status FROM users WHERE LOWER(email) = LOWER(?)`,
        [email.trim()]
      );

      // Helper to mask email for safe UI display
      const maskEmail = (em) => {
        if (!em || !em.includes('@')) return 'your email';
        const [local, domain] = em.split('@');
        const visible = local.length > 2 ? local[0] + '***' + local[local.length - 1] : local[0] + '***';
        const domainParts = domain.split('.');
        const maskedDomain = domainParts[0][0] + '***.' + domainParts.slice(1).join('.');
        return `${visible}@${maskedDomain}`;
      };

      // Helper to clean phone numbers for flexible matching
      const cleanDigits = (num) => (num ? num.replace(/\D/g, '') : '');

      if (!users || users.length === 0 || users[0].status !== 'ACTIVE') {
        // Return generic success to prevent email enumeration attacks
        return successResponse(res, {
          message: 'If the account details match our records, a 6-digit verification code has been dispatched to your registered email.',
          data: {
            maskedEmail: maskEmail(email),
            expiresInSeconds: 300,
          },
        });
      }

      const user = users[0];
      const userPhoneDigits = cleanDigits(user.phone);
      const inputPhoneDigits = cleanDigits(phone);

      // Verify that phone matches the registered user record
      const isPhoneMatch =
        userPhoneDigits.length >= 7 &&
        inputPhoneDigits.length >= 7 &&
        (userPhoneDigits.endsWith(inputPhoneDigits) || inputPhoneDigits.endsWith(userPhoneDigits));

      if (!isPhoneMatch) {
        // Return generic success to prevent phone enumeration attacks
        return successResponse(res, {
          message: 'If the account details match our records, a 6-digit verification code has been dispatched to your registered email.',
          data: {
            maskedEmail: maskEmail(user.email),
            expiresInSeconds: 300,
          },
        });
      }

      // Invalidate existing unverified OTPs for this user
      await query(
        `UPDATE password_reset_otps SET verified_at = NOW() WHERE user_id = ? AND verified_at IS NULL`,
        [user.id]
      );

      // Generate cryptographically random 6-digit OTP
      const otp = String(crypto.randomInt(100000, 1000000));
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 Minutes

      await query(
        `INSERT INTO password_reset_otps (user_id, otp_hash, attempts_left, expires_at)
         VALUES (?, ?, 5, ?)`,
        [user.id, otpHash, expiresAt]
      );

      // Dispatch OTP email via Brevo
      await emailService.sendResetOtpEmail({
        to: user.email,
        name: user.name,
        otp,
      });

      return successResponse(res, {
        message: 'If the account details match our records, a 6-digit verification code has been dispatched to your registered email.',
        data: {
          maskedEmail: maskEmail(user.email),
          expiresInSeconds: 300,
          otp: env.isDev ? otp : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/verify-reset-otp
   * Step 3: Validate 6-digit OTP with rate limiting & generate short-lived Reset Authorization Token
   */
  async verifyResetOtp(req, res, next) {
    try {
      const { email, otp } = verifyResetOtpSchema.parse(req.body);

      const users = await query(
        `SELECT id, name, email, status FROM users WHERE LOWER(email) = LOWER(?)`,
        [email.trim()]
      );

      if (!users || users.length === 0 || users[0].status !== 'ACTIVE') {
        return errorResponse(res, {
          statusCode: 400,
          code: 'INVALID_OTP',
          message: 'Invalid or expired verification code.',
        });
      }

      const user = users[0];
      const records = await query(
        `SELECT id, user_id, otp_hash, attempts_left, expires_at, verified_at
         FROM password_reset_otps
         WHERE user_id = ? AND verified_at IS NULL
         ORDER BY id DESC
         LIMIT 1`,
        [user.id]
      );

      if (!records || records.length === 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'OTP_NOT_FOUND',
          message: 'No active verification request found. Please request a new code.',
        });
      }

      const record = records[0];

      if (record.attempts_left <= 0) {
        await query(`UPDATE password_reset_otps SET verified_at = NOW() WHERE id = ?`, [record.id]);
        return errorResponse(res, {
          statusCode: 400,
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: 'Maximum verification attempts exceeded. Please request a new code.',
        });
      }

      if (new Date() > new Date(record.expires_at)) {
        await query(`UPDATE password_reset_otps SET verified_at = NOW() WHERE id = ?`, [record.id]);
        return errorResponse(res, {
          statusCode: 400,
          code: 'OTP_EXPIRED',
          message: 'Verification code has expired. Please request a new code.',
        });
      }

      const incomingOtpHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
      const expectedHashBuffer = Buffer.from(record.otp_hash);
      const incomingHashBuffer = Buffer.from(incomingOtpHash);

      const isMatch =
        expectedHashBuffer.length === incomingHashBuffer.length &&
        crypto.timingSafeEqual(expectedHashBuffer, incomingHashBuffer);

      if (!isMatch) {
        const remaining = record.attempts_left - 1;
        await query(`UPDATE password_reset_otps SET attempts_left = ? WHERE id = ?`, [remaining, record.id]);
        return errorResponse(res, {
          statusCode: 400,
          code: 'INVALID_OTP',
          message: remaining > 0
            ? `Incorrect verification code. ${remaining} attempts remaining.`
            : 'Incorrect verification code. Maximum attempts exceeded. Please request a new code.',
        });
      }

      // Mark OTP as verified
      await query(`UPDATE password_reset_otps SET verified_at = NOW() WHERE id = ?`, [record.id]);

      // Generate secure single-use password reset authorization token
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
      const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes

      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
        [user.id, tokenHash, resetExpiresAt]
      );

      return successResponse(res, {
        message: 'Identity verified successfully. You may now set your new password.',
        data: {
          resetToken: rawResetToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/resend-reset-otp
   * Resend OTP with 45-second anti-abuse cooldown
   */
  async resendResetOtp(req, res, next) {
    try {
      const { email } = resendResetOtpSchema.parse(req.body);

      const users = await query(
        `SELECT id, name, email, phone, status FROM users WHERE LOWER(email) = LOWER(?)`,
        [email.trim()]
      );

      if (!users || users.length === 0 || users[0].status !== 'ACTIVE') {
        return successResponse(res, {
          message: 'If the account exists, a new verification code has been dispatched.',
        });
      }

      const user = users[0];

      // Anti-abuse: 45-second cooldown
      const recent = await query(
        `SELECT created_at FROM password_reset_otps
         WHERE user_id = ? AND created_at > (NOW() - INTERVAL 45 SECOND)
         ORDER BY id DESC LIMIT 1`,
        [user.id]
      );

      if (recent && recent.length > 0) {
        return errorResponse(res, {
          statusCode: 429,
          code: 'RATE_LIMIT_COOLDOWN',
          message: 'Please wait 45 seconds before requesting another verification code.',
        });
      }

      // Invalidate previous OTPs
      await query(
        `UPDATE password_reset_otps SET verified_at = NOW() WHERE user_id = ? AND verified_at IS NULL`,
        [user.id]
      );

      const otp = String(crypto.randomInt(100000, 1000000));
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await query(
        `INSERT INTO password_reset_otps (user_id, otp_hash, attempts_left, expires_at) VALUES (?, ?, 5, ?)`,
        [user.id, otpHash, expiresAt]
      );

      await emailService.sendResetOtpEmail({
        to: user.email,
        name: user.name,
        otp,
      });

      return successResponse(res, {
        message: 'A new 6-digit verification code has been dispatched to your email.',
        data: {
          expiresInSeconds: 300,
          otp: env.isDev ? otp : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/reset-password
   * Step 4: Set new password with complexity enforcement & invalidate sessions
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
          message: 'Password reset session is invalid or has expired.',
        });
      }

      const record = records[0];
      if (record.used_at !== null || new Date() > new Date(record.expires_at)) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'TOKEN_EXPIRED',
          message: 'Password reset authorization has expired or has already been used.',
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await transaction(async (conn) => {
        // 1. Update password
        await conn.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, record.user_id]);

        // 2. Consume reset authorization token
        await conn.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`, [record.id]);

        // 3. Invalidate any outstanding OTPs for this user
        await conn.query(
          `UPDATE password_reset_otps SET verified_at = NOW() WHERE user_id = ? AND verified_at IS NULL`,
          [record.user_id]
        );

        // 4. Invalidate active sessions
        await conn.query(
          `DELETE FROM sessions WHERE JSON_EXTRACT(sess, '$.user.id') = ?`,
          [record.user_id]
        );

        // 5. Audit log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, ip_address)
           VALUES (?, 'PASSWORD_RESET', 'USER', ?, ?)`,
          [record.user_id, record.user_id, req.ip]
        );
      });

      return successResponse(res, {
        message: 'Your password has been changed successfully. Please log in with your new password.',
      });
    } catch (error) {
      next(error);
    }
  },
};

