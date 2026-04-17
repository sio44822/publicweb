const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const statistics = require('../utils/statistics');

const router = express.Router();

const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 55005;

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
  res.render('1');
});

router.get('/public/coupon', (req, res) => {
  const userId = getUserId(req, res);
  statistics.recordVisit(userId);
  res.render('coupon');
});

router.get('/api/statistics', (req, res) => {
  const stats = statistics.getStatistics();
  res.json(stats);
});

router.get('/api/statistics/daily', (req, res) => {
  const daily = statistics.getDailyStatistics();
  res.json(daily);
});

router.get('/api/statistics/today', (req, res) => {
  const today = statistics.getTodayStats();
  res.json(today);
});

router.get('/statistics', (req, res) => {
  res.render('statistics');
});

router.get('/public/url-qr-doc-tool', (req, res) => {
  res.render('url-qr-doc-tool');
});

router.get('/public/11.html', (req, res) => {
  res.render('1');
});

router.get('/', (req, res) => {
  res.send(`URLBASE: ${URLBASE}<br>Mode: ${isDev ? 'Development' : 'Production'}`);
});

module.exports = router;