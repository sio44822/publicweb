const { get } = require('./connection');

// Create all tables
const createTables = () => {
  const db = get();
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Courses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      slots TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  // Services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      url TEXT,
      icon TEXT,
      order_number INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  // Statistics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      pagePath TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  // Daily stats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      totalVisitors INTEGER DEFAULT 0,
      totalPageViews INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  console.log('Tables created successfully');
};

// Drop all tables (for migrations/rollback)
const dropTables = () => {
  const db = get();
  db.exec('DROP TABLE IF EXISTS daily_stats');
  db.exec('DROP TABLE IF EXISTS statistics');
  db.exec('DROP TABLE IF EXISTS services');
  db.exec('DROP TABLE IF EXISTS courses');
  console.log('Tables dropped');
};

// Initialize schema
const initialize = () => {
  createTables();
};

module.exports = { createTables, dropTables, initialize };