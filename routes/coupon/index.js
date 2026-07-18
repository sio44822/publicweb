 /**
  * 優惠券工具路由
  */
 import express from 'express';
 import db from '../../utils/db/index.js';
 import { getUserId, getNavServices } from '../_helpers.js';
 
 const router = express.Router();
 
 router.get('/public/coupon', async (req, res) => {
   const userId = getUserId(req, res);
   try {
     await db.statistics.recordVisit(userId, '/public/coupon');
   } catch (e) {
     console.error('[recordVisit] coupon error:', e.message);
   }
   const navServices = await getNavServices('/public/coupon');
   res.render('coupon/index', { navServices, currentPath: '/public/coupon' });
 });
 
 export default router;
