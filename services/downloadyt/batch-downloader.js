 /**
  * batch-downloader.js — Parallel batch download orchestrator
  */
 import { fileURLToPath } from 'url';
 import path from 'path';
 import fs from 'fs';
 import { spawn } from 'child_process';
 import archiver from 'archiver';
 import ffmpeg from '@ffmpeg-installer/ffmpeg';
 import { v4 as uuidv4 } from 'uuid';
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
 const TOOLS_DIR = path.join(PROJECT_ROOT, 'tools', 'downloadyt');
 const DOWNLOAD_DIR = path.join(PROJECT_ROOT, 'public', 'downloadyt', 'downloads');
 const COOKIES_FILE = path.join(PROJECT_ROOT, 'cookies', 'downloadyt', 'youtube.txt');
 
 function resolvePython() {
   const configured = process.env.PYTHON_PATH;
   if (configured && fs.existsSync(configured)) return configured;
   return process.platform === 'win32' ? 'python' : 'python3';
 }
 
 const PYTHON_PATH = resolvePython();
 const DOWNLOADER_SCRIPT = path.join(TOOLS_DIR, 'browser_download.py');
 const YTDLP_CMD = path.join(TOOLS_DIR, 'ytdlp', 'yt-dlp.exe');
 const FFMPEG_CMD = ffmpeg.path;
 const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '5', 10);
 
 // In-memory batch store
 const batches = {};
 
 // ==================== Helpers ====================
 
 function isPlaylistUrl(url) {
   return /youtube\.com\/(playlist|watch.*[&?]list=)/i.test(url);
 }
 
 /** Parse playlist URL — array of video URLs */
 function parsePlaylist(url) {
   return new Promise((resolve, reject) => {
     const proc = spawn(YTDLP_CMD, [
       '--flat-playlist', '--dump-json',
       '--cookies', COOKIES_FILE,
       '--extractor-args', 'youtube:player_client=android_vr',
       '--no-warnings', '--no-check-certificate',
       url
     ], { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
 
     let stdout = '';
     let stderr = '';
     proc.stdout.on('data', d => { stdout += d.toString('utf-8'); });
     proc.stderr.on('data', d => { stderr += d.toString('utf-8'); });
     proc.on('close', code => {
       if (code !== 0) return reject(new Error(stderr || 'Playlist parse failed'));
       const urls = stdout.trim().split('\n').filter(Boolean).map(line => {
         try { return JSON.parse(line).url || JSON.parse(line).webpage_url; }
         catch { return null; }
       }).filter(Boolean);
       resolve(urls);
     });
     proc.on('error', reject);
   });
 }
 
 /** Get best MP4 format ID from Playwright format list */
 function pickBestMp4(info) {
   const formats = info.formats || [];
   const mp4s = formats
     .filter(f => f.ext === 'mp4' && f.has_video)
     .sort((a, b) => (b.height || 0) - (a.height || 0));
   if (mp4s.length === 0) return null;
   return String(mp4s[0].format_id);
 }
 
 /** Sanitize filename */
 function sanitizeFilename(name) {
   return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim().substring(0, 200);
 }
 
 /** Run Playwright format extraction */
 function runPlaywrightFormats(url) {
   return new Promise((resolve, reject) => {
     const proc = spawn(PYTHON_PATH, [DOWNLOADER_SCRIPT, 'formats', url, '--cookies', COOKIES_FILE], {
       cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe']
     });
     let lastResult = null;
     proc.stdout.on('data', d => {
       for (const line of d.toString('utf-8').split('\n').filter(l => l.trim())) {
         try {
           const msg = JSON.parse(line);
           if (msg.type === 'result') lastResult = msg.data;
           if (msg.type === 'error') reject(new Error(msg.message));
         } catch (e) { }
       }
     });
     let stderr = '';
     proc.stderr.on('data', d => { stderr += d.toString('utf-8'); });
     proc.on('close', code => {
       if (code === 0 && lastResult) resolve(lastResult);
       else reject(new Error(stderr || `Formats exited ${code}`));
     });
     proc.on('error', reject);
   });
 }
 
 // ==================== Download One Video ====================
 
 function downloadOneVideo(url, formatId, outputPath, subtitle, onProgress) {
   return new Promise((resolve) => {
     const args = [
       '--cookies', COOKIES_FILE,
       '--js-runtime', 'quickjs',
       '-f', formatId,
       '--merge-output-format', 'mp4',
       '--output', outputPath,
       '--progress', '--newline',
       '--no-warnings', '--no-check-certificate',
       '--ffmpeg-location', FFMPEG_CMD,
       '--extractor-args', 'youtube:player_client=android_vr',
     ];
     if (subtitle) {
       args.push('--write-subs', '--sub-langs', 'zh-Hans,zh-Hant,zh,cmn', '--embed-subs');
     }
     args.push(url);
 
     const proc = spawn(YTDLP_CMD, args, {
       cwd: PROJECT_ROOT, env: process.env,
       stdio: ['pipe', 'pipe', 'pipe']
     });
     let stderr = '';
 
     proc.stdout.on('data', data => {
       const str = data.toString('utf-8');
       const m = str.match(/(\d+\.?\d*)%/);
       if (m && onProgress) onProgress(parseFloat(m[1]));
     });
     proc.stderr.on('data', d => { stderr += d.toString('utf-8'); });
     proc.on('close', code => {
       if (code === 0 && fs.existsSync(outputPath)) {
         resolve({ success: true, path: outputPath });
       } else {
         resolve({ success: false, error: stderr.substring(0, 300) || `Exit code ${code}` });
       }
     });
     proc.on('error', err => resolve({ success: false, error: err.message }));
   });
 }
 
 // ==================== Post-Processing ====================
 
 /** Create folder named YYYYMMDDHHmm and move files */
 function createDatedFolder(files) {
   const now = new Date();
   const pad = n => String(n).padStart(2, '0');
   const folderName = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
   const folderPath = path.join(DOWNLOAD_DIR, folderName);
 
   if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
 
   for (const f of files) {
     if (fs.existsSync(f)) {
       const dest = path.join(folderPath, path.basename(f));
       fs.renameSync(f, dest);
     }
   }
   console.log(`[Batch] Files moved to ${folderPath}`);
   return folderPath;
 }
 
 /** Zip a folder, then delete original files */
 function zipFolder(folderPath) {
   return new Promise((resolve, reject) => {
     const zipPath = folderPath + '.zip';
     const output = fs.createWriteStream(zipPath);
     const archive = archiver('zip', { zlib: { level: 5 } });
 
     output.on('close', () => {
       console.log(`[Batch] ZIP created: ${zipPath} (${archive.pointer()} bytes)`);
       // Cleanup original folder
       fs.rmSync(folderPath, { recursive: true, force: true });
       resolve(zipPath);
     });
     archive.on('error', reject);
     output.on('error', reject);
 
     archive.pipe(output);
     archive.directory(folderPath, path.basename(folderPath));
     archive.finalize();
   });
 }
 
 // ==================== Main Batch Orchestrator ====================
 
 async function runBatch(batchId, urls, subtitle, postAction) {
   const batch = batches[batchId];
   if (!batch) return;
 
   batch.status = 'parsing';
 
   // Step 1: Expand playlist URLs
   const allUrls = [];
   for (const url of urls) {
     const trimmed = url.trim();
     if (!trimmed) continue;
     if (isPlaylistUrl(trimmed)) {
       try {
         batch.log.push(`解析播放清單: ${trimmed}`);
         const playlistUrls = await parsePlaylist(trimmed);
         allUrls.push(...playlistUrls);
         batch.log.push(`  找到 ${playlistUrls.length} 個影片`);
       } catch (e) {
         batch.log.push(`  解析失敗: ${e.message}`);
       }
     } else {
       allUrls.push(trimmed);
     }
   }
 
   // Step 2: Deduplicate
   const seen = new Set();
   const uniqueUrls = allUrls.filter(u => {
     const key = u.trim();
     if (seen.has(key)) return false;
     seen.add(key);
     return true;
   });
   batch.log.push(`總共 ${uniqueUrls.length} 個影片`);
 
   // Step 3: Get formats for all videos (sequential)
   batch.status = 'analyzing';
   const videoTasks = [];
   for (let i = 0; i < uniqueUrls.length; i++) {
     const url = uniqueUrls[i];
     try {
       const info = await runPlaywrightFormats(url);
       const formatId = pickBestMp4(info);
       if (!formatId) {
         videoTasks.push({ url, title: info.title || url, status: 'error', error: '沒有找到 MP4 格式' });
         batch.log.push(`❌ ${info.title || url}: 沒 MP4 格式`);
       } else {
         const title = sanitizeFilename(info.title || 'video');
         const outputPath = path.join(DOWNLOAD_DIR, `${title}.mp4`);
         videoTasks.push({
           url, title: info.title || url, formatId, outputPath,
           status: 'pending', progress: 0
         });
       }
     } catch (e) {
       videoTasks.push({ url, title: url, status: 'error', error: e.message });
       batch.log.push(`❌ ${url}: ${e.message}`);
     }
     batch.videos = [...videoTasks];
     batch.totalCount = videoTasks.length;
     batch.completedCount = videoTasks.filter(v => v.status === 'error').length;
   }
 
   // Step 4: Download with concurrency limit
   batch.status = 'downloading';
   const pending = videoTasks.filter(v => v.status === 'pending');
   const inProgress = new Set();
 
   async function downloadTask(task) {
     inProgress.add(task);
     task.status = 'downloading';
     batch.log.push(`⬇️ ${task.title}`);
 
     const result = await downloadOneVideo(task.url, task.formatId, task.outputPath, subtitle, (pct) => {
       task.progress = pct;
     });
 
     inProgress.delete(task);
     if (result.success) {
       task.status = 'completed';
       task.progress = 100;
       task.filepath = result.path;
       batch.completedCount++;
       batch.log.push(`✅ ${task.title}`);
     } else {
       task.status = 'error';
       task.error = result.error;
       batch.completedCount++;
       batch.log.push(`❌ ${task.title}: ${result.error}`);
     }
 
     // Start next pending task
     const next = pending.find(t => t.status === 'pending' && !inProgress.has(t));
     if (next) await downloadTask(next);
   }
 
   // Start initial batch of concurrent downloads
   const initial = pending.slice(0, MAX_CONCURRENT);
   await Promise.all(initial.map(t => downloadTask(t)));
 
   // Step 5: Post-processing
   batch.status = 'processing';
   const succeeded = videoTasks.filter(v => v.status === 'completed' && v.filepath);
   const files = succeeded.map(v => v.filepath).filter(fs.existsSync);
 
   if (files.length === 0) {
     batch.status = 'completed';
     batch.resultType = 'none';
     batch.log.push('沒有任何檔案成功下載');
     return;
   }
 
   if (postAction === 'folder' || postAction === 'zip') {
     const folderPath = createDatedFolder(files);
     if (postAction === 'zip') {
       batch.resultPath = await zipFolder(folderPath);
       batch.resultType = 'zip';
       batch.resultName = path.basename(batch.resultPath);
     } else {
       batch.resultPath = folderPath;
       batch.resultType = 'folder';
       batch.resultName = path.basename(folderPath);
     }
   } else {
     // video mode: files stay in downloads/
     batch.resultType = 'video';
     batch.resultPaths = files.map(f => path.basename(f));
   }
 
   batch.status = 'completed';
   batch.log.push(`完成！成功 ${succeeded.length}/${videoTasks.length}`);
 }
 
 // ==================== Public API ====================
 
 function createBatch(urls, subtitle, postAction) {
   const batchId = uuidv4();
   batches[batchId] = {
     id: batchId,
     status: 'created',
     urls,
     subtitle: !!subtitle,
     postAction: postAction || 'video',
     videos: [],
     totalCount: 0,
     completedCount: 0,
     log: [],
     resultType: null,
     resultPath: null,
     resultPaths: null,
     resultName: null,
     createdAt: new Date().toISOString(),
   };
 
   // Start async
   runBatch(batchId, urls, !!subtitle, postAction || 'video');
   return batchId;
 }
 
 function getBatch(batchId) {
   return batches[batchId] || null;
 }
 
 export { createBatch, getBatch, DOWNLOAD_DIR };
