import express from 'express';
import statistics from '../utils/db/statistics.js';

const router = express.Router();

// 統計後台的帳密（與服務管理分開，獨立認證）
const STATS_USERNAME = process.env.STATS_USERNAME || 'admin';
const STATS_PASSWORD = process.env.STATS_PASSWORD || '28345013';

/**
 * 絡計 API 的認證中間件。
 * 驗證 stats_token Cookie 的 Base64 編碼內容：
 * 格式為 "username|password|expiryTimestamp"，
 * 需帳號密碼正確且未過期才允許通過。
 */
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

// ======================== 認證 API ========================

/**
 * 統計後台登入。
 * 驗證帳號密碼後，將 "username|password|到期時間" 以 Base64 編碼
 * 寫入 stats_token Cookie（有效期一年），作為後續 API 認證憑證。
 */
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

/** 登出：將 stats_token Cookie 設為空值並立即過期 */
router.post('/api/stats/logout', (req, res) => {
  res.cookie('stats_token', '', { maxAge: 0 });
  res.json({ success: true });
});

/** 檢查當前是否已登入（前端用來判斷是否需顯示登入畫面） */
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

// ======================== 統計頁面 ========================

/** 渲染統計儀表板頁面 */
router.get('/statistics', (req, res) => {
  res.render('statistics');
});

// ======================== 統計數據 API ========================

/** 取得所有訪問記錄（按時間倒序） */
router.get('/api/statistics', checkStatsAuth, async (req, res) => {
  const stats = await statistics.getStatistics();
  res.json(stats);
});

/** 取得每日統計（日期 → 訪客數/瀏覽數） */
router.get('/api/statistics/daily', checkStatsAuth, async (req, res) => {
  const daily = await statistics.getDailyStatistics();
  res.json(daily);
});

/** 取得今日統計（今日獨立訪客數與總瀏覽數） */
router.get('/api/statistics/today', checkStatsAuth, async (req, res) => {
  const today = await statistics.getTodayStats();
  res.json(today);
});

/** 取得各頁面的統計數據（頁面 → 瀏覽數/獨立用戶數） */
router.get('/api/statistics/pages', checkStatsAuth, async (req, res) => {
  const pageStats = await statistics.getPageStats();
  res.json(pageStats);
});

/** 取得指定頁面今日的訪問統計 */
router.get('/api/statistics/page/today', checkStatsAuth, async (req, res) => {
  const page = req.query.page;
  const today = await statistics.getTodayPageStats(page);
  res.json(today);
});

/** 取得指定頁面的日趨勢（預設 7 天） */
router.get('/api/statistics/page/daily', checkStatsAuth, async (req, res) => {
  const page = req.query.page;
  const days = parseInt(req.query.days) || 7;
  const daily = await statistics.getPageDailyTrend(page, days);
  res.json(daily);
});

/** 取得每日訪問趨勢（可指定頁面，預設 30 天） */
router.get('/api/statistics/trend', checkStatsAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const trend = await statistics.getDailyPageStats(days);
  res.json(trend);
});

/**
 * 取得每日趨勢（含或不含頁面篩選）。
 * 若有指定 page 則回傳該頁面的日趨勢，否則回傳全站用戶趨勢。
 */
router.get('/api/statistics/trend/daily', checkStatsAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const page = req.query.page;
  const trend = page ? await statistics.getPageDailyTrend(page, days) : await statistics.getUserTrend(days);
  res.json(trend);
});

/** 取得近一週趨勢（簡寫，等同 trend/daily?days=7） */
router.get('/api/statistics/trend/weekly', checkStatsAuth, async (req, res) => {
  const trend = await statistics.getWeekTrend();
  res.json(trend);
});

/** 取得近一個月趨勢（簡寫，等同 trend/daily?days=30） */
router.get('/api/statistics/trend/monthly', checkStatsAuth, async (req, res) => {
  const trend = await statistics.getMonthTrend();
  res.json(trend);
});

/** 取得指定頁面的每小時訪問分佈（預設 24 小時） */
router.get('/api/statistics/trend/hour', checkStatsAuth, async (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const page = req.query.page;
  const trend = await statistics.getPageHourTrend(page, hours);
  res.json(trend);
});

/**
 * 篩選特定日期的統計數據。
 * 若有指定 page，則回傳該頁面當日的每小時分佈；
 * 否則回傳當日各頁面的統計彙總。
 */
router.get('/api/statistics/filter/daily', checkStatsAuth, async (req, res) => {
  const date = req.query.date;
  const page = req.query.page;
  if (!date) {
    return res.status(400).json({ error: 'date required' });
  }
  const stats = page ? await statistics.getFilteredPageDailyStats(page, date) : await statistics.getFilteredDailyStats(date);
  res.json(stats);
});

/** 篩選特定年份第幾週的統計數據 */
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

/** 篩選特定年月的統計數據 */
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

/**
 * KPI 總覽。
 * 從全量數據中即時計算：總瀏覽數、獨立用戶數、
 * 今日瀏覽/用戶數、最受歡迎的服務頁面。
 */
router.get('/api/statistics/kpi', checkStatsAuth, async (req, res) => {
  const stats = await statistics.getStatistics();
  const totalVisits = stats.length;
  const uniqueUsers = new Set(stats.map(r => r.userId)).size;

  // 計算各頁面的瀏覽次數，找出最高者作為 topService
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

/**
 * 圖表數據 API。
 * 根據 type 參數回傳不同時間維度的數據：
 * - hourly: 24 小時內每小時訪問量
 * - weekly: 近 7 天每日趨勢
 * - monthly: 近 30 天每日趨勢
 * - default (daily): 近 30 天趨勢（可指定頁面）
 */
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

/**
 * 各服務的統計彙總。
 * 回傳每個頁面的總瀏覽數與獨立用戶數，按瀏覽數降序排列。
 */
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

/**
 * 匯出 CSV。
 * 支援依頁面、起迄日期篩選，回傳 CSV 格式的下載檔案。
 */
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

  // 組合 CSV 內容：表頭 + 每筆記錄
  const csv = ['時間,服務,訪客ID'].concat(
    filtered.map(r => `${r.time},${r.pagePath || '/' },${r.userId}`)
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=statistics-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});

// ======================== 明細 API ========================

/**
 * 取得某一天的詳細統計。
 * 回傳：當日總瀏覽、獨立用戶、每小時分佈、各頁面統計。
 */
router.get('/api/statistics/day-detail', checkStatsAuth, async (req, res) => {
  const date = req.query.date;
  const page = req.query.page || '';
  if (!date) return res.status(400).json({ error: 'date required' });
  try {
    const detail = await statistics.getDayDetail(date, page);
    res.json(detail);
  } catch (e) {
    console.error('[day-detail] Error:', e);
    res.status(500).json({ error: 'Failed to get day detail' });
  }
});

/**
 * 取得某一週的詳細統計。
 * 回傳：當週總瀏覽、獨立用戶、每日趨勢、各頁面統計。
 */
router.get('/api/statistics/week-detail', checkStatsAuth, async (req, res) => {
  const year = parseInt(req.query.year);
  const week = parseInt(req.query.week);
  const page = req.query.page || '';
  if (!year || !week) return res.status(400).json({ error: 'year and week required' });
  try {
    const detail = await statistics.getWeekDetail(year, week, page);
    res.json(detail);
  } catch (e) {
    console.error('[week-detail] Error:', e);
    res.status(500).json({ error: 'Failed' });
  }
});

/**
 * 取得某一月的詳細統計。
 * 回傳：當月總瀏覽、獨立用戶、每日趨勢（含補齊空白日）、各頁面統計。
 */
router.get('/api/statistics/month-detail', checkStatsAuth, async (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  const page = req.query.page || '';
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });
  try {
    const detail = await statistics.getMonthDetail(year, month, page);
    res.json(detail);
  } catch (e) {
    console.error('[month-detail] Error:', e);
    res.status(500).json({ error: 'Failed' });
  }
});

// ======================== 監控設定 API ========================

/** 取得訪問監控的開關狀態（可透過 monitoringEnabled 欄位控制） */
router.get('/api/statistics/monitoring-status', checkStatsAuth, async (req, res) => {
  try {
    const enabled = await statistics.isMonitoringEnabled();
    res.json({ monitoringEnabled: enabled });
  } catch(e) {
    res.status(500).json({ error: 'Failed' });
  }
});

/** 切換訪問監控的開關狀態（開→關 或 關→開） */
router.post('/api/statistics/monitoring-toggle', checkStatsAuth, async (req, res) => {
  try {
    const current = await statistics.isMonitoringEnabled();
    await statistics.setMonitoringEnabled(!current);
    res.json({ monitoringEnabled: !current });
  } catch(e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ======================== KPI 彙總 API ========================

/**
 * KPI 完整彙總。
 * 從全量訪問記錄中，即時計算：
 * - 累計：總瀏覽數、總獨立用戶數
 * - 今日：瀏覽數、獨立用戶數
 * - 本週：瀏覽數、獨立用戶數
 * - 本月：瀏覽數、獨立用戶數
 *
 * 時區固定為 UTC+8（香港時間）。
 */
router.get('/api/statistics/kpi-summary', checkStatsAuth, async (req, res) => {
  try {
    const allStats = await statistics.getStatistics();
    const totalVisits = allStats.length;
    const totalUsers = new Set(allStats.map(r => r.userId)).size;

    // 取得當前香港時間
    const now = new Date();
    now.setHours(now.getHours() + 8);
    var today = now.toISOString().slice(0, 10);

    // 計算本週起始日（週一）
    var weekStart = new Date(now.getTime());
    weekStart.setDate(weekStart.getDate() - ((weekStart.getUTCDay()||7)-1));
    var ws = weekStart.toISOString().slice(0, 10);

    // 本月起始日
    var monthStart = now.getUTCFullYear() + "-" + String(now.getUTCMonth()+1).padStart(2,"0") + "-01";

    var todayV = 0, weekV = 0, monthV = 0;
    var todayU = new Set(), weekU = new Set(), monthU = new Set();

    // 逐一比對每筆記錄的日期，分類計入對應的時間段
    allStats.forEach(function(r) {
      var d = (r.time || "").slice(0, 10);
      if (d === today) { todayV++; todayU.add(r.userId); }
      if (d >= ws) { weekV++; weekU.add(r.userId); }
      if (d >= monthStart) { monthV++; monthU.add(r.userId); }
    });

    res.json({
      totalVisits: totalVisits, totalUsers: totalUsers,
      todayVisits: todayV, todayUsers: todayU.size,
      weekVisits: weekV, weekUsers: weekU.size,
      monthVisits: monthV, monthUsers: monthU.size
    });
  } catch(e) {
    console.error("[kpi-summary] Error:", e);
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
