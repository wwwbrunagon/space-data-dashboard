# AGENT.md — Space Dashboard Monorepo

This file is the authoritative reference for AI agents and contributors working in this repository. Read it fully before making any changes.

---

## Repository Type

**Monorepo.** All packages, apps, and services live in a single repository managed with a shared toolchain. Do not split packages into separate repos.

---

## Monorepo Structure

```
space-dashboard/                  ← repo root
├── apps/
│   └── web/                      ← Next.js 15 dashboard (App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx                  ← Dashboard entry (Server Component)
│       │   │   ├── error.tsx                 ← Error boundary (Client Component)
│       │   │   └── api/
│       │   │       ├── apod/route.ts         ← GET /api/apod?date=YYYY-MM-DD
│       │   │       ├── asteroids/route.ts    ← GET /api/asteroids?start=&end=
│       │   │       └── cron/sync/route.ts    ← POST /api/cron/sync (protected)
│       │   ├── components/
│       │   │   ├── ApodCard.tsx              ← Server Component
│       │   │   ├── AsteroidTable.tsx         ← Client Component (filtering/sort)
│       │   │   └── HistoryCalendar.tsx       ← Client Component
│       │   ├── lib/
│       │   │   ├── nasa.ts                   ← NASA API client
│       │   │   ├── db.ts                     ← Prisma client singleton
│       │   │   └── queries.ts                ← Typed DB query functions
│       │   └── types/
│       │       └── nasa.ts                   ← Zod schemas + inferred types
│       ├── next.config.ts
│       └── package.json
├── packages/
│   ├── db/                        ← Prisma schema, migrations, generated client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   └── index.ts           ← Re-exports db client + query helpers
│   │   └── package.json
│   ├── types/                     ← Shared Zod schemas and TypeScript types
│   │   ├── src/
│   │   │   └── nasa.ts
│   │   └── package.json
│   └── config/                    ← Shared ESLint, TypeScript, Tailwind configs
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
├── turbo.json                     ← Turborepo pipeline config
├── pnpm-workspace.yaml            ← pnpm workspace definition
├── package.json                   ← Root package.json (devDependencies, scripts)
└── .env.local                     ← Secrets (never committed)
```

---

## Package Manager

**pnpm** with workspaces. Never use `npm` or `yarn` in this repo.

```bash
# Install all dependencies from root
pnpm install

# Run a script in a specific workspace
pnpm --filter @space/web dev
pnpm --filter @space/db migrate

# Add a dependency to a specific package
pnpm --filter @space/web add date-fns
pnpm --filter @space/web add -D @types/node
```

### Workspace package names

| Directory              | Package name       |
|------------------------|--------------------|
| `apps/web`             | `@space/web`       |
| `packages/db`          | `@space/db`        |
| `packages/types`       | `@space/types`     |
| `packages/config`      | `@space/config`    |

---

## Build System

**Turborepo** orchestrates the build pipeline. All tasks are defined in `turbo.json`.

```bash
# Dev (all apps in parallel)
pnpm dev

# Build all packages and apps in dependency order
pnpm build

# Type-check the entire repo
pnpm typecheck

# Lint the entire repo
pnpm lint

# Run DB migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

### Turborepo pipeline (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

> `^build` means: build all upstream dependencies first. `@space/web` depends on `@space/db` and `@space/types`, so those build first automatically.

---

## Tech Stack

| Layer         | Technology              | Version  |
|---------------|-------------------------|----------|
| Framework     | Next.js (App Router)    | 15.x     |
| Language      | TypeScript              | 5.x      |
| Styling       | Tailwind CSS            | 3.x      |
| ORM           | Prisma                  | 5.x      |
| Database      | PostgreSQL              | 16.x     |
| Validation    | Zod                     | 3.x      |
| Date utils    | date-fns                | 3.x      |
| Client state  | TanStack Query          | 5.x      |
| Build system  | Turborepo               | latest   |
| Package mgr   | pnpm                    | 9.x      |

---

## Environment Variables

Secrets live in `.env.local` at the **repo root** and are shared across apps. Never commit this file.

```bash
# .env.local
NASA_API_KEY=your_key_from_api.nasa.gov
DATABASE_URL="postgresql://user:password@localhost:5432/spacedash"
CRON_SECRET=a-long-random-string-generate-with-openssl-rand-hex-32
```

- `NASA_API_KEY` — Register free at api.nasa.gov. Do **not** use `DEMO_KEY` in development (30 req/hour limit).
- `DATABASE_URL` — Postgres connection string. Locally use Docker; in production use Neon / Supabase / Vercel Postgres.
- `CRON_SECRET` — Bearer token protecting the `/api/cron/sync` endpoint.

> **Security rule:** Never reference `NASA_API_KEY` or `CRON_SECRET` in any `'use client'` file. All NASA API calls happen in Server Components or Route Handlers only.

---

## Database (`packages/db`)

The `@space/db` package owns the Prisma schema, migrations, and exports a typed client singleton.

### Schema overview

| Table            | Primary key            | Purpose                              |
|------------------|------------------------|--------------------------------------|
| `apod_snapshots` | `date` (natural, YYYY-MM-DD) | One APOD entry per calendar day |
| `asteroids`      | `nasaId` (NASA string ID)    | Near-Earth Object records        |
| `sync_log`       | `id` (autoincrement)         | Cron audit log                   |

### Migration workflow

```bash
# Development — creates migration file and applies it
pnpm --filter @space/db exec prisma migrate dev --name <description>

# Production — applies existing migrations only (use in CI/CD)
pnpm --filter @space/db exec prisma migrate deploy

# Generate Prisma client after schema changes (usually automatic)
pnpm --filter @space/db exec prisma generate
```

### Key schema rules

- `ApodSnapshot.date` is the `@id` — upserting by date is idempotent by design.
- `Asteroid.nasaId` is the `@id` — use NASA's own stable string IDs, not a surrogate.
- Always store `rawData Json` alongside typed columns. This future-proofs against NASA API schema changes without requiring a back-fill.
- Indexes on `asteroids.closeApproachDate` and `asteroids.isPotentiallyHazardous` are required — the most common query filters.

---

## Caching Architecture

Three layers operate together. Do not bypass or reorder them.

1. **Next.js fetch cache** (`next: { revalidate: 3600 }`) — CDN/edge layer, 1-hour TTL on all NASA API calls.
2. **PostgreSQL DB cache** — Primary cache. Every NASA response is upserted to the DB. Always query DB before calling the NASA API.
3. **React `cache()`** — Deduplicates identical calls within a single server render pass. Wrap all query functions with `cache()`.

```
Request → Check DB → Hit? Return from DB
                   → Miss? Call NASA → Upsert DB → Return
```

---

## Component Rules

### Server Components (default)
- No `'use client'` directive.
- Fetch data directly — DB queries, NASA API calls.
- Never import or reference `process.env.NASA_API_KEY` in any component marked `'use client'`.
- Use `async/await` at the component level.

### Client Components
- Require `'use client'` at the top of the file.
- Only used when the feature requires browser APIs, `useState`, `useEffect`, or event handlers (e.g., table sorting/filtering, interactive calendar).
- Receive initial data as props from a parent Server Component — do **not** fetch on mount unless the user has triggered a new query.

### Data fetching pattern

```
DashboardPage (Server Component)
  ├── Fetches all data concurrently with Promise.all
  ├── ApodCard (Server Component) — wrapped in <Suspense>
  └── AsteroidTable (Client Component) — receives initialAsteroids as props
```

---

## API Routes

| Route                  | Method | Auth           | Description                          |
|------------------------|--------|----------------|--------------------------------------|
| `/api/apod`            | GET    | None           | Cache-aside APOD fetch by date       |
| `/api/asteroids`       | GET    | None           | Cache-aside asteroid fetch by range  |
| `/api/cron/sync`       | POST   | Bearer token   | Sync APOD + asteroids, log result    |

### Cron security

The `/api/cron/sync` endpoint validates the `Authorization: Bearer <CRON_SECRET>` header before doing any work. Return `401` immediately if it doesn't match. Never remove this check.

### Cron schedule

Configured in `apps/web/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 1 * * *"
    }
  ]
}
```

Runs at 01:00 UTC daily — 1 hour after NASA publishes the new APOD at midnight UTC. This avoids caching a stale response.

---

## TypeScript Conventions

- **Never use `any`.** Use `unknown` and narrow it.
- **Prefer `Prisma.ModelGetPayload<{}>` over raw model types** — it accounts for `select`/`include` modifiers and is more precise.
- **Infer types from Zod schemas** — define the schema, then `type Foo = z.infer<typeof FooSchema>`. No manual interface maintenance for external API responses.
- **Use `Pick<>` honestly** — if a query uses `select`, the return type must reflect only those fields.
- **No `as` casts to lie to the compiler.** The only acceptable `as` usage is the Prisma `rawData` cast: `value as unknown as Record<string, unknown>`.

---

## Coding Patterns

### Concurrent DB queries — always use `Promise.all`

```typescript
// ✅ Correct — concurrent, ~30ms total
const [asteroids, syncStatus] = await Promise.all([
  getAsteroidsByDateRange(today, nextWeek),
  getLastSyncStatus(),
])

// ❌ Wrong — sequential waterfall, ~50ms total
const asteroids = await getAsteroidsByDateRange(today, nextWeek)
const syncStatus = await getLastSyncStatus()
```

### Upsert with empty `update` — idempotent insert

```typescript
// Inserts if not exists, does nothing on conflict
await db.apodSnapshot.upsert({
  where:  { date },
  create: { ...data },
  update: {},           // ← intentional no-op
})
```

### Zod validation at API boundaries

All external data (NASA API responses) must be parsed through a Zod schema before use. A parse failure surfaces a typed error with a meaningful message instead of a runtime crash deep in the app.

---

## Adding a New Feature

1. **New shared types** → add to `packages/types/src/`.
2. **New DB table or column** → update `packages/db/prisma/schema.prisma`, run `pnpm db:migrate`, update `packages/db/src/index.ts` exports.
3. **New API route** → add under `apps/web/src/app/api/`. Follow the cache-aside pattern.
4. **New component** → default to Server Component. Only add `'use client'` if interactivity is required.
5. **New cron task** → add to the existing `/api/cron/sync` handler and log to `SyncLog`.

---

## What Not To Do

- ❌ Do not add a new top-level `package.json` outside `apps/` or `packages/` — all packages must live in the monorepo workspace.
- ❌ Do not call `npm install` or `yarn` — use `pnpm` only.
- ❌ Do not call NASA API directly from a Client Component.
- ❌ Do not skip `SyncLog` writes in cron tasks — the audit log is required for production observability.
- ❌ Do not use `prisma migrate dev` in CI/CD — use `prisma migrate deploy`.
- ❌ Do not store secrets in `apps/web/.env.local` separately — all env vars go in the root `.env.local`.
- ❌ Do not use `DEMO_KEY` as the NASA API key in any environment.
- ❌ Do not remove the `Suspense` boundary around `ApodCard` — it allows independent streaming of the two dashboard sections.

---

## Local Development Setup

```bash
# 1. Clone and install
git clone <repo-url> space-dashboard
cd space-dashboard
pnpm install

# 2. Set up environment
cp .env.example .env.local
# Fill in NASA_API_KEY, DATABASE_URL, CRON_SECRET

# 3. Start local Postgres (Docker recommended)
docker run -d \
  --name spacedash-pg \
  -e POSTGRES_DB=spacedash \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16

# 4. Run migrations and generate Prisma client
pnpm db:migrate

# 5. Start all apps
pnpm dev

# App runs at http://localhost:3000
# Prisma Studio at http://localhost:5555 (run: pnpm db:studio)
```

---

## Deployment (Vercel)

```bash
npm i -g vercel
vercel

vercel env add NASA_API_KEY production
vercel env add DATABASE_URL production
vercel env add CRON_SECRET production
```

Run `prisma migrate deploy` as a build step in Vercel — add it to `apps/web/package.json`:

```json
{
  "scripts": {
    "build": "prisma migrate deploy && next build"
  }
}
```

### Recommended managed Postgres providers

| Service          | Free tier         | Notes                                 |
|------------------|-------------------|---------------------------------------|
| Neon             | 0.5 GB + branches | Best DX, instant preview branches     |
| Supabase         | 500 MB            | Includes Auth, Storage, Realtime      |
| Vercel Postgres  | 256 MB            | Zero-config with Vercel (Neon-backed) |
| Railway          | $5 credit/month   | Simple, predictable billing           |

---

## Production Checklist

- [ ] `NASA_API_KEY` set in Vercel env vars — never in source code
- [ ] `CRON_SECRET` is 32+ random bytes (`openssl rand -hex 32`)
- [ ] `prisma migrate deploy` runs in build, not `migrate dev`
- [ ] Vercel cron configured in `apps/web/vercel.json`
- [ ] `next.config.ts` includes `apod.nasa.gov` in `remotePatterns`
- [ ] `SyncLog` monitored — alert on two or more consecutive `status: 'error'` rows
- [ ] Error boundaries (`error.tsx`) in place for both dashboard sections
- [ ] No `DEMO_KEY` reference anywhere in the codebase (`grep -r DEMO_KEY .`)
