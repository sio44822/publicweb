 /**
  * 課程預約工具路由
  */
 import express from 'express';
 import db from '../../utils/db/index.js';
 import { getUserId, getNavServices } from '../_helpers.js';
 
 const router = express.Router();
 
 router.get('/public/coursereservation', async (req, res) => {
   const userId = getUserId(req, res);
   try {
     await db.statistics.recordVisit(userId, '/public/coursereservation');
   } catch (e) {
     console.error('[recordVisit] coursereservation error:', e.message);
   }
   const navServices = await getNavServices('/public/coursereservation');
   res.render('coursereservation/index', { navServices, currentPath: '/public/coursereservation' });
 });
 
 export default router;
