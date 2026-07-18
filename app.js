// 載入 .env 環境變數（必須在其他模組之前）
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { fileURLToPath } from 'url';
 import path from 'path';
 import fs from 'fs';
 import downloadytApiRoutes from './routes/downloadyt/api.js';
 import downloadytAdvanceRoutes from './routes/downloadyt/advance.js';
 import { initCleanup as initDownloadytCleanup } from './services/downloadyt/cleanup.js';
 import { checkDownloader } from './services/downloadyt/downloader.js';

// ESM 沒有 __filename / __dirname，需從 import.meta.url 手動取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

// 設定 EJS 模板引擎及其目錄
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 中間件：解析 Cookie、JSON body、URL-encoded body
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態檔案伺服（public 目錄下的 CSS / JS / 圖片等）
app.use(express.static(path.join(__dirname, 'public')));

// 掛載所有路由
 app.use(routes);
 
 // ===== DownloadYT 功能整合 =====
 
 // 確保目錄存在
 ['temp', 'public/downloadyt/downloads', 'cookies/downloadyt'].forEach(dir => {
   const dirPath = path.join(__dirname, dir);
   if (!fs.existsSync(dirPath)) {
     fs.mkdirSync(dirPath, { recursive: true });
   }
 });
 
 // DownloadYT 頁面路由（放在靜態檔案前，避免衝突）
 app.get('/downloadyt', (req, res) => {
   res.render('downloadyt/index', { basePath: '/downloadyt', port: PORT });
 });
 app.get('/downloadyt/advance', (req, res) => {
   res.render('downloadyt/advance', { basePath: '/downloadyt', port: PORT });
 });
 
 // DownloadYT 靜態檔案
 app.use('/downloadyt', express.static(path.join(__dirname, 'public', 'downloadyt')));
 
 // DownloadYT API 路由
 app.use('/downloadyt/api', downloadytApiRoutes);
 app.use('/downloadyt/api/advance', downloadytAdvanceRoutes);
 
 // 啟動清理排程
 initDownloadytCleanup();
 
 // 啟動時檢查下載器狀態
 checkDownloader().then(ready => {
   console.log(`[DownloadYT] Downloader ready: ${ready}`);
 });

// 匯出 Express app 供 Vercel Serverless Runtime 使用
export default app;

// 僅在本機開發時啟動 HTTP 伺服器（Vercel 環境由平台託管，不需 listen）
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const isDev = process.env.NODE_ENV === 'development';
    const URLBASE = isDev
      ? `http://localhost:${PORT}`
      : process.env.PUBLIC_URL || 'https://your-domain.com';

    console.log(`Server running on port ${PORT} ${URLBASE}`);
    console.log(`Mode: ${isDev ? 'Development (nodemon)' : 'Production'}`);
  });
}
