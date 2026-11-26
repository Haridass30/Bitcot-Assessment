import { loadConfig, loadDotEnvIfPresent } from './config/index.js';
import { createPool, pingDatabase, waitForDatabase } from './db/connection.js';
import { MySqlEmployeeRepository } from './repositories/employee.repository.js';
import { EmployeeService } from './services/employee.service.js';
import { createServer } from './server.js';
import { logger, setLogLevel } from './utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 25_000; // below the ECS default stopTimeout of 30s

async function main(): Promise<void> {
  loadDotEnvIfPresent();
  const config = loadConfig();
  setLogLevel(config.logLevel);

  const pool = createPool(config.database);
  await waitForDatabase(pool);

  const employeeService = new EmployeeService(new MySqlEmployeeRepository(pool));
  const { httpServer, apollo } = await createServer({
    config,
    employeeService,
    checkDatabase: () => pingDatabase(pool),
  });

  await new Promise<void>((resolve) => httpServer.listen(config.port, '0.0.0.0', resolve));
  logger.info('GraphQL server ready', {
    url: `http://localhost:${config.port}/graphql`,
    health: `http://localhost:${config.port}/health`,
    env: config.nodeEnv,
    corsOrigins: config.corsOrigins,
  });

  // Graceful shutdown: ECS sends SIGTERM when draining/replacing tasks.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Shutting down', { signal });
    const timer = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    timer.unref();
    try {
      await apollo.stop(); // also drains the HTTP server
      await pool.end();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
