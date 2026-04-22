# Phase 2: Course Management - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

管理員在 `/mgmt/services` 點擊「服務預約系統」進入課程管理功能，管理員可新增/編輯/刪除課程選項。

</domain>

<decisions>
## Implementation Decisions

### 管理頁面
- **D-01:** 管理員在 `/mgmt/services` 點擊「服務預約系統」卡片進入 `/mgmt/courses` 頁面
- **D-02:** 頁面維持現有極簡風格（Tailwind + rounded-2xl + minimal design）
- **D-03:** 編輯模式：點擊課程直接 inline 修改

### 課程資料結構
- **D-04:** 維持現有固定時段結構：`{ id, name, image, slots[{time, limit}] }`
- **D-05:** slots 為固定時段（如 9:00、13:00、15:00），不動態新增日期

### 預約與名額同步
- **D-06:** `views/1.ejs` 的 `initApp()` 從 `/api/courses` 讀取課程
- **D-07:** 進頁面立即顯示本地名額（快速響應）
- **D-08:** 提交前向 Google Sheet 檢查名額：
  - 滿額 → 顯示「名額已滿」錯誤
  - 有名額 → 提交成功 + 更新本地名額
- **D-09:** 預約表單提交維持現有方式（直接寫入 Google Sheet）

### QR Code 工具
- **D-10:** 維持現有 `/public/url-qr-doc-tool` 頁面
- **D-11:** 支援單一 URL 輸入轉 QR Code

</decisions>

<canonical_refs>
## Canonical References

### 現有檔案
- `views/1.ejs` — 預約系統前端
- `views/url-qr-doc-tool.ejs` — QR Code 工具
- `views/admin/services.ejs` — 管理頁面參考
- `routes/index.js` — 現有路由
- `utils/courses-loader.js` — 課程資料載入
- `data/courses.json` — 課程資料

### 現有資料
- `data/services.json` — 服務列表
- Google Sheet App Script — 預約資料寫入

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Tailwind CSS：已用於所有頁面
- Chart.js：統計頁已引入
- Express 路由模組：現成模式
- courses-loader.js：已具備 CRUD 功能

### Established Patterns
- 極簡設計：rounded-2xl, shadow-sm, border, bg-slate-50
- inline 編輯模式
- 同步鎖定 UI（loading-overlay）

### Integration Points
- `views/1.ejs` initApp()：需改為新的名額檢查流程
- routes/index.js：需新增 `/api/courses` API
- `utils/courses-loader.js`：需支援名額追蹤

</code_context>

<specifics>
## Specific Ideas

- 課程資料結構：id, name, image, slots[{time, limit}]
- 簡化管理：不需要雙向 Google Sheet 同步，預約直接寫入
- 名額更新流程：提交前檢查 → 成功後更新本地

</specifics>

<deferred>
## Deferred Ideas

- QR Code API 化（未來有需求再說）

</deferred>

---

*Phase: 02-course-management*
*Context gathered: 2026-04-23*