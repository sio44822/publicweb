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

## Technical Context

### Stack
- Node.js + Express 4.18.2
- EJS 5.0.2 templating
- Tailwind CSS (already in use)
- Cookie-based user identification (existing)

### Entry Points
- `app.js` - Express application entry
- `routes/index.js` - Route definitions
- `views/` - EJS templates

### Integration Points
- Routes: Add `/services/` and `/mgmt/services` routes
- Views: Create service grid and admin management templates
- Statistics: Existing user tracking can be reused for nav page visits

---

*Project: publicweb*
*Created: 2026-04-21*