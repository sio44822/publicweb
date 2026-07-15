# Roadmap: Service Navigation Layer

## Milestones

- ✅ **v1.0 Services Navigation** — Phase 1 (shipped 2026-04-21)
- ✅ **v1.1 Enhanced Statistics** — (shipped 2026-04-22)
- ○ **v1.2 SQLite Database Migration** — (planned 2026-04-23)

---

## Phase 1: SQLite Setup & Schema Design

**Status:** In Planning
**Goal:** Set up SQLite database with proper schema

### Requirements

- DB-01: SQLite Database Setup
- DB-02: Database Connection Layer

### Success Criteria (what must be TRUE):

1. SQLite database file created at `data/publicweb.db`
2. Database initialization script runs without errors
3. All required tables created (courses, services, statistics, daily_stats)
4. Connection module handles errors gracefully

### Plans

**Plans:** 2 plans

Plans:
- [ ] 01-sqlite-setup/01-01-PLAN.md — SQLite connection layer setup
- [ ] 01-sqlite-setup/01-02-PLAN.md — Database schema creation

---

## Phase 2: Courses Migration

**Status:** Completed
**Goal:** Migrate courses data from JSON to SQLite

### Requirements

- DB-03: Courses Migration

### Success Criteria (what must be TRUE):

1. Course data exported from `data/courses.json`
2. All courses inserted into SQLite with correct schema
3. Course slots migrated correctly
4. Verification query returns same course count as JSON file

### Plans

**Plans:** 1 plan

Plans:
- [✅] 02-course-migration/02-01-PLAN.md — Courses migration and data access layer

---

## Phase 3: Statistics Migration

**Status:** In Planning
**Goal:** Migrate statistics data from JSON to SQLite

### Requirements

- DB-04: Statistics Migration

### Success Criteria (what must be TRUE):

1. Statistics records exported from JSON files
2. All visit records inserted into SQLite
3. Daily statistics migrated correctly
4. Verification query returns same record count as JSON file

### Plans

**Plans:** 1 plan

Plans:
- [ ] 03-statistics-migration/03-01-PLAN.md — Statistics data access layer and migration

---

## Phase 4: Services Migration & Data Access Layer

**Status:** In Planning
**Goal:** Migrate services and create new data access layer

### Requirements

- DB-05: Services Migration
- DB-06: Course Data Access Layer
- DB-07: Statistics Data Access Layer
- DB-08: Services Data Access Layer

### Success Criteria (what must be TRUE):

1. Services migrated to SQLite
2. Course repository provides CRUD operations
3. Statistics repository provides record/query operations
4. Services repository provides CRUD operations
5. All repositories maintain API compatibility with existing loaders

### Plans

TBD

**Plans:** 2 plans

Plans:
- [ ] 04-services-migration/04-01-PLAN.md — Services data access layer and migration
- [ ] 04-services-migration/04-02-PLAN.md — Unified data access module (index.js)

---

## Phase 5: Refactor & Verification

**Status:** In Planning
**Goal:** Refactor routes to use database and verify everything works

### Requirements

- DB-09: Refactor Routes to Use Database
- DB-10: Verification & Testing

### Success Criteria (what must be TRUE):

1. Routes import and use new database modules
2. All API endpoints return expected data
3. No breaking changes to existing API contracts
4. No data loss after migration
5. Application runs without errors

### Plans

**Plans:** 1 plan

Plans:
- [ ] 05-refactor-verification/05-01-PLAN.md — Refactor routes to use database and verify endpoints

---

## Previous Milestones

### v1.1 Enhanced Statistics (COMPLETED)

<details>
<summary>✅ v1.1 - SHIPPED 2026-04-22</summary>

- KPI 儀表板: 今日/總瀏覽、訪客
- 篩選器: 日期範圍 + 服務下拉
- 趨勢圖: 時/日/週/月切換
- 服務排名: 長條圖
- 數據表格: 可排序/搜尋
- CSV 匯出

</details>

### v1.0 Services Navigation (COMPLETED)

<details>
<summary>✅ v1.0 - SHIPPED 2026-04-21</summary>

- 服務導覽頁 (`/services/`) - 網格卡片響應式設計
- 管理員頁面 (`/mgmt/services`) - 密碼保護、啟用/停用、排序、編輯
- 服務設定驗證 - 名稱/連結必填、URL 格式檢查
- 管理員密碼移至環境變數 (`ADMIN_PASSWORD`)

</details>

---

*Roadmap v1.2 planned*