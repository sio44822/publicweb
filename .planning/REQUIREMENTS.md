# Requirements: Service Navigation Layer

**Milestone:** v1.2 SQLite Database Migration
**Phase:** Defined
**Created:** 2026-04-23

## Overview

Replace JSON file storage with SQLite database. Migrate existing course and statistics data, create new data access layer, and refactor existing code.

---

## v1 Requirements

### DB-01: SQLite Database Setup
Set up SQLite database for the project with proper schema.

**Acceptance Criteria:**
- [ ] SQLite database file at `data/publicweb.db`
- [ ] Database initialization script creates all required tables
- [ ] Tables: `courses`, `services`, `statistics`, `daily_stats`
- [ ] Foreign key relationships where applicable

### DB-02: Database Connection Layer
Create database connection module with connection pooling.

**Acceptance Criteria:**
- [ ] Connection module at `utils/db/connection.js`
- [ ] Use `better-sqlite3` for synchronous operations
- [ ] Environment-based database path (dev vs prod)
- [ ] Error handling for connection failures

### DB-03: Courses Migration
Migrate courses data from JSON to SQLite.

**Acceptance Criteria:**
- [ ] Export existing courses from `data/courses.json`
- [ ] Insert courses into SQLite `courses` table
- [ ] Preserve course IDs, names, descriptions, images
- [ ] Migrate course slots (time, limit, booked count)
- [ ] Verify all courses migrated correctly

### DB-04: Statistics Migration
Migrate statistics data from JSON to SQLite.

**Acceptance Criteria:**
- [ ] Export existing statistics from `data/coupon-statistics.json`
- [ ] Insert records into SQLite `statistics` table
- [ ] Preserve userId, pagePath, timestamp
- [ ] Migrate daily statistics from `data/daily-statistics.json`
- [ ] Verify all records migrated correctly

### DB-05: Services Migration
Migrate services config from JSON to SQLite.

**Acceptance Criteria:**
- [ ] Export existing services from `data/services.json`
- [ ] Insert services into SQLite `services` table
- [ ] Preserve service order, enabled status
- [ ] Verify all services migrated correctly

### DB-06: Course Data Access Layer
Create SQLite-based course repository.

**Acceptance Criteria:**
- [ ] Repository module at `utils/db/courses.js`
- [ ] CRUD operations: getAll, getById, add, update, delete
- [ ] Slot management operations
- [ ] Consistent with existing `courses-loader.js` API
- [ ] Unit tests for critical operations

### DB-07: Statistics Data Access Layer
Create SQLite-based statistics repository.

**Acceptance Criteria:**
- [ ] Repository module at `utils/db/statistics.js`
- [ ] Record visit operations
- [ ] Query operations: getTodayStats, getPageStats, getDailyTrend
- [ ] Consistent with existing `statistics.js` API
- [ ] Unit tests for critical operations

### DB-08: Services Data Access Layer
Create SQLite-based services repository.

**Acceptance Criteria:**
- [ ] Repository module at `utils/db/services.js`
- [ ] CRUD operations: getAll, getEnabled, getById, update
- [ ] Consistent with existing `services-loader.js` API
- [ ] Unit tests for critical operations

### DB-09: Refactor Routes to Use Database
Update route handlers to use new database layer.

**Acceptance Criteria:**
- [ ] `routes/index.js` imports database modules
- [ ] Course routes use `utils/db/courses.js`
- [ ] Service routes use `utils/db/services.js`
- [ ] Statistics recorded via `utils/db/statistics.js`
- [ ] No breaking changes to existing API contracts

### DB-10: Verification & Testing
Verify migration and refactoring work correctly.

**Acceptance Criteria:**
- [ ] All API endpoints return expected data
- [ ] Course CRUD operations work
- [ ] Statistics recording works
- [ ] Service management works
- [ ] No data loss after migration

---

## Technical Decisions

### D-01: SQLite Library Choice
- Use `better-sqlite3` for synchronous, fast operations
- Alternative: `sqlite3` for async if needed

### D-02: Database Location
- Development: `data/publicweb.db`
- Production: Use environment variable `DATABASE_PATH`

### D-03: Migration Strategy
- One-time migration script
- Keep JSON files as backup until verified
- Rollback plan if issues found

### D-04: API Compatibility
- Keep same function signatures as existing loaders
- Drop-in replacement for existing modules

---

## Out of Scope

- GraphQL API (future milestone)
- Multiple database support (PostgreSQL, MySQL)
- Real-time sync between instances
- Advanced caching layer

---

*Requirements defined: 2026-04-23*
*Milestone: v1.2 SQLite Database Migration*