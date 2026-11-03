import app from './app.js';
import { env } from './config/env.js';
import { pool, testConnection } from './config/db.js';
import { logger } from './utils/logger.js';

const server = app.listen(env.PORT, async () => {
  logger.success(`======================================================`);
  logger.success(`🚀 VCube MeFlow Backend Service Started`);
  logger.success(`📍 Listening on: http://localhost:${env.PORT}`);
  logger.success(`🌐 Environment:    ${env.NODE_ENV}`);
  logger.success(`🖥️  Frontend URL:   ${env.FRONTEND_URL}`);
  logger.success(`======================================================`);

  // Non-blocking database connection test
  const dbStatus = await testConnection();
  if (dbStatus.connected) {
    logger.success('✅ TiDB/MySQL Database Connected Successfully.');
  } else {
    logger.warn(`⚠️  Database connection pending or unreachable: ${dbStatus.error}`);
    logger.info('💡 Update your database credentials in backend/.env to connect.');
  }
});

// Graceful Shutdown Handling
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('Database pool drained.');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing database pool:', err.message);
      process.exit(1);
    }
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    logger.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
