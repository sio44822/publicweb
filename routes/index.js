import express from 'express';
import courserservationRoutes from './coursereservation/index.js';
import couponRoutes from './coupon/index.js';
import urlQrDocToolRoutes from './url-qr-doc-tool/index.js';
import db from '../utils/db/index.js';
import statisticsRoutes from './statistics.js';
import { getUserId, getNavServices } from './_helpers.js';

const router = express.Router();

const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 80;

// 根據環境決定 base URL（本地開發用 localhost，正式環境用自訂域名）
const URLBASE = isDev
  ? `http://localhost:${PORT}`
  : process.env.PUBLIC_URL || 'https://your-domain.com';

/**
 * 取得或建立訪客唯一 ID（寫入 Cookie，有效期一年）。
 * 用於訪問統計時區分不同使用者。
 */

/**
 * 取得導覽列的服務清單。
 * 僅回傳已啟用且 currentService 有設定 showInNav 的服務。
 */

// 掛載統計相關路由（含 /statistics、/api/stats/* 等）
router.use(statisticsRoutes);

// ==== 獨立工具路由 ====
router.use(courserservationRoutes);
router.use(couponRoutes);
router.use(urlQrDocToolRoutes);

// 提供前端所需的環境設定（base URL、運行模式）
router.get('/config', (req, res) => {
  res.json({
    URLBASE: URLBASE,
    mode: isDev ? 'development' : 'production'
  });
});

// 首頁及 /services 均渲染服務總覽頁
router.get('/', (req, res) => {
  res.render('services');
});

router.get('/services', (req, res) => {
  res.render('services');
});

// ======================== 公開服務頁面 ========================

/**
 * 課程預約頁面。
 * 記錄訪客造訪行為後，取得導覽列服務清單並渲染頁面。
 */

/**
 * 優惠券頁面。
 * 流程同上：記錄造訪 → 取導覽列 → 渲染頁面。
 */

/**
 * URL 轉 QR Code 文檔工具頁面。
 */

// ======================== 管理後台頁面 ========================

/**
 * 課程管理後台。
 * 透過 Cookie 驗證是否為管理員，決定是否顯示管理功能。
 */
router.get('/mgmt/courses', async (req, res) => {
  const cookie = req.cookies[ADMIN_COOKIE];
  const isAdmin = cookie === ADMIN_SECRET;
  const courses = await db.courses.getAll();
  res.render('admin/courses', { courses, isAdmin });
});

/**
 * 服務管理後台。
 * 除管理員驗證外，額外檢查 show_advanced Cookie 以決定是否顯示進階設定。
 */
router.get('/mgmt/services', async (req, res) => {
  const cookie = req.cookies[ADMIN_COOKIE];
  const isAdmin = cookie === ADMIN_SECRET;
  const showAdvanced = req.cookies.show_advanced === 'true';
  const allServices = await db.services.getAll();
  res.render('admin/services', { services: allServices, isAdmin, showAdvanced });
});

// ======================== 課程 API ========================

/** 取得所有課程清單 */
router.get('/api/courses', async (req, res) => {
  const courses = await db.courses.getAll();
  res.json(courses);
});

/** 新增課程（名稱為必填，其他欄位有預設值） */
router.post('/api/courses', async (req, res) => {
  const { name, description, image, slots } = req.body;
  console.log('=== addCourse request ===');
  console.log('name:', JSON.stringify(name));
  console.log('description:', JSON.stringify(description));
  console.log('image:', JSON.stringify(image));
  console.log('slots:', JSON.stringify(slots));

  if (!name || !name.trim()) {
    return res.status(400).json({ error: '名稱不可為空' });
  }
  const course = await db.courses.add({ name, description, image, slots: slots || [] });
  console.log('course after addCourse:', JSON.stringify(course));

  if (!course) {
    return res.status(400).json({ error: '新增失敗' });
  }
  res.json(course);
});

/** 依 ID 取得單一課程 */
router.get('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const course = await db.courses.getById(id);
  if (!course) {
    return res.status(404).json({ error: '課程不存在' });
  }
  res.json(course);
});

/** 更新指定 ID 的課程 */
router.put('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, image, slots } = req.body;
  const course = await db.courses.updateCourse(id, { name, description, image, slots });
  if (!course) {
    return res.status(404).json({ error: '課程不存在' });
  }
  res.json(course);
});

/** 刪除指定 ID 的課程 */
router.delete('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const success = await db.courses.deleteCourse(id);
  if (!success) {
    return res.status(404).json({ error: '課程不存在' });
  }
  res.json({ success: true });
});

/** 批次更新多個課程（用於排序或批量修改） */
router.put('/api/courses/batch-update', async (req, res) => {
  const { courses } = req.body;
  if (!courses || !Array.isArray(courses)) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  for (const update of courses) {
    await db.courses.updateCourse(update.id, update);
  }
  res.json({ success: true });
});

/**
 * 從 Google Sheet 同步課程預約數據。
 * 從外部 Google Apps Script API 取得最新預約數，再逐一更新 Firestore。
 */
router.post('/api/courses/sync', async (req, res) => {
  console.log('[Sync] Starting sync from Google Sheet...');
  try {
    const updated = await refreshCourseBookingsFromGoogle();
    console.log('[Sync] Completed, updated courses:', updated);
    res.json({ success: true, updated });
  } catch (err) {
    console.error('[Sync] Error:', err);
    res.status(500).json({ error: '同步失敗' });
  }
});

/**
 * 課程預約 API。
 * 流程：驗證欄位 → 檢查時段是否存在 → 檢查名額 →
 *       通知 Google Sheet（非同步 fire-and-forget）→
 *       更新本地 Firestore 記錄已預約人數。
 */
router.post('/api/courses/book', async (req, res) => {
  const { courseId, time, name, phone } = req.body;

  if (!courseId || !time || !name || !phone) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }

  const courseIdNum = parseInt(courseId, 10);

  const course = await db.courses.getById(courseIdNum);

  if (!course) {
    return res.status(404).json({ error: '課程不存在' });
  }

  const slot = (course.slots || []).find(s => s.time === time);

  if (!slot) {
    return res.status(404).json({ error: '時段不存在' });
  }

  const limit = slot.limit || 3;
  const booked = slot.booked || 0;

  if (booked >= limit) {
    return res.status(400).json({ error: '該時段名額已滿' });
  }

  try {
    // 將預約資料 POST 到 Google Apps Script（fire-and-forget，不等待回應）
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYMAW1pdigBwM6xlbuD9kJvnVMLWyt2rPcT0Mh9_Z_s8hnopvqJkh-D7znlmOUKf7f/exec';
    const params = new URLSearchParams();
    params.append('姓名', name);
    params.append('電話', phone);
    params.append('課程', course.name);
    params.append('時段', time);
    params.append('提交時間', new Date().toLocaleString());

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: params,
      mode: 'no-cors'
    });

    // 更新對應時段的已預約人數
    const newSlots = (course.slots || []).map(s => {
      if (s.time === time) {
        return { ...s, booked: (s.booked || 0) + 1 };
      }
      return s;
    });

    const updated = await db.courses.updateCourse(courseIdNum, { slots: newSlots });

    res.json({ success: true });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: '預約失敗，請稍後再試' });
  }
});

// ======================== 服務 API ========================

/** 取得所有已啟用的服務（前端導覽列使用） */
router.get('/api/services', async (req, res) => {
  const services = await db.services.getEnabled();
  res.json(services);
});

/**
 * 批次更新服務配置。
 * 會先驗證每個服務的必填欄位（名稱、URL），再整批寫入 Firestore。
 */
router.post('/api/services/update', async (req, res) => {
  const { services } = req.body;
  if (!services || !Array.isArray(services)) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  const errors = db.services.validateServices(services);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  await db.services.saveServices({ services });
  res.json({ success: true });
});

// ======================== 管理員認證 ========================

const ADMIN_COOKIE = 'services_admin';
const ADMIN_SECRET = 'publicweb-services-2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '28345013';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYMAW1pdigBwM6xlbuD9kJvnVMLWyt2rPcT0Mh9_Z_s8hnopvqJkh-D7znlmOUKf7f/exec';

/**
 * 從 Google Sheet 取得各課程各時段的最新預約統計。
 * 回傳格式為 { "課程名-時段": 已預約人數, ... }
 */
async function fetchGoogleSheetStats() {
  try {
    const url = `${GOOGLE_SCRIPT_URL}?action=getStats&t=${Date.now()}`;
    const res = await fetch(url);
    const json = await res.json();
    return json;
  } catch (e) {
    console.error('Failed to fetch Google Sheet stats:', e);
    return null;
  }
}

/**
 * 將 Google Sheet 的預約數據同步回本地 Firestore。
 * 比對每個課程時段的 booked 值，若有差異則更新。
 * 回傳更新的課程數量。
 */
async function refreshCourseBookingsFromGoogle() {
  const stats = await fetchGoogleSheetStats();
  if (!stats) return false;

  const courses = await db.courses.getAll();
  let updated = 0;

  for (const course of courses) {
    let needsUpdate = false;
    const newSlots = (course.slots || []).map(slot => {
      // 組合 key：課程名稱-時段，對應 Google Sheet 的欄位命名
      const key = `${course.name}-${slot.time}`;
      // 若 Google Sheet 無數據則預設為 0
      const googleBooked = (stats[key] !== undefined && stats[key] !== null)
        ? parseInt(stats[key], 10)
        : 0;

      if (slot.booked !== googleBooked && !isNaN(googleBooked)) {
        needsUpdate = true;
        return { ...slot, booked: googleBooked };
      }
      return slot;
    });

    if (needsUpdate) {
      await db.courses.updateCourse(course.id, { slots: newSlots });
      updated++;
    }
  }

  return updated;
}

/** 檢查管理員是否已登入（Cookie 比對） */
router.get('/api/services/login', (req, res) => {
  const cookie = req.cookies[ADMIN_COOKIE];
  if (cookie === ADMIN_SECRET) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

/** 管理員登入：比對密碼後寫入 Cookie（有效期 24 小時） */
router.post('/api/services/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.cookie(ADMIN_COOKIE, ADMIN_SECRET, { maxAge: 86400000, httpOnly: true });
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

/** 管理員登出：清除管理員 Cookie */
router.post('/api/services/logout', (req, res) => {
  res.clearCookie(ADMIN_COOKIE);
  res.json({ ok: true });
});

// 舊版 URL 兼容：將舊的短路徑重導向至新的課程預約頁
router.get('/public/1', (req, res) => {
  res.redirect('/public/coursereservation');
});

router.get('/public/11.html', (req, res) => {
  res.redirect('/public/coursereservation');
});

// 伺服器啟動後延遲 2 秒執行一次 Google Sheet 同步，確保 Firestore 數據最新
setTimeout(() => {
  refreshCourseBookingsFromGoogle().then(updated => {
  }).catch(err => {
    console.error('[Startup] Sync failed:', err);
  });
}, 2000);

/**
 * 進階設定驗證：密碼正確時設定 show_advanced Cookie（有效期 30 天）。
 * 用於管理後台顯示進階功能設定。
 */
router.post('/api/services/verify-advanced', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.cookie('show_advanced', 'true', { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: false });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid password' });
});


// 清除進階模式 Cookie\
router.post('/api/services/clear-advanced', (req, res) => {
  res.clearCookie('show_advanced');
  res.json({ ok: true });
});

export default router;