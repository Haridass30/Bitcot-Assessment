# syntax=docker/dockerfile:1
# GraphQL API image - built with the REPOSITORY ROOT as context so the
# database migrations ship inside the image:
#   docker build -f graphql-server/Dockerfile -t employee-graphql-server .
ARG NODE_IMAGE=node:22-alpine

# ---- 1. Install all dependencies (incl. dev) for compilation ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY graphql-server/package.json graphql-server/package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- 2. Compile TypeScript ----
FROM deps AS build
COPY graphql-server/tsconfig.json graphql-server/tsconfig.build.json ./
COPY graphql-server/src ./src
RUN npm run build

# ---- 3. Production-only dependencies ----
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY graphql-server/package.json graphql-server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# ---- 4. Minimal runtime image ----
FROM ${NODE_IMAGE} AS runtime
LABEL org.opencontainers.image.title="employee-graphql-server" \
      org.opencontainers.image.description="Apollo GraphQL API for the Employee Management System"
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_DIR=/app/database
WORKDIR /app

COPY --chown=node:node graphql-server/package.json ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node database/migrations ./database/migrations
COPY --chown=node:node database/seeds ./database/seeds

# Run as the unprivileged built-in "node" user.
USER node
EXPOSE 4000

# Local/Compose health check. (ECS uses the task-definition healthCheck / ALB target group instead.)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Exec form: node is PID 1 and receives SIGTERM directly for graceful shutdown.
CMD ["node", "dist/index.js"]
