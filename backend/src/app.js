import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { env } from './config/env.js';
import { sessionMiddleware } from './middleware/session.js';
import { errorHandler } from './middleware/errorHandler.js';
import { errorResponse } from './utils/apiResponse.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import roleRoutes from './routes/role.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import userRoutes from './routes/user.routes.js';
import taskRoutes from './routes/task.routes.js';
import workRoutes from './routes/work.routes.js';
import workflowRoutes from './routes/workflow.routes.js';
import proofRoutes from './routes/proof.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import workloadRoutes from './routes/workload.routes.js';
import auditRoutes from './routes/audit.routes.js';
import publishingRoutes from './routes/publishing.routes.js';
import courseRoutes from './routes/course.routes.js';
import projectRoutes from './routes/project.routes.js';
import contentRoutes from './routes/content.routes.js';
import shootRoutes from './routes/shoot.routes.js';
import footageRoutes from './routes/footage.routes.js';
import editingRoutes from './routes/editing.routes.js';
import thumbnailRoutes from './routes/thumbnail.routes.js';

const app = express();

// Trust reverse proxy (Render, Heroku, Nginx) for secure cookie forwarding
app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Cross-Origin Resource Sharing
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Request Logger
if (env.isDev) {
  app.use(morgan('dev'));
}

// Global Rate Limiting (1000 requests per 15 min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Persistent Session Middleware
app.use(sessionMiddleware);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/work', workRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/proofs', proofRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/workload', workloadRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/publishing', publishingRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/shoots', shootRoutes);
app.use('/api/footage', footageRoutes);
app.use('/api/editing', editingRoutes);
app.use('/api/thumbnails', thumbnailRoutes);

// Catch-all 404 Route for API requests
app.use('/api/*', (req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `API endpoint '${req.originalUrl}' not found.`,
  });
});

// Serve frontend static build if dist exists (Single-Service Deployment support)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized Error Handler
app.use(errorHandler);

export default app;

