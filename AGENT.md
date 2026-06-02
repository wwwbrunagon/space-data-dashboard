# Space Data Dashboard — AGENT.md

Complete reference guide for developing and deploying the Space Data Dashboard. Read this before contributing.

---

## Project Overview

**Space Data Dashboard** is a production-grade full-stack Next.js 15 application that displays NASA's Astronomy Photo of the Day (APOD) and near-Earth asteroid data. The dashboard features a PostgreSQL historical archive, intelligent multi-layer caching, and a daily cron-based background sync job.

### What You'll Build

- **APOD Display**: Daily Astronomy Photo of the Day with title, explanation, and copyright attribution
- **Asteroid Tracking**: Filterable, sortable table of near-Earth objects (NEOs) for the next 7 days
- **Historical Archive**: PostgreSQL stores every daily fetch for queryable history
- **Smart Caching**: 3-layer cache strategy (Next.js fetch cache, PostgreSQL, React cache())
- **Background Sync**: Daily cron job pre-populates data before user traffic arrives
- **Type-Safe API Integration**: Zod runtime validation + TypeScript ensures API responses match expected shapes
- **Quota Management**: Stays within NASA's 1,000 requests/day free tier

### Architecture Stack

| Component    | Technology     | Version | Purpose                            |
| ------------ | -------------- | ------- | ---------------------------------- |
| Framework    | Next.js 15     | 15.x    | Server Components, Route Handlers  |
| Language     | TypeScript     | 5.x     | Full end-to-end type safety        |
| Frontend UI  | React 18       | 18.x    | Server & Client Components         |
| Styling      | Tailwind CSS   | 3.x     | Utility-first CSS                  |
| Database ORM | Prisma         | 5.x     | Type-safe DB queries               |
| Database     | PostgreSQL     | 16.x    | Primary data store                 |
| Validation   | Zod            | 3.x     | Runtime schema validation          |
| Dates        | date-fns       | 3.x     | Date formatting & manipulation     |
| Query Client | TanStack Query | 5.x     | Client-side async state (optional) |
| Package Mgr  | pnpm           | 9.x     | Fast workspace package manager     |
| Build System | Turborepo      | latest  | Monorepo build orchestration       |
| Deployment   | Vercel         | latest  | Hosting + cron jobs                |

### Monorepo Structure

```
space-dashboard/
├── apps/
│   └── web/                      ← Next.js 15 dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx                    ← Dashboard (Server Component)
│       │   │   ├── error.tsx                   ← Error boundary
│       │   │   ├── globals.css                 ← Global styles
│       │   │   └── api/
│       │   │       ├── apod/route.ts           ← GET /api/apod?date=YYYY-MM-DD
│       │   │       ├── asteroids/route.ts      ← GET /api/asteroids?start=&end=
│       │   │       └── cron/sync/route.ts      ← POST /api/cron/sync (protected)
│       │   ├── components/
│       │   │   ├── ApodCard.tsx                ← Server Component
│       │   │   ├── AsteroidTable.tsx           ← Client Component
│       │   │   └── HistoryCalendar.tsx         ← Client Component (optional)
│       │   ├── lib/
│       │   │   ├── nasa.ts                     ← NASA API client
│       │   │   ├── db.ts                       ← Prisma singleton
│       │   │   └── queries.ts                  ← Query functions with cache()
│       │   └── types/
│       │       └── nasa.ts                     ← Zod schemas
│       ├── next.config.ts
│       ├── vercel.json                         ← Cron config
│       └── package.json
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma                   ← 3 tables: apod_snapshots, asteroids, sync_log
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   └── client.ts                       ← Prisma export
│   │   └── package.json
│   └── config/                   ← Shared linting/typing configs
├── turbo.json                    ← Build pipeline
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── .env.local                    ← NASA_API_KEY, DATABASE_URL, CRON_SECRET

```

### Key Design Decisions

**Why Next.js App Router?**
Server Components enable server-side data fetching before HTML rendering, eliminating loading spinners for initial page loads. Route Handlers replace a separate Express server, collapsing a 3-service architecture (frontend + BFF + API) into one coherent Next.js app.

**Why Prisma over raw SQL?**
Auto-generated TypeScript types for query results eliminate type-drift. Migrations are handled cleanly without manual SQL maintenance. At this project's scale (3 tables), raw SQL would work fine, but Prisma provides type safety and future scalability.

**Why PostgreSQL over SQLite?**

- JSON columns for flexible NASA response caching
- Full-text search capability (future feature)
- Cloud deployment trivial (Vercel Postgres, Supabase, Neon all support Postgres)

**Why Zod validation at API boundaries?**
NASA's public API can change without notice. Zod validates responses at runtime, converting potential crashes into handled errors with meaningful messages.

---

## Build and Test Commands

### Development Setup

```bash
# Install dependencies (use pnpm, never npm/yarn)
pnpm install

# Create .env.local in project root
cat > .env.local << EOF
NASA_API_KEY=your_key_from_api.nasa.gov
DATABASE_URL="postgresql://user:password@localhost:5432/spacedash"
CRON_SECRET=$(openssl rand -hex 32)
EOF

# Initialize Prisma and apply migrations
pnpm db:migrate

# (Optional) Open database browser
pnpm db:studio
```

### Running Locally

```bash
# Start development server (http://localhost:3000)
pnpm dev

# Watches for file changes, hot-reloads
# Prisma Client auto-generated on startup
# Database migrations applied automatically

# In another terminal, manually trigger cron sync:
curl -X POST http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret"
```

### Production Build

```bash
# Build optimized production bundle
pnpm build

# Start production server
pnpm start

# Or build and test locally
pnpm build && pnpm start
```

### Database Commands

```bash
# After editing prisma/schema.prisma:
pnpm db:migrate

# Apply existing migrations to prod (use in CI/CD):
pnpm db:migrate:deploy

# Reset local database (DESTRUCTIVE):
pnpm db:reset

# View migration history:
pnpm db:status
```

### NASA API Configuration

```bash
# Get free API key
# 1. Visit https://api.nasa.gov
# 2. Register (instant, no approval needed)
# 3. Copy API key to .env.local

# Generate CRON_SECRET
openssl rand -hex 32

# Test NASA API directly
curl "https://api.nasa.gov/planetary/apod?api_key=YOUR_KEY&date=2025-04-14"
```

### Testing Endpoints

```bash
# Test APOD endpoint
curl http://localhost:3000/api/apod
curl "http://localhost:3000/api/apod?date=2025-04-14"

# Test asteroids endpoint
curl http://localhost:3000/api/asteroids
curl "http://localhost:3000/api/asteroids?start=2025-04-14&end=2025-04-21"

# Check response headers (X-Cache: HIT or MISS)
curl -v http://localhost:3000/api/apod

# Test cron endpoint
curl -X POST http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret"

# Test invalid input
curl "http://localhost:3000/api/apod?date=invalid"
# Expected: 400 with error message
```

---

## Code Style Guidelines

### TypeScript Best Practices

**Single source of truth for types**:

```typescript
// ✅ GOOD: Define Zod schema, infer TypeScript type
export const ApodSchema = z.object({
	title: z.string(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	url: z.string().url(),
});

export type Apod = z.infer<typeof ApodSchema>;

// ✅ GOOD: Derived Prisma query types
export type ApodSnapshotRow = Prisma.ApodSnapshotGetPayload<{}>;

// ❌ BAD: Manual interfaces that drift from reality
interface ApodResponse {
	title: string;
	date: string;
	url: string;
}
```

**Use `Prisma.GetPayload` for accurate query shapes**:

```typescript
// ✅ GOOD: Accounts for select/include modifiers
export type AsteroidRow = Prisma.AsteroidGetPayload<{}>;

// ✅ GOOD: Honest typing with Pick<>
export async function getRecentApodHistory(limit = 30) {
	const result = await db.apodSnapshot.findMany({
		orderBy: { date: 'desc' },
		take: limit,
		select: { date: true, title: true, url: true },
	});
	return result as Promise<Pick<ApodSnapshotRow, 'date' | 'title' | 'url'>[]>;
}

// ❌ BAD: Lies to TypeScript
const result = await db.apodSnapshot.findMany({ select: { date: true } });
const typed: ApodSnapshotRow[] = result as ApodSnapshotRow[];
```

**Never use `any`**. Use `unknown` and narrow it:

```typescript
// ✅ GOOD
function handle(value: unknown) {
	if (typeof value === 'string') {
		console.log(value.toUpperCase());
	}
}

// ❌ BAD
function handle(value: any) {
	console.log(value.toUpperCase()); // Unsafe
}
```

### Server vs Client Components

**Server Components are the default** (no `'use client'` directive needed):

```typescript
// ✅ GOOD: Server Component (default in App Router)
// src/components/ApodCard.tsx
export default async function ApodCard({ date }: Props) {
  const apod = await getApodByDate(date) // DB query OK
  return <article>...</article>
}

// ✅ GOOD: Client Component (explicit)
// src/components/AsteroidTable.tsx
'use client'
export default function AsteroidTable({ initialAsteroids }: Props) {
  const [showHazardous, setShowHazardous] = useState(false) // useState OK
  return <table>...</table>
}

// ❌ BAD: Never expose secrets in 'use client' files
'use client'
const key = process.env.NASA_API_KEY // Next.js errors at build time
```

### Data Fetching Patterns

**Fetch at the top, pass down as props**:

```typescript
// ✅ GOOD: Concurrent fetches at page level
export default async function DashboardPage() {
  const [asteroids, syncStatus] = await Promise.all([
    getAsteroidsByDateRange(today, nextWeek),
    getLastSyncStatus(),
  ])
  // Total time: ~30ms (concurrent)
  return <Dashboard asteroids={asteroids} syncStatus={syncStatus} />
}

// ❌ BAD: Sequential awaits
const asteroids = await getAsteroidsByDateRange(today, nextWeek) // 30ms
const syncStatus = await getLastSyncStatus() // 20ms
// Total time: ~50ms (sequential waterfall)
```

**Use React `cache()` for deduplication within render**:

```typescript
// ✅ GOOD: Deduplicates within single render pass
export const getApodByDate = cache(async (date: string) =>
	db.apodSnapshot.findUnique({ where: { date } }),
);

// If ApodCard and page title both call getApodByDate("2025-04-14"),
// the DB is only hit once per render
```

### Validation at API Boundaries

**Always validate external data with Zod**:

```typescript
// ✅ GOOD: Runtime validation before use
async function nasaFetch<T>(
	path: string,
	schema: { parse: (data: unknown) => T },
): Promise<T> {
	const res = await fetch(`${BASE}${path}?api_key=${key}`);
	if (!res.ok) throw new Error(`NASA API ${res.status}`);

	const json = await res.json();
	return schema.parse(json); // Zod validates + transforms
}

// ✅ GOOD: Transform during parsing
const CloseApproachSchema = z.object({
	relative_velocity: z.object({
		kilometers_per_hour: z.string().transform(Number), // String → Number at parse time
	}),
});
```

### Caching Strategy (3 Layers)

```typescript
// Layer 1: Next.js fetch cache (edge, 1-hour TTL)
const res = await fetch(url, { next: { revalidate: 3600 } });

// Layer 2: PostgreSQL (primary cache, always query DB first)
export async function GET(req: NextRequest) {
	const cached = await db.apodSnapshot.findUnique({ where: { date } });
	if (cached)
		return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });

	// If miss, fetch and persist
	const apod = await fetchApod(date);
	await db.apodSnapshot.upsert({
		where: { date },
		create: { ...apod },
		update: {}, // Idempotent no-op
	});
	return NextResponse.json(apod, { headers: { 'X-Cache': 'MISS' } });
}

// Layer 3: React cache() (deduplicates within render)
export const getApodByDate = cache(async (date: string) => {
	return db.apodSnapshot.findUnique({ where: { date } });
});
```

### Idempotent Upserts

```typescript
// ✅ GOOD: Empty update block is intentional (insert-if-not-exists)
await db.apodSnapshot.upsert({
  where:  { date },
  create: { date, title, explanation, ... },
  update: {}, // ← No-op on conflict
})
```

---

## Testing Instructions

### Manual Integration Testing

#### APOD Endpoint

```bash
# Test today's APOD (should hit DB if pre-synced)
curl http://localhost:3000/api/apod
# Response: { date, title, explanation, url, mediaType, ... }
# Header: X-Cache: HIT (from DB) or MISS (from NASA)

# Test specific date
curl "http://localhost:3000/api/apod?date=2025-04-14"

# Test invalid format
curl "http://localhost:3000/api/apod?date=invalid"
# Response: 400 { error: "Invalid date format. Use YYYY-MM-DD" }
```

#### Asteroids Endpoint

```bash
# Default range (today + 7 days)
curl http://localhost:3000/api/asteroids
# Response: { asteroids: [...], source: "db" | "api" }

# Custom date range
curl "http://localhost:3000/api/asteroids?start=2025-04-14&end=2025-04-21"
```

#### Cron Sync Job

```bash
# Test locally with correct auth
curl -X POST http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret"
# Response: { synced: { apod: {...}, asteroids: {...} }, totalMs: 1234 }

# Test without auth (should fail)
curl -X POST http://localhost:3000/api/cron/sync
# Response: 401 { error: "Unauthorized" }
```

### UI Testing (Manual)

**APOD Card**

- [ ] Renders without loading spinner (SSR)
- [ ] Image displays correctly
- [ ] Falls back to video iframe if `mediaType === 'video'`
- [ ] Copyright shown if available
- [ ] Date displayed correctly

**Asteroid Table**

- [ ] Initial data loads from props (no API call from browser)
- [ ] Filter "hazardous only" works
- [ ] Sort by clicking column headers
- [ ] Pagination (prev/next buttons)
- [ ] Correctly formatted numbers (locale-specific)

**Error Handling**

- [ ] Disconnect NASA API key → error message appears
- [ ] DB connection fails → error boundary renders
- [ ] "Try again" button resets component

### Database Validation

```bash
# Check Prisma schema syntax
npx prisma validate

# View migration history
npx prisma migrate status

# Inspect last sync logs
npx prisma db execute --stdin <<EOF
SELECT * FROM sync_log ORDER BY ran_at DESC LIMIT 5;
EOF

# Count asteroids
npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM asteroids;
EOF

# Verify today's APOD cached
npx prisma db execute --stdin <<EOF
SELECT date, title FROM apod_snapshots WHERE date = CURRENT_DATE;
EOF
```

### Performance Testing

```bash
# Measure page load time
curl -w "DNS: %{time_namelookup}s | Connect: %{time_connect}s | Total: %{time_total}s\n" \
  -o /dev/null -s http://localhost:3000

# Profile with Chrome DevTools
# 1. Open http://localhost:3000
# 2. DevTools → Performance → Record
# 3. Look for LCP (Largest Contentful Paint) < 2.5s
```

---

## Security Considerations

### API Key Management

**Never expose NASA_API_KEY to the browser**:

```typescript
// ✅ SECURE: Only in Server Components / Route Handlers
export default async function ApodCard() {
	const apod = await fetchApod(date); // Server-side only
}

// ✅ SECURE: Environment variable, never hardcoded
// .env.local
NASA_API_KEY = sk_live_xxxxx;

// ❌ INSECURE: Exposed in 'use client' file (Next.js errors at build)
('use client');
const key = process.env.NASA_API_KEY;

// ❌ INSECURE: Hardcoded in code
const NASA_API_KEY = 'sk_live_xxxxx';
```

**Add to `.gitignore`**:

```
.env.local
.env.*.local
*.env
```

### Cron Job Protection

**Protect `/api/cron/sync` with bearer token**:

```typescript
// ✅ SECURE: Validate CRON_SECRET on every request
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Proceed with sync...
}

// ✅ GOOD: Generate strong token
$ openssl rand -hex 32
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

// ✅ GOOD: Vercel cron automatically sends token in Authorization header
```

**Monitor for failures**:

```typescript
// Log every sync attempt
await db.syncLog.create({
	data: {
		syncType: 'apod',
		status: 'success' | 'error',
		errorMessage: err ? String(err) : null,
		durationMs: Date.now() - start,
	},
});

// Alert if 3+ consecutive failures
```

### Rate Limiting & Quota Management

**NASA free tier: 1,000 requests/day**:

```typescript
// ✅ GOOD: Multi-layer cache prevents quota exhaustion
// Layer 1: Next.js fetch cache (revalidate: 3600) — 1 req/hour per edge region
// Layer 2: PostgreSQL — 1 req per date (historical archive)
// Layer 3: Cron pre-fetches before user traffic

// ✅ GOOD: Respect Retry-After header
if (res.status === 429) {
	const retryAfter = Number(res.headers.get('Retry-After') ?? 60);
	await new Promise((r) => setTimeout(r, retryAfter * 1000));
}
```

### Database Connection Security

**Connection pooling critical for serverless**:

```typescript
// ✅ SECURE: Prisma singleton (prevents connection leak on hot-reload)
const createPrismaClient = () =>
	new PrismaClient({
		log:
			process.env.NODE_ENV === 'development'
				? ['query', 'error', 'warn']
				: ['error'], // No query logs in prod
	});

declare global {
	var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
	globalThis.prisma = db;
}

// ✅ SECURE: DATABASE_URL in environment variable only
// .env.local
DATABASE_URL = 'postgresql://user:password@localhost:5432/spacedash';

// ✅ GOOD: Connection pooling for serverless (use Neon, Vercel Postgres, etc.)
DATABASE_URL = 'postgresql://user:password@pgbouncer-host:6432/spacedash';
```

### Error Response Security

**Don't leak sensitive information**:

```typescript
// ✅ GOOD: Generic error to client, detailed log server-side
try {
	return NextResponse.json(data);
} catch (err) {
	console.error('[APOD API]', err); // Full error in server logs only
	return NextResponse.json(
		{ error: 'Failed to fetch APOD data' },
		{ status: 502 },
	);
}

// ❌ BAD: Exposes implementation details
return NextResponse.json({ error: String(err) }, { status: 500 });
```

### Input Validation

**Validate all user inputs before processing**:

```typescript
// ✅ GOOD: Date format validation before API call
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
	return NextResponse.json(
		{ error: 'Invalid date format. Use YYYY-MM-DD' },
		{ status: 400 },
	);
}

// ✅ GOOD: Zod schema validation at boundaries
const parsed = AsteroidSchema.parse(nasaResponse);
```

### Secure Headers

```typescript
// next.config.ts
import { type NextConfig } from 'next';

const config: NextConfig = {
	headers: async () => [
		{
			source: '/:path*',
			headers: [
				{ key: 'X-Content-Type-Options', value: 'nosniff' },
				{ key: 'X-Frame-Options', value: 'DENY' },
				{ key: 'X-XSS-Protection', value: '1; mode=block' },
				{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
			],
		},
	],
};

export default config;
```

### Production Deployment Checklist

- [ ] `NASA_API_KEY` in Vercel environment variables (never in code)
- [ ] `CRON_SECRET` ≥ 32 random bytes (`openssl rand -hex 32`)
- [ ] `DATABASE_URL` uses strong password (generated by Neon/Supabase)
- [ ] Migrations run via `prisma migrate deploy` (not `dev`) in CI/CD
- [ ] Error logs sanitized (no stack traces to clients)
- [ ] HTTPS enforced (Vercel default)
- [ ] Cron failure monitoring configured
- [ ] SyncLog alerts set up (consecutive failures)
- [ ] NASA API rate limits respected (1-hour TTL on fetches)
- [ ] No secrets in `vercel.json`, `.next/`, or `package.json`
- [ ] No `DEMO_KEY` references in any environment

---

## Additional Resources

- [NASA API Docs](https://api.nasa.gov) — Free registration, 1,000 req/day
- [Next.js App Router](https://nextjs.org/docs/app) — Server Components, Route Handlers
- [Prisma ORM](https://www.prisma.io/docs) — Database access layer
- [Zod Runtime Validation](https://zod.dev) — Schema validation
- [Vercel Cron](https://vercel.com/docs/cron-jobs) — Serverless cron jobs
- [React Server Components](https://react.dev/reference/react/use-server)

---

**Last Updated**: June 2, 2026
