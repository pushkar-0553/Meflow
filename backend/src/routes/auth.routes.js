import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Strict Rate Limiting on Login (10 attempts per 15 minutes per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting on password recovery and OTP attempts
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    code: 'TOO_MANY_OTP_ATTEMPTS',
    message: 'Too many verification attempts. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication Lifecycle
router.post('/login', loginLimiter, authController.login);
router.get('/me', authController.getMe);
router.post('/logout', requireAuth, authController.logout);

// Onboarding & Invitation Flow
router.post('/invite', requireAuth, requireAdmin, authController.inviteEmployee);
router.post('/test-email', requireAuth, requireAdmin, authController.testEmail);
router.get('/verify-invite', authController.verifyInvite);
router.post('/complete-invite', authController.completeInvite);

// Password Recovery 2-Factor Flow
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/verify-reset-otp', otpLimiter, authController.verifyResetOtp);
router.post('/resend-reset-otp', otpLimiter, authController.resendResetOtp);
router.post('/reset-password', authController.resetPassword);

export default router;

