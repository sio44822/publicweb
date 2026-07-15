// Firestore 課程資料存取層（CRUD 操作）
import { getDb, Timestamp } from './firebase.js';

const COLLECTION = 'courses';

/**
 * 將 Firestore 文件轉換為前端可用的課程物件。
 * 處理 Timestamp 轉毫秒時間戳、缺省值等。
 */
function docToCourse(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || '',
    description: data.description || '',
    image: data.image || '',
    slots: Array.isArray(data.slots) ? data.slots : [],
    created_at: data.createdAt?.toMillis?.() ?? null,
    updated_at: data.updatedAt?.toMillis?.() ?? null
  };
}

/** 取得所有課程（按建立時間升序排列） */
async function getAll() {
  const snapshot = await getDb().collection(COLLECTION).orderBy('createdAt', 'asc').get();
  return snapshot.docs.map(docToCourse);
}

/** 依 ID 取得單一課程，不存在則回傳 null */
async function getById(id) {
  const doc = await getDb().collection(COLLECTION).doc(String(id)).get();
  if (!doc.exists) return null;
  return docToCourse(doc);
}

/**
 * 新增課程。
 * 自動加入 createdAt / updatedAt 時間戳，
 * 回傳完整課程物件（含 Firestore 自動產生的 ID）。
 */
async function add(course) {
  const now = Timestamp.now();
  const data = {
    name: course.name || '',
    description: course.description || '',
    image: course.image || '',
    slots: Array.isArray(course.slots) ? course.slots : [],
    createdAt: now,
    updatedAt: now
  };
  const ref = await getDb().collection(COLLECTION).add(data);
  return getById(ref.id);
}

/**
 * 更新課程。
 * 僅允許更新白名單中的欄位（name / description / image / slots），
 * 防止意外覆蓋其他欄位（如 createdAt）。
 * 回傳更新後的完整課程物件。
 */
async function updateCourse(id, updates) {
  const existing = await getById(id);
  if (!existing) return null;

  const allowed = {};
  if (updates.name !== undefined) allowed.name = updates.name;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.image !== undefined) allowed.image = updates.image;
  if (updates.slots !== undefined) {
    allowed.slots = Array.isArray(updates.slots) ? updates.slots : [];
  }
  allowed.updatedAt = Timestamp.now();

  await getDb().collection(COLLECTION).doc(String(id)).update(allowed);
  return getById(id);
}

/** 刪除課程（硬刪除，不可復原） */
async function deleteCourse(id) {
  await getDb().collection(COLLECTION).doc(String(id)).delete();
  return true;
}

/**
 * 從本地 JSON 檔案遷移課程資料至 Firestore。
 * 使用 Firestore 批次寫入（batch）以確保原子性。
 * 回傳遷移的課程數量。
 */
async function migrateFromJson(jsonPath) {
  const fs = await import('fs');
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(rawData);

  const now = Timestamp.now();
  const batch = getDb().batch();
  for (const c of (data.courses || [])) {
    const ref = getDb().collection(COLLECTION).doc(String(c.id));
    batch.set(ref, {
      name: c.name || '',
      description: c.description || '',
      image: c.image || '',
      slots: Array.isArray(c.slots) ? c.slots : [],
      createdAt: now,
      updatedAt: now
    });
  }
  await batch.commit();
  return (data.courses || []).length;
}

export default {
  getAll,
  getById,
  add,
  updateCourse,
  deleteCourse,
  migrateFromJson
};
