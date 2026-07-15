# External Integrations

**Analysis Date:** 2026-04-21

## APIs & External Services

**External APIs:**
- None detected - this is a self-contained application

## Data Storage

**File-Based Storage:**
- Local JSON files in `data/` directory
  - `coupon-statistics.json` - Visit records (userId, pagePath, time)
  - `daily-statistics.json` - Aggregated daily statistics
- Location: `data/` directory (not committed to git per `.gitignore`)
- Client: Native Node.js `fs` module

**No External Database:**
- No MySQL, PostgreSQL, MongoDB, or other database systems
- All data persisted in JSON format

## Authentication & Identity

**Custom Cookie-Based Authentication:**
- User identification via `coupon_user_id` cookie
  - Generated using `uuid` v4
  - Stored in HTTP-only cookie (365 day expiry)
  - Used for visit tracking across pages

**Statistics Admin Auth:**
- Custom token-based authentication for statistics dashboard
  - Credentials: `STATS_USERNAME` and `STATS_PASSWORD` env vars
  - Default credentials hardcoded in `routes/statistics.js` (NOT recommended for production)
  - Auth token stored in `stats_token` cookie (base64 encoded)
  - Token format: `{username}|{password}|{expiry_timestamp}`

**Important Security Note:**
The statistics authentication uses a simple base64-encoded credential token stored in cookies. This is a non-standard approach that should be replaced with proper session management or JWT implementation for production use.

## Third-Party SDKs/Libraries

**No External SDKs:**
- No Stripe, Supabase, AWS, or other service integrations
- No payment gateways
- No cloud storage services

## Environment Variables & Secrets

**Required environment variables:**
- `PORT` - Server port (optional, default: 80)
- `NODE_ENV` - Environment mode (development/production)
- `PUBLIC_URL` - Production URL base (required in production mode)
- `STATS_USERNAME` - Statistics dashboard username
- `STATS_PASSWORD` - Statistics dashboard password

**Configuration approach:**
- Loaded via `dotenv` package in `app.js`
- `.env` file at project root (gitignored)
- Example configuration:

```
# Server
PORT=80
NODE_ENV=development

# Production URL (used when NODE_ENV=production)
PUBLIC_URL=https://your-domain.com

# Statistics Dashboard Credentials
STATS_USERNAME=admin
STATS_PASSWORD=your_password
```

## Monitoring & Observability

**Error Tracking:**
- None - uses console.log for logging

**Logs:**
- Console output via `console.log`
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Self-hosted (not deployed to cloud platforms)

**CI Pipeline:**
- None detected - no GitHub Actions, GitLab CI, or other CI/CD

**Deployment approach:**
- Standard Node.js deployment
- Run `npm start` for production
- Can be reverse-proxied behind NGINX

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-04-21*