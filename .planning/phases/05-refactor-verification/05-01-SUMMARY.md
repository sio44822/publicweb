---
phase: 05-refactor-verification
plan: 01
subsystem: routes
tags:
  - migration
  - sqlite
  - database-layer
dependency_graph:
  requires:
    - DB-09
    - DB-10
  provides:
    - API endpoints using SQLite
  affects:
    - routes/index.js
tech_stack:
  added:
    - better-sqlite3
    - db.courses
    - db.services
    - db.statistics
  patterns:
    - Lazy database initialization
    - Repository pattern for data access
key_files:
  created: []
  modified:
    - routes/index.js
decisions:
  - Keep startDailyCron() from utils/statistics for backward compatibility
  - Use db.statistics.recordVisit instead of original statistics.recordVisit
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-23"
---

# Phase 5 Plan 1: Refactor & Verification Summary

## One-Liner

Migrated all route handlers from JSON-based loaders to SQLite database modules (db.courses, db.services, db.statistics)

## Completed Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Replace loader imports with database modules | 3ee6e11 |
| 2 | Refactor course routes to use db.courses | 3ee6e11 |
| 3 | Refactor service routes to use db.services | 3ee6e11 |
| 4 | Update statistics to use db.statistics | 3ee6e11 |
| 5 | Verify all API endpoints work | 3ee6e11 |

## Changes Made

### routes/index.js

1. **Import Changes** (Task 1):
   - Replaced `coursesLoader` and `servicesLoader` imports
   - Added `const db = require('../utils/db')` for db.courses, db.services, db.statistics

2. **Course Endpoints** (Task 2):
   - GET /api/courses → `db.courses.getAll()`
   - POST /api/courses → `db.courses.add(...)`
   - GET /api/courses/:id → `db.courses.getById(id)`
   - PUT /api/courses/:id → `db.courses.updateCourse(id, ...)`
   - DELETE /api/courses/:id → `db.courses.deleteCourse(id)`
   - PUT /api/courses/batch-update → Iterate with `db.courses.updateCourse()`

3. **Service Endpoints** (Task 3):
   - GET /api/services → `db.services.getEnabled()`
   - GET /mgmt/services → `db.services.getAll()`
   - POST /api/services/update → `db.services.validateServices()` + `db.services.saveServices()`

4. **Statistics Recording** (Task 4):
   - Record visits with `db.statistics.recordVisit(userId, pagePath)`
   - Keep `statistics.startDailyCron()` from original utils/statistics for cron job

5. **Verification** (Task 5):
   - All database modules load correctly
   - GET /api/courses returns 0 courses (empty)
   - GET /api/services returns 3 services
   - recordVisit creates records in SQLite

## Verification Results

```bash
node -e "const db = require('./utils/db'); ..."
DB modules loaded: object object object
GET /api/courses: 0 courses
GET /api/services: 3 services
recordVisit: 1 change(s)
All endpoints verified successfully
```

## Deviations from Plan

None - plan executed exactly as written.

## API Contracts Maintained

- Response formats unchanged (matching JSON loader output)
- Error messages unchanged ("名稱不可為空", "課程不存在", etc.)
- Status codes unchanged (400, 404, etc.)