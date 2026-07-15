# Testing Patterns

**Analysis Date:** 2026-04-21

## Test Framework

**Status:** Not configured

**Current State:**
- No testing framework found in `package.json`
- No test files detected in the codebase
- No linting or formatting tools configured (no ESLint, Prettier, or similar)

## Test File Organization

**Location:** Not applicable

**Current State:**
- No test directory exists
- No test files found with patterns: `*.test.js`, `*.spec.js`, `__tests__/*`

## Testing Patterns and Conventions

**Approach:** Not established

**What Would Be Recommended:**

1. **Test Location:**
   - Co-located: `utils/statistics.test.js`
   - Or separate: `tests/unit/`, `tests/integration/`

2. **Framework Options:**
   - Jest: `npm install --save-dev jest`
   - Mocha + Chai: `npm install --save-dev mocha chai`
   - Node.js built-in test runner (Node 20+)

3. **Suggested Package.json Scripts:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Test Coverage Approach

**Current:** None

**Recommended:**
- Aim for critical utility functions in `utils/statistics.js`
- Test statistics calculations, date/time functions, file operations
- Test route handlers for auth, validation, error responses

## How to Run Tests

**Current:** Not applicable - no tests exist

**Once Configured:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Testing Recommendations

**Priority Areas for Testing:**

1. **Statistics Utilities** (`utils/statistics.js`):
   - `getHongKongTime()` - timezone handling
   - `getHongKongDateString()` - date formatting
   - `recordVisit()` - file write operations
   - `getTodayStats()` - filtering logic
   - `getPageDailyTrend()` - aggregation logic
   - `getFilteredWeeklyStats()` - date range calculations
   - `getFilteredMonthlyStats()` - month calculations

2. **Authentication** (`routes/statistics.js`):
   - Login success/failure
   - Token validation
   - Logout behavior

3. **Routes** (`routes/index.js`):
   - Cookie setting
   - User ID generation

**Mocking Strategy:**
- Mock `fs` module for file operations
- Mock `cookie-parser` for cookie handling
- Use test database/file for statistics data

## Current Code Without Tests

**Files Needing Tests:**
- `utils/statistics.js` - Core business logic (663 lines)
- `routes/statistics.js` - API endpoints with auth
- `routes/index.js` - Route definitions
- `app.js` - Application setup

---

*Testing analysis: 2026-04-21*