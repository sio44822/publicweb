// 本地 JSON 檔案版本的服務配置讀寫工具
// 作為 Firestore 遷移前的備用方案，或用於本地開發測試。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const SERVICES_FILE = path.join(DATA_DIR, 'services.json');

/** 確保 data 目錄存在 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** 讀取 services.json，若不存在則回傳空結構 */
function getServices() {
  ensureDataDir();
  if (!fs.existsSync(SERVICES_FILE)) {
    return { services: [] };
  }
  const data = fs.readFileSync(SERVICES_FILE, 'utf8');
  return JSON.parse(data);
}

/** 將服務配置寫入 services.json */
function saveServices(config) {
  ensureDataDir();
  fs.writeFileSync(SERVICES_FILE, JSON.stringify(config, null, 2));
}

/**
 * 取得已啟用的服務（過濾 enabled === true 並按 order 排序）。
 * 用於前端導覽列顯示。
 */
function getEnabledServices() {
  const config = getServices();
  return config.services
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);
}

/** 依 ID 查找單一服務 */
function getServiceById(id) {
  const config = getServices();
  return config.services.find(s => s.id === id);
}

/**
 * 更新單一服務。
 * 驗證必填欄位：名稱與 URL 不可為空字串。
 * 使用展開運算符合併新舊資料。
 */
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

/**
 * 驗證服務配置。
 * 檢查：名稱不可為空、URL 不可為空、URL 必須以 / 或 http 開頭。
 */
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

export default {
  getServices,
  saveServices,
  getEnabledServices,
  getServiceById,
  updateService,
  validateServices
};
