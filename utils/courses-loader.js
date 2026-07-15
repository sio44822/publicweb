// 本地 JSON 檔案版本的課程資料讀寫工具
// 作為 Firestore 遷移前的備用方案，或用於本地開發測試。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');

/** 確保 data 目錄存在（不存在則遞迴建立） */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** 讀取 courses.json，若不存在則回傳空結構 */
function getCourses() {
  ensureDataDir();
  if (!fs.existsSync(COURSES_FILE)) {
    return { courses: [] };
  }
  const data = fs.readFileSync(COURSES_FILE, 'utf8');
  return JSON.parse(data);
}

/** 將課程配置寫入 courses.json（格式化為 2 格縮排） */
function saveCourses(config) {
  ensureDataDir();
  fs.writeFileSync(COURSES_FILE, JSON.stringify(config, null, 2));
}

/** 取得所有課程陣列 */
function getAllCourses() {
  const config = getCourses();
  return config.courses;
}

/** 依 ID 查找單一課程 */
function getCourseById(id) {
  const config = getCourses();
  return config.courses.find(c => c.id === id);
}

/**
 * 新增課程。
 * 自動產生遞增 ID（從現有課程中找出最大數值 ID + 1）。
 * 若未提供 slots，預設建立三個時段（9:00 / 13:00 / 15:00），每個限額 3 人。
 * 回傳新增的完整課程物件。
 */
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

  // 從現有課程中找出最大數值 ID，新 ID = 最大值 + 1
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

  // 預設時段：每個時段限額 3 人
  if (!course.slots || !course.slots.length) {
    newCourse.slots = [
      { time: '9:00', limit: 3, booked: 0 },
      { time: '13:00', limit: 3, booked: 0 },
      { time: '15:00', limit: 3, booked: 0 }
    ];
  } else {
    // 使用提供的 slots，預設 booked 為 0
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

/**
 * 更新課程。
 * 使用展開運算符合併新舊資料，保留未提供的欄位。
 */
function updateCourse(id, updates) {
  const config = getCourses();
  const idx = config.courses.findIndex(c => c.id === id);
  if (idx === -1) return null;
  config.courses[idx] = { ...config.courses[idx], ...updates };
  saveCourses(config);
  return config.courses[idx];
}

/** 刪除課程（使用 splice 移除陣列元素） */
function deleteCourse(id) {
  const config = getCourses();
  const idx = config.courses.findIndex(c => c.id === id);
  if (idx === -1) return false;
  config.courses.splice(idx, 1);
  saveCourses(config);
  return true;
}

/**
 * 驗證課程配置的必填欄位。
 * 回傳錯誤訊息陣列（空陣列表示驗證通過）。
 */
function validateCourses(courses) {
  const errors = [];
  courses.forEach((c, i) => {
    if (!c.name || !c.name.trim()) errors.push(`第 ${i + 1} 項：名稱不可為空`);
    if (!c.description || !c.description.trim()) errors.push(`第 ${i + 1}項：說明不可為空`);
  });
  return errors;
}

export default {
  getCourses,
  saveCourses,
  getAllCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
  validateCourses
};
