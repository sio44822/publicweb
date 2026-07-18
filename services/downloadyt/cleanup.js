 /**
  * Temp file cleanup service
  */
 import { fileURLToPath } from 'url';
 import path from 'path';
 import fs from 'fs';
 import cron from 'node-cron';
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
 const TEMP_DIR = path.join(PROJECT_ROOT, 'temp');
 const DOWNLOADS_DIR = path.join(PROJECT_ROOT, 'public', 'downloadyt', 'downloads');
 const CLEANUP_MINUTES = parseInt(process.env.CLEANUP_MINUTES || '5', 10);
 const MAX_TEMP_SIZE_GB = parseInt(process.env.MAX_TEMP_SIZE_GB || '50', 10);
 
 /**
  * Calculate directory size in bytes
  */
 function getDirSize(dirPath) {
   let size = 0;
   if (!fs.existsSync(dirPath)) return 0;
   const files = fs.readdirSync(dirPath, { withFileTypes: true });
   for (const file of files) {
     const fp = path.join(dirPath, file.name);
     if (file.isDirectory()) {
       size += getDirSize(fp);
     } else {
       size += fs.statSync(fp).size;
     }
   }
   return size;
 }
 
 /**
  * Format bytes to human-readable
  */
 function formatBytes(bytes) {
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
   if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
   return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
 }
 
 /**
  * Delete old files from a directory
  */
 function cleanDir(dirPath, maxAgeMs) {
   if (!fs.existsSync(dirPath)) return;
   const now = Date.now();
   const entries = fs.readdirSync(dirPath, { withFileTypes: true });
 
   for (const entry of entries) {
     const fp = path.join(dirPath, entry.name);
     try {
       const stats = fs.statSync(fp);
       if (now - stats.mtimeMs > maxAgeMs) {
         if (entry.isDirectory()) {
           fs.rmSync(fp, { recursive: true, force: true });
         } else {
           fs.unlinkSync(fp);
         }
       }
     } catch (e) {
     }
   }
 }
 
 /**
  * Check temp size and reject if over limit
  */
 function isTempOverLimit() {
   const size = getDirSize(TEMP_DIR) + getDirSize(DOWNLOADS_DIR);
   const maxBytes = MAX_TEMP_SIZE_GB * 1024 * 1024 * 1024;
   return size > maxBytes;
 }
 
 /**
  * Initialize cleanup cron job
  */
 function initCleanup() {
   const maxAgeMs = CLEANUP_MINUTES * 60 * 1000;
 
   // Run cleanup every 1 minute
   cron.schedule('* * * * *', () => {
     cleanDir(TEMP_DIR, maxAgeMs);
     cleanDir(DOWNLOADS_DIR, maxAgeMs);
   });
 
   // Also run once at startup
   cleanDir(TEMP_DIR, maxAgeMs);
   cleanDir(DOWNLOADS_DIR, maxAgeMs);
 }
 
 export { initCleanup, isTempOverLimit, cleanDir, getDirSize, formatBytes };
