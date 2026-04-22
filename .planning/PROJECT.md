# Project: Public Web Service Navigation

**Project Name:** publicweb - Service Navigation Layer
**Created:** 2026-04-21
**Status:** Planning

## Overview

Express.js + EJS public web service with multiple service endpoints. This project adds a centralized navigation layer to provide a unified entry point for all public services, with separate views for general users and administrators.

## Domain

### Core Problem

The current public web service lacks a centralized navigation interface. Users must know specific URLs to access different services (e.g., `/public/1`, `/public/coupon`, `/public/url-qr-doc-tool`), and there is no admin interface for managing service visibility and order.

### Goal

Create a navigation system that:
1. Provides a user-facing grid view at `/services/` displaying all available services
2. Provides an admin management interface at `/mgmt/services` for controlling service visibility and display order

### Boundaries

- Phase 1 focuses on navigation layer only
- Existing service pages remain unchanged (`/public/1`, `/public/coupon`, `/public/url-qr-doc-tool`)
- No database changes required for Phase 1 (file-based or in-memory service config)

## Current Milestone: v1.2 SQLite Database Migration

**Goal:** Replace JSON file storage with SQLite database for courses and statistics

**Target features:**
- Set up SQLite database for the project
- Migrate `courses.json` data to SQLite
- Migrate `statistics.json` data to SQLite
- Create new data access layer (courses, statistics)
- Refactor existing code to use SQLite instead of file-based loaders

## Technical Context

### Stack
- Node.js + Express 4.18.2
- EJS 5.0.2 templating
- Tailwind CSS (already in use)
- Cookie-based user identification (existing)
- **SQLite** - New database

### Entry Points
- `app.js` - Express application entry
- `routes/index.js` - Route definitions
- `views/` - EJS templates

### Integration Points
- SQLite integration via `better-sqlite3` (sync) or `sqlite3` (async)
- Data access layer in `utils/db/` directory
- Refactor `utils/courses-loader.js`, `utils/services-loader.js`, `utils/statistics.js`

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Project: publicweb*
*Created: 2026-04-21*
*Last updated: 2026-04-23*