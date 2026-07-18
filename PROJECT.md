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
│   ├── index.js                # 主路由（儀表板、後台、API 聚合）
│   ├── statistics.js           # 統計分析路由
│   └── downloadyt/
│       ├── api.js              # YouTube 下載 API（格式查詢、下載、進度）
│       └── advance.js          # 批次下載進階路由（JWT 認證、ZIP 打包）
│
├── views/
│   ├── services.ejs            # 儀表板首頁（iPad 風格服務網格）
│   ├── coursereservation.ejs   # 課程預約工具頁
│   ├── coupon.ejs              # 優惠券工具頁
│   ├── url-qr-doc-tool.ejs     # URL/QR Code 工具頁
│   ├── statistics.ejs          # 統計報表頁
│   ├── admin/
│   │   ├── courses.ejs         # 課程管理後台
│   │   └── services.ejs        # 服務管理後台（啟用/排序/可見性）
│   └── downloadyt/
│       ├── index.ejs           # YouTube 下載主頁面
│       └── advance.ejs         # 進階批次下載頁面
│
├── public/
│   ├── images/
│   │   ├── coupon.png
│   │   └── coupon2.png
│   └── downloadyt/
│       ├── app.js              # YouTube 下載器前端邏輯
│       ├── advance.js          # 進階下載前端邏輯
│       ├── styles.css          # 下載器專用樣式
│       └── downloads/          # 下載影片輸出目錄
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

| 工具 | 路由路徑 | 說明 | 資料夾前綴 |
|------|----------|------|-----------|
| 儀表板首頁 | `/`, `/services` | iPad 風格工具網格 | — |
| 課程預約 | `/public/coursereservation` | 課程時段預約系統 | views/coursereservation.ejs |
| 優惠券 | `/public/coupon` | 優惠券管理與展示 | views/coupon.ejs |
| URL/QR 工具 | `/public/url-qr-doc-tool` | URL 編碼與 QR Code 產生 | views/url-qr-doc-tool.ejs |
| YouTube 下載器 | `/downloadyt` | YouTube 影片/音訊下載 | routes/downloadyt/ |
| 進階批次下載 | `/downloadyt/advance` | 批次/播放清單下載 | （與上同） |
| 統計報表 | `/statistics` | 訪問數據分析 | routes/statistics.js |
| 課程管理 | `/mgmt/courses` | 課程 CRUD 後台 | views/admin/courses.ejs |
| 服務管理 | `/mgmt/services` | 服務啟用/排序/可見性 | views/admin/services.ejs |

---

## 服務管理機制（Firestore）

儀表板的服務清單由 Firestore `services` Collection 驅動，每個服務文件包含：

```json
{
  "id": "1",
  "name": "YouTube 下載器",
  "description": "下載 YouTube 影片與音訊",
  "url": "/downloadyt",
  "icon": "\uD83C\uDFAC",
  "order": 1,
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
| `POST /api/services/update` | 批次更新服務設定 |
| `POST /api/services/verify-advanced` | 解鎖進階模式（30 天 Cookie） |

---

## 新增一個新工具的流程

1. 在 Firestore `services` Collection 新增一筆服務文件（含 url、name、icon、order）
2. 建立 `routes/<tool>/` 路由檔案，匯出 Express Router
3. 在 `app.js` 中掛載路由：`app.use(urlPrefix, toolRoutes)`
4. （可選）建立 `views/<tool>/` 模板
5. （可選）建立 `public/<tool>/` 靜態資源
6. （可選）建立 `services/<tool>/` 商業邏輯
7. （可選）建立 `tools/<tool>/` 二進位與工具腳本

### 路由掛載範例（app.js）

```js
import toolRoutes from './routes/<tool>/index.js';
app.use('/<tool>', toolRoutes);
```

### 服務配置範例（Firestore）

```json
{
  "name": "新工具",
  "url": "/new-tool",
  "icon": "\uD83D\uDD27",
  "order": 5,
  "enabled": true,
  "showInNav": true,
  "isAdvanced": false
}
```

**重要規則**：新工具的所有相關檔案應放在對應的 `<tool>/` 子目錄中，
不應修改或引用其他工具的檔案。僅 `utils/db/` 層級的共用模組除外。

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

---

> **最後更新**：2026-07-18
> **維護者**：Codex
