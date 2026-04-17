const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATISTICS_FILE = path.join(DATA_DIR, 'coupon-statistics.json');
const DAILY_STATS_FILE = path.join(DATA_DIR, 'daily-statistics.json');

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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStatistics() {
  ensureDataDir();
  if (!fs.existsSync(STATISTICS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(STATISTICS_FILE, 'utf8');
  const stats = JSON.parse(data);
  return stats.sort((a, b) => new Date(b.time) - new Date(a.time));
}

function saveStatistics(stats) {
  ensureDataDir();
  fs.writeFileSync(STATISTICS_FILE, JSON.stringify(stats, null, 2));
}

function recordVisit(userId) {
  const stats = getStatistics();
  stats.push({
    userId,
    time: getHongKongTime()
  });
  saveStatistics(stats);
  return stats.length;
}

function getTodayStats() {
  const stats = getStatistics();
  const hkDate = getHongKongDateString();
  
  const todayRecords = stats.filter(record => {
    const recordDate = record.time.split('T')[0];
    return recordDate === hkDate;
  });

  const uniqueUsers = new Set(todayRecords.map(r => r.userId));

  return {
    date: hkDate,
    userCount: uniqueUsers.size,
    visitCount: todayRecords.length
  };
}

function generateDailyStatistics() {
  const stats = getStatistics();
  const allDailyStats = fs.existsSync(DAILY_STATS_FILE) 
    ? JSON.parse(fs.readFileSync(DAILY_STATS_FILE, 'utf8'))
    : {};

  const hkDate = getHongKongDateString();
  const todayRecords = stats.filter(record => {
    const recordDate = record.time.split('T')[0];
    return recordDate === hkDate;
  });

  const uniqueUsers = new Set(todayRecords.map(r => r.userId));

  allDailyStats[hkDate] = {
    userCount: uniqueUsers.size,
    visitCount: todayRecords.length
  };

  fs.writeFileSync(DAILY_STATS_FILE, JSON.stringify(allDailyStats, null, 2));
  console.log(`[Statistics] Daily stats generated for ${hkDate}: ${uniqueUsers.size} users, ${todayRecords.length} visits`);
}

function getDailyStatistics() {
  if (!fs.existsSync(DAILY_STATS_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(DAILY_STATS_FILE, 'utf8'));
}

function startDailyCron() {
  cron.schedule('0 4 * * *', () => {
    console.log('[Statistics] Running daily statistics at 12:00 HK time');
    generateDailyStatistics();
  });
}

module.exports = {
  recordVisit,
  getTodayStats,
  getStatistics,
  getDailyStatistics,
  generateDailyStatistics,
  startDailyCron,
  getHongKongTime,
  getHongKongDateString
};