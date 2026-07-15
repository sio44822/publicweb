// 除錯工具：列出所有課程的基本資訊
// 注意：此腳本引用了舊版的 SQLite 連線模組 (utils/db/connection.js)，
// 目前專案已遷移至 Firestore，此檔案僅供參考或需要重新實作。
import { get } from './utils/db/connection.js';

const con = get();
const courses = con.prepare('SELECT id, name, slots FROM courses').all();
console.log('Total courses:', courses.length);
courses.forEach(c => {
  console.log(`ID: ${c.id}, Name: ${c.name}`);
  console.log('  Slots:', c.slots);
});
