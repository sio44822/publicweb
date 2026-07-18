 /**
  * Advance routes — password-gated batch download with post-processing
  */
 import { fileURLToPath } from 'url';
 import express from 'express';
 import path from 'path';
 import fs from 'fs';
 import jwt from 'jsonwebtoken';
 import archiver from 'archiver';
 import { createBatch, getBatch, DOWNLOAD_DIR } from '../../services/downloadyt/batch-downloader.js';
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
 
 const router = express.Router();
 const JWT_SECRET = process.env.JWT_SECRET || 'downloadyt-advance-secret';
 const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '28345013';
 
 // ==================== Auth ====================
 
 router.post('/auth', (req, res) => {
   const { password } = req.body;
   if (!password) {
     return res.status(400).json({ success: false, detail: '請輸入密碼' });
   }
   if (password !== ADMIN_PASSWORD) {
     return res.status(401).json({ success: false, detail: '密碼錯誤' });
   }
   const token = jwt.sign({ role: 'advance' }, JWT_SECRET, { expiresIn: '24h' });
   res.json({ success: true, token });
 });
 
 // ==================== Batch Download ====================
 
 // Start batch download
 router.post('/batch', (req, res) => {
   const { urls, subtitle, postAction } = req.body;
   if (!urls || !Array.isArray(urls) || urls.length === 0) {
     return res.status(400).json({ success: false, detail: '請輸入影片 URL' });
   }
   try {
     const batchId = createBatch(urls, !!subtitle, postAction || 'video');
     res.json({ success: true, batchId });
   } catch (e) {
     res.status(500).json({ success: false, detail: e.message });
   }
 });
 
 // Get batch progress
 router.get('/batch/:batchId', (req, res) => {
   const batch = getBatch(req.params.batchId);
   if (!batch) {
     return res.status(404).json({ success: false, detail: '任務不存在' });
   }
   const summary = {
     id: batch.id,
     status: batch.status,
     totalCount: batch.totalCount,
     completedCount: batch.completedCount,
     postAction: batch.postAction,
     subtitle: batch.subtitle,
     resultType: batch.resultType,
     resultName: batch.resultName,
     log: batch.log.slice(-20),
     videos: (batch.videos || []).map(v => ({
       title: v.title,
       status: v.status,
       progress: v.progress || 0,
       error: v.error || null,
     })),
   };
   res.json({ success: true, data: summary });
 });
 
 // Browse folder contents
 router.get('/browse/:folderName', (req, res) => {
   const folderPath = path.join(DOWNLOAD_DIR, req.params.folderName);
   if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
     return res.status(404).json({ success: false, detail: '目錄不存在' });
   }
   const allFiles = fs.readdirSync(folderPath).filter(f => {
     return fs.statSync(path.join(folderPath, f)).isFile();
   });
   const rows = allFiles.map((f, i) => {
     const relPath = path.relative(DOWNLOAD_DIR, path.join(folderPath, f));
     const size = (fs.statSync(path.join(folderPath, f)).size / 1024 / 1024).toFixed(1);
     return `<tr><td>${i+1}</td><td>${f}</td><td>${size} MB</td><td><a href="/downloadyt/api/advance/file?path=${encodeURIComponent(relPath)}">下載</a></td></tr>`;
   }).join('');
 
   const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><title>${req.params.folderName}</title>
 <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;background:#111;color:#eee}
 h2{color:#e94560;margin-bottom:4px}.info{color:#888;margin-bottom:20px}
 table{width:100%;border-collapse:collapse}th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #333}
 a{color:#4caf50;text-decoration:none}a:hover{text-decoration:underline}
 .zip-btn{display:inline-block;margin-bottom:16px;padding:8px 18px;background:#e94560;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem}
 </style></head><body>
 <a href="javascript:history.back()" style="color:#888">← 返回</a>
 <h2>${req.params.folderName}</h2>
 <p class="info">${allFiles.length} 個檔案，點擊名稱下載</p>
 <a class="zip-btn" href="/downloadyt/api/advance/download-zip/${encodeURIComponent(req.params.folderName)}">下載全部 ZIP</a>
 <table><thead><tr><th>#</th><th>檔案</th><th>大小</th><th></th></tr></thead><tbody>${rows}</tbody></table>
 </body></html>`;
   res.send(html);
 });
 
 // Download folder as ZIP
 router.get('/download-zip/:folderName', (req, res) => {
   const folderPath = path.join(DOWNLOAD_DIR, req.params.folderName);
   if (!fs.existsSync(folderPath)) {
     return res.status(404).json({ success: false, detail: '目錄不存在' });
   }
   const zipName = req.params.folderName + '.zip';
   res.setHeader('Content-Type', 'application/zip');
   res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`);
   const archive = archiver('zip', { zlib: { level: 5 } });
   archive.on('error', () => { if (!res.headersSent) res.status(500).end(); });
   archive.pipe(res);
   archive.directory(folderPath, req.params.folderName);
   archive.finalize();
 });
 
 // Serve individual files from a folder
 router.get('/file', (req, res) => {
   const filePath = req.query.path;
   if (!filePath) return res.status(400).json({ success: false, detail: '缺少路徑' });
   const resolved = path.resolve(DOWNLOAD_DIR, filePath);
   if (!resolved.startsWith(DOWNLOAD_DIR)) {
     return res.status(403).json({ success: false, detail: '路徑不允許' });
   }
   if (!fs.existsSync(resolved)) {
     return res.status(404).json({ success: false, detail: '檔案不存在' });
   }
   res.download(resolved, path.basename(resolved));
 });
 
 // Download result file/zip
 router.get('/download/:batchId', (req, res) => {
   const batch = getBatch(req.params.batchId);
   if (!batch || batch.status !== 'completed') {
     return res.status(404).json({ success: false, detail: '檔案不存在或尚未完成' });
   }
 
   if (batch.resultType === 'zip' && batch.resultPath && fs.existsSync(batch.resultPath)) {
     const filename = path.basename(batch.resultPath);
     return res.download(batch.resultPath, filename);
   }
 
   if (batch.resultType === 'folder' && batch.resultPath && fs.existsSync(batch.resultPath)) {
     const folderName = batch.resultName || 'download';
     return res.redirect(`/downloadyt/api/advance/browse/${encodeURIComponent(folderName)}`);
   }
 
   if (batch.resultType === 'video' && batch.resultPaths && batch.resultPaths.length > 0) {
     const files = batch.resultPaths.filter(f => {
       const fp = path.join(DOWNLOAD_DIR, f);
       return fs.existsSync(fp) && fs.statSync(fp).isFile();
     });
     if (files.length === 0) {
       return res.status(404).json({ success: false, detail: '沒有下載檔案' });
     }
     const fileList = files.map(f =>
       `{name:${JSON.stringify(f)},url:"/downloadyt/api/advance/file?path=${encodeURIComponent(f)}"}`
     ).join(',\n    ');
     const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><title>下載檔案</title>
 <style>body{font-family:sans-serif;max-width:600px;margin:60px auto;background:#111;color:#eee;text-align:center}
 h2{color:#e94560}ul{text-align:left;display:inline-block;margin:20px auto}
 li{color:#888;padding:4px 0}.done{color:#4caf50}</style></head><body>
 <h2>正在下載 ${files.length} 個檔案...</h2>
 <p style="color:#888">瀏覽器會自動開始下載每個檔案</p>
 <ul id="list">${files.map(f => `<li>${f}</li>`).join('')}</ul>
 <script>
 const files = [
     ${fileList}
 ];
 let i = 0;
 const list = document.getElementById('list');
 function next() {
   if (i >= files.length) {
     document.querySelector('h2').textContent = '全部下載完成！';
     return;
   }
   const a = document.createElement('a');
   a.href = files[i].url;
   a.download = files[i].name;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   list.children[i].classList.add('done');
   i++;
   setTimeout(next, 800);
 }
 next();
 </script>
 </body></html>`;
     res.send(html);
     return;
   }
 
   res.status(404).json({ success: false, detail: '沒有下載檔案' });
 });
 
 export default router;
