 /**
  * SendContent 路由 — 房間管理、檔案上傳/下載
  */
 import express from 'express';
 import multer from 'multer';
 import QRCode from 'qrcode';
 import { v4 as uuidv4 } from 'uuid';
 import path from 'path';
 import fs from 'fs';
 import { fileURLToPath } from 'url';
 import { sessions } from '../../services/sendcontent/session-store.js';
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const UPLOAD_DIR = process.env.VERCEL ? '/tmp/uploads/sendcontent' : path.join(PROJECT_ROOT, 'uploads', 'sendcontent');
 const API_PREFIX = '/public/sendcontent';
 
 const router = express.Router();
 
 function generateRoomNumber() {
   return Math.floor(1000 + Math.random() * 9000).toString();
 }
 
 // ===== Multer 設定 =====
 const storage = multer.diskStorage({
   destination: UPLOAD_DIR,
   filename: (req, file, cb) => {
     let originalName = file.originalname;
     try {
       if (/[^\x00-\x7F]/.test(originalName)) {
         const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
         if (/[\u4e00-\u9fa5]/.test(decoded)) originalName = decoded;
       }
     } catch (e) {}
     cb(null, uuidv4() + '-' + originalName);
   }
 });
 
 const upload = multer({ storage });

// 確保上傳目錄存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
   while (sessions.has(code)) code = generateRoomNumber();
 
   const sid = uuidv4();
   sessions.set(sid, { code, devices: [], created: Date.now() });
 
   const host = req.headers.host || 'localhost:' + (process.env.PORT || 80);
   const url = 'http://' + host + API_PREFIX + '/?sid=' + sid;
 
   try {
     const qrImage = await QRCode.toDataURL(url);
     res.json({ qr: qrImage, code, sid, url });
   } catch (err) {
     res.status(500).json({ error: err.message });
   }
 });
 
 // ===== 加入房間 =====
 router.post('/api/room/join', (req, res) => {
   const { code, sid } = req.body;
 
   if (sid && sessions.has(sid)) {
     const session = sessions.get(sid);
     if (session.code === code || !code) return res.json({ success: true, sid });
   }
 
   for (const [sessionId, session] of sessions) {
     if (session.code === code) return res.json({ success: true, sid: sessionId });
   }
 
   res.status(404).json({ error: '房間號錯誤' });
 });
 
 // ===== 檔案上傳 =====
 router.post('/api/upload', upload.single('file'), (req, res) => {
   if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
   res.json({
     filename: req.file.filename,
     originalName: req.file.originalname,
     path: API_PREFIX + '/api/download?file=' + encodeURIComponent(req.file.filename) + '&name=' + encodeURIComponent(req.file.originalname)
   });
 });
 
 // ===== 檔案下載 =====
 router.get('/api/download', (req, res) => {
   const filename = req.query.file;
   const originalName = req.query.name;
   if (!filename) return res.status(400).json({ error: 'Missing filename' });
 
   const filePath = path.join(UPLOAD_DIR, filename);
   if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
 
   res.download(filePath, originalName, (err) => {
     if (err && !res.headersSent) res.status(404).json({ error: 'Download failed' });
   });
 });
 
 export default router;