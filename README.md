# VeriTix Backend

VeriTix is an event ticketing and verification platform focused on secure issuance, purchase flows, verification at entry, and blockchain-ready auditability. This repository contains the NestJS backend API that powers authentication, events, ticket inventory, order processing, admin operations, contact workflows, and ticket verification.

## Tech Stack

- NestJS 11
- PostgreSQL 15+
- TypeORM 0.3
- Stellar SDK
- SendGrid
- Swagger / OpenAPI
- Jest + Supertest

## Project Overview

The backend exposes REST APIs for user registration and login, event creation and lifecycle management, ticket inventory, order management, verification at check-in, admin user operations, contact submissions, and blockchain integration scaffolding. PostgreSQL is the system of record, TypeORM manages entities and migrations, and the Stellar integration is used for payment and verification-related platform workflows.

## Prerequisites

Install the following before you start:

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 15 or newer
- GitHub CLI (`gh`)

Recommended local checks:

```bash
node -v
npm -v
gh --version
psql --version
```

## Local Setup

1. Clone the repository.

```bash
git clone <repo-url>
cd veritix-backend
```

2. Install dependencies.

```bash
npm install
```

3. Create your local environment file.

```bash
cp .env.example .env
```

4. Update `.env` with your PostgreSQL credentials, JWT secrets, and any Stellar settings you need.

5. Run database migrations.

```bash
npm run migration:run
```

6. Start the API in watch mode.

```bash
npm run start:dev
```

7. Open the Swagger docs.

```text
http://localhost:3000/api
```

## Environment Variables

The table below combines the variables defined in `src/config/app.config.ts`, `src/config/database-config.ts`, other config readers in the codebase, and `.env.example`.

| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `PORT` | number | Optional | `3000` | Port used by the Nest application in local and deployed environments. |
| `APP_NAME` | string | Optional | none | Friendly application name exposed through app config. |
| `DATABASE_HOST` | string | Yes | none | PostgreSQL host name or IP address. |
| `DATABASE_PORT` | number | Yes | `5432` | PostgreSQL port. |
| `DATABASE_USER` | string | Yes | none | PostgreSQL username. |
| `DATABASE_PASSWORD` | string | Yes | none | PostgreSQL password. |
| `DATABASE_NAME` | string | Yes | `veritix_db` | PostgreSQL database name. |
| `DATABASE_SSL` | boolean | Optional | `false` | Enables SSL for the database connection when set to `true`. |
| `ACCESS_TOKEN_SECRET` | string | Yes | none | Secret used to sign access tokens. |
| `REFRESH_TOKEN_SECRET` | string | Yes | none | Secret used to sign refresh tokens. |
| `ACCESS_TOKEN_EXPIRATION` | string | Optional | `1h` | Access token TTL read by `JwtHelper`. Example: `15m`, `1h`. |
| `REFRESH_TOKEN_EXPIRATION` | string | Optional | `7d` | Refresh token TTL read by `JwtHelper`. Example: `7d`, `30d`. |
| `STELLAR_NETWORK` | string | Optional | `testnet` | Target Stellar network. Supported values in config validation: `testnet`, `mainnet`. |
| `STELLAR_RECEIVING_ADDRESS` | string | Optional | none | Primary Stellar receiving address for platform payments. |
| `STELLAR_PLATFORM_ADDRESS` | string | Optional | falls back to `STELLAR_RECEIVING_ADDRESS` | Alias used by the payment listener and Stellar module. |
| `STELLAR_SECRET_KEY` | string | Optional | none | Platform Stellar secret key. Treat as sensitive and never commit it. |
| `ORDER_EXPIRY_MINUTES` | number | Optional | `15` | Lifetime of a pending order before it expires. |

## Example Environment File

The repository includes a starter file at [`.env.example`](/Users/buildafrica_1/Desktop/Drip-contribution/veritix-backend/.env.example). Copy it to `.env` and update the values for your machine.

## Database Migrations

Use the TypeORM migration scripts below:

```bash
# apply all pending migrations
npm run migration:run

# generate a new migration from entity changes
npm run migration:generate

# revert the most recent migration
npm run migration:revert
```

Notes:

- `migration:run` and `migration:revert` depend on `src/data-source.ts`.
- `migration:generate` writes a new file under `src/migrations/`.
- Run migrations after changing entities and before starting the app against a fresh database.

## API Docs

Swagger is mounted at:

```text
http://localhost:3000/api
```

The current bootstrap lives in [`src/main.ts`](/Users/buildafrica_1/Desktop/Drip-contribution/veritix-backend/src/main.ts).

## Available Scripts

```bash
# development
npm run start
npm run start:dev
npm run start:debug

# production
npm run build
npm run start:prod

# linting and formatting
npm run lint
npm run format

# database
npm run migration:run
npm run migration:generate
npm run migration:revert
```

## Running Tests

```bash
# unit tests
npm test

# end-to-end tests
npm run test:e2e

# coverage
npm run test:cov
```

## Module Overview

- `src/admin`: Admin-only API surface for managing users and other privileged operations such as role updates, suspension workflows, and administrative reporting.
- `src/auth`: Authentication and authorization domain containing registration, login, OTP verification, JWT handling, role guards, decorators, and the core `User` entity.
- `src/blockchain`: Shared blockchain abstraction layer that wraps provider-specific behavior and exposes enums, config, interfaces, and services used by ticketing and event modules.
- `src/common`: Cross-cutting utilities such as exception filters, interceptors, and shared helpers used across the application.
- `src/config`: Central configuration for app settings, database setup, pagination helpers, and email assets/templates.
- `src/contact`: Contact and support submission workflow, including DTOs, persistence models, and controller/service logic for inbound messages.
- `src/enums`: Shared enums that do not belong to a single bounded context, such as event status values used across the platform.
- `src/events`: Event lifecycle domain that manages event creation, updates, status transitions, validation rules, and event-related API responses.
- `src/migrations`: TypeORM migration history for schema creation and evolution, including event fields, Stellar payment support, and newer admin/user-management changes.
- `src/orders`: Purchase and order-processing domain that manages order entities, expiry configuration, scheduling, and order-related DTOs and endpoints.
- `src/stellar`: Stellar-specific integration layer for payment listening and Stellar network configuration, isolated from the rest of the backend behind a dedicated module.
- `src/test`: Repository-level domain and e2e tests that cover multi-module business flows beyond a single service or controller.
- `src/ticket-verification`: An additional ticket verification slice with its own controllers, services, DTOs, entities, and repositories for verification-specific workflows.
- `src/tickets-inventory`: Ticket inventory management for ticket types, QR code support, issuance state, and inventory-oriented services/controllers.
- `src/users`: User-facing profile and account APIs outside the auth module, including user DTOs, controller handlers, and service logic.
- `src/verification`: Verification endpoints, DTOs, logs, stats, and service logic for checking ticket validity, check-in flows, and verification history.

## Contributing

### Branch Naming

Use short, descriptive branch names with one of these prefixes:

- `feat/` for new features
- `fix/` for bug fixes
- `test/` for test-only work
- `perf/` for performance improvements
- `docs/` for documentation changes

Examples:

```text
feat/admin-user-management
fix/jwt-refresh-validation
test/verification-controller
docs/complete-readme
```

### Commit Message Format

Use conventional, scoped commit messages where possible:

```text
feat: add admin user suspension endpoints
fix: reject suspended users during refresh token exchange
docs: complete README setup and contributing guide
test: add verification controller e2e coverage
```

### Pull Request Checklist

Before opening a PR, make sure you have:

- rebased or merged the latest target branch
- added or updated tests for your change
- run `npm test` and `npm run test:e2e`
- run `npm run lint` and `npm run build`
- updated migrations if entity/schema changes were introduced
- updated `.env.example` if configuration changed
- updated the README or Swagger annotations when the API contract changed

### Workflow

1. Create a branch from the latest default branch.
2. Keep changes focused on a single concern.
3. Write or update tests alongside the implementation.
4. Open a PR with a clear summary, screenshots or API examples when relevant, and any migration or rollout notes.

## Troubleshooting

- If `npm run migration:run` fails with `ts-node: command not found`, run `npm install` first so local dev dependencies are installed.
- If `psql` is missing, install PostgreSQL client tools and make sure they are available on your shell `PATH`.
- If Swagger loads but endpoints are missing, confirm the relevant module is imported into `AppModule`.
- If JWT auth fails immediately on startup, confirm `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` are set.

## License

This repository is currently marked `UNLICENSED` in `package.json`.
