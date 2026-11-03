import { Router } from 'express';
import { testConnection } from '../config/db.js';
import { successResponse } from '../utils/apiResponse.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const dbStatus = await testConnection();

    const healthData = {
      status: dbStatus.connected ? 'HEALTHY' : 'DEGRADED',
      database: {
        connected: dbStatus.connected,
        ...(dbStatus.error && { error: dbStatus.error }),
      },
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
      session: {
        active: Boolean(req.session),
        sessionId: req.sessionID || null,
        user: req.session?.user ? { id: req.session.user.id, email: req.session.user.email } : null,
      },
    };

    return successResponse(res, {
      message: 'MeFlow Backend Service Health Check',
      data: healthData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
