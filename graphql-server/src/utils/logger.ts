/**
 * Minimal structured (JSON-per-line) logger. Writing JSON to stdout lets the
 * ECS awslogs driver ship logs to CloudWatch where they can be queried with
 * CloudWatch Logs Insights and turned into metric filters/alarms.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

let threshold: Level = (process.env.LOG_LEVEL as Level | undefined) ?? 'info';
const silent = process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS;

export function setLogLevel(level: Level): void {
  threshold = level;
}

function serializeError(err: unknown): unknown {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return err;
}

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (silent || ORDER[level] < ORDER[threshold]) return;
  const entry: Record<string, unknown> = { timestamp: new Date().toISOString(), level, message };
  if (meta) {
    for (const [key, value] of Object.entries(meta)) entry[key] = key === 'error' ? serializeError(value) : value;
  }
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
