/**
 * Database migration + seed runner.
 *
 *   npm run db:migrate          apply pending migrations
 *   npm run db:seed             apply pending migrations, then idempotent seed files
 *   node dist/scripts/migrate.js [--seed]   (inside the Docker image)
 *
 * On AWS this runs as a one-off ECS Fargate task (same image, command override)
 * in the private subnets before a new service revision is rolled out.
 * A MySQL named lock prevents concurrent runs from racing.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { loadDatabaseConfig, loadDotEnvIfPresent, parseLogLevel } from '../config/index.js';
import { createPool, waitForDatabase } from '../db/connection.js';
import { logger, setLogLevel } from '../utils/logger.js';

const LOCK_NAME = 'employee_db_schema_migrations';
const LOCK_TIMEOUT_SECONDS = 60;

function databaseDir(): string {
  if (process.env.DATABASE_DIR) return path.resolve(process.env.DATABASE_DIR);
  // src/scripts or dist/scripts -> ../../../database
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../database');
}

async function sqlFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function applyMigrations(conn: PoolConnection, dir: string): Promise<number> {
  await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [rows] = await conn.query<RowDataPacket[]>('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((r) => String(r.version)));
  let count = 0;

  for (const file of await sqlFiles(path.join(dir, 'migrations'))) {
    if (applied.has(file)) {
      logger.debug('Migration already applied', { file });
      continue;
    }
    logger.info('Applying migration', { file });
    await conn.query(await readFile(path.join(dir, 'migrations', file), 'utf8'));
    await conn.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
    count++;
  }
  return count;
}

/** Seeds are recorded in schema_migrations as "seed:<file>" so each runs once per database. */
async function applySeeds(conn: PoolConnection, dir: string): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>("SELECT version FROM schema_migrations WHERE version LIKE 'seed:%'");
  const applied = new Set(rows.map((r) => String(r.version)));
  let count = 0;
  for (const file of await sqlFiles(path.join(dir, 'seeds'))) {
    const version = `seed:${file}`;
    if (applied.has(version)) {
      logger.debug('Seed already applied', { file });
      continue;
    }
    logger.info('Applying seed', { file });
    await conn.query(await readFile(path.join(dir, 'seeds', file), 'utf8'));
    await conn.query('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
    count++;
  }
  return count;
}

async function main(): Promise<void> {
  loadDotEnvIfPresent();
  const database = loadDatabaseConfig();
  setLogLevel(parseLogLevel(process.env));
  const seed = process.argv.includes('--seed') || ['1', 'true', 'yes'].includes((process.env.SEED_DATABASE ?? '').toLowerCase());
  const dir = databaseDir();

  // multipleStatements is enabled only for this trusted, file-based runner - never for the API pool.
  const pool = createPool({ ...database, connectionLimit: 1 }, { multipleStatements: true });
  try {
    await waitForDatabase(pool, 20, 3000);
    const conn = await pool.getConnection();
    try {
      const [lockRows] = await conn.query<RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS acquired', [LOCK_NAME, LOCK_TIMEOUT_SECONDS]);
      if (lockRows[0]?.acquired !== 1) throw new Error('Could not acquire migration lock');
      try {
        const count = await applyMigrations(conn, dir);
        logger.info('Migrations complete', { applied: count, directory: dir });
        if (seed) {
          const seeded = await applySeeds(conn, dir);
          logger.info('Seeding complete', { applied: seeded });
        }
      } finally {
        await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
      }
    } finally {
      conn.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  logger.error('Migration failed', { error });
  process.exit(1);
});
