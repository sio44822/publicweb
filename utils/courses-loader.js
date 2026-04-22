const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getCourses() {
  ensureDataDir();
  if (!fs.existsSync(COURSES_FILE)) {
    return { courses: [] };
  }
  const data = fs.readFileSync(COURSES_FILE, 'utf8');
  return JSON.parse(data);
}

function saveCourses(config) {
  ensureDataDir();
  fs.writeFileSync(COURSES_FILE, JSON.stringify(config, null, 2));
}

function getAllCourses() {
  const config = getCourses();
  return config.courses;
}

function getCourseById(id) {
  const config = getCourses();
  return config.courses.find(c => c.id === id);
}

function addCourse(course) {
  const rawName = course.name;
  console.log('addCourse - rawName:', JSON.stringify(rawName), 'type:', typeof rawName);
  
  const name = (course.name || '').toString().trim();
  console.log('addCourse - name:', JSON.stringify(name), 'length:', name.length);
  
  if (!name || name.length === 0) {
    console.log('addCourse - ERROR: name is empty');
    return null;
  }
  
  const config = getCourses();
  
  const numericIds = config.courses
    .map(c => {
      const n = parseInt(c.id);
      return isNaN(n) ? 0 : n;
    })
    .filter(n => n > 0);
  
  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const newId = maxId + 1;
  
  const description = (course.description || '').toString().trim() || `關於 ${name}`;
  const image = (course.image || '').toString().trim() || `https://placehold.co/400x400?text=${encodeURIComponent(name)}`;
  
  const newCourse = {
    id: String(newId),
    name: name,
    description: description,
    image: image
  };
  
  if (!course.slots || !course.slots.length) {
    newCourse.slots = [
      { time: '9:00', limit: 3, booked: 0 },
      { time: '13:00', limit: 3, booked: 0 },
      { time: '15:00', limit: 3, booked: 0 }
    ];
  } else {
    newCourse.slots = course.slots.map(s => ({
      time: s.time || '9:00',
      limit: s.limit || 3,
      booked: 0
    }));
  }
  
  console.log('addCourse - newCourse:', JSON.stringify(newCourse));
  
  config.courses.push(newCourse);
  saveCourses(config);
  return newCourse;
}

function updateCourse(id, updates) {
  const config = getCourses();
  const idx = config.courses.findIndex(c => c.id === id);
  if (idx === -1) return null;
  config.courses[idx] = { ...config.courses[idx], ...updates };
  saveCourses(config);
  return config.courses[idx];
}

function deleteCourse(id) {
  const config = getCourses();
  const idx = config.courses.findIndex(c => c.id === id);
  if (idx === -1) return false;
  config.courses.splice(idx, 1);
  saveCourses(config);
  return true;
}

function validateCourses(courses) {
  const errors = [];
  courses.forEach((c, i) => {
    if (!c.name || !c.name.trim()) errors.push(`第 ${i + 1} 項：名稱不可為空`);
    if (!c.description || !c.description.trim()) errors.push(`第 ${i + 1}項：說明不可為空`);
  });
  return errors;
}

module.exports = {
  getCourses,
  saveCourses,
  getAllCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
  validateCourses
};