// Firestore 訪問統計資料存取層
// 使用兩個 Collection：
//   - statistics: 每筆訪問的明細記錄（userId, pagePath, timestamp）
//   - daily_stats: 每日彙總（日期 → 總訪客數/總瀏覽數）
import { getDb, Timestamp, FieldValue } from './firebase.js';

const STATS_COL = 'statistics';
const DAILY_COL = 'daily_stats';

// ======================== 時間工具函式 ========================

/**
 * 取得當前香港時間（UTC+8）的 ISO 8601 字串。
 * 所有統計資料的時間戳均以香港時區為準。
 */
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

/**
 * 取得當前香港日期的 YYYY-MM-DD 字串。
 * 用於 daily_stats Collection 的文件 ID 及日期範圍查詢。
 */
function getHongKongDateString() {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 將 ISO 時間字串轉換為 Unix 秒級時間戳。
 * Firestore 的 timestamp 欄位儲存為秒而非毫秒。
 */
function timeToTimestamp(timeStr) {
  return Math.floor(new Date(timeStr).getTime() / 1000);
}

/**
 * 計算指定日期的香港時區起迄時間戳（秒）。
 * start = 當日 00:00:00+08:00，end = 當日 23:59:59+08:00。
 * 用於 Firestore 的 range 查詢。
 */
function hkDayRange(dateStr) {
  const start = Math.floor(new Date(dateStr + 'T00:00:00+08:00').getTime() / 1000);
  const end = Math.floor(new Date(dateStr + 'T23:59:59+08:00').getTime() / 1000);
  return { start, end };
}

// ======================== 監控開關 ========================

// 快取監控狀態，避免每次 recordVisit 都查詢 Firestore
var monitoringCache = null;

/**
 * 檢查訪問監控是否啟用。
 * 從 Firestore config/settings 文件讀取 monitoringEnabled 欄位。
 * 結果會快取在記憶體中，設定變更後需重新啟動或呼叫 setMonitoringEnabled。
 */
async function isMonitoringEnabled() {
  if (monitoringCache !== null) return monitoringCache;
  try {
    const doc = await getDb().collection('config').doc('settings').get();
    monitoringCache = doc.exists ? (doc.data().monitoringEnabled !== false) : true;
  } catch(e) {
    monitoringCache = true; // 預設啟用
  }
  return monitoringCache;
}

/** 設定監控開關狀態並同步更新 Firestore 與記憶體快取 */
async function setMonitoringEnabled(val) {
  monitoringCache = val;
  await getDb().collection('config').doc('settings').set({ monitoringEnabled: val, updatedAt: Timestamp.now() }, { merge: true });
}

// ======================== 記錄訪問 ========================

/**
 * 記錄一次訪問行為。
 * 同時執行兩個操作：
 * 1. 在 statistics Collection 新增一筆明細記錄
 * 2. 在 daily_stats Collection 原子性遞增當日的總訪客數與總瀏覽數
 *
 * 若監控已關閉則直接回傳 0 不做任何寫入。
 */
async function recordVisit(userId, pagePath = '/') {
  if (!(await isMonitoringEnabled())) return 0;
  const timestamp = timeToTimestamp(getHongKongTime());
  const hkDate = getHongKongDateString();

  // 新增訪問明細
  await getDb().collection(STATS_COL).add({ userId, pagePath, timestamp, createdAt: Timestamp.now() });

  // 原子性更新每日彙總（使用 FieldValue.increment 確保並發安全）
  const dailyRef = getDb().collection(DAILY_COL).doc(hkDate);
  await dailyRef.set({
    date: hkDate,
    totalVisitors: FieldValue.increment(1),
    totalPageViews: FieldValue.increment(1),
    updatedAt: Timestamp.now(),
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true }); // merge: true 避免覆蓋其他欄位

  return 1;
}

// ======================== 查詢統計 ========================

/**
 * 取得今日的統計摘要。
 * 從 statistics Collection 查詢當日所有記錄，
 * 使用 Set 計算獨立訪客數。
 */
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

/**
 * 取得各頁面的統計彙總。
 * 若指定 page 參數，僅回傳該頁面的數據。
 * 回傳格式：{ "/page": { visits, userCount }, ... }
 */
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

/**
 * 取得每日統計數據（從 daily_stats Collection）。
 * 若指定 date，僅回傳該日數據；否則回傳所有日期。
 */
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

/**
 * 取得所有訪問明細記錄（按時間倒序）。
 * 回傳格式：[{ userId, pagePath, time }, ...]
 * 注意：此查詢載入全量資料，資料量大時可能影響效能。
 */
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

/** getDailyStats 的無參數版本，回傳所有日期的每日統計 */
async function getDailyStatistics() {
  return getDailyStats();
}

/**
 * 取得指定頁面今日的訪問統計。
 * 回傳 { date, page, visits, userCount }
 */
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

/**
 * 取得指定頁面的日趨勢（回溯 N 天）。
 * 逐一查詢每一天的數據，組成時間序列陣列。
 * 回傳格式：[{ date, visits, userCount }, ...]（由舊到新）
 */
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

/**
 * 取得全站用戶趨勢（回溯 N 天）。
 * 與 getPageDailyTrend 類似，但不篩選 pagePath。
 */
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

/** 近 7 天全站趨勢（簡寫） */
async function getWeekTrend() { return getUserTrend(7); }

/** 近 30 天全站趨勢（簡寫） */
async function getMonthTrend() { return getUserTrend(30); }

/**
 * 取得指定頁面的每小時訪問分佈（回溯 N 小時）。
 * 用於流量尖峰分析。
 * 回傳格式：[{ hour, visits }, ...]
 */
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

/**
 * 篩選指定日期的各頁面統計。
 * 回傳 [{ page, visits, userCount }, ...]
 */
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

/**
 * 篩選指定頁面在特定日期的每小時分佈。
 * 回傳 [{ hour, visits }, ...]（按小時升序）
 */
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

/**
 * 篩選指定年份第幾週的各頁面統計。
 * 使用 ISO 週數計算：1月1日所在週為第1週，每週從週一開始。
 */
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

/**
 * 篩選指定年月的各頁面統計。
 * 自動計算該月的第一天與最後一天作為查詢範圍。
 */
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

/** JSON 遷移已不需要（已改用 Firestore），保留介面相容 */
async function migrateFromJson() {
  console.log('[Statistics] Firestore does not require JSON migration.');
  return 0;
}

// ======================== 明細查詢 ========================

/**
 * 取得某一天的詳細統計。
 * 回傳包含：當日總覽、每小時分佈、各頁面統計。
 * 若指定 page 參數，僅統計該頁面的數據。
 */
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
    if (page && data.pagePath !== page) return; // 頁面篩選
    total++;
    users.add(data.userId);

    // 計算每小時分佈（轉換為 UTC+8 小時）
    const hour = new Date(data.timestamp * 1000 + 8 * 3600 * 1000).getUTCHours();
    hourly[hour] = (hourly[hour] || 0) + 1;

    // 計算各頁面統計
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

/**
 * 取得某一週的詳細統計。
 * 回傳包含：當週總覽、每日趨勢、各頁面統計。
 * 會自動補齊無資料的空白日（visits: 0），確保圖表完整。
 */
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

  // 補齊空白日：從 startDate 到 endDate 逐日檢查，無資料則填入 0
  var fill = {};
  var cur = new Date(startDate.getTime());
  while (cur <= endDate) {
    var ds = cur.toISOString().slice(0, 10);
    fill[ds] = daily[ds] || { visits: 0, users: new Set() };
    cur.setDate(cur.getDate() + 1);
  }
  return {
    year, week,
    totalVisits: total,
    uniqueUsers: allUsers.size,
    dailyTrend: Object.entries(fill).map(([d, v]) => ({
      date: d, visits: v.visits, uniqueUsers: v.users.size
    })).sort((a, b) => a.date.localeCompare(b.date)),
    pages: Object.entries(pages).map(([name, d]) => ({
      page: name, visits: d.visits, uniqueUsers: d.u.size
    })).sort((a, b) => b.visits - a.visits)
  };
}

/**
 * 取得某一月的詳細統計。
 * 結構與 getWeekDetail 相同，但時間範圍為整月。
 * 同樣會補齊空白日。
 */
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

  // 補齊空白日
  var fill = {};
  var cur = new Date(startDate.getTime());
  while (cur <= endDate) {
    var ds = cur.toISOString().slice(0, 10);
    fill[ds] = daily[ds] || { visits: 0, users: new Set() };
    cur.setDate(cur.getDate() + 1);
  }
  return {
    year, month,
    totalVisits: total,
    uniqueUsers: allUsers.size,
    dailyTrend: Object.entries(fill).map(([d, v]) => ({
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
