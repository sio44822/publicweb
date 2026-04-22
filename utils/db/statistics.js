const fs = require('fs');
const path = require('path');
const { get } = require('./connection');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STATISTICS_FILE = path.join(DATA_DIR, 'coupon-statistics.json');
const DAILY_STATS_FILE = path.join(DATA_DIR, 'daily-statistics.json');

// Helper: Get Hong Kong time as ISO string
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

// Helper: Get Hong Kong date string (YYYY-MM-DD)
function getHongKongDateString() {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Convert ISO 8601 time to Unix timestamp (seconds)
function timeToTimestamp(timeStr) {
  return Math.floor(new Date(timeStr).getTime() / 1000);
}

// Record a visit to the statistics table
function recordVisit(userId, pagePath = '/') {
  const db = get();
  const timestamp = timeToTimestamp(getHongKongTime());
  
  const stmt = db.prepare(`
    INSERT INTO statistics (userId, pagePath, timestamp)
    VALUES (?, ?, ?)
  `);
  
  const result = stmt.run(userId, pagePath, timestamp);
  return result.changes;
}

// Get today's statistics
function getTodayStats() {
  const db = get();
  const hkDate = getHongKongDateString();
  const todayStart = new Date(hkDate + 'T00:00:00+08:00');
  const todayEnd = new Date(hkDate + 'T23:59:59+08:00');
  
  const startTimestamp = Math.floor(todayStart.getTime() / 1000);
  const endTimestamp = Math.floor(todayEnd.getTime() / 1000);
  
  const userCount = db.prepare(`
    SELECT COUNT(DISTINCT userId) as count
    FROM statistics
    WHERE timestamp >= ? AND timestamp <= ?
  `).get(startTimestamp, endTimestamp).count;
  
  const visitCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM statistics
    WHERE timestamp >= ? AND timestamp <= ?
  `).get(startTimestamp, endTimestamp).count;
  
  return {
    date: hkDate,
    userCount,
    visitCount
  };
}

// Get page statistics (optionally filtered by page)
function getPageStats(page) {
  const db = get();
  let query = `
    SELECT pagePath as page, COUNT(*) as visits, COUNT(DISTINCT userId) as userCount
    FROM statistics
  `;
  
  if (page) {
    query += ` WHERE pagePath = ?`;
    query += ` GROUP BY pagePath`;
    const result = db.prepare(query).get(page);
    return result ? { [result.page]: { visits: result.visits, userCount: result.userCount } } : {};
  } else {
    query += ` GROUP BY pagePath`;
    const results = db.prepare(query).all();
    const result = {};
    results.forEach(row => {
      result[row.page] = { visits: row.visits, userCount: row.userCount };
    });
    return result;
  }
}

// Get daily statistics (optionally filtered by date)
function getDailyStats(date) {
  const db = get();
  const hkDate = date || getHongKongDateString();
  
  if (date) {
    const row = db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(date);
    return row ? { [row.date]: { userCount: row.totalVisitors, visitCount: row.totalPageViews } } : {};
  } else {
    const results = db.prepare('SELECT * FROM daily_stats').all();
    const result = {};
    results.forEach(row => {
      result[row.date] = { userCount: row.totalVisitors, visitCount: row.totalPageViews };
    });
    return result;
  }
}

// Get all statistics records (for compatibility)
function getStatistics() {
  const db = get();
  const results = db.prepare(`
    SELECT userId, pagePath, timestamp
    FROM statistics
    ORDER BY timestamp DESC
  `).all();
  
  // Convert timestamps back to ISO format
  return results.map(row => ({
    userId: row.userId,
    pagePath: row.pagePath,
    time: new Date(row.timestamp * 1000).toISOString()
  }));
}

// Migrate data from JSON files to SQLite
function migrateFromJson() {
  const db = get();
  
  console.log('[Statistics Migration] Starting migration from JSON to SQLite...');
  
  // Check if data already exists
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM statistics').get().count;
  if (existingCount > 0) {
    console.log(`[Statistics Migration] Statistics table already has ${existingCount} records. Skipping migration.`);
  } else {
    // Read coupon-statistics.json
    if (fs.existsSync(STATISTICS_FILE)) {
      const statsData = JSON.parse(fs.readFileSync(STATISTICS_FILE, 'utf8'));
      console.log(`[Statistics Migration] Found ${statsData.length} records in coupon-statistics.json`);
      
      const insertStmt = db.prepare(`
        INSERT INTO statistics (userId, pagePath, timestamp)
        VALUES (?, ?, ?)
      `);
      
      const insertMany = db.transaction((records) => {
        for (const record of records) {
          const timestamp = timeToTimestamp(record.time);
          const pagePath = record.pagePath || '/';  // Default to root path if missing
          insertStmt.run(record.userId, pagePath, timestamp);
        }
      });
      
      insertMany(statsData);
      console.log(`[Statistics Migration] Migrated ${statsData.length} statistics records`);
    } else {
      console.log('[Statistics Migration] coupon-statistics.json not found, skipping');
    }
  }
  
  // Check if daily_stats already has data
  const existingDailyCount = db.prepare('SELECT COUNT(*) as count FROM daily_stats').get().count;
  if (existingDailyCount > 0) {
    console.log(`[Statistics Migration] daily_stats table already has ${existingDailyCount} records. Skipping migration.`);
  } else {
    // Read daily-statistics.json
    if (fs.existsSync(DAILY_STATS_FILE)) {
      const dailyData = JSON.parse(fs.readFileSync(DAILY_STATS_FILE, 'utf8'));
      console.log(`[Statistics Migration] Found ${Object.keys(dailyData).length} records in daily-statistics.json`);
      
      const insertStmt = db.prepare(`
        INSERT INTO daily_stats (date, totalVisitors, totalPageViews)
        VALUES (?, ?, ?)
      `);
      
      Object.entries(dailyData).forEach(([date, values]) => {
        insertStmt.run(date, values.userCount, values.visitCount);
      });
      
      console.log(`[Statistics Migration] Migrated ${Object.keys(dailyData).length} daily_stats records`);
    } else {
      console.log('[Statistics Migration] daily-statistics.json not found, skipping');
    }
  }
  
  console.log('[Statistics Migration] Migration complete');
}

module.exports = {
  recordVisit,
  getTodayStats,
  getPageStats,
  getDailyStats,
  getStatistics,
  migrateFromJson,
  getHongKongTime,
  getHongKongDateString
};