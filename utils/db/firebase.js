import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

let db = null;

function initFirebase() {
  if (getApps().length > 0) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT not set. Using default credentials.');
    initializeApp();
    return;
  }

  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch {
    try {
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

function getDb() {
  if (!db) {
    initFirebase();
    db = getFirestore();
  }
  return db;
}

export { getDb, Timestamp, FieldValue };
