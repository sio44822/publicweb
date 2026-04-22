const fs = require('fs');
const { get } = require('./connection');

/**
 * Get all courses from database
 * @returns {Array} Array of course objects
 */
function getAll() {
  const db = get();
  const courses = db.prepare('SELECT * FROM courses ORDER BY id').all();
  return courses.map(course => ({
    ...course,
    slots: JSON.parse(course.slots || '[]')
  }));
}

/**
 * Get course by ID
 * @param {number} id - Course ID
 * @returns {Object|null} Course object or null
 */
function getById(id) {
  const db = get();
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!course) return null;
  return {
    ...course,
    slots: JSON.parse(course.slots || '[]')
  };
}

/**
 * Add a new course
 * @param {Object} course - Course object
 * @returns {Object} Created course
 */
function add(course) {
  const db = get();
  let slotsData = course.slots;
  if (typeof slotsData === 'string') {
    try { slotsData = JSON.parse(slotsData); } catch { slotsData = []; }
  }
  if (!Array.isArray(slotsData)) slotsData = [];
  const slots = JSON.stringify(slotsData);
  
  const stmt = db.prepare(`
    INSERT INTO courses (name, description, image, slots)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    course.name,
    course.description || '',
    course.image || '',
    slots
  );
  
  return getById(result.lastInsertRowid);
}

/**
 * Update a course
 * @param {number} id - Course ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated course or null
 */
function updateCourse(id, updates) {
  const db = get();
  if (!updates || Object.keys(updates).length === 0) return getById(id);
  
  const existing = getById(id);
  if (!existing) return null;
  
  const merged = { ...existing, ...updates };
  if (updates.slots !== undefined) {
    let slotsData = updates.slots;
    if (typeof slotsData === 'string') {
      try { slotsData = JSON.parse(slotsData); } catch { slotsData = []; }
    }
    if (!Array.isArray(slotsData)) slotsData = [];
    merged.slots = slotsData;
  }
  
  let slotsStr = merged.slots;
  if (typeof slotsStr === 'string') {
    try { slotsStr = JSON.parse(slotsStr); } catch { slotsStr = []; }
  }
  if (!Array.isArray(slotsStr)) slotsStr = [];
  const slots = JSON.stringify(slotsStr);
  
  const stmt = db.prepare(`
    UPDATE courses
    SET name = ?, description = ?, image = ?, slots = ?, updated_at = strftime('%s', 'now')
    WHERE id = ?
  `);
  
  stmt.run(merged.name || existing.name, merged.description || existing.description, merged.image || existing.image, slots, id);
  
  return getById(id);
}

/**
 * Delete a course
 * @param {number} id - Course ID
 * @returns {boolean} Success
 */
function deleteCourse(id) {
  const db = get();
  const stmt = db.prepare('DELETE FROM courses WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Migrate courses from JSON file to database
 * @param {string} jsonPath - Path to JSON file
 * @returns {number} Number of courses migrated
 */
function migrateFromJson(jsonPath) {
  const db = get();
  
  // Read JSON file
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(rawData);
  const courses = data.courses;
  
  // Clear existing courses
  db.prepare('DELETE FROM courses').run();
  
  // Insert courses
  const stmt = db.prepare(`
    INSERT INTO courses (id, name, description, image, slots)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((courses) => {
    for (const course of courses) {
      const slots = JSON.stringify(course.slots || []);
      const id = parseInt(course.id, 10);
      stmt.run(
        isNaN(id) ? null : id,
        course.name,
        course.description || '',
        course.image || '',
        slots
      );
    }
  });
  
  insertMany(courses);
  
  return courses.length;
}

module.exports = {
  getAll,
  getById,
  add,
  updateCourse,
  deleteCourse,
  migrateFromJson
};