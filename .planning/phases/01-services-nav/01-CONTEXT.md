# Phase 1: 新增導覽頁 - Context

**Gathered:** 2026-04-21
**Status:** Pre-discussed (GSD Project Initialized)
**GSD Project:** `.planning/config.json`

<domain>
## Phase Boundary

建立一個導覽頁面作為所有服務的統一入口，分為一般使用者和管理員兩種檢視。

</domain>

<decisions>
## Implementation Decisions

### 路由結構
- **D-01:** `/services/` — 一般使用者網格卡片介面
- **D-02:** `/mgmt/services` — 管理員介面，管理服務（路徑用 `/mgmt/` 前綴，區分一般路由）

### 版面樣式
- **D-03:** 一般使用者：網格卡片布局
- **D-04:** 管理員：功能導向列表或卡片，含啟用/停用開關

### 視覺風格
- **D-05:** 極簡設計，字級與間距清晰，大量留白
- **D-06:** coupon.ejs 維持現狀不變
- **D-07:** 響應式：手機單欄，桌面多格（網格自適應）

### 服務卡片資訊
- **D-08:** 卡片��示：服務名稱、簡短說明、圖示/預覽圖
- **D-09:** 管理者可在管理介面編輯顯示順序與說明

</decisions>

<canonical_refs>
## Canonical References

### 現有頁面
- `views/1.ejs` — 預約系統（服務之一）
- `views/coupon.ejs` — 優惠券頁（服務之一）
- `views/url-qr-doc-tool.ejs` — QR 工具頁（服務之一）

### 現有路由
- `routes/index.js` — 現有路由定義（須新增 `/services/` 和 `/mgmt/services`）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Tailwind CSS：已用於 1.ejs，可直接沿用
- Express 路由模組：現成模式
- 現有服務靜態圖：public/images/

### Established Patterns
- 卡片使用 `rounded-2xl`、`shadow-sm`、`border`
- 響應式使用 `grid-cols-1 md:grid-cols-N`

### Integration Points
- routes/index.js：新增兩個路由
- 可共享同一個 views/layout（若建立共 用模板）

</code_context>

<specifics>
## Specific Ideas

- 管理員路徑使用 `/mgmt/` 前綴（mgmt = management 縮寫）
- 極簡設計參考 coupon.ejs 的低對比風格

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-services-nav*
*Context gathered: 2026-04-21*