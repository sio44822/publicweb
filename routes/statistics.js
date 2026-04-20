const express = require('express');
const statistics = require('../utils/statistics');

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

router.get('/statistics', (req, res) => {
  res.render('statistics');
});

router.get('/api/statistics', checkStatsAuth, (req, res) => {
  const stats = statistics.getStatistics();
  res.json(stats);
});

router.get('/api/statistics/daily', checkStatsAuth, (req, res) => {
  const daily = statistics.getDailyStatistics();
  res.json(daily);
});

router.get('/api/statistics/today', checkStatsAuth, (req, res) => {
  const today = statistics.getTodayStats();
  res.json(today);
});

router.get('/api/statistics/pages', checkStatsAuth, (req, res) => {
  const pageStats = statistics.getPageStats();
  res.json(pageStats);
});

router.get('/api/statistics/page/today', checkStatsAuth, (req, res) => {
  const page = req.query.page;
  const today = statistics.getTodayPageStats(page);
  res.json(today);
});

router.get('/api/statistics/page/daily', checkStatsAuth, (req, res) => {
  const page = req.query.page;
  const days = parseInt(req.query.days) || 7;
  const daily = statistics.getPageDailyTrend(page, days);
  res.json(daily);
});

router.get('/api/statistics/trend', checkStatsAuth, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const trend = statistics.getDailyPageStats(days);
  res.json(trend);
});

router.get('/api/statistics/trend/daily', checkStatsAuth, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const page = req.query.page;
  const trend = page ? statistics.getPageDailyTrend(page, days) : statistics.getUserTrend(days);
  res.json(trend);
});

router.get('/api/statistics/trend/weekly', checkStatsAuth, (req, res) => {
  const trend = statistics.getWeekTrend();
  res.json(trend);
});

router.get('/api/statistics/trend/monthly', checkStatsAuth, (req, res) => {
  const trend = statistics.getMonthTrend();
  res.json(trend);
});

router.get('/api/statistics/trend/hour', checkStatsAuth, (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const page = req.query.page;
  const trend = statistics.getPageHourTrend(page, hours);
  res.json(trend);
});

router.get('/api/statistics/filter/daily', checkStatsAuth, (req, res) => {
  const date = req.query.date;
  const page = req.query.page;
  if (!date) {
    return res.status(400).json({ error: 'date required' });
  }
  const stats = page ? statistics.getFilteredPageDailyStats(page, date) : statistics.getFilteredDailyStats(date);
  res.json(stats);
});

router.get('/api/statistics/filter/weekly', checkStatsAuth, (req, res) => {
  const year = parseInt(req.query.year);
  const week = parseInt(req.query.week);
  console.log('[API] /api/statistics/filter/weekly called, year:', year, 'week:', week);
  if (!year || !week) {
    return res.status(400).json({ error: 'year and week required' });
  }
  const stats = statistics.getFilteredWeeklyStats(year, week);
  res.json(stats);
});

router.get('/api/statistics/filter/monthly', checkStatsAuth, (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  console.log('[API] /api/statistics/filter/monthly called, year:', year, 'month:', month);
  if (!year || !month) {
    return res.status(400).json({ error: 'year and month required' });
  }
  const stats = statistics.getFilteredMonthlyStats(year, month);
  res.json(stats);
});

module.exports = router;