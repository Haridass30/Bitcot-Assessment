interface RuntimeConfig {
  graphqlUrl?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

const DEFAULT_GRAPHQL_URL = 'http://localhost:4000/graphql';

/**
 * Resolves the GraphQL endpoint in priority order:
 *  1. Runtime config (public/config.js) - lets one build artifact be promoted
 *     across environments (e.g. the same S3 bundle for staging and production).
 *  2. Build-time VITE_GRAPHQL_URL.
 *  3. Local development default.
 */
export function getGraphqlUrl(): string {
  const runtimeUrl = typeof window !== 'undefined' ? window.__APP_CONFIG__?.graphqlUrl : undefined;
  if (runtimeUrl && runtimeUrl.trim() !== '') return runtimeUrl.trim();

  const buildTimeUrl = import.meta.env.VITE_GRAPHQL_URL;
  if (buildTimeUrl && buildTimeUrl.trim() !== '') return buildTimeUrl.trim();

  return DEFAULT_GRAPHQL_URL;
}
