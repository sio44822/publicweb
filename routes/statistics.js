import express from 'express';
import statistics from '../utils/db/statistics.js';

const router = express.Router();

const STATS_USERNAME = process.env.STATS_USERNAME || 'admin';
const STATS_PASSWORD = process.env.STATS_PASSWORD || '28345013';

function checkStatsAuth(req, res, next) {
  const statsToken = req.cookies.stats_token;
  if (statsToken) {
    try {
      const decoded = Buffer.from(statsToken, 'base64').toString('utf8');
      const [user, pass, expiry] = decoded.split('|');
      if (user === STATS_USERNAME && pass === STATS_PASSWORD && parseInt(expiry) > Date.now()) {
        return next();
      }
    } catch (e) {}
  }

  return res.status(401).json({ error: 'Authentication required' });
}

router.post('/api/stats/login', (req, res) => {
  console.log('[login] headers:', req.headers);
  console.log('[login] req.body:', req.body);
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials', received: req.body });
  }
  console.log('[login] username:', username, 'password:', password);
  console.log('[login] STATS_USERNAME:', STATS_USERNAME, 'STATS_PASSWORD:', STATS_PASSWORD);
  if (username === STATS_USERNAME && password === STATS_PASSWORD) {
      console.log('[login] credentials match!');
      const expiry = Date.now() + 365 * 24 * 60 * 60 * 1000;
      const token = Buffer.from(`${username}|${password}|${expiry}`).toString('base64');
    res.cookie('stats_token', token, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'Lax'
    });
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

router.post('/api/stats/logout', (req, res) => {
  res.cookie('stats_token', '', { maxAge: 0 });
  res.json({ success: true });
});

router.get('/api/stats/check', (req, res) => {
  const statsToken = req.cookies.stats_token;
  if (statsToken) {
    try {
      const decoded = Buffer.from(statsToken, 'base64').toString('utf8');
      const [user, pass, expiry] = decoded.split('|');
      if (user === STATS_USERNAME && pass === STATS_PASSWORD && parseInt(expiry) > Date.now()) {
        return res.json({ authenticated: true });
      }
    } catch (e) {}
  }
  res.json({ authenticated: false });
});

router.get('/statistics', (req, res) => {
  res.render('statistics');
});

router.get('/api/statistics', checkStatsAuth, async (req, res) => {
  const stats = await statistics.getStatistics();
  res.json(stats);
});

router.get('/api/statistics/daily', checkStatsAuth, async (req, res) => {
  const daily = await statistics.getDailyStatistics();
  res.json(daily);
});

router.get('/api/statistics/today', checkStatsAuth, async (req, res) => {
  const today = await statistics.getTodayStats();
  res.json(today);
});

router.get('/api/statistics/pages', checkStatsAuth, async (req, res) => {
  const pageStats = await statistics.getPageStats();
  res.json(pageStats);
});

router.get('/api/statistics/page/today', checkStatsAuth, async (req, res) => {
  const page = req.query.page;
  const today = await statistics.getTodayPageStats(page);
  res.json(today);
});

router.get('/api/statistics/page/daily', checkStatsAuth, async (req, res) => {
  const page = req.query.page;
  const days = parseInt(req.query.days) || 7;
  const daily = await statistics.getPageDailyTrend(page, days);
  res.json(daily);
});

router.get('/api/statistics/trend', checkStatsAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const trend = await statistics.getDailyPageStats(days);
  res.json(trend);
});

router.get('/api/statistics/trend/daily', checkStatsAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const page = req.query.page;
  const trend = page ? await statistics.getPageDailyTrend(page, days) : await statistics.getUserTrend(days);
  res.json(trend);
});

router.get('/api/statistics/trend/weekly', checkStatsAuth, async (req, res) => {
  const trend = await statistics.getWeekTrend();
  res.json(trend);
});

router.get('/api/statistics/trend/monthly', checkStatsAuth, async (req, res) => {
  const trend = await statistics.getMonthTrend();
  res.json(trend);
});

router.get('/api/statistics/trend/hour', checkStatsAuth, async (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const page = req.query.page;
  const trend = await statistics.getPageHourTrend(page, hours);
  res.json(trend);
});

router.get('/api/statistics/filter/daily', checkStatsAuth, async (req, res) => {
  const date = req.query.date;
  const page = req.query.page;
  if (!date) {
    return res.status(400).json({ error: 'date required' });
  }
  const stats = page ? await statistics.getFilteredPageDailyStats(page, date) : await statistics.getFilteredDailyStats(date);
  res.json(stats);
});

router.get('/api/statistics/filter/weekly', checkStatsAuth, async (req, res) => {
  const year = parseInt(req.query.year);
  const week = parseInt(req.query.week);
  console.log('[API] /api/statistics/filter/weekly called, year:', year, 'week:', week);
  if (!year || !week) {
    return res.status(400).json({ error: 'year and week required' });
  }
  const stats = await statistics.getFilteredWeeklyStats(year, week);
  res.json(stats);
});

router.get('/api/statistics/filter/monthly', checkStatsAuth, async (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  console.log('[API] /api/statistics/filter/monthly called, year:', year, 'month:', month);
  if (!year || !month) {
    return res.status(400).json({ error: 'year and month required' });
  }
  const stats = await statistics.getFilteredMonthlyStats(year, month);
  res.json(stats);
});

router.get('/api/statistics/kpi', checkStatsAuth, async (req, res) => {
  const stats = await statistics.getStatistics();
  const totalVisits = stats.length;
  const uniqueUsers = new Set(stats.map(r => r.userId)).size;
  
  const pageCounts = {};
  stats.forEach(r => {
    const page = r.pagePath || '/';
    pageCounts[page] = (pageCounts[page] || 0) + 1;
  });
  const sortedPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]);
  const topService = sortedPages[0] ? { page: sortedPages[0][0], count: sortedPages[0][1] } : null;
  
  const today = await statistics.getTodayStats();
  
  res.json({
    totalVisits,
    totalUsers: uniqueUsers,
    todayVisits: today.visitCount,
    todayUsers: today.userCount,
    topService
  });
});

router.get('/api/statistics/chart', checkStatsAuth, async (req, res) => {
  const type = req.query.type || 'daily';
  const page = req.query.page;
  let data;
  
  if (type === 'hourly') {
    data = await statistics.getPageHourTrend(page, 24);
  } else if (type === 'weekly') {
    data = await statistics.getWeekTrend();
  } else if (type === 'monthly') {
    data = await statistics.getMonthTrend();
  } else {
    data = page ? await statistics.getPageDailyTrend(page, 30) : await statistics.getUserTrend(30);
  }
  res.json(data);
});

router.get('/api/statistics/service-stats', checkStatsAuth, async (req, res) => {
  const stats = await statistics.getStatistics();
  const pageData = {};
  
  stats.forEach(r => {
    const page = r.pagePath || '/';
    if (!pageData[page]) {
      pageData[page] = { visits: 0, users: new Set() };
    }
    pageData[page].visits++;
    pageData[page].users.add(r.userId);
  });
  
  const result = Object.entries(pageData).map(([page, data]) => ({
    page,
    visits: data.visits,
    users: data.users.size
  })).sort((a, b) => b.visits - a.visits);
  
  res.json(result);
});

router.get('/api/statistics/export', checkStatsAuth, async (req, res) => {
  const stats = await statistics.getStatistics();
  const page = req.query.page;
  const startDate = req.query.start;
  const endDate = req.query.end;
  
  let filtered = stats;
  if (page) {
    filtered = filtered.filter(r => r.pagePath === page);
  }
  if (startDate) {
    filtered = filtered.filter(r => r.time >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(r => r.time <= endDate);
  }
  
  const csv = ['時間,服務,訪客ID'].concat(
    filtered.map(r => `${r.time},${r.pagePath || '/' },${r.userId}`)
  ).join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=statistics-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});


router.get('/api/statistics/day-detail', checkStatsAuth, async (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'date required' });
  try {
    const detail = await statistics.getDayDetail(date);
    res.json(detail);
  } catch (e) {
    console.error('[day-detail] Error:', e);
    res.status(500).json({ error: 'Failed to get day detail' });
  }
});


router.get('/api/statistics/week-detail', checkStatsAuth, async (req, res) => {
  const year = parseInt(req.query.year);
  const week = parseInt(req.query.week);
  if (!year || !week) return res.status(400).json({ error: 'year and week required' });
  try {
    const detail = await statistics.getWeekDetail(year, week);
    res.json(detail);
  } catch (e) {
    console.error('[week-detail] Error:', e);
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/api/statistics/month-detail', checkStatsAuth, async (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });
  try {
    const detail = await statistics.getMonthDetail(year, month);
    res.json(detail);
  } catch (e) {
    console.error('[month-detail] Error:', e);
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
