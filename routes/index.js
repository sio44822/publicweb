const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const statistics = require('../utils/statistics');
const statisticsRoutes = require('./statistics');

const router = express.Router();

const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 80;

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

router.use(statisticsRoutes);

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