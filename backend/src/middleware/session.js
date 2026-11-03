import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const MySQLStore = MySQLStoreFactory(session);

let sessionStore;

try {
  sessionStore = new MySQLStore(
    {
      createDatabaseTable: false,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'sid',
          expires: 'expired',
          data: 'sess',
        },
      },
    },
    pool
  );
  logger.info('MySQL/TiDB persistent session store configured.');
} catch (error) {
  logger.warn('Failed to attach MySQL session store, falling back to MemoryStore:', error.message);
  sessionStore = new session.MemoryStore();
}

export const sessionMiddleware = session({
  name: 'meflow_sid',
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Refreshes expiration with each request
  cookie: {
    httpOnly: true,
    secure: env.isProd, // true in production (HTTPS)
    sameSite: env.isProd ? 'none' : 'lax', // 'none' for cross-site Vercel -> Render
    maxAge: 2.5 * 60 * 60 * 1000, // 2.5 hours in milliseconds
  },
});

// Re-export authentication guards for convenience and backwards compatibility
export { requireAuth, requireAdmin } from './auth.middleware.js';

