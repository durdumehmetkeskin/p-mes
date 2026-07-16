#!/bin/sh
set -e

# Seed the initial admin user (idempotent). Reads ADMIN_EMAIL / ADMIN_NAME /
# ADMIN_PASSWORD from the environment. This first app-context boot also runs any
# pending migrations (migrationsRun=true in production). Best-effort: a failed/
# skipped seed must never prevent the API from starting.
echo "[entrypoint] running admin seed..."
node dist/database/seeds/admin.seed.js || echo "[entrypoint] admin seed skipped/failed"

# Seed the default report templates (idempotent; never overwrites edits).
echo "[entrypoint] running reports seed..."
node dist/database/seeds/reports.seed.js || echo "[entrypoint] reports seed skipped/failed"

echo "[entrypoint] starting API..."
# exec so node becomes PID 1 and receives SIGTERM for graceful shutdown.
exec node dist/main.js
