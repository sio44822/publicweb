 /**
  * ZIP packaging service
  */
 import { fileURLToPath } from 'url';
 import path from 'path';
 import fs from 'fs';
 import archiver from 'archiver';
 import { v4 as uuidv4 } from 'uuid';
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
 const DOWNLOADS_DIR = path.join(PROJECT_ROOT, 'public', 'downloadyt', 'downloads');
 
 /**
  * Create a ZIP from selected files
  * @param {string} taskId - The task ID
  * @param {string[]} files - Array of filenames to include
  * @returns {Promise<{zipPath: string, zipName: string}>}
  */
 function createZip(taskId, files) {
   return new Promise((resolve, reject) => {
     if (!files || files.length === 0) {
       return reject(new Error('沒有檔案可以打包'));
     }
 
     const zipName = `download_${taskId.slice(0, 8)}.zip`;
     const zipPath = path.join(DOWNLOADS_DIR, zipName);
 
     const output = fs.createWriteStream(zipPath);
     const archive = archiver('zip', { zlib: { level: 5 } });
 
     output.on('close', () => {
       console.log(`[Packager] ZIP created: ${zipName} (${archive.pointer()} bytes)`);
       resolve({ zipPath, zipName, size: archive.pointer() });
     });
 
     archive.on('error', reject);
     output.on('error', reject);
 
     archive.pipe(output);
 
     for (const file of files) {
       const filePath = path.join(DOWNLOADS_DIR, file);
       if (fs.existsSync(filePath)) {
         archive.file(filePath, { name: file });
         console.log(`[Packager] Adding to ZIP: ${file}`);
       } else {
         console.warn(`[Packager] File not found: ${file}`);
       }
     }
 
     archive.finalize();
   });
 }
 
 export { createZip };
