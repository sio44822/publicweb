import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db/index.js';
import statisticsRoutes from './statistics.js';

const router = express.Router();

const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 80;

const URLBASE = isDev 
  ? `http://localhost:${PORT}` 
  : process.env.PUBLIC_URL || 'https://your-domain.com';

function getUserId(req, res) {
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

async function getNavServices(currentPath) {
  const services = await db.services.getEnabled();
  const currentService = services.find(s => s.url === currentPath);
  if (!currentService || currentService.showInNav === false) return [];
  return services.map(s => ({ id: s.id, name: s.name, url: s.url, icon: s.icon }));
}

router.use(statisticsRoutes);

router.get('/config', (req, res) => {
  res.json({
    URLBASE: URLBASE,
    mode: isDev ? 'development' : 'production'
  });
});

router.get('/', (req, res) => {
  res.render('services');
});

router.get('/services', (req, res) => {
  res.render('services');
});



router.get('/public/coursereservation', async (req, res) => {
  const userId = getUserId(req, res);
  try {
    await db.statistics.recordVisit(userId, '/public/coursereservation');
  } catch (e) {
    console.error('[recordVisit] coursereservation error:', e.message);
  }
  const navServices = await getNavServices('/public/coursereservation');
  res.render('coursereservation', { navServices, currentPath: '/public/coursereservation' });
});

router.get('/public/coupon', async (req, res) => {
  const userId = getUserId(req, res);
  try {
    await db.statistics.recordVisit(userId, '/public/coupon');
  } catch (e) {
    console.error('[recordVisit] coupon error:', e.message);
  }
  const navServices = await getNavServices('/public/coupon');
  res.render('coupon', { navServices, currentPath: '/public/coupon' });
});

router.get('/public/url-qr-doc-tool', async (req, res) => {
  const userId = getUserId(req, res);
  try {
    await db.statistics.recordVisit(userId, '/public/url-qr-doc-tool');
  } catch (e) {
    console.error('[recordVisit] url-qr-doc-tool error:', e.message);
  }
  const navServices = await getNavServices('/public/url-qr-doc-tool');
  res.render('url-qr-doc-tool', { navServices, currentPath: '/public/url-qr-doc-tool' });
});

router.get('/mgmt/courses', async (req, res) => {
  const cookie = req.cookies[ADMIN_COOKIE];
  const isAdmin = cookie === ADMIN_SECRET;
  const courses = await db.courses.getAll();
  res.render('admin/courses', { courses, isAdmin });
});

router.get('/mgmt/services', async (req, res) => {
  const cookie = req.cookies[ADMIN_COOKIE];
  const isAdmin = cookie === ADMIN_SECRET;
  const allServices = await db.services.getAll();
  res.render('admin/services', { services: allServices, isAdmin });
});

router.get('/api/courses', async (req, res) => {
  const courses = await db.courses.getAll();
  res.json(courses);
});

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

router.get('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const course = await db.courses.getById(id);
  if (!course) {
    return res.status(404).json({ error: '課程不存在' });
  }
  res.json(course);
});

router.put('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, image, slots } = req.body;
  const course = await db.courses.updateCourse(id, { name, description, image, slots });
  if (!course) {
    return res.status(404).json({ error: '課程不存在' });
  }
  res.json(course);
});

router.delete('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const success = await db.courses.deleteCourse(id);
  if (!success) {
    return res.status(404).json({ error: '課程不存在' });
  }
  res.json({ success: true });
});

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

router.get('/api/services', async (req, res) => {
  const services = await db.services.getEnabled();
  res.json(services);
});

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

const ADMIN_COOKIE = 'services_admin';
const ADMIN_SECRET = 'publicweb-services-2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '28345013';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYMAW1pdigBwM6xlbuD9kJvnVMLWyt2rPcT0Mh9_Z_s8hnopvqJkh-D7znlmOUKf7f/exec';

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

async function refreshCourseBookingsFromGoogle() {
  const stats = await fetchGoogleSheetStats();
  if (!stats) return false;

  const courses = await db.courses.getAll();
  let updated = 0;

  for (const course of courses) {
    let needsUpdate = false;
    const newSlots = (course.slots || []).map(slot => {
      const key = `${course.name}-${slot.time}`;
      // 没数据时重置为 0
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

router.get('/api/services/login', (req, res) => {
  const cookie = req.cookies[ADMIN_COOKIE];
  if (cookie === ADMIN_SECRET) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

router.post('/api/services/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.cookie(ADMIN_COOKIE, ADMIN_SECRET, { maxAge: 86400000, httpOnly: true });
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

router.post('/api/services/logout', (req, res) => {
  res.clearCookie(ADMIN_COOKIE);
  res.json({ ok: true });
});

router.get('/public/1', (req, res) => {
  res.redirect('/public/coursereservation');
});

router.get('/public/11.html', (req, res) => {
  res.redirect('/public/coursereservation');
});

setTimeout(() => {
  refreshCourseBookingsFromGoogle().then(updated => {
  }).catch(err => {
    console.error('[Startup] Sync failed:', err);
  });
}, 2000);

export default router;
