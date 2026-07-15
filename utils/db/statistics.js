import { getDb, Timestamp, FieldValue } from './firebase.js';

const STATS_COL = 'statistics';
const DAILY_COL = 'daily_stats';

function getHongKongTime() {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+08:00`;
}

function getHongKongDateString() {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToTimestamp(timeStr) {
  return Math.floor(new Date(timeStr).getTime() / 1000);
}

function hkDayRange(dateStr) {
  const start = Math.floor(new Date(dateStr + 'T00:00:00+08:00').getTime() / 1000);
  const end = Math.floor(new Date(dateStr + 'T23:59:59+08:00').getTime() / 1000);
  return { start, end };
}

var monitoringCache = null;

async function isMonitoringEnabled() {
  if (monitoringCache !== null) return monitoringCache;
  try {
    const doc = await getDb().collection('config').doc('settings').get();
    monitoringCache = doc.exists ? (doc.data().monitoringEnabled !== false) : true;
  } catch(e) {
    monitoringCache = true;
  }
  return monitoringCache;
}

async function setMonitoringEnabled(val) {
  monitoringCache = val;
  await getDb().collection('config').doc('settings').set({ monitoringEnabled: val, updatedAt: Timestamp.now() }, { merge: true });
}

async function recordVisit(userId, pagePath = '/') {
  if (!(await isMonitoringEnabled())) return 0;
  const timestamp = timeToTimestamp(getHongKongTime());
  const hkDate = getHongKongDateString();

  await getDb().collection(STATS_COL).add({ userId, pagePath, timestamp, createdAt: Timestamp.now() });

  const dailyRef = getDb().collection(DAILY_COL).doc(hkDate);
  await dailyRef.set({
    date: hkDate,
    totalVisitors: FieldValue.increment(1),
    totalPageViews: FieldValue.increment(1),
    updatedAt: Timestamp.now(),
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return 1;
}

async function getTodayStats() {
  const hkDate = getHongKongDateString();
  const { start, end } = hkDayRange(hkDate);

  const snapshot = await getDb().collection(STATS_COL)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();

  const users = new Set();
  snapshot.forEach(d => users.add(d.data().userId));

  return {
    date: hkDate,
    userCount: users.size,
    visitCount: snapshot.size
  };
}

async function getPageStats(page) {
  const snapshot = await getDb().collection(STATS_COL).get();
  const agg = {};
  snapshot.forEach(d => {
    const p = d.data().pagePath || '/';
    if (!agg[p]) agg[p] = { visits: 0, userCount: new Set() };
    agg[p].visits++;
    agg[p].userCount.add(d.data().userId);
  });

  if (page) {
    const g = agg[page];
    if (!g) return {};
    return { [page]: { visits: g.visits, userCount: g.userCount.size } };
  }
  const result = {};
  for (const [p, g] of Object.entries(agg)) {
    result[p] = { visits: g.visits, userCount: g.userCount.size };
  }
  return result;
}

async function getDailyStats(date) {
  if (date) {
    const doc = await getDb().collection(DAILY_COL).doc(date).get();
    if (!doc.exists) return {};
    const d = doc.data();
    return { [date]: { userCount: d.totalVisitors, visitCount: d.totalPageViews } };
  }
  const snapshot = await getDb().collection(DAILY_COL).orderBy('date', 'asc').get();
  const result = {};
  snapshot.forEach(d => {
    const data = d.data();
    result[data.date] = { userCount: data.totalVisitors, visitCount: data.totalPageViews };
  });
  return result;
}

async function getStatistics() {
  const snapshot = await getDb().collection(STATS_COL)
    .orderBy('timestamp', 'desc')
    .get();
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      userId: data.userId,
      pagePath: data.pagePath,
      time: new Date(data.timestamp * 1000).toISOString()
    };
  });
}

async function getDailyStatistics() {
  return getDailyStats();
}

async function getTodayPageStats(page) {
  const hkDate = getHongKongDateString();
  const { start, end } = hkDayRange(hkDate);
  const snapshot = await getDb().collection(STATS_COL)
    .where('pagePath', '==', page)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();
  const users = new Set();
  snapshot.forEach(d => users.add(d.data().userId));
  return { date: hkDate, page, visits: snapshot.size, userCount: users.size };
}

async function getPageDailyTrend(page, days = 7) {
  const results = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() + 8 * 60 * 60 * 1000 - i * 24 * 60 * 60 * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hkDate = `${year}-${month}-${day}`;
    const { start, end } = hkDayRange(hkDate);
    const snapshot = await getDb().collection(STATS_COL)
      .where('pagePath', '==', page)
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();
    const users = new Set();
    snapshot.forEach(d => users.add(d.data().userId));
    results.push({ date: hkDate, visits: snapshot.size, userCount: users.size });
  }
  return results;
}

async function getUserTrend(days = 7) {
  const results = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() + 8 * 60 * 60 * 1000 - i * 24 * 60 * 60 * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hkDate = `${year}-${month}-${day}`;
    const { start, end } = hkDayRange(hkDate);
    const snapshot = await getDb().collection(STATS_COL)
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();
    const users = new Set();
    snapshot.forEach(d => users.add(d.data().userId));
    results.push({ date: hkDate, visits: snapshot.size, userCount: users.size });
  }
  return results;
}

async function getWeekTrend() { return getUserTrend(7); }

async function getMonthTrend() { return getUserTrend(30); }

async function getPageHourTrend(page, hours = 24) {
  const now = Date.now() + 8 * 60 * 60 * 1000;
  const results = [];
  for (let i = hours - 1; i >= 0; i--) {
    const hourStart = Math.floor((now - i * 60 * 60 * 1000) / 1000);
    const hourEnd = Math.floor((now - (i - 1) * 60 * 60 * 1000) / 1000);
    const snapshot = await getDb().collection(STATS_COL)
      .where('pagePath', '==', page)
      .where('timestamp', '>=', hourStart)
      .where('timestamp', '<', hourEnd)
      .get();
    const h = new Date(now - i * 60 * 60 * 1000).getUTCHours();
    results.push({ hour: h, visits: snapshot.size });
  }
  return results;
}

async function getFilteredDailyStats(date) {
  const { start, end } = hkDayRange(date);
  const snapshot = await getDb().collection(STATS_COL)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();
  const agg = {};
  snapshot.forEach(d => {
    const p = d.data().pagePath || '/';
    if (!agg[p]) agg[p] = { visits: 0, users: new Set() };
    agg[p].visits++;
    agg[p].users.add(d.data().userId);
  });
  return Object.entries(agg).map(([page, v]) => ({ page, visits: v.visits, userCount: v.users.size }));
}

async function getFilteredPageDailyStats(page, date) {
  const { start, end } = hkDayRange(date);
  const snapshot = await getDb().collection(STATS_COL)
    .where('pagePath', '==', page)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();
  const hourly = {};
  snapshot.forEach(d => {
    const t = d.data().timestamp;
    const hour = new Date(t * 1000 + 8 * 3600 * 1000).getUTCHours();
    if (!hourly[hour]) hourly[hour] = 0;
    hourly[hour]++;
  });
  return Object.entries(hourly).map(([h, visits]) => ({ hour: parseInt(h), visits }));
}

async function getFilteredWeeklyStats(year, week) {
  const jan1 = new Date(year, 0, 1);
  const dow = jan1.getDay();
  const startDate = new Date(jan1.getTime() + ((week - 1) * 7 - dow - 1) * 86400000);
  const endDate = new Date(jan1.getTime() + (week * 7 - dow - 2) * 86400000);
  const start = Math.floor(startDate.getTime() / 1000);
  const end = Math.floor(endDate.getTime() / 1000);

  const snapshot = await getDb().collection(STATS_COL)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();
  const agg = {};
  snapshot.forEach(d => {
    const p = d.data().pagePath || '/';
    if (!agg[p]) agg[p] = { visits: 0, users: new Set() };
    agg[p].visits++;
    agg[p].users.add(d.data().userId);
  });
  return Object.entries(agg).map(([page, v]) => ({ page, visits: v.visits, userCount: v.users.size }));
}

async function getFilteredMonthlyStats(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const start = Math.floor(startDate.getTime() / 1000);
  const end = Math.floor(endDate.getTime() / 1000);

  const snapshot = await getDb().collection(STATS_COL)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();
  const agg = {};
  snapshot.forEach(d => {
    const p = d.data().pagePath || '/';
    if (!agg[p]) agg[p] = { visits: 0, users: new Set() };
    agg[p].visits++;
    agg[p].users.add(d.data().userId);
  });
  return Object.entries(agg).map(([page, v]) => ({ page, visits: v.visits, userCount: v.users.size }));
}

async function migrateFromJson() {
  console.log('[Statistics] Firestore does not require JSON migration.');
  return 0;
}


async function getDayDetail(dateStr, page) {
  const { start, end } = hkDayRange(dateStr);
  const snapshot = await getDb().collection(STATS_COL)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();

  const hourly = {};
  const pages = {};
  const users = new Set();
  let total = 0;

  snapshot.forEach(d => {
    const data = d.data();
    if (page && data.pagePath !== page) return;
    total++;
    users.add(data.userId);

    const hour = new Date(data.timestamp * 1000 + 8 * 3600 * 1000).getUTCHours();
    hourly[hour] = (hourly[hour] || 0) + 1;

    const p = data.pagePath || '/';
    if (!pages[p]) pages[p] = { visits: 0, u: new Set() };
    pages[p].visits++;
    pages[p].u.add(data.userId);
  });

  return {
    date: dateStr,
    totalVisits: total,
    uniqueUsers: users.size,
    hourlyDistribution: Object.entries(hourly)
      .map(([h, v]) => ({ hour: parseInt(h), visits: v }))
      .sort((a, b) => a.hour - b.hour),
    pages: Object.entries(pages)
      .map(([name, d]) => ({ page: name, visits: d.visits, uniqueUsers: d.u.size }))
      .sort((a, b) => b.visits - a.visits)
  };
}


async function getWeekDetail(year, week, page) {
  const jan1 = new Date(year, 0, 1);
  const dow = jan1.getDay();
  const startDate = new Date(jan1.getTime() + ((week - 1) * 7 - dow - 1) * 86400000);
  const endDate = new Date(jan1.getTime() + (week * 7 - dow - 2) * 86400000);
  const start = Math.floor(startDate.getTime() / 1000);
  const end = Math.floor(endDate.getTime() / 1000);

  const snapshot = await getDb().collection(STATS_COL)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();

  const daily = {};
  const pages = {};
  const allUsers = new Set();
  let total = 0;

  snapshot.forEach(d => {
    const data = d.data();
    if (page && data.pagePath !== page) return;
    total++;
    allUsers.add(data.userId);

    const date = new Date(data.timestamp * 1000 + 8 * 3600 * 1000);
    const day = date.toISOString().slice(0, 10);
    if (!daily[day]) daily[day] = { visits: 0, users: new Set() };
    daily[day].visits++;
    daily[day].users.add(data.userId);

    const p = data.pagePath || '/';
    if (!pages[p]) pages[p] = { visits: 0, u: new Set() };
    pages[p].visits++;
    pages[p].u.add(data.userId);
  });

  return {
    year, week,
    totalVisits: total,
    uniqueUsers: allUsers.size,
    dailyTrend: Object.entries(daily).map(([d, v]) => ({
      date: d, visits: v.visits, uniqueUsers: v.users.size
    })).sort((a, b) => a.date.localeCompare(b.date)),
    pages: Object.entries(pages).map(([name, d]) => ({
      page: name, visits: d.visits, uniqueUsers: d.u.size
    })).sort((a, b) => b.visits - a.visits)
  };
}

async function getMonthDetail(year, month, page) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const start = Math.floor(startDate.getTime() / 1000);
  const end = Math.floor(endDate.getTime() / 1000);

  const snapshot = await getDb().collection(STATS_COL)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();

  const daily = {};
  const pages = {};
  const allUsers = new Set();
  let total = 0;

  snapshot.forEach(d => {
    const data = d.data();
    if (page && data.pagePath !== page) return;
    total++;
    allUsers.add(data.userId);

    const date = new Date(data.timestamp * 1000 + 8 * 3600 * 1000);
    const day = date.toISOString().slice(0, 10);
    if (!daily[day]) daily[day] = { visits: 0, users: new Set() };
    daily[day].visits++;
    daily[day].users.add(data.userId);

    const p = data.pagePath || '/';
    if (!pages[p]) pages[p] = { visits: 0, u: new Set() };
    pages[p].visits++;
    pages[p].u.add(data.userId);
  });

  return {
    year, month,
    totalVisits: total,
    uniqueUsers: allUsers.size,
    dailyTrend: Object.entries(daily).map(([d, v]) => ({
      date: d, visits: v.visits, uniqueUsers: v.users.size
    })).sort((a, b) => a.date.localeCompare(b.date)),
    pages: Object.entries(pages).map(([name, d]) => ({
      page: name, visits: d.visits, uniqueUsers: d.u.size
    })).sort((a, b) => b.visits - a.visits)
  };
}

export default {
  recordVisit,
  isMonitoringEnabled,
  setMonitoringEnabled,
  getTodayStats,
  getPageStats,
  getDailyStats,
  getStatistics,
  migrateFromJson,
  getHongKongTime,
  getHongKongDateString,
  getDailyStatistics,
  getTodayPageStats,
  getPageDailyTrend,
  getUserTrend,
  getWeekTrend,
  getMonthTrend,
  getPageHourTrend,
  getFilteredDailyStats,
  getFilteredPageDailyStats,
  getFilteredWeeklyStats,
  getFilteredMonthlyStats,
  getDayDetail,
  getWeekDetail,
  getMonthDetail
};
