 /**
  * API routes — all /downloadyt/api/* endpoints
  */
 import { fileURLToPath } from 'url';
 import express from 'express';
 import path from 'path';
 import fs from 'fs';
 import { spawn } from 'child_process';
 import { v4 as uuidv4 } from 'uuid';
 import ffmpeg from '@ffmpeg-installer/ffmpeg';
 
 import {
   getVideoInfo, downloadVideo,
   formatDuration,
   downloadProgress, downloadResults,
   DOWNLOAD_DIR, COOKIES_FILE
 } from '../../services/downloadyt/downloader.js';
 import { isTempOverLimit } from '../../services/downloadyt/cleanup.js';
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
 const TOOLS_DIR = path.join(PROJECT_ROOT, 'tools', 'downloadyt');
 const YTDLP_CMD = path.join(TOOLS_DIR, 'ytdlp', 'yt-dlp.exe');
 const FFMPEG_CMD = ffmpeg.path;
 
 const router = express.Router();
 
 function resolvePython() {
   const configured = process.env.PYTHON_PATH;
   if (configured && fs.existsSync(configured)) return configured;
   return process.platform === 'win32' ? 'python' : 'python3';
 }
 
 function sanitizeFilename(name) {
   return String(name).replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim().substring(0, 200);
 }
 
 // ==================== Cookie Management ====================
 
 router.get('/cookies', (req, res) => {
   const exists = fs.existsSync(COOKIES_FILE);
   res.json({ success: true, hasCookie: exists });
 });
 
 router.post('/cookies/refresh', async (req, res) => {
   const pythonPath = resolvePython();
   const extractScript = path.join(__dirname, '..', '..', '..', 'tools', 'downloadyt', 'extract_cookies.py');
 
   const proc = spawn(pythonPath, [extractScript], {
     cwd: PROJECT_ROOT,
     stdio: 'pipe'
   });
 
   let stdout = '';
   let stderr = '';
   proc.stdout.on('data', (d) => { stdout += d.toString(); });
   proc.stderr.on('data', (d) => { stderr += d.toString(); });
 
   proc.on('close', (code) => {
     if (code === 0 && fs.existsSync(COOKIES_FILE)) {
       res.json({ success: true, message: 'Cookies 已更新' });
     } else {
       res.status(400).json({ success: false, detail: stderr || stdout || 'Cookie 提取失敗' });
     }
   });
 
   proc.on('error', (err) => {
     res.status(400).json({ success: false, detail: err.message });
   });
 });
 
 // ==================== Direct Download API ====================
 
 /** Get video title quickly via yt-dlp */
 function getVideoTitle(url) {
   return new Promise((resolve, reject) => {
     const proc = spawn(YTDLP_CMD, [
       '--cookies', COOKIES_FILE,
       '--js-runtime', 'quickjs',
       '--extractor-args', 'youtube:player_client=android_vr',
       '--no-warnings', '--no-check-certificate',
       '--print', 'title',
       url
     ], { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
     const chunks = [];
     let stderr = '';
     proc.stdout.on('data', d => { chunks.push(d); });
     proc.stderr.on('data', d => { stderr += d.toString('utf-8'); });
     proc.on('close', code => {
       const buf = Buffer.concat(chunks);
       let title = '';
       try { title = new TextDecoder('big5', { fatal: false }).decode(buf); }
       catch { title = buf.toString('utf-8'); }
       title = title.trim();
       if (code === 0 && title) resolve(title);
       else reject(new Error(stderr || '無法取得影片標題'));
     });
     proc.on('error', reject);
   });
 }
 
 router.get('/direct/video', async (req, res) => {
   try {
     const url = req.query.url;
     if (!url) return res.status(400).json({ success: false, detail: '請提供 url= 參數' });
 
     let filename = 'video.mp4';
     try {
       const title = await getVideoTitle(url);
       filename = sanitizeFilename(title) + '.mp4';
     } catch (e) {
       console.log('[Direct] Title fetch failed, using default name:', e.message);
     }
 
     res.setHeader('Content-Type', 'video/mp4');
     res.attachment(filename);
 
     const proc = spawn(YTDLP_CMD, [
       '--cookies', COOKIES_FILE,
       '--js-runtime', 'quickjs',
       '--extractor-args', 'youtube:player_client=android_vr',
       '--ffmpeg-location', FFMPEG_CMD,
       '--no-warnings', '--no-check-certificate',
       '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
       '--merge-output-format', 'mp4',
       '-o', '-',
       url
     ], { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
 
     proc.stdout.pipe(res);
     proc.stderr.on('data', d => { /* ignore progress */ });
     proc.on('error', err => {
       if (!res.headersSent) res.status(500).json({ success: false, detail: err.message });
     });
   } catch (error) {
     if (!res.headersSent) res.status(500).json({ success: false, detail: error.message });
   }
 });
 
 router.get('/direct/music', async (req, res) => {
   try {
     const url = req.query.url;
     if (!url) return res.status(400).json({ success: false, detail: '請提供 url= 參數' });
 
     let filename = 'audio.m4a';
     try {
       const title = await getVideoTitle(url);
       filename = sanitizeFilename(title) + '.m4a';
     } catch (e) {
       console.log('[Direct] Title fetch failed, using default name:', e.message);
     }
 
     res.setHeader('Content-Type', 'audio/mp4');
     res.attachment(filename);
 
     const proc = spawn(YTDLP_CMD, [
       '--cookies', COOKIES_FILE,
       '--js-runtime', 'quickjs',
       '--extractor-args', 'youtube:player_client=android_vr',
       '--no-warnings', '--no-check-certificate',
       '-f', 'bestaudio[ext=m4a]/bestaudio',
       '-o', '-',
       url
     ], { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
 
     proc.stdout.pipe(res);
     proc.stderr.on('data', d => { /* ignore progress */ });
     proc.on('error', err => {
       if (!res.headersSent) res.status(500).json({ success: false, detail: err.message });
     });
   } catch (error) {
     if (!res.headersSent) res.status(500).json({ success: false, detail: error.message });
   }
 });
 
 // ==================== Video Operations ====================
 
 // POST /api/formats - Get format list
 router.post('/formats', async (req, res) => {
   try {
     const { url } = req.body;
     if (!url) {
       return res.status(400).json({ success: false, detail: '請輸入影片 URL' });
     }
 
     const info = await getVideoInfo(url);
     res.json({ success: true, data: info });
   } catch (error) {
     res.status(400).json({ success: false, detail: error.message });
   }
 });
 
 // POST /api/parse — synonym for formats
 router.post('/parse', async (req, res) => {
   try {
     const { url } = req.body;
     if (!url) {
       return res.status(400).json({ success: false, detail: '請輸入影片 URL' });
     }
 
     const info = await getVideoInfo(url);
     res.json({ success: true, data: info });
   } catch (error) {
     res.status(400).json({ success: false, detail: error.message });
   }
 });
 
 // POST /api/download - Start download
 router.post('/download', async (req, res) => {
   try {
     const { url, format_id, title } = req.body;
     if (!url || !format_id) {
       return res.status(400).json({ success: false, detail: '參數不完整' });
     }
 
     const taskId = uuidv4();
 
     // Start download (non-blocking)
     downloadVideo(url, format_id, taskId, title, req.ip);
 
     res.json({ success: true, task_id: taskId });
   } catch (error) {
     res.status(400).json({ success: false, detail: error.message });
   }
 });
 
 // GET /api/progress/:taskId - Download progress
 router.get('/progress/:taskId', (req, res) => {
   const { taskId } = req.params;
   if (!downloadProgress[taskId]) {
     return res.status(404).json({ success: false, detail: '任務不存在' });
   }
   res.json({ success: true, data: downloadProgress[taskId] });
 });
 
 // GET /api/status/:taskId - Alias
 router.get('/status/:taskId', (req, res) => {
   const { taskId } = req.params;
   if (!downloadProgress[taskId]) {
     return res.status(404).json({ success: false, detail: '任務不存在' });
   }
   res.json({ success: true, data: downloadProgress[taskId] });
 });
 
 // GET /api/downloaded/:taskId - Download file
 router.get('/downloaded/:taskId', (req, res) => {
   const { taskId } = req.params;
 
   if (!downloadResults[taskId]) {
     return res.status(404).json({ success: false, detail: '檔案不存在' });
   }
 
   const filepath = downloadResults[taskId];
   if (!fs.existsSync(filepath)) {
     return res.status(404).json({ success: false, detail: '檔案不存在' });
   }
 
   const filename = path.basename(filepath);
   res.download(filepath, filename);
 });
 
 // DELETE /api/task/:taskId
 router.delete('/task/:taskId', (req, res) => {
   const { taskId } = req.params;
 
   if (downloadResults[taskId]) {
     const filepath = downloadResults[taskId];
     if (fs.existsSync(filepath)) {
       fs.unlinkSync(filepath);
     }
     delete downloadResults[taskId];
   }
 
   delete downloadProgress[taskId];
 
   res.json({ success: true, message: '任務已刪除' });
 });
 
 export default router;
