const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SERVICES_FILE = path.join(DATA_DIR, 'services.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getServices() {
  ensureDataDir();
  if (!fs.existsSync(SERVICES_FILE)) {
    return { services: [] };
  }
  const data = fs.readFileSync(SERVICES_FILE, 'utf8');
  return JSON.parse(data);
}

function saveServices(config) {
  ensureDataDir();
  fs.writeFileSync(SERVICES_FILE, JSON.stringify(config, null, 2));
}

function getEnabledServices() {
  const config = getServices();
  return config.services
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);
}

function getServiceById(id) {
  const config = getServices();
  return config.services.find(s => s.id === id);
}

function updateService(id, updates) {
  const config = getServices();
  const idx = config.services.findIndex(s => s.id === id);
  if (idx === -1) return null;
  if (updates.name !== undefined && !updates.name.trim()) {
    throw new Error('服務名稱不可為空');
  }
  if (updates.url !== undefined && !updates.url.trim()) {
    throw new Error('服務連結不可為空');
  }
  config.services[idx] = { ...config.services[idx], ...updates };
  saveServices(config);
  return config.services[idx];
}

function validateServices(services) {
  const errors = [];
  services.forEach((svc, i) => {
    if (!svc.name || !svc.name.trim()) errors.push(`第 ${i + 1} 項：名稱不可為空`);
    if (!svc.url || !svc.url.trim()) errors.push(`第 ${i + 1}項：連結不可為空`);
    if (svc.url && !svc.url.startsWith('/') && !svc.url.startsWith('http')) {
      errors.push(`第 ${i + 1} 項：連結必須以 / 或 http 開頭`);
    }
  });
  return errors;
}

module.exports = {
  getServices,
  saveServices,
  getEnabledServices,
  getServiceById,
  updateService,
  validateServices
};