import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig, loadDatabaseConfig } from '../../src/config/index.js';

const baseEnv = { DB_HOST: 'localhost', DB_USER: 'app', DB_PASSWORD: 'secret', DB_NAME: 'employee_db' };

describe('loadConfig', () => {
  it('applies sensible development defaults', () => {
    const config = loadConfig(baseEnv);
    expect(config).toMatchObject({
      nodeEnv: 'development',
      isProduction: false,
      port: 4000,
      introspection: true,
      corsOrigins: ['http://localhost:5173', 'http://localhost:8080'],
      database: { host: 'localhost', port: 3306, connectionLimit: 10, ssl: 'false' },
    });
  });

  it('parses comma-separated CORS origins and numeric values', () => {
    const config = loadConfig({ ...baseEnv, CORS_ORIGINS: 'https://a.example, https://b.example', PORT: '8080', DB_PORT: '3307' });
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.port).toBe(8080);
    expect(config.database.port).toBe(3307);
  });

  it('requires CORS_ORIGINS and DB_PASSWORD in production and disables introspection by default', () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', DB_PASSWORD: '' })).toThrow(/CORS_ORIGINS.*\n.*DB_PASSWORD/s);
    const config = loadConfig({ ...baseEnv, NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example' });
    expect(config.introspection).toBe(false);
  });

  it('reports all missing/invalid variables together', () => {
    try {
      loadConfig({ PORT: 'abc', DB_SSL: 'maybe' });
      throw new Error('expected ConfigError');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const message = (error as Error).message;
      for (const key of ['PORT', 'DB_SSL', 'DB_HOST', 'DB_USER', 'DB_NAME']) expect(message).toContain(key);
    }
  });

  it('supports the Amazon RDS TLS profile', () => {
    expect(loadDatabaseConfig({ ...baseEnv, DB_SSL: 'rds' }).ssl).toBe('rds');
  });
});
