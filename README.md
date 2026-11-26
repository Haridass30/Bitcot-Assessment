# Employee Management System: Bitcot DevOps Assessment

A full-stack Employee Management System built with **React + TypeScript + Apollo Client** on the frontend, an **Apollo GraphQL server (Node.js + TypeScript)** on the backend and **MySQL** for persistence. It is containerised with Docker and structured for deployment to AWS: S3 + CloudFront, ECS Fargate, RDS MySQL, Secrets Manager and Lambda.

> **Scope of this stage:** this repository contains the application, its Docker setup and its tests.
> No AWS infrastructure has been created yet. [AWS integration](#aws-integration) explains how each part is designed to plug into the target AWS architecture.

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Technology stack](#technology-stack)
4. [Repository structure](#repository-structure)
5. [Prerequisites](#prerequisites)
6. [Quick start (Docker Compose)](#quick-start-docker-compose)
7. [Local development (without Docker for app code)](#local-development-without-docker-for-app-code)
8. [Configuration](#configuration)
9. [Database](#database)
10. [GraphQL API](#graphql-api)
11. [Testing](#testing)
12. [Docker](#docker)
13. [AWS integration](#aws-integration)
14. [Security notes](#security-notes)
15. [Troubleshooting](#troubleshooting)

---

## Features

| Area | What you get |
|------|--------------|
| Dashboard | Total, active, department and on-leave counts; recently added employees; employees-by-department chart |
| Employees | Responsive table (desktop) and card list (mobile) showing name, email, department, designation, joining date and status |
| CRUD | Create, view, edit and delete (with confirmation dialog) |
| Search & filter | Debounced server-side name search plus a department filter, both kept in the URL (`/employees?q=an&department=Sales`) so views can be shared |
| UX | Loading indicators, error states with retry, success/error toast notifications, per-field form validation (client **and** server) |
| API | `employees`, `employee(id)`, `createEmployee`, `updateEmployee`, `deleteEmployee`; `/health` endpoint; configurable CORS; typed error codes |
| Ops | Multi-stage Docker images running as non-root, health checks, graceful shutdown, structured JSON logs, migration runner, runtime-configurable frontend |

## Architecture

### Local (Docker Compose)

```
 Browser
   │  http://localhost:8080                       http://localhost:4000/graphql  (CORS)
   ▼                                                         ▲
┌──────────────────────┐   GraphQL over HTTP (Apollo Client) │
│ frontend             │ ────────────────────────────────────┘
│ nginx (non-root)     │
│ React SPA + config.js│          ┌────────────────────────────────────────────┐
└──────────────────────┘          │ graphql-server (Node 22, non-root)          │
                                  │  Express ─► Apollo Server ─► Resolvers      │
                                  │           ─► EmployeeService (validation)   │
                                  │           ─► EmployeeRepository (mysql2)    │
                                  └───────────────────────┬────────────────────┘
┌──────────────────────┐                                  │ SQL (pooled)
│ migrate (one-off)    │ ─── applies migrations/seeds ──► ┌▼─────────────────────┐
└──────────────────────┘                                  │ mysql:8.4 (volume)   │
                                                          └──────────────────────┘
```

### Backend layering

```
src/index.ts          server bootstrap, DB wait/retry, graceful shutdown (SIGTERM)
src/server.ts         Express app: security headers, request logging, /health, CORS, Apollo middleware
src/graphql/          schema.ts (SDL) · resolvers.ts (thin) · formatError.ts (error mapping/masking)
src/services/         EmployeeService: business operations, transport-agnostic  ◄── reusable by Lambda
src/validation/       input validation & normalisation (pure functions)
src/repositories/     EmployeeRepository interface + MySQL implementation (parameterised SQL)
src/db/               mysql2 pool factory (TLS/RDS profile, UTC, keep-alive), health ping
src/config/           validated environment configuration
src/models/           domain types (Employee, statuses, departments)
src/scripts/          migrate.ts: migration + seed runner with a MySQL named lock
```

Resolvers stay thin and the business rules live in `EmployeeService`, which only knows about the `EmployeeRepository` interface. That's what lets the same operations later run inside AWS Lambda without touching GraphQL or Express, and lets local MySQL be swapped for Amazon RDS by changing environment variables only.

## Technology stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript (strict), Vite 7, Apollo Client 4, React Router 7, Tailwind CSS 4 |
| Backend | Node.js 22 (≥ 20.19 supported locally), TypeScript (strict), Apollo Server 5, Express 5, GraphQL 16, mysql2 |
| Database | MySQL 8.4 (compatible with Amazon RDS for MySQL 8.x) |
| Testing | Vitest, Testing Library, Supertest, Apollo `MockedProvider` |
| Containers | Docker multi-stage builds, nginx-unprivileged, Docker Compose |

## Repository structure

```
bitcot-devops-assessment/
├── frontend/                         React SPA
│   ├── docker/
│   │   ├── nginx.conf                SPA routing, caching rules, /health
│   │   ├── security-headers.conf     shared security headers
│   │   └── 40-runtime-config.sh      writes config.js from GRAPHQL_URL at container start
│   ├── public/
│   │   ├── config.js                 runtime config (GraphQL URL), never cached
│   │   └── favicon.svg
│   ├── src/
│   │   ├── apollo/client.ts          Apollo Client factory
│   │   ├── components/               reusable UI (form, table, filters, dialog, badges, states, layout)
│   │   ├── context/ToastContext.tsx  notifications
│   │   ├── graphql/employees.ts      typed GraphQL documents
│   │   ├── hooks/                    useDebouncedValue, useDeleteEmployee
│   │   ├── pages/                    Dashboard, Employees, Detail, Create, Edit, NotFound
│   │   ├── test/                     test setup, fixtures, render helpers
│   │   ├── types/  utils/            domain types, validation, formatting, error helpers
│   │   ├── config.ts                 GraphQL URL resolution (runtime → build-time → default)
│   │   ├── constants.ts              departments, statuses
│   │   ├── App.tsx  main.tsx  index.css
│   ├── Dockerfile  .dockerignore  .env.example
│   ├── index.html  package.json  tsconfig*.json  vite.config.ts
├── graphql-server/                   Apollo GraphQL API
│   ├── src/
│   │   ├── config/index.ts           configuration
│   │   ├── db/connection.ts          database connection
│   │   ├── graphql/                  schema.ts, resolvers.ts, context.ts, formatError.ts
│   │   ├── models/employee.ts        domain model
│   │   ├── repositories/             employee.repository.ts
│   │   ├── services/                 employee.service.ts
│   │   ├── validation/               employee.validation.ts
│   │   ├── utils/                    errors.ts, logger.ts
│   │   ├── scripts/migrate.ts        migrations + seeds
│   │   ├── server.ts                 server initialisation
│   │   └── index.ts                  entry point
│   ├── tests/
│   │   ├── unit/                     validation, service, config
│   │   ├── integration/              GraphQL API over HTTP (in-memory + real MySQL)
│   │   └── helpers/
│   ├── examples/employee-operations.graphql   ready-to-run Sandbox operations
│   ├── Dockerfile  .env.example  package.json  tsconfig*.json  vitest.config.ts
├── database/
│   ├── migrations/001_create_employees_table.sql   SQL schema
│   ├── seeds/001_sample_employees.sql              sample data (15 employees)
│   └── init-db.sh                                  mysql-CLI initialisation script
├── docker-compose.yml
├── .dockerignore  .env.example  .gitignore
└── README.md
```

## Prerequisites

| Tool | Version | Needed for |
|------|---------|-----------|
| Docker Engine + Compose v2 | Docker 24+ | Running the full stack |
| Node.js + npm | Node **22 LTS** recommended (≥ 20.19 works) | Local development and tests |
| mysql client | 8.x | Optional, only for `database/init-db.sh` |

## Quick start (Docker Compose)

```bash
cd bitcot-devops-assessment

# 1. Create your local environment file and set real passwords
cp .env.example .env
#    edit MYSQL_ROOT_PASSWORD and DB_PASSWORD in .env

# 2. Build and start everything (MySQL → migrate → GraphQL API → frontend)
docker compose up --build -d

# 3. Check status: all services should be "healthy" and migrate "Exited (0)"
docker compose ps -a
```

| URL | What |
|-----|------|
| http://localhost:8080 | React application |
| http://localhost:4000/graphql | GraphQL endpoint + Apollo Sandbox (when `GRAPHQL_INTROSPECTION=true`) |
| http://localhost:4000/health | API health check (`200` when DB reachable, `503` otherwise) |
| http://localhost:8080/health | Frontend container health check |
| `127.0.0.1:3307` | MySQL (host port 3307 avoids clashing with a local MySQL on 3306) |

Useful commands:

```bash
docker compose logs -f graphql-server     # structured JSON logs
docker compose logs migrate               # migration output
docker compose down                       # stop (data is kept in the mysql-data volume)
docker compose down -v                    # stop AND delete the database volume
```

## Local development (without Docker for app code)

Run MySQL in Docker and the two apps with hot reload:

```bash
# 1. Start only MySQL (uses the root .env)
cp .env.example .env            # if not done yet; set passwords
docker compose up -d mysql

# 2. Backend
cd graphql-server
npm install
cp .env.example .env            # set DB_PASSWORD to the same value as in the root .env
npm run db:seed                 # apply migrations + sample data (db:migrate for schema only)
npm run dev                     # http://localhost:4000/graphql (tsx watch)

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env            # VITE_GRAPHQL_URL=http://localhost:4000/graphql
npm run dev                     # http://localhost:5173
```

Other scripts:

| Package | Script | Purpose |
|---------|--------|---------|
| graphql-server | `npm run build` / `npm start` | Compile to `dist/` / run compiled server |
| graphql-server | `npm run typecheck` | Type-check sources and tests |
| frontend | `npm run build` | Type-check + production bundle in `dist/` |
| frontend | `npm run preview` | Serve the production bundle locally |

## Configuration

All configuration comes from environment variables. No secrets are hardcoded in source code or Dockerfiles.

### GraphQL server (`graphql-server/.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` enables stricter validation and error masking |
| `PORT` | `4000` | HTTP port |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` (dev only) | Comma-separated allowed browser origins. **Required in production.** `*` allows all |
| `GRAPHQL_INTROSPECTION` | `true` in dev, `false` in production | Schema introspection + Apollo Sandbox landing page |
| `DB_HOST` | required | MySQL host (RDS endpoint on AWS) |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | required | Database user |
| `DB_PASSWORD` | required in production | Database password (Secrets Manager on AWS) |
| `DB_NAME` | required | Database name |
| `DB_CONNECTION_LIMIT` | `10` | Pool size per API instance |
| `DB_SSL` | `false` | `false`, `true` (verify with system CAs) or `rds` (verify with the Amazon RDS CA bundle shipped in mysql2) |
| `DATABASE_DIR` | `../database` (`/app/database` in Docker) | Location of `migrations/` and `seeds/` for the migration runner |
| `SEED_DATABASE` | `false` | Migration runner also applies seeds (same as `--seed`) |

Configuration is validated at start-up. Every invalid or missing variable is reported at once and the process exits non-zero, so a misconfigured ECS task fails fast and visibly.

### Frontend

The GraphQL endpoint is resolved in this order (`frontend/src/config.ts`):

1. **Runtime** `window.__APP_CONFIG__.graphqlUrl` from `/config.js`. In Docker it's generated from `GRAPHQL_URL` at container start; on S3 the pipeline uploads an environment-specific `config.js`. One build artifact can therefore be promoted from staging to production unchanged.
2. **Build time** `VITE_GRAPHQL_URL`.
3. Default `http://localhost:4000/graphql`.

### Docker Compose (root `.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MYSQL_ROOT_PASSWORD` | required | MySQL root password (container only) |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `employee_db` / `employee_app` / required | Application database and least-privilege user |
| `LOG_LEVEL`, `CORS_ORIGINS`, `GRAPHQL_INTROSPECTION` | see above | Passed to the API |
| `SEED_DATABASE` | `true` | Load sample employees on first start |
| `FRONTEND_GRAPHQL_URL` | `http://localhost:4000/graphql` | GraphQL URL as seen by the browser |
| `FRONTEND_HOST_PORT` / `API_HOST_PORT` / `MYSQL_HOST_PORT` | `8080` / `4000` / `3307` | Host port mappings |

## Database

### Schema (`database/migrations/001_create_employees_table.sql`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INT UNSIGNED AUTO_INCREMENT` | Primary key (exposed as GraphQL `ID`) |
| `name` | `VARCHAR(100)` | Indexed |
| `email` | `VARCHAR(255)` | **Unique** (`uq_employees_email`), case-insensitive collation |
| `department` | `VARCHAR(100)` | Indexed, used for filtering |
| `designation` | `VARCHAR(100)` | |
| `joining_date` | `DATE` | |
| `status` | `ENUM('ACTIVE','INACTIVE','ON_LEAVE')` | Default `ACTIVE`, indexed |
| `created_at` | `DATETIME(3)` | Default `CURRENT_TIMESTAMP(3)`, UTC |
| `updated_at` | `DATETIME(3)` | Auto-updated on change, UTC |

Engine InnoDB, charset `utf8mb4`, collation `utf8mb4_0900_ai_ci`. All timestamps are UTC: the pool sets `time_zone = '+00:00'` on every connection.

### Migrations and seeds

The migration runner (`graphql-server/src/scripts/migrate.ts`):

- applies `database/migrations/*.sql` in filename order and records each in a `schema_migrations` table
- with `--seed` (or `SEED_DATABASE=true`) applies `database/seeds/*.sql` once per database, recorded as `seed:<file>`
- takes a MySQL `GET_LOCK` so concurrent runs (e.g. two deployments) can't race
- is idempotent: re-running applies nothing new

How to run it:

```bash
# Docker Compose: runs automatically as the one-off "migrate" service before the API starts
docker compose run --rm migrate                       # re-run manually
docker compose run --rm migrate node dist/scripts/migrate.js --seed

# From source (graphql-server/.env configured)
cd graphql-server && npm run db:migrate               # schema only
cd graphql-server && npm run db:seed                  # schema + sample data

# With only the mysql CLI (e.g. from a bastion host to RDS); shares the same tracking table
DB_HOST=127.0.0.1 DB_PORT=3307 DB_USER=employee_app DB_PASSWORD=... DB_NAME=employee_db \
  ./database/init-db.sh --seed
```

To add a schema change, create `database/migrations/002_<description>.sql`. It's applied on the next run.

## GraphQL API

Endpoint: `POST /graphql`. Full schema: `graphql-server/src/graphql/schema.ts`.

```graphql
enum EmployeeStatus { ACTIVE INACTIVE ON_LEAVE }

type Employee {
  id: ID!  name: String!  email: String!  department: String!  designation: String!
  joiningDate: String!   # YYYY-MM-DD
  status: EmployeeStatus!
  createdAt: String!  updatedAt: String!   # ISO-8601 UTC
}

type Query {
  employees(filter: EmployeeFilter): [Employee!]!   # filter: { search, department, status }
  employee(id: ID!): Employee                        # null when not found
}

type Mutation {
  createEmployee(input: CreateEmployeeInput!): Employee!
  updateEmployee(id: ID!, input: UpdateEmployeeInput!): Employee!   # partial update
  deleteEmployee(id: ID!): ID!                                      # returns deleted ID
}
```

### Validation rules (enforced server-side, mirrored in the UI)

| Field | Rule |
|-------|------|
| name | 2–100 chars; letters (any language), spaces, `'`, `.`, `-`; whitespace collapsed |
| email | valid format, ≤ 255 chars, stored lowercase, unique |
| department | one of: Engineering, Product, Design, Marketing, Sales, Human Resources, Finance, Operations, Customer Support |
| designation | 2–100 chars |
| joiningDate | real calendar date `YYYY-MM-DD`, not before 1970, at most 1 year in the future |
| status | `ACTIVE` \| `INACTIVE` \| `ON_LEAVE` (default `ACTIVE`) |

### Error codes

| `extensions.code` | When | Extra |
|-------------------|------|-------|
| `BAD_USER_INPUT` | Validation failure, malformed ID, invalid enum | `extensions.fields`: `{ field: message }` |
| `NOT_FOUND` | Updating or deleting an employee that doesn't exist | |
| `CONFLICT` | Email already used by another employee | `extensions.fields.email` |
| `INTERNAL_SERVER_ERROR` | Unexpected failure (details logged, masked from clients in production) | |

### Sample operations

Open **Apollo Sandbox** at http://localhost:4000/graphql. A complete operations file is in [`graphql-server/examples/employee-operations.graphql`](graphql-server/examples/employee-operations.graphql).

**List all employees**
```graphql
query ListEmployees {
  employees { id name email department designation joiningDate status createdAt updatedAt }
}
```

**Search by name and filter by department**
```graphql
query SearchEmployees($filter: EmployeeFilter) {
  employees(filter: $filter) { id name department status }
}
```
```json
{ "filter": { "search": "an", "department": "Engineering" } }
```

**Get one employee**
```graphql
query GetEmployee($id: ID!) {
  employee(id: $id) { id name email department designation joiningDate status createdAt updatedAt }
}
```
```json
{ "id": "1" }
```

**Create**
```graphql
mutation CreateEmployee($input: CreateEmployeeInput!) {
  createEmployee(input: $input) { id name email status createdAt }
}
```
```json
{
  "input": {
    "name": "Neha Gupta",
    "email": "neha.gupta@bitcot.example",
    "department": "Engineering",
    "designation": "Site Reliability Engineer",
    "joiningDate": "2025-02-03",
    "status": "ACTIVE"
  }
}
```

**Update (partial)**
```graphql
mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
  updateEmployee(id: $id, input: $input) { id designation status updatedAt }
}
```
```json
{ "id": "1", "input": { "designation": "Staff Engineer", "status": "ON_LEAVE" } }
```

**Delete**
```graphql
mutation DeleteEmployee($id: ID!) { deleteEmployee(id: $id) }
```
```json
{ "id": "1" }
```

**With curl**
```bash
curl -s http://localhost:4000/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ employees(filter:{department:\"Sales\"}) { id name status } }"}'
```

## Testing

```bash
# Backend: unit + GraphQL API integration (no database needed)
cd graphql-server && npm test
npm run test:unit
npm run test:integration

# Backend: additionally run the end-to-end suite against a real MySQL
# (only touches rows with @integration-test.invalid emails and removes them afterwards)
docker compose up -d mysql
INTEGRATION_DB_HOST=127.0.0.1 INTEGRATION_DB_PORT=3307 \
INTEGRATION_DB_USER=employee_app INTEGRATION_DB_PASSWORD=<DB_PASSWORD> INTEGRATION_DB_NAME=employee_db \
  npm run test:integration

# Frontend: component and page tests
cd frontend && npm test

# Type checks (as a CI gate would run them)
cd graphql-server && npm run typecheck
cd frontend && npm run typecheck
```

| Suite | File(s) | Covers |
|-------|---------|--------|
| Backend unit | `tests/unit/employee.validation.test.ts` | Every validation rule, normalisation, ID and filter validation |
| Backend unit | `tests/unit/employee.service.test.ts` | All employee operations: create, list/search/filter, get, update, delete, conflicts, not-found |
| Backend unit | `tests/unit/config.test.ts` | Env parsing, production requirements, aggregated config errors |
| API integration | `tests/integration/graphql.api.test.ts` | Full HTTP stack: CRUD, filters, error codes, error masking, introspection off, `/health` 200/503, CORS allow/deny, 404 |
| API + MySQL | `tests/integration/mysql.integration.test.ts` | Real repository SQL: CRUD lifecycle, DB unique constraint, case-insensitive search, LIKE-wildcard escaping, UTC timestamps |
| Frontend | `src/components/__tests__/*` | EmployeeForm validation/submit/server errors, StatusBadge, ConfirmDialog |
| Frontend | `src/pages/__tests__/*` | EmployeesPage (loading, data, URL filter, empty search, error + retry), DashboardPage statistics |
| Frontend | `src/utils/__tests__/validation.test.ts` | Client-side validation rules |

Current results: backend **63 passed** (+4 real-MySQL tests when enabled, 67 total), frontend **23 passed**.

## Docker

### Images

| Image | Dockerfile | Build context | Base (runtime) | Size | User |
|-------|-----------|---------------|----------------|------|------|
| GraphQL API | `graphql-server/Dockerfile` | **repository root** (bundles `database/` migrations) | `node:22-alpine` | ~190 MB | `node` (uid 1000) |
| Frontend | `frontend/Dockerfile` | `frontend/` | `nginxinc/nginx-unprivileged:1.30-alpine` | ~60 MB | `nginx` (uid 101) |

Both are multi-stage builds. The API image compiles TypeScript in one stage and copies only `dist/` plus production `node_modules` into the runtime stage. The frontend image builds the static bundle with Node and serves it from nginx. Both define `HEALTHCHECK`s. The API runs `node` directly as PID 1, so it receives `SIGTERM`, drains in-flight requests, closes the DB pool and exits within the ECS stop timeout.

### Build and run individually

```bash
# Build
docker build -f graphql-server/Dockerfile -t employee-graphql-server:latest .
docker build -t employee-frontend:latest ./frontend

# Run the migration job, then the API. This example reuses the Compose MySQL by joining
# its network (start it with `docker compose up -d mysql`); for any other MySQL, set DB_HOST/DB_PORT.
docker run --rm --network bitcot-ems_default --env-file graphql-server/.env \
  -e DB_HOST=mysql -e DB_PORT=3306 \
  employee-graphql-server:latest node dist/scripts/migrate.js --seed

docker run -d --name api --network bitcot-ems_default -p 4001:4000 --env-file graphql-server/.env \
  -e NODE_ENV=production -e DB_HOST=mysql -e DB_PORT=3306 \
  employee-graphql-server:latest

# Run the frontend, pointing it at any API URL at runtime
docker run -d --name web -p 8081:8080 -e GRAPHQL_URL=http://localhost:4001/graphql employee-frontend:latest
# (ports 4001/8081 avoid clashing with the Compose stack; add http://localhost:8081 to CORS_ORIGINS in graphql-server/.env)
```

### nginx behaviour (frontend)

- `index.html` uses `Cache-Control: no-cache`; `/assets/*` (content-hashed) uses `max-age=31536000, immutable`; `/config.js` uses `no-store`
- SPA fallback (`try_files … /index.html`) makes deep links like `/employees/3/edit` work
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; `server_tokens off`; gzip

## AWS integration

What the application already provides for each target service, and what remains for the infrastructure stage:

| Target | Already built into the app | Next stage (infrastructure) |
|--------|----------------------------|-----------------------------|
| **S3 + CloudFront** (frontend) | `npm run build` produces a static `dist/`; hashed assets suit long CDN caching; runtime `config.js` lets one bundle serve any environment; SPA routing needs only a 403/404 → `/index.html` rule | Private S3 bucket with Origin Access Control, CloudFront distribution, `aws s3 sync` + selective invalidation (`/index.html`, `/config.js`) |
| **ECS Fargate** (GraphQL API) | Stateless container; listens on `0.0.0.0:$PORT`; `/health` for ALB target group health checks (503 when DB is down); graceful `SIGTERM` shutdown within 25 s; JSON logs to stdout for the `awslogs` driver; `trust proxy` for ALB; non-root user | ECR repo, task definition (`healthCheck`, `secrets`, `awslogs`), service behind an ALB, deployment circuit breaker with rollback, Service Auto Scaling on CPU/ALB request count |
| **RDS MySQL (private subnets)** | Repository uses only standard MySQL 8 SQL; connection is configured entirely through `DB_*` env vars; `DB_SSL=rds` verifies TLS against the Amazon RDS CA; startup retry and keep-alive tolerate failover; pool size configurable per task | RDS in private subnets, security group allowing 3306 only from the ECS task security group, Multi-AZ, automated backups |
| **Secrets Manager** | No credentials in code or images; config reads `DB_USER`/`DB_PASSWORD` from env, so ECS can inject them straight from Secrets Manager via the task definition's `secrets` (`valueFrom: <secret-arn>:password::`) with no SDK needed | Secret (or RDS-managed master secret), rotation, task execution role permission `secretsmanager:GetSecretValue` on that ARN only |
| **Migrations on deploy** | Same image runs `node dist/scripts/migrate.js` as a one-off task; MySQL named lock prevents concurrent runs; idempotent | CI step: `aws ecs run-task` with command override in private subnets, wait for success, then update the service |
| **Lambda (TypeScript)** | `EmployeeService` is framework-agnostic, with one method per operation (`listEmployees`, `getEmployee`, `createEmployee`, `updateEmployee`, `deleteEmployee`). Domain errors (`ValidationError`, `NotFoundError`, `ConflictError`) are plain classes that map easily to HTTP status codes. `loadDatabaseConfig()` loads DB settings without server-only config | **Not implemented yet.** Each Lambda handler will create a pool once per execution environment (outside the handler), build `new EmployeeService(new MySqlEmployeeRepository(pool))` and call one method. Run in VPC private subnets, ideally via RDS Proxy. The service, repository and models can move into a shared package |
| **IAM** | The app needs no AWS API permissions at runtime (secrets are injected by ECS) | Task execution role (ECR pull, logs, specific secret), minimal task role, GitHub OIDC deploy role scoped to the ECR repo, ECS service, S3 bucket and CloudFront distribution |
| **GitHub Actions CI/CD** | Deterministic `npm ci` builds; `typecheck`, `test` and `build` scripts in both packages; integration suite switchable via env vars (can use a MySQL service container); Dockerfiles build from a clean checkout | Workflow: test → build/push images to ECR (tag = git SHA) → migrate → deploy ECS (rollback via circuit breaker) → build/sync frontend to S3 → invalidate CloudFront |
| **CloudWatch** | Structured JSON logs (one line per request with method, path, status, `durationMs` and GraphQL operation name; errors with stack traces) ready for Logs Insights and metric filters; health endpoint for ALB metrics | Log groups with retention, metric filters (5xx and error counts), alarms on ALB 5xx, target response time, unhealthy hosts, ECS CPU/memory, RDS CPU/connections/free storage; SNS notifications |

## Security notes

- **SQL injection:** all queries are parameterised. Dynamic `UPDATE` columns come from a fixed allow-list. `LIKE` wildcards in search are escaped. `multipleStatements` is enabled only for the file-based migration runner, never for the API pool.
- **Input validation:** server-side validation of every field. GraphQL enums constrain status. Request body limited to 100 KB.
- **Error handling:** production mode returns only safe messages and codes. Stack traces and SQL errors are logged, never returned.
- **CORS:** explicit allow-list (`CORS_ORIGINS`), required in production. Apollo's CSRF prevention stays enabled.
- **Introspection / Sandbox:** off by default in production (`GRAPHQL_INTROSPECTION`).
- **Containers:** non-root users, minimal Alpine runtime images, no secrets baked in (`.dockerignore` excludes `.env*`). The frontend container can write only `config.js`.
- **Headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on API and frontend; `x-powered-by` and nginx version disabled.
- **Dependencies:** `npm audit` reports 0 vulnerabilities in both packages. A transitive `@graphql-tools/utils` advisory is pinned to a patched release via `overrides`.
- **Database user:** the app connects as a non-root user (`employee_app`). The MySQL root password is used only by the MySQL container itself.

Not in scope for this assessment, and the natural next steps: authentication/authorisation (e.g. Amazon Cognito + JWT validation in the GraphQL context), pagination for very large datasets, query depth/complexity limits, and AWS WAF on CloudFront/ALB.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `DB_PASSWORD must be set in .env` when running Compose | `cp .env.example .env` and set the passwords |
| Port 3306/4000/8080 already in use | Change `MYSQL_HOST_PORT` / `API_HOST_PORT` / `FRONTEND_HOST_PORT` in `.env` |
| `migrate` exited with code 1 | `docker compose logs migrate`. Usually wrong credentials. If you changed passwords after the first start, the volume still holds the old ones: `docker compose down -v` (deletes data) |
| Frontend shows "Unable to reach the server" | Check `curl localhost:4000/health`; make sure `FRONTEND_GRAPHQL_URL` is reachable **from the browser** |
| Browser console shows a CORS error | Add the frontend origin (scheme + host + port) to `CORS_ORIGINS` and restart the API |
| Health check returns 503 | The API is running but can't reach MySQL. Check `DB_*` variables and network/security groups |
| `Invalid configuration: …` on start-up | Every listed variable is missing or invalid; set them and restart |
