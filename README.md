# VeriTix Backend

VeriTix Backend is the NestJS API for the VeriTix ticketing platform. It handles authentication, event publishing, ticket inventory, orders, blockchain payment flows, verification, and admin operations.

A new contributor should be able to clone the repo, configure PostgreSQL, run migrations, and start the API in under 15 minutes with the guide below.

## Overview

VeriTix is a ticketing platform built around secure event operations and Stellar-based payment flows. The backend is responsible for user accounts, event and ticket lifecycle management, waitlists, payment instructions, webhook processing, and operational tooling for admins.

### Tech stack

- NestJS 11
- PostgreSQL 15+
- TypeORM
- Stellar SDK
- SendGrid

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 15 or newer
- A local database user with permission to create and migrate databases

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/Lead-Studios/veritix-backend.git
cd veritix-backend
npm install
```

### 2. Create the local database

Create a PostgreSQL database for development and, if you plan to run e2e tests, another one for tests.

```sql
CREATE DATABASE veritix;
CREATE DATABASE veritix_test;
```

### 3. Create your environment file

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Update the required values in `.env`, especially `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, and `REFRESH_TOKEN_SECRET`.

### 4. Run database migrations

```bash
npm run migration:run
```

### 5. Start the API

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`.

### 6. Open Swagger

Interactive API docs are available at `http://localhost:3000/api`.

## Environment Variables

| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | `development \| production \| test \| staging` | Optional | `development` | Controls runtime mode and a few conditional behaviors such as Swagger exposure. |
| `PORT` | `number` | Optional | `3000` | Port used by the NestJS HTTP server. |
| `ALLOWED_ORIGINS` | `string` | Optional | `http://localhost:3000` | Comma-separated list of origins allowed by CORS. |
| `DATABASE_URL` | `string` | Required | None | PostgreSQL connection string for the main application database. |
| `TEST_DATABASE_URL` | `string` | Optional | None | PostgreSQL connection string used by test workflows. |
| `ACCESS_TOKEN_SECRET` | `string` | Required | None | Secret used to sign access tokens. Must be at least 32 characters. |
| `REFRESH_TOKEN_SECRET` | `string` | Required | None | Secret used to sign refresh tokens. Must be at least 32 characters. |
| `ACCESS_TOKEN_EXPIRATION` | `string` | Optional | `15m` | Access token lifetime passed to JWT signing. |
| `REFRESH_TOKEN_EXPIRATION` | `string` | Optional | `7d` | Refresh token lifetime passed to JWT signing. |
| `ORDER_EXPIRY_MINUTES` | `number` | Optional | `15` | Number of minutes before a pending order expires. |
| `STELLAR_NETWORK` | `testnet \| mainnet` | Optional | `testnet` | Selects the Horizon endpoint and Stellar network passphrase. |
| `STELLAR_RECEIVING_ADDRESS` | `string` | Optional | None | Wallet address buyers send payment to for Stellar-based orders. |
| `STELLAR_SECRET_KEY` | `string` | Optional | None | Secret key used for refund operations and other platform-signed Stellar transactions. |
| `STELLAR_WEBHOOK_SECRET` | `string` | Optional | None | Shared secret used to validate Stellar payment webhook signatures. |
| `SENDGRID_API_KEY` | `string` | Optional | None | Enables real email delivery through SendGrid when present. |
| `SENDGRID_FROM_EMAIL` | `string` | Optional | `noreply@veritix.com` | Default sender address for outgoing emails. |
| `GOOGLE_CLIENT_ID` | `string` | Optional | None | OAuth client ID for Google social login. |
| `GOOGLE_CLIENT_SECRET` | `string` | Optional | None | OAuth client secret for Google social login. |
| `GITHUB_CLIENT_ID` | `string` | Optional | None | OAuth client ID for GitHub social login. |
| `GITHUB_CLIENT_SECRET` | `string` | Optional | None | OAuth client secret for GitHub social login. |
| `OAUTH_CALLBACK_BASE_URL` | `string (URL)` | Optional | None | Base URL used to build Google and GitHub OAuth callback URLs, for example `http://localhost:3000`. |
| `STORAGE_PROVIDER` | `local \| s3` | Optional | `local` | Chooses whether uploads are stored on the local filesystem or in S3. |
| `S3_BUCKET` | `string` | Optional | None | S3 bucket name for uploaded assets when `STORAGE_PROVIDER=s3`. |
| `S3_REGION` | `string` | Optional | None | AWS region for the configured S3 bucket. |
| `S3_ACCESS_KEY_ID` | `string` | Optional | None | Access key used to authenticate S3 uploads. |
| `S3_SECRET_ACCESS_KEY` | `string` | Optional | None | Secret key used to authenticate S3 uploads. |

## Database Migrations

Run all pending migrations:

```bash
npm run migration:run
```

Generate a new migration:

```bash
npm run migration:generate -- src/migrations/YourMigrationName
```

Revert the last migration:

```bash
npm run migration:revert
```

## API Docs

Swagger is served locally at `http://localhost:3000/api` when the app is not running in production.

## Tests

Run the main automated checks with:

```bash
npm test
npm run test:e2e
npm run test:cov
```

## Module Overview

- `admin/`: Admin-only operations for moderation, refunds, analytics, and audit trails.
- `auth/`: Registration, password recovery, JWT auth, avatar upload, and OAuth login flows.
- `common/`: Shared guards, decorators, middleware, filters, interceptors, storage, validators, and email helpers.
- `config/`: Environment schema and configuration validation.
- `events/`: Event creation, lifecycle management, publication rules, and waitlist handling.
- `health/`: Basic health check endpoints for uptime monitoring.
- `orders/`: Checkout, payment instructions, order expiry, reservation, and retry-payment flows.
- `stellar/`: Stellar network integration, webhook handling, and payment confirmation processing.
- `ticket-types/`: Ticket type catalog management, capacity tracking, and reservation helpers.
- `tickets/`: Ticket issuance, status tracking, transfers, and verification data.
- `users/`: User entity management and user-facing domain data.
- `verification/`: Ticket verification workflows and related API endpoints.

## Contributing

### Branch naming

Use one of these prefixes for feature branches:

- `feat/`
- `fix/`
- `test/`
- `perf/`

Examples:

- `feat/retry-payment`
- `fix/swagger-csp`
- `test/orders-service`

### Commit format

Use a conventional-style commit message:

```text
type(scope): short summary
```

Examples:

- `feat(auth): add google and github oauth login`
- `docs(readme): complete contributor setup guide`

### Pull request checklist

- Confirm the branch name follows the expected prefix.
- Explain the user-facing or operational change.
- Link the relevant issue.
- Include screenshots or request/response examples when API behavior changes.
- Run the relevant tests locally.
- Add or update migrations when schema changes are included.
- Update docs and `.env.example` when configuration changes.

## Useful Commands

```bash
npm run start:dev
npm run build
npm run migration:run
npm test
npm run test:e2e
npm run test:cov
```
