#!/bin/sh
# Executed by the nginx image entrypoint before nginx starts.
# Writes the runtime config consumed by src/config.ts so the same image can be
# promoted between environments by changing only the GRAPHQL_URL env var.
set -eu

CONFIG_FILE=/usr/share/nginx/html/config.js

if [ -n "${GRAPHQL_URL:-}" ]; then
  # Escape backslashes and single quotes for a JS string literal.
  escaped=$(printf '%s' "$GRAPHQL_URL" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g")
  printf "window.__APP_CONFIG__ = {\n  graphqlUrl: '%s',\n};\n" "$escaped" > "$CONFIG_FILE"
  echo "40-runtime-config: graphqlUrl=${GRAPHQL_URL}"
else
  echo "40-runtime-config: GRAPHQL_URL not set, using build-time configuration"
fi
