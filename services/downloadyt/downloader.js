 /**
  * downloader.js — Hybrid download service
  * - Playwright (browser_download.py) for format listing (bypasses anti-bot)
  * - yt-dlp (3DYD build + QuickJS) for downloading (android_vr client)
  */
 import { fileURLToPath } from 'url';
 import path from 'path';
 import fs from 'fs';
 import { spawn, execSync } from 'child_process';
 import ffmpeg from '@ffmpeg-installer/ffmpeg';
 import 'dotenv/config';
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
 const TOOLS_DIR = path.join(PROJECT_ROOT, 'tools', 'downloadyt');
 const DOWNLOAD_DIR = path.join(PROJECT_ROOT, 'public', 'downloadyt', 'downloads');
 const COOKIES_FILE = path.join(PROJECT_ROOT, 'cookies', 'downloadyt', 'youtube.txt');
 
 function sanitizeFilename(name) {
   return String(name).replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim().substring(0, 200);
 }
 
 function resolvePython() {
   const configured = process.env.PYTHON_PATH;
   if (configured && fs.existsSync(configured)) return configured;
   return process.platform === 'win32' ? 'python' : 'python3';
 }
 
 const PYTHON_PATH = resolvePython();
 const DOWNLOADER_SCRIPT = path.join(TOOLS_DIR, 'browser_download.py');
 const YTDLP_CMD = path.join(TOOLS_DIR, 'ytdlp', 'yt-dlp.exe');
 const FFMPEG_CMD = ffmpeg.path;
 
 const RECORD_FILE = path.join(TOOLS_DIR, 'record.txt');
 
 function timestamp() {
   const now = new Date();
   const pad = (n) => String(n).padStart(2, '0');
   return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
 }
 
 function writeRecord(filename, ip) {
   const line = `${timestamp()}-${filename}-${ip}\n`;
   fs.appendFileSync(RECORD_FILE, line, 'utf-8');
 }
 
 const downloadProgress = {};
 const downloadResults = {};
 
 /** Run browser_download.py for format listing */
 function runPlaywrightFormats(url) {
   return new Promise((resolve, reject) => {
     const proc = spawn(PYTHON_PATH, [DOWNLOADER_SCRIPT, 'formats', url, '--cookies', COOKIES_FILE], {
       cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe']
     });
     let lastResult = null;
     proc.stdout.on('data', (d) => {
       for (const line of d.toString('utf-8').split('\n').filter(l => l.trim())) {
         try {
           const msg = JSON.parse(line);
           if (msg.type === 'result') lastResult = msg.data;
           if (msg.type === 'error') reject(new Error(msg.message));
         } catch (e) { }
       }
     });
     let stderr = '';
     proc.stderr.on('data', (d) => { stderr += d.toString('utf-8'); });
     proc.on('close', (code) => {
       if (code === 0 && lastResult) resolve(lastResult);
       else reject(new Error(stderr || `Formats exited ${code}`));
     });
     proc.on('error', reject);
   });
 }
 
 function formatDuration(s) {
   if (!s || s <= 0) return '';
   const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
   return h > 0
     ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
     : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
 }
 
 async function getVideoInfo(url) {
   const info = await runPlaywrightFormats(url);
   info.duration_formatted = formatDuration(info.duration);
   return info;
 }
 
 /**
  * Download using yt-dlp with QuickJS + android_vr client
  * Auto-selects best audio (140) for video-only formats
  */
 async function downloadVideo(url, formatId, taskId, title, ip) {
 
   const videoTitle = title || url;
   downloadProgress[taskId] = {
     status: 'downloading', percent: 0,
     message: '正在分析影片資訊...', title: videoTitle
   };
 
   const outputTmpl = path.join(DOWNLOAD_DIR, `${taskId}.%(ext)s`);
 
   // Determine format string and whether this is an audio download
   let formatStr, isAudio = false;
   if (formatId === 'm4a_best') {
     // M4A: download best audio directly, no conversion
     isAudio = true;
     formatStr = 'bestaudio[ext=m4a]/bestaudio';
   } else if (/^\d+$/.test(formatId) && parseInt(formatId) > 100) {
     // Video-only format: merge with best m4a audio (AAC, MP4-compatible)
     formatStr = `${formatId}+bestaudio[ext=m4a]/best`;
   } else {
     formatStr = formatId;
   }
 
   const args = [
     '--cookies', COOKIES_FILE,
     '--js-runtime', 'quickjs',
     '-f', formatStr,
     ...(isAudio
       ? []
       : ['--merge-output-format', 'mp4']),
     '--output', outputTmpl,
     '--progress', '--newline',
     '--no-warnings', '--no-check-certificate',
     '--ffmpeg-location', FFMPEG_CMD,
     '--extractor-args', 'youtube:player_client=android_vr',
     url
   ];
 
   return new Promise((resolve) => {
     const proc = spawn(YTDLP_CMD, args, {
       cwd: PROJECT_ROOT, env: process.env,
       stdio: ['pipe', 'pipe', 'pipe']
     });
     let stderr = '';
 
     proc.stdout.on('data', (data) => {
       const str = data.toString();
       const m = str.match(/(\d+\.?\d*)%/);
       if (m) {
         const pct = parseFloat(m[1]);
         downloadProgress[taskId] = {
           status: 'downloading', percent: pct,
           message: `下載中... ${pct}%`, title: videoTitle
         };
       }
     });
     proc.stderr.on('data', (d) => { stderr += d.toString('utf-8'); });
     proc.on('close', (code) => {
       if (code === 0) {
         try {
           const ext = isAudio ? '.m4a' : '.mp4';
           const files = fs.readdirSync(DOWNLOAD_DIR)
             .filter(f => f.startsWith(taskId) && f.endsWith(ext))
             .sort((a, b) => fs.statSync(path.join(DOWNLOAD_DIR, b)).mtimeMs -
                           fs.statSync(path.join(DOWNLOAD_DIR, a)).mtimeMs);
           if (files.length > 0) {
             const oldPath = path.join(DOWNLOAD_DIR, files[0]);
             // Rename to video title
             const safeTitle = sanitizeFilename(videoTitle);
             const newName = safeTitle + ext;
             const newPath = path.join(DOWNLOAD_DIR, newName);
             // Avoid collision
             let finalPath = newPath;
             let counter = 1;
             while (fs.existsSync(finalPath)) {
               finalPath = path.join(DOWNLOAD_DIR, `${safeTitle}_(${counter})${ext}`);
               counter++;
             }
             fs.renameSync(oldPath, finalPath);
             const finalName = path.basename(finalPath);
             downloadResults[taskId] = finalPath;
             downloadProgress[taskId] = {
               status: 'completed', percent: 100,
               filename: finalName, title: videoTitle, message: '下載完成！'
             };
             writeRecord(finalName, ip || '0.0.0.0');
             return;
           }
         } catch (e) { }
       }
       downloadProgress[taskId] = {
         status: 'error', percent: 0,
         message: `下載失敗: ${stderr.substring(0, 200) || '未知錯誤' + code}`,
         title: videoTitle
       };
     });
     proc.on('error', (err) => {
       downloadProgress[taskId] = {
         status: 'error', percent: 0,
         message: `下載失敗: ${err.message}`, title: videoTitle
       };
     });
   });
 }
 
 async function checkDownloader() {
   try {
     execSync(`"${PYTHON_PATH}" -c "import playwright"`, { stdio: 'ignore' });
     execSync(`"${YTDLP_CMD}" --version`, { stdio: 'ignore' });
     return true;
   } catch (e) {
     return false;
   }
 }
 
 export {
   checkDownloader, getVideoInfo, downloadVideo,
   formatDuration, downloadProgress, downloadResults,
   DOWNLOAD_DIR, COOKIES_FILE, FFMPEG_CMD
 };
