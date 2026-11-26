import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';
import type { DatabaseConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Builds mysql2 pool options from config. The same code path serves local
 * Docker MySQL and Amazon RDS MySQL; only the environment differs
 * (host = RDS endpoint in a private subnet, DB_SSL=rds, credentials injected
 * from AWS Secrets Manager).
 */
export function buildPoolOptions(config: DatabaseConfig, overrides: Partial<PoolOptions> = {}): PoolOptions {
  const ssl: PoolOptions['ssl'] =
    config.ssl === 'rds' ? 'Amazon RDS' : config.ssl === 'true' ? { rejectUnauthorized: true } : undefined;

  return {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: 10_000,
    // Store/read all timestamps as UTC; return DATE columns as 'YYYY-MM-DD' strings.
    timezone: 'Z',
    dateStrings: ['DATE'],
    ssl,
    ...overrides,
  };
}

export function createPool(config: DatabaseConfig, overrides: Partial<PoolOptions> = {}): Pool {
  const pool = mysql.createPool(buildPoolOptions(config, overrides));
  // Ensure CURRENT_TIMESTAMP defaults are generated in UTC regardless of server time zone.
  pool.pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
  return pool;
}

export async function pingDatabase(pool: Pool): Promise<void> {
  await pool.query('SELECT 1');
}

/** Retries the initial connection so the API tolerates the DB starting slightly later (Compose, RDS failover). */
export async function waitForDatabase(pool: Pool, attempts = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await pingDatabase(pool);
      logger.info('Database connection established', { attempt });
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
      logger.warn('Database not reachable yet, retrying', { attempt, attempts, error });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
