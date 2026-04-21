# Technology Stack

**Analysis Date:** 2026-04-21

## Languages

**Primary:**
- JavaScript (Node.js) - Server-side rendering and API endpoints

**Secondary:**
- EJS - Template markup language for views

## Runtime

**Environment:**
- Node.js - JavaScript runtime for server execution

**Package Manager:**
- npm - Node package manager
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Express 4.18.2 - Web application framework for routing and middleware

**Template Engine:**
- EJS 5.0.2 - Embedded JavaScript templating for server-rendered HTML views

**Scheduling:**
- node-cron 4.2.1 - Cron-style scheduled task execution for daily statistics

**Build/Dev:**
- nodemon 3.0.1 - Development server with auto-restart on file changes

## Key Dependencies

**Production:**
- express 4.18.2 - Web framework
- ejs 5.0.2 - Template engine
- cookie-parser 1.4.7 - Cookie parsing for user identification
- dotenv 16.3.1 - Environment variable loading
- uuid 13.0.0 - Unique user ID generation
- node-cron 4.2.1 - Scheduled task scheduler

**Development:**
- nodemon 3.0.1 - Development auto-reload server

## Configuration

**Environment:**
- Uses `dotenv` for environment variable loading
- `.env` file for local development (not committed to git)
- Environment variables loaded in `app.js` via `require('dotenv').config()`

**Build:**
- No build step required - runs directly with Node.js
- Entry point: `app.js`

## Platform Requirements

**Development:**
- Node.js runtime
- npm for dependency management
- Run via: `npm run dev` (uses nodemon)
- Run via: `npm start` (production mode)

**Production:**
- Node.js runtime
- Port configured via environment (default: 80)
- Static files served from `public/` directory

---

*Stack analysis: 2026-04-21*
