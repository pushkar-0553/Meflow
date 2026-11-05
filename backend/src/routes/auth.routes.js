import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Strict Rate Limiting on Login (5 attempts per 15 minutes per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Generous 10 for development, protects against brute-force
  message: {
    success: false,
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
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

// Password Reset Flow
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;

