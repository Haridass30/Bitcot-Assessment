/**
 * Transport-agnostic application errors. The GraphQL layer maps them to
 * GraphQL error codes; a future Lambda/API Gateway handler could map them to
 * HTTP status codes instead.
 */
export type AppErrorCode = 'BAD_USER_INPUT' | 'NOT_FOUND' | 'CONFLICT';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: AppErrorCode,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = 'Validation failed. Please check the highlighted fields.') {
    super(message, 'BAD_USER_INPUT', fields);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 'CONFLICT', fields);
  }
}
