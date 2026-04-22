const path = require('path');
const { get } = require('./connection');

function getAll() {
  const rows = get().prepare('SELECT * FROM services').all();
  return rows.map(row => ({
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    url: row.url || '',
    icon: row.icon || '',
    order: row.order_number,
    enabled: row.enabled === 1
  }));
}

function getEnabled() {
  const rows = get().prepare('SELECT * FROM services WHERE enabled = 1 ORDER BY order_number').all();
  return rows.map(row => ({
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    url: row.url || '',
    icon: row.icon || '',
    order: row.order_number,
    enabled: true
  }));
}

function getById(id) {
  const row = get().prepare('SELECT * FROM services WHERE id = ?').get(String(id));
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    url: row.url || '',
    icon: row.icon || '',
    order: row.order_number,
    enabled: row.enabled === 1
  };
}

function update(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url); }
  if (updates.icon !== undefined) { fields.push('icon = ?'); values.push(updates.icon); }
  if (updates.order !== undefined) { fields.push('order_number = ?'); values.push(updates.order); }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
  
  if (fields.length === 0) return false;
  
  fields.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000));
  values.push(String(id));
  
  const stmt = get().prepare('UPDATE services SET ' + fields.join(', ') + ' WHERE id = ?');
  const result = stmt.run(...values);
  return result.changes > 0;
}

function saveServices(config) {
  const db = get();
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM services').run();
    const insert = db.prepare('INSERT INTO services (id, name, description, url, icon, order_number, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const svc of config.services) {
      insert.run(String(svc.id), svc.name || '', svc.description || '', svc.url || '', svc.icon || '', svc.order || 0, svc.enabled ? 1 : 0);
    }
  });
  transaction();
  return true;
}

function migrateFromJson(jsonPath) {
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const db = get();
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM services').run();
    const insert = db.prepare('INSERT INTO services (id, name, description, url, icon, order_number, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const svc of (data.services || [])) {
      insert.run(String(svc.id), svc.name || '', svc.description || '', svc.url || '', svc.icon || '', svc.order || 0, svc.enabled ? 1 : 0);
    }
  });
  transaction();
  return data.services ? data.services.length : 0;
}

function validateServices(services) {
  const errors = [];
  services.forEach((s, i) => {
    if (!s.name || !String(s.name).trim()) errors.push(`第 ${i + 1} 項：名稱不可為空`);
    if (!s.url || !String(s.url).trim()) errors.push(`第 ${i + 1} 項：網址不可為空`);
  });
  return errors;
}

module.exports = {
  getAll,
  getEnabled,
  getById,
  update,
  saveServices,
  migrateFromJson,
  validateServices
};