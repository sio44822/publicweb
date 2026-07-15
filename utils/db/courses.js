import { getDb, Timestamp } from './firebase.js';

const COLLECTION = 'courses';

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

async function getAll() {
  const snapshot = await getDb().collection(COLLECTION).orderBy('createdAt', 'asc').get();
  return snapshot.docs.map(docToCourse);
}

async function getById(id) {
  const doc = await getDb().collection(COLLECTION).doc(String(id)).get();
  if (!doc.exists) return null;
  return docToCourse(doc);
}

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

async function deleteCourse(id) {
  await getDb().collection(COLLECTION).doc(String(id)).delete();
  return true;
}

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
