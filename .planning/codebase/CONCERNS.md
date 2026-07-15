# Codebase Concerns

**Analysis Date:** 2026-04-21

## Tech Debt

**Statistics Module:**
- Issue: Monolithic `utils/statistics.js` with 663 lines, mixing data access, cron scheduling, and statistical calculations
- Files: `utils/statistics.js`
- Impact: Difficult to test individual functions, maintainability degrades as the file grows
- Fix approach: Split into smaller modules (data access layer, statistics computation, cron scheduler)

**No Input Validation:**
- Issue: Login endpoint accepts any input without sanitization or validation
- Files: `routes/statistics.js` lines 24-44
- Impact: Potential injection attacks, unexpected behavior with malformed input
- Fix approach: Add input validation middleware (e.g., `express-validator`)

**Inconsistent Module Structure:**
- Issue: Functions defined after `module.exports` in `utils/statistics.js` (lines 390-663 defined after export)
- Files: `utils/statistics.js`
- Impact: Code is harder to follow, potential circular dependency issues
- Fix approach: Move all function definitions before `module.exports`

**Duplicate Date Calculations:**
- Issue: Hong Kong time calculation duplicated across multiple functions
- Files: `utils/statistics.js`
- Impact: Code duplication, inconsistent behavior if calculation changes
- Fix approach: Extract to a shared utility function with cached reference

## Security Concerns

**Base64-Encoded Cookie Credentials:**
- Issue: Stats authentication stores username and password in base64-encoded cookie without proper hashing
- Files: `routes/statistics.js` lines 13-17, 36-41
- Impact: Credentials visible to anyone with access to cookies, not secure against tampering
- Fix approach: Use proper session management (e.g., `express-session`) with server-side storage

**Hardcoded Default Credentials:**
- Issue: Default statistics password `28345013` is hardcoded as fallback
- Files: `routes/statistics.js` line 7
- Impact: Anyone can access statistics with default credentials if env vars not set
- Fix approach: Fail fast if credentials not configured, never use defaults in production

**No Rate Limiting:**
- Issue: Login endpoint `/api/stats/login` has no rate limiting
- Files: `routes/statistics.js`
- Impact: Brute force attacks possible
- Fix approach: Add `express-rate-limit` middleware

**No Security Headers:**
- Issue: No security headers (helmet, CSP, etc.) configured
- Files: `app.js`
- Impact: Missing protection against XSS, clickjacking, etc.
- Fix approach: Add `helmet` middleware

**No HTTPS Enforcement:**
- Issue: No redirect from HTTP to HTTPS
- Files: `app.js`
- Impact: Traffic can be intercepted
- Fix approach: Add HTTPS redirect middleware or configure at proxy level

**Cookie Configuration:**
- Issue: Cookies don't set `secure` flag for production
- Files: `routes/statistics.js` lines 37-41, `routes/index.js` lines 22-25
- Impact: Cookies sent over insecure connections in production
- Fix approach: Set `secure: true` when `NODE_ENV === 'production'`

**Sensitive Data in Logs:**
- Issue: Login credentials logged to console
- Files: `routes/statistics.js` lines 25, 31-32
- Impact: Passwords visible in server logs
- Fix approach: Remove credential logging, log only username or success/failure

## Performance Bottlenecks

**Single JSON File Storage:**
- Issue: All visit statistics stored in one JSON file, entire file read on every operation
- Files: `data/coupon-statistics.json`, `utils/statistics.js` lines 35-43
- Impact: Linear performance degradation as file grows; O(n) reads for every request
- Fix approach: Migrate to a proper database (MySQL, PostgreSQL), use indexing

**In-Memory Set Operations:**
- Issue: `getPageStats()` creates Sets for all records, memory grows unbounded
- Files: `utils/statistics.js` lines 172-194
- Impact: Memory exhaustion with large datasets
- Fix approach: Use database aggregation queries, not in-memory processing

**No Write Caching:**
- Issue: Statistics written to file on every visit
- Files: `utils/statistics.js` lines 45-48
- Impact: Slow writes, potential file corruption from concurrent access
- Fix approach: Batch writes, use a queue, or database transactions

## Known Bugs

**No Critical Bugs Detected**
- The codebase appears functionally sound for its current scope

## Scaling Limits

**File-Based Storage:**
- Current capacity: Limited to available disk space
- Limit: Single JSON file becomes read/write bottleneck after ~100K records
- Scaling path: Migrate to MySQL or PostgreSQL with proper indexing

**In-Memory Aggregation:**
- Current capacity: All aggregation happens in memory
- Limit: Server memory exhaustion with large datasets
- Scaling path: Use database aggregation queries (COUNT, GROUP BY)

**No Concurrent Write Handling:**
- Current capacity: `fs.writeFileSync` used without locking
- Limit: Data corruption risk under concurrent access
- Scaling path: Use database with transaction support

## Code Quality Issues

**No Testing:**
- Issue: Zero test files in the codebase
- Files: Project-wide
- Impact: No regression protection, refactoring risk
- Fix approach: Add Jest or Mocha with basic unit tests

**No Linting/Formatting:**
- Issue: No ESLint or Prettier configuration
- Files: Project-wide
- Impact: Inconsistent code style, potential errors
- Fix approach: Add `.eslintrc.json` and `.prettierrc`

**No TypeScript:**
- Issue: Pure JavaScript with no type safety
- Impact: Runtime errors from typos and type mismatches
- Fix approach: Consider migration to TypeScript

**Large Functions:**
- Issue: Statistics computation functions handle too many responsibilities
- Files: `utils/statistics.js` lines 102-140, 556-613
- Impact: Hard to test, understand, and modify
- Fix approach: Extract pure calculation functions with clear inputs/outputs

## Missing Documentation

**No Project README:**
- Missing: Quick start guide, installation instructions
- Fix approach: Create `README.md` with setup and deployment instructions

**No API Documentation:**
- Missing: Endpoint documentation for statistics API
- Fix approach: Add `API.md` or OpenAPI spec

**No Inline Comments:**
- Missing: JSDoc comments on functions
- Files: All source files
- Fix approach: Add JSDoc comments especially for public functions

**No Environment Documentation:**
- Missing: `.env.example` file documenting required variables
- Fix approach: Create `.env.example` from current `.env` structure

---

*Concerns audit: 2026-04-21*