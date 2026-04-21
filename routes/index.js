const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const statistics = require('../utils/statistics');
const statisticsRoutes = require('./statistics');
const servicesLoader = require('../utils/services-loader');

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

router.get('/services', (req, res) => {
  res.render('services');
});

router.get('/statistics', (req, res) => {
  res.render('statistics');
});

router.get('/api/services', (req, res) => {
  const services = servicesLoader.getEnabledServices();
  res.json(services);
});

router.get('/mgmt/services', (req, res) => {
  const cookie = req.cookies[ADMIN_COOKIE];
  const isAdmin = cookie === ADMIN_SECRET;
  const config = servicesLoader.getServices();
  res.render('admin/services', { services: config.services, isAdmin });
});

router.post('/api/services/update', (req, res) => {
  const { services } = req.body;
  if (!services || !Array.isArray(services)) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  const errors = servicesLoader.validateServices(services);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  servicesLoader.saveServices({ services });
  res.json({ success: true });
});

const ADMIN_COOKIE = 'services_admin';
const ADMIN_SECRET = 'publicweb-services-2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '28345013';

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

module.exports = router;