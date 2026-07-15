// Firestore 服務配置資料存取層
import { getDb, Timestamp } from './firebase.js';
import fs from 'fs';

const COLLECTION = 'services';

/**
 * 將 Firestore 文件轉換為前端可用的服務物件。
 * 特別處理布林值：enabled / showInNav / isAdvanced
 * 確保即使資料庫中存的是 1/0 也能正確轉為 true/false。
 */
const svcMap = (id, data) => ({
  id: String(id),
  name: data.name || '',
  description: data.description || '',
  url: data.url || '',
  icon: data.icon || '',
  order: data.order ?? 0,
  enabled: data.enabled === true || data.enabled === 1,
  showInNav: data.showInNav !== false, // 預設為 true
  isAdvanced: data.isAdvanced === true
});

/** 取得所有服務（按 order 欄位升序排列） */
async function getAll() {
  const snapshot = await getDb().collection(COLLECTION).get();
  const all = snapshot.docs.map(d => svcMap(d.id, d.data()));
  return all.sort((a, b) => a.order - b.order);
}

/** 取得已啟用的服務（用於前端導覽列） */
async function getEnabled() {
  const all = await getAll();
  return all.filter(s => s.enabled);
}

/** 依 ID 取得單一服務 */
async function getById(id) {
  const doc = await getDb().collection(COLLECTION).doc(String(id)).get();
  if (!doc.exists) return null;
  return svcMap(doc.id, doc.data());
}

/**
 * 更新單一服務。
 * 與 courses.js 相同，使用白名單機制防止覆蓋 createdAt 等欄位。
 * 回傳 true 表示更新成功，false 表示無欄位需更新。
 */
async function update(id, updates) {
  const allowed = {};
  if (updates.name !== undefined) allowed.name = updates.name;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.url !== undefined) allowed.url = updates.url;
  if (updates.icon !== undefined) allowed.icon = updates.icon;
  if (updates.order !== undefined) allowed.order = updates.order;
  if (updates.enabled !== undefined) allowed.enabled = updates.enabled ? true : false;
  if (updates.isAdvanced !== undefined) allowed.isAdvanced = updates.isAdvanced ? true : false;
  if (Object.keys(allowed).length === 0) return false;
  allowed.updatedAt = Timestamp.now();

  await getDb().collection(COLLECTION).doc(String(id)).update(allowed);
  return true;
}

/**
 * 整批替換服務配置（全量覆蓋）。
 * 先刪除所有現有文件，再逐一寫入新的服務資料。
 * 使用 Firestore 批次操作確保原子性。
 *
 * 注意：此操作為破壞性操作，會清除所有舊資料。
 */
async function saveServices(config) {
  const now = Timestamp.now();
  const batch = getDb().batch();
  const existing = await getDb().collection(COLLECTION).listDocuments();
  for (const ref of existing) batch.delete(ref);

  for (const svc of (config.services || [])) {
    const ref = getDb().collection(COLLECTION).doc(String(svc.id));
    batch.set(ref, {
      name: svc.name || '',
      description: svc.description || '',
      url: svc.url || '',
      icon: svc.icon || '',
      order: svc.order ?? 0,
      enabled: svc.enabled === true || svc.enabled === 1,
      showInNav: svc.showInNav !== false,
      isAdvanced: svc.isAdvanced === true,
      createdAt: now,
      updatedAt: now
    });
  }
  await batch.commit();
  return true;
}

/**
 * 從本地 JSON 檔案遷移服務資料至 Firestore。
 * 使用批次寫入以確保原子性。
 */
async function migrateFromJson(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const now = Timestamp.now();
  const batch = getDb().batch();
  for (const svc of (data.services || [])) {
    const ref = getDb().collection(COLLECTION).doc(String(svc.id));
    batch.set(ref, {
      name: svc.name || '',
      description: svc.description || '',
      url: svc.url || '',
      icon: svc.icon || '',
      order: svc.order ?? 0,
      enabled: svc.enabled === true || svc.enabled === 1,
      showInNav: svc.showInNav !== false,
      isAdvanced: svc.isAdvanced === true,
      createdAt: now,
      updatedAt: now
    });
  }
  await batch.commit();
  return (data.services || []).length;
}

/**
 * 驗證服務配置的必填欄位。
 * 回傳錯誤訊息陣列（空陣列表示驗證通過）。
 */
function validateServices(services) {
  const errors = [];
  services.forEach((s, i) => {
    if (!s.name || !String(s.name).trim()) errors.push('第' + (i + 1) + '個服務名稱不可為空白');
    if (!s.url || !String(s.url).trim()) errors.push('第' + (i + 1) + '個服務URL不可為空白');
  });
  return errors;
}

export default {
  getAll,
  getEnabled,
  getById,
  update,
  saveServices,
  migrateFromJson,
  validateServices
};
