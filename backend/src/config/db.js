import mysql from 'mysql2/promise';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const poolConfig = {
  host: env.DB.HOST,
  port: env.DB.PORT,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  database: env.DB.NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: 'utf8mb4',
};

// TiDB Cloud SSL configuration
if (env.DB.SSL) {
  poolConfig.ssl = {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  };
}

export const pool = mysql.createPool(poolConfig);

/**
 * Execute parameterized SQL query
 */
export async function query(sql, params = []) {
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (error) {
    logger.error(`Database query failed: ${sql.slice(0, 100)}...`, error.message);
    throw error;
  }
}

/**
 * Transaction runner helper
 */
export async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction rolled back due to error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test database connectivity
 */
export async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    return { connected: true, result: rows[0].result };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

