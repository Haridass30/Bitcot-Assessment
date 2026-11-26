import http from 'node:http';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import type { AppConfig } from './config/index.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { createFormatError } from './graphql/formatError.js';
import type { GraphQLContext } from './graphql/context.js';
import type { EmployeeService } from './services/employee.service.js';
import { logger } from './utils/logger.js';

export interface ServerDependencies {
  config: Pick<AppConfig, 'isProduction' | 'corsOrigins' | 'introspection'>;
  employeeService: EmployeeService;
  /** Resolves when the database is reachable; rejects otherwise. */
  checkDatabase: () => Promise<void>;
}

export interface AppServer {
  app: Express;
  httpServer: http.Server;
  apollo: ApolloServer<GraphQLContext>;
}

const startedAt = Date.now();

export function buildCorsOptions(origins: string[]): CorsOptions {
  const allowAll = origins.includes('*');
  return {
    origin: (origin, callback) => {
      // Non-browser clients (curl, ALB health checks, server-to-server) send no Origin header.
      if (!origin || allowAll || origins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apollo-require-preflight', 'x-apollo-operation-name'],
    maxAge: 600,
  };
}

export async function createServer({ config, employeeService, checkDatabase }: ServerDependencies): Promise<AppServer> {
  const app = express();
  const httpServer = http.createServer(app);

  app.disable('x-powered-by');
  // ECS tasks sit behind an Application Load Balancer.
  app.set('trust proxy', true);

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Request logging (skips health checks to keep CloudWatch logs clean).
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health') return next();
    // Captured up-front: Express rewrites req.url/req.path inside mounted routers.
    const path = req.originalUrl.split('?')[0];
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info('request', {
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        operation: typeof req.body?.operationName === 'string' ? req.body.operationName : undefined,
      });
    });
    next();
  });

  app.get('/health', async (_req: Request, res: Response) => {
    const body = {
      status: 'ok' as 'ok' | 'error',
      database: 'up' as 'up' | 'down',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
    try {
      await checkDatabase();
      res.status(200).json(body);
    } catch (error) {
      logger.error('Health check failed: database unreachable', { error });
      res.status(503).json({ ...body, status: 'error', database: 'down' });
    }
  });

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: config.introspection,
    includeStacktraceInErrorResponses: !config.isProduction,
    formatError: createFormatError(config.isProduction),
    // Signals are handled in index.ts (drain HTTP, stop Apollo, close the DB pool, then exit).
    stopOnTerminationSignals: false,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      config.introspection
        ? ApolloServerPluginLandingPageLocalDefault({ embed: true })
        : ApolloServerPluginLandingPageDisabled(),
    ],
  });
  await apollo.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(buildCorsOptions(config.corsOrigins)),
    express.json({ limit: '100kb' }),
    expressMiddleware(apollo, {
      context: async (): Promise<GraphQLContext> => ({ employeeService }),
    }),
  );

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Final error handler (e.g. malformed JSON bodies).
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status >= 500) logger.error('Unhandled HTTP error', { error: err });
    res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
  });

  return { app, httpServer, apollo };
}
