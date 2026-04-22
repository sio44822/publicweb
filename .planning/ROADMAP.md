# Roadmap: Service Navigation Layer

## Milestones

- ✅ **v1.0 Services Navigation** — Phase 1 (shipped 2026-04-21)
- ✅ **v1.1 Enhanced Statistics** — (shipped 2026-04-22)
- ○ **v1.2 Course Management** — Phase 2

---

## Phase 2: Course Management

**Status:** Planned
**Planned:** 2026-04-23
**Goal:** 管理員可新增/編輯/刪除課程，使用者可以預約課程

### Requirements

- **D-01:** 管理員從 /mgmt/services 進入 /mgmt/courses
- **D-02:** 維持極簡風格
- **D-03:** Inline 編輯模式
- **D-04:** 課程結構 { id, name, image, slots[{time, limit}] }
- **D-05:** 固定時段
- **D-06:** 從 /api/courses 讀取
- **D-07:** 本地名額快速顯示
- **D-08:** 提交前檢查名額
- **D-09:** 寫入 Google Sheet
- **D-10:** QR Code 工具維持
- **D-11:** 單一 URL 輸入

### Research Findings

Most functionality already implemented in codebase:
- /mgmt/courses admin interface
- /api/courses CRUD endpoints
- views/1.ejs booking flow with Google Sheet sync

### Plans

- [ ] 02-01-PLAN.md — Verification plan (4 checkpoints)

---

## v1.1 Enhanced Statistics (COMPLETED)

<details>
<summary>✅ v1.1 - SHIPPED 2026-04-22</summary>

- KPI 儀表板: 今日/總瀏覽、訪客
- 篩選器: 日期範圍 + 服務下拉
- 趨勢圖: 時/日/週/月切換
- 服務排名: 長條圖
- 數據表格: 可排序/搜尋
- CSV 匯出

</details>

---

*Roadmap v1.1 shipped*