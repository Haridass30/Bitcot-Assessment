# syntax=docker/dockerfile:1
# React SPA image: static build served by an unprivileged nginx.
#   docker build -t employee-frontend ./frontend
ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30-alpine

# ---- 1. Build the static bundle ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Optional build-time fallback; the runtime GRAPHQL_URL env var (config.js) takes precedence.
ARG VITE_GRAPHQL_URL=""
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
RUN npm run build

# ---- 2. Serve with nginx (non-root, listens on 8080) ----
FROM ${NGINX_IMAGE} AS runtime
LABEL org.opencontainers.image.title="employee-frontend" \
      org.opencontainers.image.description="React frontend for the Employee Management System"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --chmod=0755 docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

# Only config.js is writable by the nginx user (rewritten at start-up from GRAPHQL_URL).
USER root
RUN chown 101:101 /usr/share/nginx/html/config.js
USER 101

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/health || exit 1
