 /**
  * 共用工具函式 — 提供路由層使用的 getUserId / getNavServices
  */
 import { v4 as uuidv4 } from 'uuid';
 import db from '../utils/db/index.js';
 
 export function getUserId(req, res) {
   let userId = req.cookies.coupon_user_id;
   if (!userId) {
     userId = uuidv4();
     res.cookie('coupon_user_id', userId, {
       maxAge: 365 * 24 * 60 * 60 * 1000,
       httpOnly: true
     });
   }
   return userId;
 }
 
 export async function getNavServices(currentPath) {
   const services = await db.services.getEnabled();
   const currentService = services.find(s => s.url === currentPath);
   if (!currentService || currentService.showInNav === false) return [];
   return services.map(s => ({ id: s.id, name: s.name, url: s.url, icon: s.icon }));
 }
