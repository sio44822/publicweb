# Coding Conventions

**Analysis Date:** 2026-04-21

## Naming Patterns

**Files:**
- JavaScript: camelCase (e.g., `statistics.js`, `app.js`)
- Routes: camelCase matching resource (e.g., `routes/index.js`, `routes/statistics.js`)
- Views: lowercase with extension (e.g., `statistics.ejs`, `coupon.ejs`)

**Functions:**
- camelCase: `recordVisit()`, `getStatistics()`, `getUserTrend()`
- Descriptive verb prefixes: `get*`, `record*`, `generate*`, `start*`, `getFiltered*`
- Helper functions: lowercase with action verbs like `ensureDataDir()`, `getHongKongTime()`

**Variables:**
- camelCase: `userId`, `pagePath`, `hkDate`
- Constants (environment-derived): UPPER_SCREAMING_CASE (e.g., `STATS_USERNAME`, `PORT`, `DATA_DIR`)
- Loop variables: single letters or descriptive (e.g., `i`, `days`, `page`)

**Types:**
- Not explicitly typed (Plain JavaScript)
- Objects returned from functions follow property naming: camelCase

## Code Style

**Formatting:**
- No automatic formatter configured (no Prettier)
- No ESLint configuration found
- Manual indentation: 2 spaces
- Semicolons: Used consistently

**Structure:**
```javascript
// 1. Require external modules
const express = require('express');
const path = require('path');

// 2. Require internal modules
const statistics = require('../utils/statistics');
const routes = require('./routes');

// 3. Constants
const STATS_USERNAME = process.env.STATS_USERNAME || 'default';

// 4. Middleware/helper functions
function checkStatsAuth(req, res, next) { }

// 5. Route definitions
router.get('/path', handler);

// 6. Module exports
module.exports = router;
```

**Line Length:** No enforced limit (manual management)

**Braces:** Single-line bodies for simple conditionals, braces for blocks

## Import Organization

**Order:**
1. Node.js built-in modules (`express`, `path`, `fs`, `cron`)
2. External npm packages (`cookie-parser`, `ejs`, `dotenv`, `uuid`)
3. Internal modules (`../utils/statistics`, `./routes`)

**Pattern:**
```javascript
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const statistics = require('../utils/statistics');
```

**Path Aliases:** Not used - relative paths only (`../`, `./`)

## Error Handling

**Patterns:**

1. **Route-level validation:**
```javascript
if (!username || !password) {
  return res.status(400).json({ error: 'Missing credentials' });
}
```

2. **Authentication checks:**
```javascript
if (statsToken) {
  try {
    const decoded = Buffer.from(statsToken, 'base64').toString('utf8');
    // ...
  } catch (e) {}
}
return res.status(401).json({ error: 'Authentication required' });
```

3. **Missing query parameters:**
```javascript
if (!year || !week) {
  return res.status(400).json({ error: 'year and week required' });
}
```

4. **File existence checks:**
```javascript
if (!fs.existsSync(STATISTICS_FILE)) {
  return [];
}
```

**Status Codes Used:**
- `200` - Success (implicit)
- `400` - Bad request / missing parameters
- `401` - Unauthorized / authentication failed

## Logging

**Framework:** console.log

**Patterns:**
- Development-mode logging in `app.js`
- API request logging with brackets: `console.log('[login] headers:', req.headers);`
- Cron job logging: `console.log('[Statistics] Running daily statistics...');`
- Cookie and body logging for debugging

**Logging in Statistics Module:**
```javascript
console.log(`[Statistics] Daily stats generated for ${hkDate}: ${uniqueUsers.size} users, ${todayRecords.length} visits`);
```

## Comments

**When to Comment:**
- No JSDoc comments found in codebase
- Minimal inline comments
- Focus is on self-explanatory code with descriptive names

**Current Approach:**
- Function names are descriptive enough
- No formal documentation blocks

**Recommendation:** Add JSDoc for:
- Exported functions in `utils/statistics.js`
- Route handlers in `routes/*.js`
- Authentication middleware

## Function Design

**Size:** Medium - functions handle single responsibility but can be long (663 lines in `utils/statistics.js`)

**Parameters:**
- Direct parameters: `page`, `days`, `date`, `year`, `month`
- Default values: `days = 7`, `hours = 24`

**Return Values:**
- Objects: `{ date, userCount, visitCount }`
- Arrays: `[{ date, users, visits }]`
- Empty fallbacks: `[]`, `{}`

## Module Design

**Exports:**
- CommonJS: `module.exports = { ... }`
- Named exports for all public functions in `utils/statistics.js`
- Single router export in route files

**Barrel Files:** Not used

**Directory Structure:**
```
project/
├── app.js              # Entry point
├── routes/
│   ├── index.js        # Main routes
│   └── statistics.js   # Statistics API routes
├── utils/
│   └── statistics.js   # Statistics utilities
├── views/              # EJS templates
└── public/             # Static files
```

## Security Patterns

**Authentication:**
- Token stored in httpOnly cookie
- Base64 encoded token: `username|password|expiry`
- Session expiry check: `parseInt(expiry) > Date.now()`

**Input Handling:**
- Express middleware: `express.json()`, `express.urlencoded()`
- Parameter validation in routes

---

*Convention analysis: 2026-04-21*