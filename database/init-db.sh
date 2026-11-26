#!/usr/bin/env bash
# Initialise a MySQL database (local or Amazon RDS) using only the mysql CLI.
# Applies every migration in database/migrations and, with --seed, the seed files.
# Prefer `npm run db:migrate` (graphql-server) which also tracks applied versions;
# this script records versions in the same schema_migrations table, so both are interchangeable.
#
# Usage:
#   DB_HOST=127.0.0.1 DB_PORT=3307 DB_USER=employee_app DB_PASSWORD=... DB_NAME=employee_db ./database/init-db.sh [--seed]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${DB_HOST:?DB_HOST is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"
DB_PORT="${DB_PORT:-3306}"

# Pass the password via env (not argv) so it does not appear in the process list.
export MYSQL_PWD="${DB_PASSWORD:-}"
MYSQL=(mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" --database="$DB_NAME" --batch --skip-column-names)

"${MYSQL[@]}" -e "CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"

for file in "$SCRIPT_DIR"/migrations/*.sql; do
  version="$(basename "$file")"
  applied="$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';")"
  if [[ "$applied" == "0" ]]; then
    echo "Applying migration $version"
    "${MYSQL[@]}" < "$file"
    "${MYSQL[@]}" -e "INSERT INTO schema_migrations (version) VALUES ('$version');"
  else
    echo "Skipping migration $version (already applied)"
  fi
done

if [[ "${1:-}" == "--seed" ]]; then
  for file in "$SCRIPT_DIR"/seeds/*.sql; do
    version="seed:$(basename "$file")"
    applied="$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';")"
    if [[ "$applied" == "0" ]]; then
      echo "Applying seed $(basename "$file")"
      "${MYSQL[@]}" < "$file"
      "${MYSQL[@]}" -e "INSERT INTO schema_migrations (version) VALUES ('$version');"
    else
      echo "Skipping seed $(basename "$file") (already applied)"
    fi
  done
fi
echo "Database initialisation complete."
