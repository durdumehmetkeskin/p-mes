# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`p-mes` is a Manufacturing Execution System. The repo root is a container (`docker-compose.yml`, `.env`, `pgadmin/`, `lokasyon-ornek-data/`) wrapping **two independent npm apps**:

- `backend/` — NestJS 11 + TypeORM + PostgreSQL 18 REST API (served under `/api`).
- `frontend/` — Refine + React 19 + Vite SPA (shadcn/ui + Tailwind v4), talking to the API over REST.

There is **no root `package.json`** — run npm commands inside `backend/` or `frontend/`. Domain surface: inventory (materials/lots/warehouses/zones/racks/reservations/balances/transactions), tooling (tools/assignments/usages/cycle-logs/status-history), project & production (customers/orders/processes/stages/workflow-templates/workload), locations (with sensor-XLS ingest), attachments (MinIO), reporting (embedded jsreport), plus auth, roles/permissions, users, and audit.

> Note: three codebase-memory-mcp projects exist. Use `C-Users-mdk-Desktop-p-mes-backend` and `C-Users-mdk-Desktop-p-mes-frontend`; the root `C-Users-mdk-Desktop-p-mes` index is stale.

## Commands

### Backend (`cd backend`)
```bash
npm run start:dev          # watch mode; API at http://localhost:3000/api, Swagger at /docs
npm run build              # nest build -> dist/ (REQUIRED before any migration/seed; they run against dist/)
npm run start:prod         # node dist/main
npm test                   # Jest unit tests (*.spec.ts under src)
npm test -- auth.service   # run a single spec by name/path substring
npm run test:e2e           # e2e via test/jest-e2e.json
npm run lint               # eslint --fix over src/apps/libs/test

npm run migration:create -- src/database/migrations/<Name>   # scaffold empty TS migration (ts-node, no build)
npm run migration:generate -- src/database/migrations/<Name> # build, then diff entities vs DB (reads dist)
npm run migration:run      # build, then apply pending migrations
npm run migration:revert   # build, then roll back the last migration
npm run seed:admin         # build, then idempotently create/promote admin (needs ADMIN_PASSWORD env)
npm run seed:reports       # build, then idempotently (re)seed system jsreport templates
```

### Frontend (`cd frontend`)
```bash
npm run dev                # refine dev (Vite) on http://localhost:5173
npm run build              # tsc && refine build
npm run start              # serve the production build
npx shadcn@latest add <c>  # add a shadcn/ui primitive into src/components/ui (uses components.json; no tailwind.config to edit)
# npm run codegen          # VESTIGIAL — graphql-codegen with no config/schema; do not use
```
Frontend installs need `--legacy-peer-deps` (Refine + React 19). Locally this is applied automatically via `frontend/.npmrc`; the Dockerfile passes it explicitly. The backend has no such constraint.

### Full stack / infra (repo root)
```bash
cp .env.example .env       # then edit secrets
docker compose up -d --build   # db + pgadmin + minio + backend + frontend
docker compose up -d db minio  # local-dev: just backing services, then run backend/frontend natively
docker compose build frontend  # REQUIRED after changing VITE_API_URL (baked at build time)
```
Ports: frontend `5173`, API `3000/api`, Postgres `5432`, pgAdmin `5050`, MinIO API `9000` / console `9001` — all bound to `127.0.0.1` only. The entry point is **Traefik** on `:80` (`TRAEFIK_HTTP_PORT`): `/api` + `/docs` → backend, `/` → frontend. `VITE_API_URL=/api` is resolved against the page origin at runtime, so the same frontend build works behind any host serving the SPA; if the host changes, update `APP_URL` in `.env` + `docker compose up -d backend` so QR deep links follow. Direct `http://localhost:5173` has broken API calls by design — use `http://localhost` (Traefik) locally. The dockerized backend entrypoint (`backend/docker-entrypoint.sh`) auto-runs the admin + reports seeds (idempotent, non-fatal) then `node dist/main.js`; migrations auto-apply on boot (see below).

## Backend architecture

**Bootstrap (`src/main.ts`).** Global prefix `api` (env `API_PREFIX`); CORS origin from `CORS_ORIGIN` with `exposedHeaders: ['x-total-count']`; a global `ValidationPipe { whitelist, forbidNonWhitelisted, transform }`; one global filter (`AllExceptionsFilter`, normalizes errors to `{statusCode,message,error,timestamp,path}`) and one global interceptor (`LoggingInterceptor`); Swagger UI at `/docs` (Bearer scheme `access-token`).

**Config (`src/config/*`).** `@nestjs/config` `registerAs` into four namespaces — `app`, `database`, `auth`, `storage` — accessed by dotted keys (`config.get('app.corsOrigins')`). `env.validation.ts` validates env once at startup and **fails fast** (e.g. `JWT_SECRET` `@MinLength(32)`).

**Global providers (`src/app.module.ts`).** Three `APP_GUARD`s run in a deliberate order: `JwtAuthGuard` → `RolesGuard` → `PermissionsGuard` (authenticate before authorize). An `APP_INTERCEPTOR` `AuditContextInterceptor` runs after the guards and stashes `request.user` `{id,email}` into `nestjs-cls` so the audit DB subscriber can attribute changes without threading the actor through method args.

**Persistence.** `BaseEntity` (`src/common/entities/base.entity.ts`) gives every entity a UUID PK, `createdAt`/`updatedAt`, and a soft-delete `deletedAt` (all timestamptz). Column names are snake_case set explicitly per column (no naming strategy). Two TypeORM configs exist and **must be kept in sync**: `database/database.module.ts` (runtime, via `ConfigService`, `autoLoadEntities`) and `database/data-source.ts` (CLI-only, raw `process.env`, globs `dist/**/*.entity.js`). `synchronize` is on **only** when `NODE_ENV=development`; every other env uses `synchronize:false` + `migrationsRun:true` (migrations auto-apply at boot).

**Auth & authorization.** `JwtStrategy.validate` re-loads the user fresh from the DB on every request (the JWT payload is only `{sub,email}`), so roles/permissions are always authoritative and revocations take effect immediately. Authorization is a **per-role permission-key** scheme: controllers carry `@RequirePermissions('resource:action')` (resource = kebab-plural, action = read/create/update/delete + granular verbs like `create-issue`, `update-status`). `PermissionsGuard` passes if the union of the user's roles' `permissions` covers every required key; the **Admin** system role bypasses all checks. Refresh tokens are opaque, hashed (SHA-256), single-use with rotation + reuse-detection (family revoke); password reset is single-use and revokes all sessions. Self-registration is open (`POST /users` is `@Public()`), new users get the default `user` role.

**Audit (`src/modules/audit/`).** `audit.subscriber.ts` audits **every** entity via a *denylist* (`AUDIT_EXCLUDED_ENTITIES` in `audit.constants.ts`), writing before/after JSONB in the same transaction as the change; `SENSITIVE_KEYS` are redacted. `immutability.subscriber.ts` blocks update/delete on append-only entities (`AuditLog`, `ToolStatusHistory`, `ToolCycleLog`, `InventoryTransaction`).

**REST list contract.** Refine simple-rest: clients send `_start`/`_end`/`_sort`/`_order`; the server returns the total in a lowercase `x-total-count` header. `resolveListQuery` (`modules/project/list-query.util.ts`, byte-identical copy in `modules/location/`) parses these into TypeORM `skip`/`take` with a per-controller `SORTABLE` allow-list. Inventory and tooling controllers **inline** the same parsing rather than importing the util.

**Feature module pattern.** `controller + service + (repository) + dto/ + entities/ + enums/`, applied inconsistently — some services inject a repository wrapper, others inject `Repository<T>` and build QueryBuilders directly. There is no BaseCrudService; each resource re-implements CRUD. Storage is MinIO (`modules/storage/minio.service.ts`, auto-creates bucket); reporting embeds jsreport in-process (`modules/reporting/jsreport.service.ts`, Chromium for PDF/xlsx); QR codes are generated on demand (`modules/qr/qr.service.ts`, never persisted).

### Backend gotchas
- **Migrations/seeds run against compiled `dist/`.** The npm scripts prepend `npm run build`; edits to `.ts` entities/migrations are invisible until rebuilt, and a stale `dist/` silently produces wrong migrations.
- **Every route is authenticated by default** (global `JwtAuthGuard`) — a new endpoint 401s unless `@Public()`. A route with **no `@RequirePermissions`** is open to *any* authenticated user; forgetting it silently under-protects.
- **Adding `@RequirePermissions('x:y')` requires adding `x:y` to `modules/roles/permission.catalog.ts`** — otherwise it can't be granted to non-admin roles and `updatePermissions` rejects it as unknown.
- **Admin bypasses both the permission guard and service-layer project scoping.** Test features with a non-admin *member* user, or scoping paths never execute.
- **Non-admin access failures return 404, not 403** (to avoid leaking existence). Don't "fix" these to 403.
- **Every new entity is audited automatically.** Add high-volume/secret entities to `AUDIT_EXCLUDED_ENTITIES` and any new secret field name to `SENSITIVE_KEYS`.
- **`numeric`/`decimal` columns come back as strings from `pg`.** Attach `transformer: numericTransformer` (`common/transformers/numeric.transformer.ts`) to each numeric `@Column`; it is opt-in per column, not automatic.
- **New list endpoints** must write the lowercase `x-total-count` header (CORS already exposes it) or frontend pagination breaks.

## Frontend architecture

**Data layer is REST via `@refinedev/simple-rest`** — `src/providers/data.ts` is the only dataProvider. The GraphQL packages in `package.json` (`@refinedev/nestjs-query`, `graphql-ws`, `@graphql-codegen/*`) and the `codegen` script are **vestigial scaffold cruft** (zero imports, no config).

**Networking (`src/providers/`).** One shared `axiosInstance` (base `VITE_API_URL`, default `http://localhost:3000/api`) is used by both data and auth providers. A request interceptor injects `Authorization: Bearer <token>`; a response interceptor does single-flight `POST /auth/refresh` on 401 and retries. Tokens live in `localStorage` (`p-mes-access-token` / `p-mes-refresh-token`). `auth.ts` implements the Refine authProvider against `/auth/*`; `check()` only tests token presence (no server call). `access-control.ts` (`accessControlProvider`) caches `GET /auth/me` + `GET /permissions`, maps `{resource,action}` → `resource:action`, and **fails open** (unknown keys / network errors → allowed); call `resetAccessControl()` after role changes.

**Routing & resources (`src/App.tsx`).** Plain react-router v7 `<Routes>` (not a Refine data router). Adding a resource touches **two places**: the `resources[]` array (name + routes + `meta.label/icon/parent/group`) *and* the `<Routes>` tree. Many resources are registered with **meta only, no `list` route** (e.g. `inventory-balances`, `reservations`, `orders`, `tool-*` history) — these are load-bearing so Refine data hooks resolve inside detail/workspace screens; don't delete them to "clean up" the sidebar (which is generated from `useMenu()`). CRUD create/edit/show render as **route-driven overlays** over the still-mounted list: wrap create/edit in `RouteFormDialog` (modal) and show in `RouteShowSheet` (Sheet). The **project module has its own nested workspace** at `/projects/:id` (`pages/projects/workspace/project-workspace.tsx`) with a scoped secondary sidebar; add project sub-features there via its `NAV` array, not as app-level pages.

**UI system.** Two deliberate layers: `src/components/ui/*` = ~47 unmodified shadcn/ui "new-york" primitives (Radix + `cva`); `src/components/refine-ui/*` = Refine-aware components composed from them (layout/sidebar/header, data-table, forms, buttons, views, notifications, theme). Domain widgets live in `src/components/<domain>/`. Use `cn()` from `src/lib/utils.ts` for class merging. `@/*` → `./src/*` (set in both `vite.config.ts` and `tsconfig.json`). Page convention: `src/pages/<resource>/` with `list/create/edit/show.tsx`, a shared `<resource>-form-fields.tsx`, and an `index.ts` barrel.

**Tailwind is v4, CSS-first — there is NO `tailwind.config.js`.** Enabled via the `@tailwindcss/vite` plugin; all theming (oklch color vars, `--radius`, Inter font, `.dark` variant) lives in `src/App.css` via `@import "tailwindcss"` + `@theme inline`. Dark mode is the **custom** provider `refine-ui/theme/theme-provider.tsx` (localStorage `refine-ui-theme`, toggles `.dark` on `<html>`); `next-themes` is a dependency but effectively unused — use `useTheme` from the refine-ui provider.

### Frontend gotchas
- **`VITE_API_URL` is compile-time**, baked into the bundle at build. Changing it requires `docker compose build frontend` (or a fresh `npm run build`); a runtime env change does nothing. It must point at the host-published API (`http://localhost:3000/api`).
- **Do not create a `tailwind.config.js`** (v4) or add `next-themes`. Add design tokens in `src/App.css`.
- `"use client";` directives in `refine-ui/*` are inert (Vite SPA, `rsc=false`) — copied from upstream templates; don't infer Next.js/RSC.
- `accessControlProvider` caches permissions in a module-level promise; stale after role changes until `resetAccessControl()` (called on login/register/logout) or reload.
