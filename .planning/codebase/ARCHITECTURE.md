# Architecture

**Analysis Date:** 2026-04-21

## Pattern Overview

**Overall:** Simple Express MVC Pattern

This is a lightweight Node.js + Express web application with a simple MVC-like architecture. The application serves static public pages with server-side rendering (EJS templates) and tracks user visits for statistics.

**Key Characteristics:**
- **Controller layer**: Express route handlers in `routes/` directory manage HTTP request/response
- **View layer**: EJS templates in `views/` for server-side rendering
- **Model/Service layer**: Utility modules in `utils/` handle business logic (statistics)
- **Data layer**: File-based JSON storage in `data/` directory
- **Static assets**: Images and other public files served from `public/`

## Layers

**Entry Point (app.js):**
- Purpose: Initialize Express app and start HTTP server
- Location: `app.js`
- Contains: Express middleware configuration, route registration, server startup
- Depends on: express, ejs, cookie-parser, dotenv
- Used by: Node.js runtime (npm start/npm run dev)

**Routing Layer (routes/):**
- Purpose: Handle HTTP requests and map to appropriate views/services
- Location: `routes/index.js`, `routes/statistics.js`
- Contains: Route definitions, request handlers, authentication logic
- Depends on: `utils/statistics.js`
- Used by: `app.js` (mounted via `app.use(routes)`)

**Business Logic Layer (utils/):**
- Purpose: Core functionality - statistics recording, aggregation, and cron jobs
- Location: `utils/statistics.js`
- Contains: Statistics tracking, data persistence to JSON files, daily statistics generation
- Depends on: fs, path, node-cron
- Used by: `routes/index.js`, `routes/statistics.js`

**View Layer (views/):**
- Purpose: Server-side HTML templates rendered by EJS
- Location: `views/`
- Contains: EJS templates (coupon.ejs, 1.ejs, statistics.ejs, url-qr-doc-tool.ejs)
- Depends on: EJS templating engine
- Used by: Route handlers call `res.render()`

**Static Assets (public/):**
- Purpose: Serve images and other public files
- Location: `public/`
- Contains: Images (coupon.png, coupon2.png)
- Used by: Browser requests via Express static middleware

## Data Flow

**User Visit Flow:**

1. User requests a page (e.g., `/public/coupon`)
2. Route handler (`routes/index.js`) extracts or generates user ID from cookie
3. Statistics module (`utils/statistics.js`) records visit with userId, pagePath, timestamp
4. Statistics saved to JSON file (`data/coupon-statistics.json`)
5. EJS template renders the page
6. Response sent to browser with cookie set

**Statistics API Flow:**

1. Client requests statistics endpoint (e.g., `/api/statistics`)
2. Authentication middleware validates stats_token cookie
3. Statistics module reads from JSON file, aggregates data
4. JSON response sent to client

**Daily Cron Flow:**

1. `node-cron` triggers at 4:00 UTC (12:00 HK time)
2. Statistics module aggregates daily statistics
3. Daily stats saved to `data/daily-statistics.json`

## Key Abstractions

**User Identification:**
- Purpose: Track unique visitors using cookies
- Examples: `routes/index.js` - `getUserId()` function
- Pattern: UUID v4 stored in `coupon_user_id` cookie, expires in 365 days

**Statistics Recording:**
- Purpose: Record each page visit with user tracking
- Examples: `utils/statistics.js` - `recordVisit(userId, pagePath)`
- Pattern: Append to JSON array, re-read entire file for each operation

**Statistics Aggregation:**
- Purpose: Calculate visit counts, unique users, trends
- Examples: `utils/statistics.js` - `getTodayStats()`, `getPageDailyTrend()`, etc.
- Pattern: Filter and aggregate in-memory from JSON data

## Entry Points

**Main Application:**
- Location: `app.js`
- Triggers: `npm start` or `npm run dev`
- Responsibilities: Express setup, middleware registration, route mounting, port binding

**Routes Index:**
- Location: `routes/index.js`
- Triggers: Any HTTP request to the server
- Responsibilities: Page routing, user ID management, statistics recording, sub-route mounting

**Statistics Routes:**
- Location: `routes/statistics.js`
- Triggers: Requests to `/api/stats/*` and `/statistics`
- Responsibilities: Statistics API endpoints, authentication, data retrieval

## Error Handling

**Strategy:** Basic error handling with console logging

**Patterns:**
- Route-level try-catch for authentication (statistics.js)
- Missing credentials validation with 400 status
- Invalid authentication returns 401 status
- Console logging for debugging (`console.log()`)

## Cross-Cutting Concerns

**Logging:** Console-based logging throughout the application
- Route handlers log headers and body for debugging
- Statistics module logs daily generation and errors

**Validation:**
- Request body validation for credentials
- Query parameter validation for statistics endpoints (date, year, week, month)

**Authentication:**
- Cookie-based token authentication for statistics
- Base64-encoded token with username|password|expiry format
- Token validation with expiry check

**User Tracking:**
- UUID-based user identification via cookies
- Unique user counting using Set data structure

**Time Handling:**
- Hong Kong Time (UTC+8) used consistently
- Custom functions: `getHongKongTime()`, `getHongKongDateString()`

---

*Architecture analysis: 2026-04-21*
