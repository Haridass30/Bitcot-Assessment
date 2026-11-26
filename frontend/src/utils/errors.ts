import { CombinedGraphQLErrors } from '@apollo/client';

/** Extracts a human-readable message from an Apollo/GraphQL/network error. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (CombinedGraphQLErrors.is(error)) {
    const messages = error.errors.map((e) => e.message).filter(Boolean);
    if (messages.length > 0) return messages.join(' ');
  }
  if (error instanceof Error && error.message) {
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return 'Unable to reach the server. Check your connection and that the API is running.';
    }
    return error.message;
  }
  return fallback;
}

/** Returns per-field validation messages sent by the API (extensions.fields), if any. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!CombinedGraphQLErrors.is(error)) return {};
  for (const e of error.errors) {
    const fields = e.extensions?.fields;
    if (fields && typeof fields === 'object') {
      return Object.fromEntries(
        Object.entries(fields as Record<string, unknown>).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
    }
  }
  return {};
}
