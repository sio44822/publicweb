# Codebase Structure

**Analysis Date:** 2026-04-21

## Directory Layout

```
C:\Users\user\Desktop\web\publicweb/
├── app.js              # Express application entry point
├── package.json       # Project dependencies and scripts
├── .env               # Environment variables (contains secrets)
├── .gitignore         # Git ignore patterns
├── routes/            # Express route handlers (controllers)
│   ├── index.js       # Main routes + user ID management
│   └── statistics.js # Statistics API routes + authentication
├── views/             # EJS templates (server-side rendered pages)
│   ├── 1.ejs         # Public page 1
│   ├── coupon.ejs     # Coupon page
│   ├── url-qr-doc-tool.ejs  # URL/QR document tool page
│   └── statistics.ejs # Statistics dashboard page
├── utils/             # Business logic utilities
│   └── statistics.js  # Statistics recording, aggregation, cron jobs
├── public/            # Static assets served directly
│   └── images/       # Public images
│       ├── coupon.png
│       └── coupon2.png
├── data/             # JSON data storage (auto-created)
│   ├── coupon-statistics.json    # Individual visit records
│   └── daily-statistics.json   # Aggregated daily stats
└── node_modules/     # NPM dependencies
```

## Directory Purposes

**Root (`app.js`):**
- Purpose: Application entry point
- Contains: Express initialization, middleware setup, server startup
- Key files: `app.js`

**Routes (`routes/`):**
- Purpose: HTTP request handling and routing logic
- Contains: Route definitions, request handlers, authentication
- Key files: `routes/index.js`, `routes/statistics.js`

**Views (`views/`):**
- Purpose: Server-side HTML templates
- Contains: EJS files for page rendering
- Key files: `1.ejs`, `coupon.ejs`, `url-qr-doc-tool.ejs`, `statistics.ejs`

**Utils (`utils/`):**
- Purpose: Core business logic
- Contains: Statistics tracking, data aggregation, cron scheduling
- Key files: `utils/statistics.js`

**Public (`public/`):**
- Purpose: Static file serving
- Contains: Images served without processing
- Key files: `public/images/coupon.png`, `public/images/coupon2.png`

**Data (`data/`):**
- Purpose: JSON file-based persistence
- Contains: Visit records and daily statistics
- Generated: Yes (auto-created on first statistics recording)
- Committed: No (should be in .gitignore)

## Key File Locations

**Entry Points:**
- `app.js`: Main Express application bootstrap

**Configuration:**
- `package.json`: NPM dependencies and scripts
- `.env`: Environment variables (secrets - NOT committed)

**Core Logic:**
- `routes/index.js`: Main routing with user ID management
- `routes/statistics.js`: Statistics API routes
- `utils/statistics.js`: Statistics business logic

**Templates:**
- `views/1.ejs`: Landing page template
- `views/coupon.ejs`: Coupon page template
- `views/url-qr-doc-tool.ejs`: URL/QR tool page template
- `views/statistics.ejs`: Statistics dashboard template

**Static Assets:**
- `public/images/coupon.png`: Coupon image
- `public/images/coupon2.png`: Coupon alternate image

**Data Storage:**
- `data/coupon-statistics.json`: Individual visit records
- `data/daily-statistics.json`: Daily aggregated statistics

## Naming Conventions

**Files:**
- JavaScript files: camelCase (index.js, statistics.js)
- EJS templates: kebab-case (1.ejs, coupon.ejs, url-qr-doc-tool.ejs)
- Data files: kebab-case (coupon-statistics.json, daily-statistics.json)

**Directories:**
- Directories: lowercase (routes, views, utils, public, data)

**Functions:**
- Functions: camelCase (getUserId, recordVisit, getStatistics)
- Private functions: camelCase prefixed with underscore pattern not used

## Where to Add New Code

**New Page:**
- Route handler: Add to `routes/index.js`
- View template: Create new `.ejs` file in `views/`
- Static assets: Add to `public/images/` or `public/`

**New API Endpoint:**
- Route definition: Add to `routes/statistics.js`
- Handler logic: Add to `utils/statistics.js` or create new utility module
- Response format: Return JSON

**New Utility Module:**
- Location: `utils/` directory
- Export pattern: CommonJS module.exports

**New Route File:**
- Location: `routes/` directory
- Import in: `routes/index.js` via `router.use()`

## Special Directories

**data/:**
- Purpose: JSON file-based data persistence
- Generated: Yes (created by `utils/statistics.js` on first run)
- Committed: No (should be in .gitignore)

**node_modules/:**
- Purpose: NPM package dependencies
- Generated: Yes (via npm install)
- Committed: No

**public/:**
- Purpose: Static files served directly to browser
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-21*