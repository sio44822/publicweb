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

function recordVisit(userId, pagePath = '/') {
  const stats = getStatistics();
  stats.push({
    userId,
    pagePath,
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

function getTodayPageStats(page) {
  const stats = getStatistics();
  const hkDate = getHongKongDateString();
  
  let todayRecords = stats.filter(record => {
    const recordDate = record.time.split('T')[0];
    return recordDate === hkDate;
  });

  if (page) {
    todayRecords = todayRecords.filter(r => r.pagePath === page);
  }

  const uniqueUsers = new Set(todayRecords.map(r => r.userId));

  return {
    date: hkDate,
    page: page || 'all',
    userCount: uniqueUsers.size,
    visitCount: todayRecords.length
  };
}

function getPageDailyTrend(page, days = 7) {
  const stats = getStatistics();
  const result = [];
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  const dateSet = new Set();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    dateSet.add(dateStr);
    result.push({ date: dateStr, users: 0, visits: 0 });
  }

  const dailyUsers = {};
  const dailyVisits = {};

  stats.forEach(record => {
    const recordDate = record.time.split('T')[0];
    const recordPage = record.pagePath;
    if (dateSet.has(recordDate) && (!page || recordPage === page)) {
      if (!dailyUsers[recordDate]) {
        dailyUsers[recordDate] = new Set();
        dailyVisits[recordDate] = 0;
      }
      dailyUsers[recordDate].add(record.userId);
      dailyVisits[recordDate]++;
    }
  });

  result.forEach(item => {
    if (dailyUsers[item.date]) {
      item.users = dailyUsers[item.date].size;
      item.visits = dailyVisits[item.date];
    }
  });

  return result;
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

function getPageStats() {
  const stats = getStatistics();
  const pageCounts = {};
  
  stats.forEach(record => {
    const page = record.pagePath || '/';
    if (!pageCounts[page]) {
      pageCounts[page] = { visits: 0, users: new Set() };
    }
    pageCounts[page].visits++;
    pageCounts[page].users.add(record.userId);
  });

  const result = {};
  Object.keys(pageCounts).forEach(page => {
    result[page] = {
      visits: pageCounts[page].visits,
      userCount: pageCounts[page].users.size
    };
  });

  return result;
}

function getDailyPageStats(days = 30) {
  const stats = getStatistics();
  const result = {};
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    result[dateStr] = {};
  }

  stats.forEach(record => {
    const recordDate = record.time.split('T')[0];
    if (result[recordDate]) {
      const page = record.pagePath || '/';
      if (!result[recordDate][page]) {
        result[recordDate][page] = 0;
      }
      result[recordDate][page]++;
    }
  });

  return result;
}

function getUserTrend(days = 7) {
  const stats = getStatistics();
  const result = [];
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    result.push({ date: dateStr, users: 0, visits: 0 });
  }

  const dailyUsers = {};
  const dailyVisits = {};

  stats.forEach(record => {
    const recordDate = record.time.split('T')[0];
    if (!dailyUsers[recordDate]) {
      dailyUsers[recordDate] = new Set();
      dailyVisits[recordDate] = 0;
    }
    dailyUsers[recordDate].add(record.userId);
    dailyVisits[recordDate]++;
  });

  result.forEach(item => {
    if (dailyUsers[item.date]) {
      item.users = dailyUsers[item.date].size;
      item.visits = dailyVisits[item.date];
    }
  });

  return result;
}

function getWeekTrend() {
  const stats = getStatistics();
  const result = [];
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const dayOfWeek = now.getUTCDay();
  const daysToStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  for (let week = 3; week >= 0; week--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - daysToStart - (week * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekLabel = `${weekEnd.getUTCMonth() + 1}/${weekEnd.getUTCDate()}`;
    result.push({ week: weekLabel, users: 0, visits: 0 });
  }

  const dailyUsers = {};
  const dailyVisits = {};

  stats.forEach(record => {
    const recordDate = record.time.split('T')[0];
    if (!dailyUsers[recordDate]) {
      dailyUsers[recordDate] = new Set();
      dailyVisits[recordDate] = 0;
    }
    dailyUsers[recordDate].add(record.userId);
    dailyVisits[recordDate]++;
  });

  const nowDateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  
  result.forEach((item, idx) => {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - daysToStart - (3 - idx) * 7);
    
    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + d);
      const dateStr = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
      
      if (dateStr <= nowDateStr && dailyUsers[dateStr]) {
        item.users += dailyUsers[dateStr].size;
        item.visits += dailyVisits[dateStr];
      }
    }
  });

  return result;
}

function getMonthTrend() {
  const stats = getStatistics();
  const result = [];
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  for (let month = 5; month >= 0; month--) {
    const date = new Date(now);
    date.setUTCMonth(date.getUTCMonth() - month);
    const monthLabel = `${date.getUTCMonth() + 1}月`;
    result.push({ month: monthLabel, users: 0, visits: 0 });
  }

  const dailyUsers = {};
  const dailyVisits = {};

  stats.forEach(record => {
    const recordDate = record.time.split('T')[0];
    if (!dailyUsers[recordDate]) {
      dailyUsers[recordDate] = new Set();
      dailyVisits[recordDate] = 0;
    }
    dailyUsers[recordDate].add(record.userId);
    dailyVisits[recordDate]++;
  });

  const nowDateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  
  result.forEach((item, idx) => {
    const monthStart = new Date(now);
    monthStart.setUTCMonth(monthStart.getUTCMonth() - (5 - idx));
    monthStart.setUTCDate(1);
    
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    monthEnd.setUTCDate(0);
    
    for (let d = 1; d <= monthEnd.getUTCDate(); d++) {
      const currentDate = new Date(monthStart);
      currentDate.setUTCDate(d);
      const dateStr = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
      
      if (dateStr <= nowDateStr && dailyUsers[dateStr]) {
        item.users += dailyUsers[dateStr].size;
        item.visits += dailyVisits[dateStr];
      }
    }
  });

  return result;
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
  getPageStats,
  getDailyPageStats,
  generateDailyStatistics,
  startDailyCron,
  getHongKongTime,
  getHongKongDateString,
  getUserTrend,
  getWeekTrend,
  getMonthTrend,
  getHourTrend,
  getFilteredDailyStats,
  getFilteredWeeklyStats,
  getFilteredMonthlyStats,
  getTodayPageStats,
  getPageDailyTrend,
  getPageHourTrend,
  getFilteredPageDailyStats
};

function getHourTrend(hours = 24) {
  const stats = getStatistics();
  const result = [];
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  for (let i = hours - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setUTCHours(date.getUTCHours() - i);
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const hourStr = String(date.getUTCHours()).padStart(2, '0');
    result.push({ date: dateStr, hour: hourStr, users: 0, visits: 0 });
  }

  const hourlyUsers = {};
  const hourlyVisits = {};

  stats.forEach(record => {
    const recordDatetime = record.time.split('T');
    const recordDate = recordDatetime[0];
    const recordHour = recordDatetime[1].split(':')[0];
    const key = `${recordDate}|${recordHour}`;
    
    if (!hourlyUsers[key]) {
      hourlyUsers[key] = new Set();
      hourlyVisits[key] = 0;
    }
    hourlyUsers[key].add(record.userId);
    hourlyVisits[key]++;
  });

  result.forEach(item => {
    const key = `${item.date}|${item.hour}`;
    if (hourlyUsers[key]) {
      item.users = hourlyUsers[key].size;
      item.visits = hourlyVisits[key];
    }
  });

  return result;
}

function getPageHourTrend(page, hours = 24) {
  const stats = getStatistics();
  const result = [];
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  for (let i = hours - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setUTCHours(date.getUTCHours() - i);
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const hourStr = String(date.getUTCHours()).padStart(2, '0');
    result.push({ date: dateStr, hour: hourStr, users: 0, visits: 0 });
  }

  const hourlyUsers = {};
  const hourlyVisits = {};

  stats.forEach(record => {
    if (!page || record.pagePath === page) {
      const recordDatetime = record.time.split('T');
      const recordDate = recordDatetime[0];
      const recordHour = recordDatetime[1].split(':')[0];
      const key = `${recordDate}|${recordHour}`;
      
      if (!hourlyUsers[key]) {
        hourlyUsers[key] = new Set();
        hourlyVisits[key] = 0;
      }
      hourlyUsers[key].add(record.userId);
      hourlyVisits[key]++;
    }
  });

  result.forEach(item => {
    const key = `${item.date}|${item.hour}`;
    if (hourlyUsers[key]) {
      item.users = hourlyUsers[key].size;
      item.visits = hourlyVisits[key];
    }
  });

  return result;
}

function getFilteredDailyStats(date) {
  const stats = getStatistics();
  const result = { users: 0, visits: 0, hourly: [] };
  
  const hourlyUsers = {};
  const hourlyVisits = {};

  stats.forEach(record => {
    if (record.time.startsWith(date)) {
      const hour = record.time.split('T')[1].split(':')[0];
      if (!hourlyUsers[hour]) {
        hourlyUsers[hour] = new Set();
        hourlyVisits[hour] = 0;
      }
      hourlyUsers[hour].add(record.userId);
      hourlyVisits[hour]++;
    }
  });

  const uniqueUsers = new Set();
  stats.forEach(record => {
    if (record.time.startsWith(date)) {
      uniqueUsers.add(record.userId);
    }
  });

  result.users = uniqueUsers.size;
  result.visits = Object.values(hourlyVisits).reduce((a, b) => a + b, 0);

  for (let h = 0; h < 24; h++) {
    const hourStr = String(h).padStart(2, '0');
    result.hourly.push({
      hour: hourStr,
      users: hourlyUsers[hourStr] ? hourlyUsers[hourStr].size : 0,
      visits: hourlyVisits[hourStr] || 0
    });
  }

  return result;
}

function getFilteredPageDailyStats(page, date) {
  const stats = getStatistics();
  const result = { users: 0, visits: 0, hourly: [], page: page };
  
  const hourlyUsers = {};
  const hourlyVisits = {};

  stats.forEach(record => {
    if (record.time.startsWith(date) && record.pagePath === page) {
      const hour = record.time.split('T')[1].split(':')[0];
      if (!hourlyUsers[hour]) {
        hourlyUsers[hour] = new Set();
        hourlyVisits[hour] = 0;
      }
      hourlyUsers[hour].add(record.userId);
      hourlyVisits[hour]++;
    }
  });

  const uniqueUsers = new Set();
  stats.forEach(record => {
    if (record.time.startsWith(date) && record.pagePath === page) {
      uniqueUsers.add(record.userId);
    }
  });

  result.users = uniqueUsers.size;
  result.visits = Object.values(hourlyVisits).reduce((a, b) => a + b, 0);

  for (let h = 0; h < 24; h++) {
    const hourStr = String(h).padStart(2, '0');
    result.hourly.push({
      hour: hourStr,
      users: hourlyUsers[hourStr] ? hourlyUsers[hourStr].size : 0,
      visits: hourlyVisits[hourStr] || 0
    });
  }

  return result;
}

function getFilteredWeeklyStats(year, week) {
  const stats = getStatistics();
  const result = { users: 0, visits: 0, daily: [] };
  
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const targetYear = parseInt(year);
  const targetWeek = parseInt(week);
  
  const jan1 = new Date(targetYear, 0, 1);
  const daysToFirstWeek = jan1.getDay();
  const firstWeekStart = new Date(jan1);
  firstWeekStart.setDate(jan1.getDate() - daysToFirstWeek + 1);
  
  const weekStart = new Date(firstWeekStart);
  weekStart.setDate(firstWeekStart.getDate() + (targetWeek - 1) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const nowStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  const weekStartStr = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStart.getUTCDate()).padStart(2, '0')}`;
  const weekEndStr = `${weekEnd.getUTCFullYear()}-${String(weekEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(weekEnd.getUTCDate()).padStart(2, '0')}`;

  const dailyUsers = {};
  const dailyVisits = {};
  const uniqueUsers = new Set();

  stats.forEach(record => {
    const recordDate = record.time.split('T')[0];
    if (recordDate >= weekStartStr && recordDate <= weekEndStr) {
      if (recordDate <= nowStr) {
        if (!dailyUsers[recordDate]) {
          dailyUsers[recordDate] = new Set();
          dailyVisits[recordDate] = 0;
        }
        dailyUsers[recordDate].add(record.userId);
        dailyVisits[recordDate]++;
        uniqueUsers.add(record.userId);
      }
    }
  });

  result.users = uniqueUsers.size;
  result.visits = Object.values(dailyVisits).reduce((a, b) => a + b, 0);

  for (let d = 0; d < 7; d++) {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + d);
    const dateStr = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
    result.daily.push({
      date: dateStr,
      users: dailyUsers[dateStr] ? dailyUsers[dateStr].size : 0,
      visits: dailyVisits[dateStr] || 0
    });
  }

  return result;
}

function getFilteredMonthlyStats(year, month) {
  const stats = getStatistics();
  const result = { users: 0, visits: 0, daily: [] };
  
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const targetYear = parseInt(year);
  const targetMonth = parseInt(month);
  
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0);

  const startStr = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}-${String(startDate.getUTCDate()).padStart(2, '0')}`;
  const endStr = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, '0')}-${String(endDate.getUTCDate()).padStart(2, '0')}`;
  const nowStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

  const dailyUsers = {};
  const dailyVisits = {};
  const uniqueUsers = new Set();

  stats.forEach(record => {
    const recordDate = record.time.split('T')[0];
    if (recordDate >= startStr && recordDate <= endStr) {
      if (recordDate <= nowStr) {
        if (!dailyUsers[recordDate]) {
          dailyUsers[recordDate] = new Set();
          dailyVisits[recordDate] = 0;
        }
        dailyUsers[recordDate].add(record.userId);
        dailyVisits[recordDate]++;
        uniqueUsers.add(record.userId);
      }
    }
  });

  result.users = uniqueUsers.size;
  result.visits = Object.values(dailyVisits).reduce((a, b) => a + b, 0);

  const daysInMonth = endDate.getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    result.daily.push({
      date: dateStr,
      users: dailyUsers[dateStr] ? dailyUsers[dateStr].size : 0,
      visits: dailyVisits[dateStr] || 0
    });
  }

  return result;
}