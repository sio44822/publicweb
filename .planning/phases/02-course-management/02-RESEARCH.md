# Phase 2: Course Management - Research

**Researched:** 2026-04-23
**Status:** Complete

---

## Research Findings

### 1. Course Data Structure (Existing)

The `courses-loader.js` already implements:

```javascript
// Structure: { id, name, description, image, slots: [{ time, limit, booked }] }
{
  id: "1",
  name: "課程名稱",
  description: "課程說明",
  image: "https://...",
  slots: [
    { time: "9:00", limit: 3, booked: 0 },
    { time: "13:00", limit: 3, booked: 0 },
    { time: "15:00", limit: 3, booked: 0 }
  ]
}
```

**CRUD functions available:**
- `getCourses()` — Read all
- `getCourseById(id)` — Read single
- `addCourse({ name, description, image, slots })` — Create
- `updateCourse(id, updates)` — Update
- `deleteCourse(id)` — Delete
- `validateCourses(courses)` — Validation

### 2. API Endpoints (Existing)

`routes/index.js` already defines:

| Method | Endpoint | Description |
|-------|----------|-------------|
| GET | `/api/courses` | List all courses |
| POST | `/api/courses` | Add new course |
| GET | `/api/courses/:id` | Get course by ID |
| PUT | `/api/courses/:id` | Update course |
| DELETE | `/api/courses/:id` | Delete course |

These routes are already active.

### 3. Admin Interface (Existing)

`views/admin/courses.ejs` already provides:
- Login authentication (password-based)
- Inline editing for course fields
- Slot management (add/remove/update)
- Live sync with API

### 4. Booking Interface (Existing)

`views/1.ejs` already implements:
- Fetch courses from `/api/courses`
- Display course cards with slots
- Local quota display (fast)
- Google Sheet sync before submit
- Real-time quota validation

**Sync flow (existing):**
1. Load courses from `/api/courses` → display local quotas
2. `syncSeats()` fetches from Google Sheet → updates quotas
3. On submit → check if quota available → submit to Google Sheet

### 5. Google Sheet Integration (Existing)

The `views/1.ejs` uses:
- **Script URL:** `https://script.google.com/macros/s/AKfycbyYMAW1pdigBwM6xlbuD9kJvnVMLWyt2rPcT0Mh9_Z_s8hnopvqJkh-D7znlmOUKf7f/exec`
- **Actions:**
  - `action=getStats` — Get booking stats
  - POST data — Submit booking

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Admin CRUD API | ✅ Ready | `/api/courses` endpoints exist |
| Admin UI | ✅ Ready | `views/admin/courses.ejs` provides inline editing |
| Booking UI | ✅ Ready | `views/1.ejs` displays + syncs slots |
| Google Sheet sync | ✅ Ready | `syncSeats()` in 1.ejs |
| Route link | ⚠️ Needs work | D-01: Link from `/mgmt/services` to `/mgmt/courses` |

---

## Validation Architecture

No new validation architecture needed — the existing patterns are sufficient.

**Test approach:**
- Admin: Manual test CRUD at `/mgmt/courses`
- Booking: Manual test booking flow at `/public/1`
- API: Test endpoint responses with curl

---

## Potential Enhancements

Based on the existing implementation:

1. **Confirm existing functionality works** — The code exists but needs verification
2. **Fix admin route link (D-01)** — `views/admin/services.ejs` needs link to `/mgmt/courses`
3. **Add course management to nav (D-01)** — Service card "服務預約系統" → `/mgmt/courses`

---

## Conclusions

**The phase appears largely IMPLEMENTED already.**

The core functionality (courses CRUD, admin UI, booking flow, Google Sheet sync) exists in the codebase. The primary gap is the **navigation link** from `/mgmt/services` to the courses management page.

**Recommended actions:**
1. Verify existing admin CRUD works at `/mgmt/courses`
2. Add service card link in `/mgmt/services` (D-01)
3. Confirm booking flow at `/public/1` works end-to-end
4. Optional: Add inline edit for user booking without Google Sheet redirect (future)

---

*Research complete: 2026-04-23*