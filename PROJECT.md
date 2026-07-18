# PublicWeb — 多功能服務入口平台

## 系統概述

PublicWeb 是一個基於 Express + EJS + Firestore 的多功能服務聚合平台。  
首頁以 iPad 風格的應用程式網格呈現所有可用工具，每個工具點擊後進入獨立的功能頁面。

### 核心設計原則

- **儀表板入口** — `/` 與 `/services` 作為主入口，動態載入 Firestore 中的服務清單
- **工具隔離** — 每個工具的程式碼、靜態資源、邏輯服務完全獨立於自己的資料夾
- **後端可管理** — 服務啟用／排序／可見性可透過 `/mgmt/services` 後台管理
- **靜態優先** — 工具的前端檔案（JS/CSS/圖片）放在各自 `public/<tool>/`，不互相引用

---

## 系統架構

```
Browser ──→ Express (port 80/55005)
               │
               ├── EJS Views (views/)
               ├── Static Assets (public/)
               ├── API Routes (routes/)
               ├── Business Logic (services/)
               ├── Database Layer (utils/db/)
               └── External Tools (tools/)
```

### 技術棧

| 層級 | 技術 | 用途 |
|------|------|------|
| 伺服器 | Node.js + Express | HTTP 路由、API 端點 |
| 模板引擎 | EJS | 伺服器端渲染 HTML |
| 資料庫 | Firestore (Google Cloud) | 服務配置、課程管理、訪問統計 |
| 前端樣式 | Tailwind CSS (CDN) | 儀表板 UI |
| 認證 | Cookie-based | 管理後台登入 |
| 排程 | node-cron | 暫存清理、資料同步 |

---

## 檔案結構與工具隔離規則

### 工具資料夾慣例

每個工具遵循以下資料夾隔離規則，**不得跨資料夾引用其他工具的檔案**：

```
routes/<tool>/           — 該工具專屬的 Express 路由（新增時掛載到 app.js）
views/<tool>/            — 該工具專屬的 EJS 模板
public/<tool>/           — 該工具的前端靜態檔（CSS / JS / 圖片）
services/<tool>/         — 該工具的商業邏輯模組
tools/<tool>/            — 該工具所需的二進位檔或工具腳本（yt-dlp、ffmpeg 等）
cookies/<tool>/          — 該工具專用的 Cookie 檔案
```

### 例外

- `utils/db/` — 跨工具共用的資料庫存取層（Firestore 封裝）
- `utils/courses-loader.js` — 課程資料載入器
- `utils/services-loader.js` — 服務設定載入器

---

## 專案完整結構

```
publicweb/
│
├── app.js                      # Express 應用程式進入點
├── package.json
├── .env                        # 環境設定（Firebase、密碼等）
├── vercel.json                 # Vercel Serverless 部署設定
├── check-courses.js            # 課程資料檢查腳本
│
├── routes/
│   ├── _helpers.js             # 共用工具函式（getUserId、getNavServices）
│   ├── index.js                # 主路由（儀表板、後台、API 聚合）
│   ├── statistics.js           # 統計分析路由
│   ├── downloadyt/
│   │   ├── api.js              # YouTube 下載 API
│   │   └── advance.js          # 批次下載進階路由
│   ├── coursereservation/
│   │   └── index.js            # 課程預約工具路由
│   ├── coupon/
│   │   └── index.js            # 優惠券工具路由
│   └── url-qr-doc-tool/
│       └── index.js            # URL/QR Code 工具路由
│
├── views/
│   ├── services.ejs            # 儀表板首頁（iPad 風格服務網格）
│   ├── statistics.ejs          # 統計報表頁
│   ├── admin/
│   │   ├── courses.ejs         # 課程管理後台
│   │   └── services.ejs        # 服務管理後台
│   ├── downloadyt/
│   │   ├── index.ejs           # YouTube 下載主頁面
│   │   └── advance.ejs         # 進階批次下載頁面
│   ├── coursereservation/
│   │   └── index.ejs           # 課程預約頁面
│   ├── coupon/
│   │   └── index.ejs           # 優惠券頁面
│   └── url-qr-doc-tool/
│       └── index.ejs           # URL/QR Code 頁面
│
├── public/
│   ├── downloadyt/
│   │   ├── app.js              # YouTube 下載器前端邏輯
│   │   ├── advance.js          # 進階下載前端邏輯
│   │   ├── styles.css          # 下載器專用樣式
│   │   ├── 說明.png            # 使用說明圖片
│   │   └── downloads/          # 下載影片輸出目錄
│   └── coupon/
│       ├── coupon.png
│       └── coupon2.png
│
├── services/
│   └── downloadyt/
│       ├── downloader.js       # yt-dlp + ffmpeg 下載核心
│       ├── packager.js         # ZIP 打包服務
│       ├── cleanup.js          # 暫存清理 cron
│       └── batch-downloader.js # 平行批次下載協調器
│
├── tools/
│   └── downloadyt/
│       ├── ytdlp/              # yt-dlp 二進位 + QuickJS + DLL
│       ├── browser_download.py # Playwright 格式提取腳本
│       ├── extract_cookies.py  # Selenium Cookie 提取腳本
│       ├── ffmpeg.exe          # FFmpeg 影片合併
│       └── record.txt          # 下載歷史記錄
│
├── cookies/
│   └── downloadyt/
│       └── youtube.txt          # YouTube Cookie（Netscape 格式）
│
├── utils/
│   ├── db/
│   │   ├── index.js            # DB 層統一匯出
│   │   ├── firebase.js         # Firebase Admin SDK 初始化
│   │   ├── courses.js          # 課程資料 CRUD
│   │   ├── services.js         # 服務配置 CRUD
│   │   └── statistics.js       # 訪問統計記錄/查詢
│   ├── courses-loader.js       # Google Sheet 課程同步
│   └── services-loader.js      # 服務初始化載入
│
├── api/
│   └── index.js                # 舊版 API（僅供相容）
│
├── data/                       # 本地資料目錄
└── temp/                       # 暫存檔案目錄
```

---

## 工具清單

| 工具 | 路由路徑 | 說明 | 資料夾前綴 | 預設可見性 |
|------|----------|------|-----------|-----------|
| 儀表板首頁 | `/`, `/services` | iPad 風格工具網格 | — | — |
| 課程預約 | `/public/coursereservation` | 課程時段預約系統 | `routes/coursereservation/` `views/coursereservation/` | 進階模式 |
| 優惠券 | `/public/coupon` | 優惠券管理與展示 | `routes/coupon/` `views/coupon/` `public/coupon/` | 進階模式 |
| URL/QR 工具 | `/public/url-qr-doc-tool` | URL 編碼與 QR Code 產生 | `routes/url-qr-doc-tool/` `views/url-qr-doc-tool/` | 基本模式 |
| YouTube 下載器 | `/public/downloadyt` | YouTube 影片/音訊下載 | `routes/downloadyt/` `views/downloadyt/` `public/downloadyt/` | 基本模式 |
| 統計報表 | `/statistics` | 訪問數據分析 | `routes/statistics.js` | 基本模式 |
| 課程管理 | `/mgmt/courses` | 課程 CRUD 後台 | `views/admin/courses.ejs` | 進階模式 |
| 服務管理 | `/mgmt/services` | 服務啟用/排序/可見性 | `views/admin/services.ejs` | 進階模式 |

---

## 服務管理機制（Firestore）

儀表板的服務清單由 Firestore `services` Collection 驅動，每個服務文件包含：

```json
{
  "id": "downloadyt",
  "name": "YouTube 下載器",
  "description": "下載 YouTube 影片與音樂",
  "url": "/public/downloadyt",
  "icon": "\uD83C\uDFAC",
  "order": 4,
  "enabled": true,
  "showInNav": true,
  "isAdvanced": false
}
```

- `enabled` — 是否出現在前端
- `showInNav` — 是否出現在導覽列
- `isAdvanced` — 是否僅在「進階模式」下顯示
- `order` — 排序權重（升序排列）

### 管理介面

| 路徑 | 功能 |
|------|------|
| `GET /mgmt/services` | 服務管理後台（需 Cookie 認證） |
| `POST /api/services/login` | 管理員登入（取得 admin Cookie） |
| `POST /api/services/update` | 批次更新服務設定（全量覆蓋） |
| `POST /api/services/verify-advanced` | 解鎖進階模式（30 天 Cookie，`httpOnly: false`） |
| `POST /api/services/clear-advanced` | 清除進階模式 Cookie，回到基本模式 |

---

## 首頁排版規格（Dashboard Layout）

首頁採用 iPad 風格應用程式網格，客戶端渲染（Client-side Render），透過 `/api/services` 取得服務清單後動態生成卡片。

### 卡片格線系統

```css
#servicesGrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);  /* 一律 4 欄 */
    gap: 12px;
    max-width: 720px;
    margin: 0 auto;
}
```

- **一律 4 欄**：手機、平板、桌面均維持 4 欄，確保佈局一致
- **最大寬度 720px**：避免螢幕過寬時卡片間距過大
- **間距 12px**：保持緊湊但可讀的間距

### 卡片樣式

| 屬性 | 值 | 說明 |
|------|----|------|
| 邊框 | `2px solid #e5e7eb` | 淺灰色邊框，明顯可點擊 |
| 圓角 | `16px` | 接近 iOS App 圖標的圓角比例 |
| 背景 | `#fff` | 白色背景 |
| 最小高度 | `110px` | 確保內容充足顯示 |
| padding | `16px 8px` | 上下留白，左右略縮 |

### 卡片內容結構

```
┌──────────┐
│    🎬    │  ← .svc-icon (2rem)
│          │
│ YouTube  │  ← .svc-name (0.8rem, 600 weight)
│ 下載器   │
└──────────┘
```

### CSS 類別

| 類別 | 屬性 | 用途 |
|------|------|------|
| `.service-card` | 邊框、圓角、背景、過渡效果 | 卡片容器 |
| `.service-card:hover` | 邊框變紫色、陰影、上移 2px | 懸浮效果 |
| `.service-card:active` | 陰影回縮、位移歸零 | 點擊回饋 |
| `.svc-icon` | `font-size: 2rem` | 工具圖示 |
| `.svc-name` | `font-size: 0.8rem`, `font-weight: 600` | 工具名稱 |


### 互動行為

- **Hover**：邊框變為紫色（`#a855f7`），陰影擴散，卡片整體上移 2px
- **Active (點擊瞬間)**：陰影回縮，位移歸零，模擬按壓彈回效果
- **進入動畫**：每個卡片依序淡入，間隔 60ms，位移 12px

### 資料來源

所有服務資料來自 Firestore `services` Collection，透過 `GET /api/services` 取得。
基礎模式僅顯示 `isAdvanced: false` 的服務；進階模式顯示全部。

## 開發流程

### 第一階段：開發工具

**1. 建立工具資料夾與程式碼**

在 `routes/`、`views/`、`public/`、`services/`、`tools/` 下各自建立 `<tool>/` 子目錄：

```
routes/<tool>/       ← Express 路由
views/<tool>/        ← EJS 模板
public/<tool>/       ← 前端靜態資源
services/<tool>/     ← 商業邏輯
tools/<tool>/        ← 工具腳本/二進位
cookies/<tool>/      ← Cookie 檔案
```

**2. 建立路由檔案**

每個工具的路由檔案匯出 Express Router。使用 `_helpers.js` 取得共用工具函式：

```js
// routes/<tool>/index.js
import express from 'express';
import db from '../../utils/db/index.js';
import { getUserId, getNavServices } from '../_helpers.js';

const router = express.Router();

router.get('/public/<tool>', async (req, res) => {
  const userId = getUserId(req, res);
  await db.statistics.recordVisit(userId, '/public/<tool>');
  const navServices = await getNavServices('/public/<tool>');
  res.render('<tool>/index', { navServices, currentPath: '/public/<tool>' });
});

export default router;
```

**3. 在 app.js 中掛載路由**

```js
import <tool>Routes from './routes/<tool>/index.js';
// ...
app.use(<tool>Routes);
```

**4. 開發與測試**

```bash
npm run dev    # 使用 nodemon 自動重新載入
```

### 第二階段：加入首頁

工具開發完成後，需要在 Firestore `services` Collection 新增一筆服務記錄，
該工具才會出現在儀表板的服務網格中。

#### 方法 A：透過管理後台（需要先登入）

1. 在首頁進入**進階模式**（點「進階」按鈕 → 輸入密碼）
2. 點擊「管理」鏈結進入 `/mgmt/services`
3. 在服務列表中新增一筆，設定 name、url、icon、order、isAdvanced

#### 方法 B：透過 API（curl / 程式呼叫）

使用管理員權限 POST 到 `/api/services/update`（全量覆蓋，需包含所有現有服務）：

```bash
# Step 1: 登入取得 admin Cookie
curl -c cookies.txt -X POST http://localhost/api/services/login \\
  -H "Content-Type: application/json" \\
  -d '{"password":"管理員密碼"}'

# Step 2: 更新服務清單（含現有服務 + 新工具）
curl -b cookies.txt -X POST http://localhost/api/services/update \\
  -H "Content-Type: application/json" \\
  -d '{
    "services": [
      {"id":"existing-1","name":"現有工具","url":"/public/existing-1","icon":"🔧","order":1,"enabled":true,"showInNav":true,"isAdvanced":false},
      {"id":"<tool>","name":"新工具","url":"/public/<tool>","icon":"🆕","order":5,"enabled":true,"showInNav":true,"isAdvanced":false}
    ]
  }'
```

### 服務配置欄位說明

```json
{
  "id": "<tool>",
  "name": "顯示名稱",
  "description": "簡短說明（顯示在卡片下方）",
  "url": "/public/<tool>",
  "icon": "🎬",
  "order": 5,
  "enabled": true,
  "showInNav": true,
  "isAdvanced": false
}
```

| 欄位 | 說明 |
|------|------|
| `id` | 唯一識別碼，建議與工具資料夾同名 |
| `name` | 卡片上顯示的名稱 |
| `description` | 卡片下方的說明文字 |
| `url` | 點擊卡片後導向的路徑 |
| `icon` | Emoji 圖示 |
| `order` | 排序權重（越小越前面） |
| `enabled` | 是否啟用（`false` 則隱藏） |
| `showInNav` | 是否出現在導覽列 |
| `isAdvanced` | 是否僅在進階模式顯示 |
| | `false` → 基本模式與進階模式都可見 |
| | `true` → 僅進階模式可見 |

### 完整開發循環

```
建立工具檔案 (routes/views/public/services/<tool>/)
    ↓
在 app.js 掛載路由 (app.use(routes))
    ↓
npm run dev 本機開發測試
    ↓ 工具功能完成後：
新增 Firestore services 記錄（管理後台或 API）
    ↓
重整首頁 → 工具卡片出現 → 點擊進入
    ↓
Git commit & push → Vercel 自動部署
```

### 重要規則

- 新工具的所有相關檔案應放在對應的 `<tool>/` 子目錄中，**不應修改或引用其他工具的檔案**
- 僅 `utils/db/` 層級的共用模組、以及 `routes/_helpers.js` 為跨工具共用例外
- 正式環境需要先登入管理後台取得 Cookie，才能呼叫 `/api/services/update`
- 工具卡片的路徑要與路由掛載的 URL 一致（例如 `/public/<tool>`）

---

## 開發與部署

### 本機開發

```bash
npm install
npm run dev    # 使用 nodemon 監聽檔案變更
```

### Vercel 部署

專案支援 Vercel Serverless 部署，`vercel.json` 配置了必要的路由重寫規則。

### 環境變數（.env）

| 變數 | 說明 |
|------|------|
| `PORT` | 本機開發埠號（預設 80） |
| `NODE_ENV` | `development` / `production` |
| `PUBLIC_URL` | 正式環境 URL |
| `ADMIN_PASSWORD` | 管理後台與進階模式密碼 |
| `STATS_USERNAME` | 統計頁面 HTTP Basic 認證 |
| `STATS_PASSWORD` | 統計頁面 HTTP Basic 認證 |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK 憑證（JSON） |

---

## 技術細節

### ESM 模組系統

專案使用 Node.js ESM（`"type": "module"`），所有 `import`/`export` 遵循 ES Module 規範。
在 ESM 中無 `__dirname`/`__filename`，需手動取得：

```js
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### 靜態檔案服務

所有 `public/` 目錄下的檔案會自動被 Express 靜態中介軟體提供：

```js
app.use(express.static(path.join(__dirname, 'public')));
```

因此 `public/<tool>/style.css` 在瀏覽器中可透過 `/<tool>/style.css` 存取。



## 開發備忘錄

### 避免用 PowerShell 處理含 ${...} 的 JS 檔案

services.ejs、pp.js 等檔案內含大量 JavaScript template literal（${...}），
在 **PowerShell 字串中 $ 是變數展開符號**，會直接與 JS 語法衝突。

**正確做法**：直接寫 .cjs 腳本用 Node.js 操作檔案，避免 PowerShell 字串跳脫地獄。

`js
// fix.cjs — 用 Node.js 修改檔案內容
const fs = require('fs');
const path = 'target.ejs';
let c = fs.readFileSync(path, 'utf-8');
c = c.replace(/pattern/g, 'replacement');
fs.writeFileSync(path, c, 'utf-8');
`

**常見陷阱**：
- PowerShell 的 .Replace() 靜默失敗（不回報，只回傳未修改字串），寫入前未讀回驗證會誤以為成功
- Set-Content -NoNewline 搭配 pipeline 會把陣列元素合併成一行（應使用 -join "\\
"）
- [regex]::Replace 與 -replace 的 regex 行為不同需留意
- 含 ${} 的 JS template literal 不適合用 PowerShell @""@ here-string 傳遞，應用 @''@ 或直接存檔用 Node.js 處理

**黃金法則**：當發現同一問題嘗試修復四次以上仍不行，立刻換工具。

> **最後更新**：2026-07-19
> **維護者**：Codex