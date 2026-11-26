// Runtime configuration, loaded before the app bundle.
// In Docker this file is regenerated from the GRAPHQL_URL environment variable.
// On S3/CloudFront the CI/CD pipeline uploads an environment-specific version.
// Leave graphqlUrl empty to fall back to the build-time VITE_GRAPHQL_URL value.
window.__APP_CONFIG__ = {
  graphqlUrl: '',
};
