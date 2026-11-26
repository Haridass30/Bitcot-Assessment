import type { GraphQLFormattedError } from 'graphql';
import { unwrapResolverError } from '@apollo/server/errors';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Maps domain errors to GraphQL error codes and hides internal details
 * (SQL errors, stack traces) from clients in production.
 */
export function createFormatError(isProduction: boolean) {
  return (formatted: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
    const original = unwrapResolverError(error);

    if (original instanceof AppError) {
      return {
        message: original.message,
        locations: formatted.locations,
        path: formatted.path,
        extensions: { code: original.code, ...(original.fields ? { fields: original.fields } : {}) },
      };
    }

    const code = formatted.extensions?.code;
    if (code === 'INTERNAL_SERVER_ERROR' || code === undefined) {
      logger.error('Unhandled GraphQL error', { error: original, path: formatted.path });
      if (isProduction) {
        return { message: 'Internal server error', path: formatted.path, extensions: { code: 'INTERNAL_SERVER_ERROR' } };
      }
    }
    // Parse/validation errors (GRAPHQL_VALIDATION_FAILED, BAD_USER_INPUT for bad variables, ...) are safe to return.
    return formatted;
  };
}
