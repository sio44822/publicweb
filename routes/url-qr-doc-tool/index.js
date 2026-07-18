 /**
  * URL/QR Code 工具路由
  */
 import express from 'express';
 import db from '../../utils/db/index.js';
 import { getUserId, getNavServices } from '../_helpers.js';
 
 const router = express.Router();
 
 router.get('/public/url-qr-doc-tool', async (req, res) => {
   const userId = getUserId(req, res);
   try {
     await db.statistics.recordVisit(userId, '/public/url-qr-doc-tool');
   } catch (e) {
     console.error('[recordVisit] url-qr-doc-tool error:', e.message);
   }
   const navServices = await getNavServices('/public/url-qr-doc-tool');
   res.render('url-qr-doc-tool/index', { navServices, currentPath: '/public/url-qr-doc-tool' });
 });
 
 export default router;
