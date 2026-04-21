# Codebase Concerns

**Analysis Date:** 2026-04-21

## Security Concerns

### Hardcoded Credentials
- **Risk:** Default password hardcoded in source code
- **Files:** `routes/statistics.js` (line 7)
- **Impact:** Anyone with source code access can see admin credentials
- **Current mitigation:** None - password `28345013` is exposed in plaintext
- **Recommendations:** 
  - Use environment variables exclusively
  - Require `.env` to be populated before starting
  - Add password reset mechanism

### Insecure Token Storage
- **Risk:** Authentication tokens use base64 encoding (not encryption)
- **Files:** `routes/statistics.js` (lines 36, 13-15)
- **Current implementation:** Token = base64(`${username}|${password}|${expiry}`)
- **Impact:** Credentials can be decoded from cookie if intercepted
- **Recommendations:**
  - Use proper JWT or session-based authentication
  - Store only user ID in cookie, server-side session data

### Credential Logging
- **Risk:** Sensitive data logged to console
- **Files:** `routes/statistics.js` (lines 25, 26, 31, 32, 34)
- **Impact:** Passwords appear in server logs
- **Recommendations:** Remove all logging of credentials, body contents

### No HTTPS Enforcement
- **Risk:** Data transmitted in plaintext
- **Files:** `app.js`, `routes/index.js`
- **Current mitigation:** None
- **Recommendations:** Add redirect to HTTPS in production

### External Script URL Hardcoded
- **Risk:** Third-party Google Apps Script endpoint exposed
- **Files:** `views/1.ejs` (line 148)
- **Current implementation:** SCRIPT_URL directly in client-side code
- **Recommendations:** Move to server-side configuration, add validation

## Tech Debt

### File-Based Storage
- **Issue:** Statistics stored in JSON files instead of database
- **Files:** `utils/statistics.js` (lines 5-7)
- **Impact:** 
  - Concurrent writes cause race conditions
  - No ACID compliance
  - Difficult to query and aggregate
  - File I/O on every request degrades performance
- **Fix approach:** Migrate to MySQL (as per architecture pattern)

### Repeated File Reads
- **Issue:** `getStatistics()` reads entire JSON file on every call
- **Files:** `utils/statistics.js` (multiple functions)
- **Impact:** O(n) read for every statistics operation
- **Fix approach:** Cache in memory, invalidate on write

### No Input Validation
- **Issue:** API endpoints accept unvalidated query parameters
- **Files:** `routes/statistics.js` (lines 77, 84, 90, etc.)
- **Impact:** Potential for malformed data or injection
- **Fix approach:** Add request validation middleware

### No Rate Limiting
- **Issue:** No protection against abuse
- **Files:** `app.js`, `routes/statistics.js`
- **Impact:** Vulnerable to DoS attacks
- **Fix approach:** Add express-rate-limit

## Known Bugs

### Race Condition in Statistics Recording
- **Issue:** `recordVisit` reads then writes without locking
- **Files:** `utils/statistics.js` (lines 50-58)
- **Trigger:** Multiple concurrent visitors
- **Workaround:** Process requests sequentially (not scalable)

### Cookie Parsing Edge Case
- **Issue:** User ID created on every request if cookie malformed
- **Files:** `routes/index.js` (lines 18-28)
- **Trigger:** Corrupted cookie
- **Workaround:** Clear problematic cookies

## Code Quality Concerns

### Large Monolithic Files
- **Issue:** Single file exceeds 600 lines
- **Files:** `utils/statistics.js` (663 lines)
- **Impact:** Difficult to maintain, test, understand
- **Fix approach:** Split into modules (storage, analytics, reporting)

### Duplicate Code
- **Issue:** Similar date filtering logic repeated
- **Files:** `utils/statistics.js` (multiple functions)
- **Fix approach:** Extract common filtering to helper functions

### No Automated Tests
- **Issue:** Zero test files found
- **Files:** N/A
- **Impact:** No regression detection, risky refactoring
- **Fix approach:** Add Jest/Vitest with unit and integration tests

### Inconsistent Error Handling
- **Issue:** Some functions return empty, others throw
- **Files:** `utils/statistics.js` (lines 35-43, 165-170)
- **Fix approach:** Standardize error handling pattern

### No Type Safety
- **Issue:** Plain JavaScript, no TypeScript
- **Files:** Entire codebase
- **Impact:** Runtime errors, no IDE support
- **Fix approach:** Migrate to TypeScript

## Scalability Limits

### Concurrent Write Bottleneck
- **Current capacity:** Single JSON file, sequential writes
- **Limit:** ~10-50 concurrent writes before data loss
- **Scaling path:** Database with connection pooling

### Memory Usage
- **Current approach:** Load all statistics on each operation
- **Limit:** Linear growth with visitor count
- **Scaling path:** Database queries, pagination

### No Session Management
- **Current approach:** Cookie-based, stateless
- **Limit:** Cannot scale horizontally without sticky sessions
- **Scaling path:** Redis session store

## Dependencies at Risk

### Outdated EJS Version
- **Package:** ejs v5.0.2
- **Risk:** Version from 2019, known vulnerabilities
- **Impact:** Potential security issues
- **Migration plan:** Upgrade to ejs v3.x

### No Security Headers
- **Risk:** Missing X-Frame-Options, CSP, etc.
- **Files:** `app.js`
- **Recommendations:** Add helmet.js middleware

## Missing Critical Features

### No Logging Infrastructure
- **Problem:** Console.log only, no structured logging
- **Impact:** Difficult to debug production issues
- **Recommendation:** Add winston or pino

### No Health Check Endpoint
- **Problem:** No way to verify service is running
- **Recommendation:** Add `/health` endpoint

### No Request Tracing
- **Problem:** No correlation IDs for debugging
- **Recommendation:** Add request ID middleware

---

*Concerns audit: 2026-04-21*