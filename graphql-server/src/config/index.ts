/**
 * Centralised, validated configuration loaded from environment variables.
 *
 * Nothing in this file is environment specific: locally the values come from a
 * .env file / Docker Compose, on AWS ECS they are injected by the task
 * definition (plain `environment` entries plus `secrets` entries that ECS
 * resolves from AWS Secrets Manager at task start-up, e.g. DB_PASSWORD).
 */

export type SslMode = 'false' | 'true' | 'rds';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  ssl: SslMode;
}

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  corsOrigins: string[];
  introspection: boolean;
  database: DatabaseConfig;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

type Env = Record<string, string | undefined>;

function required(env: Env, key: string, errors: string[]): string {
  const value = env[key];
  if (value === undefined || value.trim() === '') {
    errors.push(`${key} is required`);
    return '';
  }
  return value.trim();
}

function integer(env: Env, key: string, fallback: number, errors: string[], min = 1, max = 65535): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${key} must be an integer between ${min} and ${max}`);
    return fallback;
  }
  return value;
}

function bool(env: Env, key: string, fallback: boolean): boolean {
  const raw = env[key]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function parseDatabase(env: Env, isProduction: boolean, errors: string[]): DatabaseConfig {
  const ssl = (env.DB_SSL?.trim().toLowerCase() || 'false') as SslMode;
  if (!['false', 'true', 'rds'].includes(ssl)) errors.push('DB_SSL must be false, true or rds');

  // An empty password is tolerated only outside production (e.g. throwaway local DBs).
  const password = isProduction ? required(env, 'DB_PASSWORD', errors) : (env.DB_PASSWORD ?? '');

  return {
    host: required(env, 'DB_HOST', errors),
    port: integer(env, 'DB_PORT', 3306, errors),
    user: required(env, 'DB_USER', errors),
    password,
    database: required(env, 'DB_NAME', errors),
    connectionLimit: integer(env, 'DB_CONNECTION_LIMIT', 10, errors, 1, 1000),
    ssl,
  };
}

function isProductionEnv(env: Env): boolean {
  return (env.NODE_ENV?.trim() || 'development') === 'production';
}

function throwIfErrors(errors: string[]): void {
  if (errors.length > 0) throw new ConfigError(`Invalid configuration:\n  - ${errors.join('\n  - ')}`);
}

/** Database settings only - used by the migration runner (and future Lambda functions). */
export function loadDatabaseConfig(env: Env = process.env): DatabaseConfig {
  const errors: string[] = [];
  const database = parseDatabase(env, isProductionEnv(env), errors);
  throwIfErrors(errors);
  return database;
}

/** Full API server configuration. */
export function loadConfig(env: Env = process.env): AppConfig {
  const errors: string[] = [];
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const isProduction = isProductionEnv(env);

  const logLevel = parseLogLevel(env, errors);

  const corsOrigins = (env.CORS_ORIGINS ?? (isProduction ? '' : 'http://localhost:5173,http://localhost:8080'))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (isProduction && corsOrigins.length === 0) errors.push('CORS_ORIGINS is required in production');

  const config: AppConfig = {
    nodeEnv,
    isProduction,
    port: integer(env, 'PORT', 4000, errors),
    logLevel,
    corsOrigins,
    introspection: bool(env, 'GRAPHQL_INTROSPECTION', !isProduction),
    database: parseDatabase(env, isProduction, errors),
  };

  throwIfErrors(errors);
  return config;
}

export function parseLogLevel(env: Env, errors: string[] = []): AppConfig['logLevel'] {
  const logLevel = (env.LOG_LEVEL?.trim().toLowerCase() || 'info') as AppConfig['logLevel'];
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    errors.push('LOG_LEVEL must be debug, info, warn or error');
    return 'info';
  }
  return logLevel;
}

/** Loads a local .env file during development. Production relies solely on injected env vars. */
export function loadDotEnvIfPresent(): void {
  if (process.env.NODE_ENV === 'production') return;
  try {
    process.loadEnvFile();
  } catch {
    // No .env file - fine, fall back to the process environment.
  }
}
