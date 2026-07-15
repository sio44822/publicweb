import { getDb, Timestamp } from './firebase.js';
import fs from 'fs';

const COLLECTION = 'services';

const svcMap = (id, data) => ({
  id: String(id),
  name: data.name || '',
  description: data.description || '',
  url: data.url || '',
  icon: data.icon || '',
  order: data.order ?? 0,
  enabled: data.enabled === true || data.enabled === 1,
  showInNav: data.showInNav !== false,
  isAdvanced: data.isAdvanced === true
});

async function getAll() {
  const snapshot = await getDb().collection(COLLECTION).get();
  const all = snapshot.docs.map(d => svcMap(d.id, d.data()));
  return all.sort((a, b) => a.order - b.order);
}

async function getEnabled() {
  const all = await getAll();
  return all.filter(s => s.enabled);
}

async function getById(id) {
  const doc = await getDb().collection(COLLECTION).doc(String(id)).get();
  if (!doc.exists) return null;
  return svcMap(doc.id, doc.data());
}

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
