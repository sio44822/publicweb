# Phase 1: SQLite Setup & Schema Design - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** Requirements extracted from ROADMAP.md and REQUIREMENTS.md

<domain>
## Phase Boundary

Set up SQLite database with proper schema for the Service Navigation Layer project. This is the foundation phase for v1.2 migration milestone.

</domain>

<decisions>
## Implementation Decisions

### Database Technology
- **D-01:** Use `better-sqlite3` for synchronous, fast SQLite operations
- **D-02:** Database file location: `data/publicweb.db` (development)

### Schema Design
- **D-03:** Tables: `courses`, `services`, `statistics`, `daily_stats`
- **D-04:** Foreign key relationships where applicable between tables
- **D-05:** Use INTEGER for primary keys with auto-increment

### Connection Layer
- **D-06:** Connection module at `utils/db/connection.js`
- **D-07:** Environment-based database path (dev vs prod via DATABASE_PATH env var)
- **D-08:** Error handling for connection failures

### Migration Strategy
- **D-09:** Keep JSON files as backup until verified
- **D-10:** One-time migration scripts per data type

### API Compatibility
- **D-11:** Maintain function signatures consistent with existing loaders
- **D-12:** Drop-in replacement for existing modules

</decisions>

<canonical_refs>
## Canonical References

### Existing Data Loaders (to be replaced)
- `utils/courses-loader.js` — Current course loader
- `utils/services-loader.js` — Current services loader  
- `utils/statistics.js` — Current statistics module

### Data Files (migration source)
- `data/courses.json` — Courses data
- `data/services.json` — Services config
- `data/coupon-statistics.json` — Statistics data
- `data/daily-statistics.json` — Daily statistics

### Route Files
- `routes/index.js` — Main route definitions

</canonical_refs>

<specifics>
## Specific Ideas

### Schema Details (from REQUIREMENTS.md)

**courses table:**
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- description (TEXT)
- image (TEXT)
- slots (JSON/tEXT for time/limit/booked)

**services table:**
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- description (TEXT)
- url (TEXT)
- icon (TEXT)
- order_number (INTEGER)
- enabled (INTEGER/BOOLEAN)

**statistics table:**
- id (INTEGER PRIMARY KEY)
- userId (TEXT)
- pagePath (TEXT)
- timestamp (INTEGER)

**daily_stats table:**
- id (INTEGER PRIMARY KEY)
- date (TEXT)
- totalVisitors (INTEGER)
- totalPageViews (INTEGER)

</specifics>

<deferred>
## Deferred Ideas

- GraphQL API (future milestone)
- Multiple database support (PostgreSQL, MySQL)
- Real-time sync between instances
- Advanced caching layer

</deferred>

---

*Phase: 01-sqlite-setup*
*Context gathered: 2026-04-23*