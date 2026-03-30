# Meridian

Stablecoin business accounts and payment infrastructure on Base. Hold USDC, send payments, track balances, get statements — built with NestJS, Temporal, Prisma, Alchemy, and viem.

## Documentation

- [API Reference](#api-reference)
- [Accounts](#accounts)
- [Payouts](#payouts)
- [Webhook Events](#webhook-events)
- [Error Handling](#error-handling)

## Requirements

- Node.js 20+
- pnpm
- Docker

## Installation

```bash
git clone <repo-url>
cd meridian
pnpm install
```

## Configuration

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API server port (default: 3000) |
| `TEMPORAL_ADDRESS` | Temporal server address |
| `ALCHEMY_API_KEY` | Alchemy API key for Base |
| `ALCHEMY_SIGNING_KEY` | Alchemy webhook signing secret |
| `ALCHEMY_WEBHOOK_ID` | Alchemy address-activity webhook ID |
| `TREASURY_PRIVATE_KEY` | Private key for the treasury wallet (signs USDC transfers) |

## Usage

```bash
docker compose up -d
pnpm exec prisma generate
pnpm exec prisma migrate dev
```

```bash
pnpm run start:dev    # API server
pnpm run worker       # Temporal workflow worker
```

Seed a test merchant:

```bash
npx ts-node prisma/seed.ts
```

## API Reference

### Authentication

```
Authorization: Bearer sk_...
```

### Accounts

#### Create an account

```
POST /v1/accounts
```

```json
{ "object": "account", "id": "...", "deposit_address": "0x...", "chain": "base", "balance": "0.00" }
```

Deposit USDC to the `deposit_address` on Base to fund the account.

#### Get balance

```
GET /v1/accounts/balance
```

```json
{ "object": "balance", "available": "12450.00", "currency": "USDC", "chain": "base" }
```

### Payouts

#### Create a payout

```
POST /v1/payouts
Idempotency-Key: unique-key-123
```

```json
{
  "amount": "100.00",
  "currency": "USDC",
  "network": "base",
  "recipient": { "type": "wallet", "address": "0x..." }
}
```

#### Retrieve a payout

```
GET /v1/payouts/{id}
```

#### List payouts

```
GET /v1/payouts?limit=10&starting_after={id}&status=delivered
```

### Webhook Endpoints

#### Register

```
POST /v1/webhook-endpoints
```

```json
{ "url": "https://..." }
```

Returns `{ id, url, secret }` — secret shown only once.

#### List

```
GET /v1/webhook-endpoints
```

### Ledger

```
GET /v1/ledger?payout_id={id}
```

## Payout Lifecycle

```
PENDING → ROUTING → DELIVERED
                  → FAILED
```

| Transition | Ledger |
|---|---|
| Routing started | merchant_balance → routing_pool |
| Delivered | routing_pool → settlement |
| Failed | routing_pool → merchant_balance |

## Webhook Events

Signed with HMAC-SHA256: `Webhook-Signature: t={ts},v1={sig}`

| Event | When |
|---|---|
| `deposit.received` | USDC deposited to merchant account |
| `payout.created` | Payout created, routing started |
| `payout.routing` | USDC transfer in progress |
| `payout.delivered` | Funds confirmed at recipient |
| `payout.failed` | Routing failed |

## Error Handling

```json
{ "error": { "category": "invalid_request_error", "code": "bad_request", "message": "..." } }
```

Categories: `api_error`, `authentication_error`, `idempotency_error`, `invalid_request_error`, `rate_limit_error`

## Architecture

| Component | Technology |
|---|---|
| API | NestJS 11, TypeScript 5.9 (strict) |
| Database | PostgreSQL 16, Prisma v7 |
| Workflows | Temporal |
| On-chain | Base via Alchemy + viem |
| Validation | Zod 4 |
| Testing | Jest |

## Development

```bash
pnpm test              # unit tests
pnpm run start:dev     # API with hot reload
pnpm run worker        # Temporal worker
pnpm run demo <key>    # end-to-end demo
pnpm run db:up         # start containers
pnpm run db:down       # stop containers
```

## License

UNLICENSED
