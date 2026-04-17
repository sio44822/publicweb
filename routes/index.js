const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const statistics = require('../utils/statistics');

const router = express.Router();

const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 55005;

const STATS_USERNAME = process.env.STATS_USERNAME || 'admin';
const STATS_PASSWORD = process.env.STATS_PASSWORD;

function requireStatsAuth(req, res, next) {
  if (!STATS_PASSWORD) {
    return res.status(500).send('Statistics auth not configured');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Statistics Admin"');
    return res.status(401).send('Authentication required');
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const [user, pass] = credentials.split(':');

  if (user === STATS_USERNAME && pass === STATS_PASSWORD) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Statistics Admin"');
  return res.status(401).send('Authentication required');
}

const URLBASE = isDev 
  ? `http://localhost:${PORT}` 
  : process.env.PUBLIC_URL || 'https://your-domain.com';

statistics.startDailyCron();

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

router.get('/config', (req, res) => {
  res.json({
    URLBASE: URLBASE,
    mode: isDev ? 'development' : 'production'
  });
});

router.get('/public/1', (req, res) => {
  const userId = getUserId(req, res);
  statistics.recordVisit(userId, '/public/1');
  res.render('1');
});

router.get('/public/coupon', (req, res) => {
  const userId = getUserId(req, res);
  statistics.recordVisit(userId, '/public/coupon');
  res.render('coupon');
});

router.get('/api/statistics', requireStatsAuth, (req, res) => {
  const stats = statistics.getStatistics();
  res.json(stats);
});

router.get('/api/statistics/daily', requireStatsAuth, (req, res) => {
  const daily = statistics.getDailyStatistics();
  res.json(daily);
});

router.get('/api/statistics/today', requireStatsAuth, (req, res) => {
  const today = statistics.getTodayStats();
  res.json(today);
});

router.get('/api/statistics/pages', requireStatsAuth, (req, res) => {
  const pageStats = statistics.getPageStats();
  res.json(pageStats);
});

router.get('/api/statistics/page/today', requireStatsAuth, (req, res) => {
  const page = req.query.page;
  const today = statistics.getTodayPageStats(page);
  res.json(today);
});

router.get('/api/statistics/page/daily', requireStatsAuth, (req, res) => {
  const page = req.query.page;
  const days = parseInt(req.query.days) || 7;
  const daily = statistics.getPageDailyTrend(page, days);
  res.json(daily);
});

router.get('/api/statistics/trend', requireStatsAuth, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const trend = statistics.getDailyPageStats(days);
  res.json(trend);
});

router.get('/api/statistics/trend/daily', requireStatsAuth, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const page = req.query.page;
  const trend = page ? statistics.getPageDailyTrend(page, days) : statistics.getUserTrend(days);
  res.json(trend);
});

router.get('/api/statistics/trend/weekly', requireStatsAuth, (req, res) => {
  const trend = statistics.getWeekTrend();
  res.json(trend);
});

router.get('/api/statistics/trend/monthly', requireStatsAuth, (req, res) => {
  const trend = statistics.getMonthTrend();
  res.json(trend);
});

router.get('/api/statistics/trend/hour', requireStatsAuth, (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const page = req.query.page;
  const trend = statistics.getPageHourTrend(page, hours);
  res.json(trend);
});

router.get('/api/statistics/filter/daily', requireStatsAuth, (req, res) => {
  const date = req.query.date;
  const page = req.query.page;
  if (!date) {
    return res.status(400).json({ error: 'date required' });
  }
  const stats = page ? statistics.getFilteredPageDailyStats(page, date) : statistics.getFilteredDailyStats(date);
  res.json(stats);
});

router.get('/api/statistics/filter/weekly', requireStatsAuth, (req, res) => {
  const year = parseInt(req.query.year);
  const week = parseInt(req.query.week);
  console.log('[API] /api/statistics/filter/weekly called, year:', year, 'week:', week);
  if (!year || !week) {
    return res.status(400).json({ error: 'year and week required' });
  }
  const stats = statistics.getFilteredWeeklyStats(year, week);
  res.json(stats);
});

router.get('/api/statistics/filter/monthly', requireStatsAuth, (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  console.log('[API] /api/statistics/filter/monthly called, year:', year, 'month:', month);
  if (!year || !month) {
    return res.status(400).json({ error: 'year and month required' });
  }
  const stats = statistics.getFilteredMonthlyStats(year, month);
  res.json(stats);
});

router.get('/statistics', requireStatsAuth, (req, res) => {
  res.render('statistics');
});

router.get('/public/url-qr-doc-tool', (req, res) => {
  const userId = getUserId(req, res);
  statistics.recordVisit(userId, '/public/url-qr-doc-tool');
  res.render('url-qr-doc-tool');
});

router.get('/public/11.html', (req, res) => {
  res.render('1');
});

router.get('/', (req, res) => {
  res.send(`URLBASE: ${URLBASE}<br>Mode: ${isDev ? 'Development' : 'Production'}`);
});

module.exports = router;