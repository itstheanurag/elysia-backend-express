# Elysia Backend Template

A production-ready, type-safe backend template built with Elysia and Bun runtime.

## Tech Stack

| Technology | Description |
|------------|-------------|
| [Bun](https://bun.sh) | Fast all-in-one JavaScript runtime |
| [Elysia](https://elysiajs.com) | Ergonomic web framework for Bun |
| [Drizzle ORM](https://orm.drizzle.team) | Headless TypeScript ORM (PostgreSQL) |
| [Redis](https://redis.io) | In-memory data store for caching and rate limiting |
| [Pino](https://getpino.io) | High-performance async logger |
| [Scalar](https://scalar.com) | Modern OpenAPI documentation UI |

## Key Features

- **Repository Pattern** - Clean separation of data access logic (UserRepository, PasswordResetTokenRepository).
- **Distributed Rate Limiting** - Redis-backed rate limiting with global scoping and intelligent in-memory fallback.
- **Docker Live Reloading** - Development workflow with volume mounting and `bun --watch` for instant container updates.
- **Secure Auth** - JWT-based authentication with Argon2id hashing and password reset flow.
- **OpenAPI Documentation** - Auto-generated docs at `/docs` (Scalar or Swagger UI) with full route discovery.
- **Server Factory** - Composeable server architecture with built-in health checks (liveness/readiness).
- **Structured Errors** - Consistent JSON error responses without stack trace clutter (logged server-side only).
- **Redis Support** - Centralized Redis client for high-performance caching and state management.

## Project Structure

```
src/
├── index.ts                    # Entry point and Module Mounting
├── config/                     # Application configuration
│   ├── env.ts                  # Environment validation (Zod)
│   ├── app.config.ts           # Application settings
│   ├── config.type.ts          # Centralized Type Definitions
│   └── index.ts                # Config exports
├── core/                       # Core system components
│   ├── factories/              # Server and Documentation factories
│   ├── exceptions.ts           # HTTP exception classes
│   ├── logger.ts               # Pino logger utilities
│   ├── redis.ts                # Redis client and health checks
│   └── index.ts                # Core exports
├── db/                         # Database layer
│   ├── schema/                 # Drizzle schema definitions
│   ├── base.repository.ts      # Base repository class
│   ├── db.client.ts            # Drizzle client configuration
│   └── index.ts                # Database exports
├── plugins/                    # Server plugins
│   ├── cors.plugin.ts          # CORS configuration
│   ├── error.plugin.ts         # Global Error Handler
│   ├── health.plugin.ts        # System Health Probes
│   ├── logger.plugin.ts        # Request/Response Logging
│   ├── rate-limit.plugin.ts    # Advanced Rate Limiting
│   └── index.ts                # Plugin exports
└── modules/                    # Feature modules
    ├── auth/                   # Authentication logic
    ├── user/                   # User management
    └── example/                # Simplified CRUD Examples
```

## Quick Start (Docker)

The fastest way to get started with the full stack (App, Postgres, and Redis):

```bash
# 1. Start the stack with live reloading enabled
docker compose up -d

# 2. View logs
docker compose logs -f app
```

## Quick Start (Local)

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and REDIS_URL
```

### 3. Run Development Server

```bash
bun run dev
```

The server starts at <http://localhost:3000>.
Documentation is available at [/docs](http://localhost:3000/docs).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | - | PostgreSQL Connection String |
| `REDIS_URL` | - | Redis Connection String |
| `JWT_SECRET` | - | Signing secret for tokens |
| `LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |
| `DOCS_ENABLED` | `true` | Enable OpenAPI docs |
| `API_PREFIX` | `/api/v1` | API route prefix |

## Development Utilities

### Rate Limiting

Apply rate limits easily at the module or route level:

```typescript
import { apiRateLimit, authRateLimit } from "@plugins/rate-limit.plugin";

const app = new Elysia().use(apiRateLimit);
```

### Structured Logging

```typescript
import { logger } from "@core/logger";

logger.info({ userId: "123" }, "User logged in");
```

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server with watch mode |
| `bun run start` | Start production server |
| `bun run typecheck` | Run TypeScript type checking |
| `db:push` | Sync database schema with Drizzle |

## License

MIT
