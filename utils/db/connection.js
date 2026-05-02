const Database = require('better-sqlite3');
const path = require('path');

// Get database path from environment or default to data/publicweb.db
const getDbPath = () => {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  return path.join(__dirname, '../../data/publicweb.db');
};

let db = null;

// Open database connection
const open = () => {
  if (db) return db;
  
  const dbPath = getDbPath();
  db = new Database(dbPath);
  
  // Enable foreign keys and set busy timeout
  db.pragma('foreign_keys = ON');
  
  return db;
};

// Close database connection  
const close = () => {
  if (db) {
    db.close();
    db = null;
  }
};

// Get database instance
const get = () => {
  if (!db) {
    open();
  }
  return db;
};

module.exports = { open, close, get, getDbPath };