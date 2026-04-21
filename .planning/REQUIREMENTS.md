# Requirements: Service Navigation Layer

**Phase:** 1
**Status:** Defined
**Created:** 2026-04-21

## User Requirements

### UR-01: User Service Directory
As a general user, I want to visit `/services/` and see a grid of all available public services so that I can easily discover and access them.

**Acceptance Criteria:**
- [ ] Route `/services/` returns an HTML page with service cards
- [ ] Services displayed in a responsive grid layout
- [ ] Each card shows: service name, brief description, icon/thumbnail
- [ ] Cards link to actual service pages (`/public/1`, `/public/coupon`, `/public/url-qr-doc-tool`)
- [ ] Mobile: single column layout
- [ ] Desktop: multi-column grid (2-3 columns)

### UR-02: Admin Service Management
As an administrator, I want to manage services at `/mgmt/services` so that I can control which services are visible and their display order.

**Acceptance Criteria:**
- [ ] Route `/mgmt/services` returns an admin management page
- [ ] List of all services with toggle to enable/disable
- [ ] Drag-and-drop or button controls to reorder services
- [ ] Edit service name and description
- [ ] Changes persist during session (file-based or memory for Phase 1)

## Non-Functional Requirements

### NFR-01: Visual Design
- Minimalist design with clear typography and spacing
- Generous whitespace for readability
- Consistent with existing `coupon.ejs` low-contrast style
- Cards use existing Tailwind patterns: `rounded-2xl`, `shadow-sm`, `border`

### NFR-02: Responsive Behavior
- Mobile (< 768px): Single column, full-width cards
- Desktop (≥ 768px): 2-3 column grid

### NFR-03: Performance
- No additional database queries for Phase 1
- Service configuration stored in-memory or JSON file

### NFR-04: Existing Service Preservation
- `coupon.ejs` remains unchanged
- Existing routes (`/public/1`, `/public/coupon`, `/public/url-qr-doc-tool`) unaffected
- Statistics recording continues for existing pages

## Technical Decisions (from Phase 1 Context)

### D-01: Route Structure
- User view: `/services/`
- Admin view: `/mgmt/services` (mgmt prefix distinguishes from public routes)

### D-02: Admin Interface
- Server-rendered EJS page (not SPA)
- Simple toggle switches for enable/disable
- Up/down arrows or reorder buttons for ordering

### D-03: Service Configuration
- Initial hardcoded service list in route handler
- File-based config (`data/services.json`) for persistence
- Structure: `{ id, name, description, path, icon, enabled, order }`

### D-04: Styling Approach
- Inline Tailwind classes (matching existing 1.ejs patterns)
- No new CSS files required
- Reuse existing card patterns

---

*Requirements defined: 2026-04-21*
*Phase: 01-services-nav*