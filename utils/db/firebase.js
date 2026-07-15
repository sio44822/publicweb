// Firebase Admin SDK 初始化與 Firestore 連線管理
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

let db = null;

/**
 * 初始化 Firebase App（僅執行一次）。
 * 憑證來源優先順序：
 * 1. FIREBASE_SERVICE_ACCOUNT 環境變數（JSON 字串或 Base64 編碼的 JSON）
 * 2. 若未設定，則使用 Google Cloud 預設憑證（例如 Vercel / GCP 環境）
 */
function initFirebase() {
  if (getApps().length > 0) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT not set. Using default credentials.');
    initializeApp();
    return;
  }

  let serviceAccount;
  try {
    // 嘗試直接解析 JSON 字串
    serviceAccount = JSON.parse(raw);
  }
  catch {
    try {
      // 失敗則嘗試 Base64 解碼後再解析（某些環境以 Base64 傳遞密鑰避免特殊字元問題）
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } catch (e) {
      console.error('[Firebase] Failed to parse credentials:', e.message);
      throw e;
    }
  }

  initializeApp({ credential: cert(serviceAccount) });
  console.log('[Firebase] Initialized');
}

/**
 * 取得 Firestore 實例（懶初始化）。
 * 首次呼叫時自動初始化 Firebase，之後回傳快取的 db 實例。
 */
function getDb() {
  if (!db) {
    initFirebase();
    db = getFirestore();
  }
  return db;
}

export { getDb, Timestamp, FieldValue };
