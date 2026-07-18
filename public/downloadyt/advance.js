/**
 * advance.js — 進階版批量下載前端邏輯
 */
const API_BASE = window.BASE_PATH || '';
let authToken = sessionStorage.getItem('advanceToken') || null;
let postAction = 'video';
let pollInterval = null;

// ==================== Auth ====================

const loginSec = document.getElementById('loginSec');
const mainSec = document.getElementById('mainSec');
const loginError = document.getElementById('loginError');

document.getElementById('loginBtn').addEventListener('click', async () => {
  const pw = document.getElementById('pwInput').value;
  if (!pw) return;
  try {
    const res = await fetch(API_BASE + '/api/advance/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.detail || '密碼錯誤');
    authToken = data.token;
    sessionStorage.setItem('advanceToken', authToken);
    loginSec.classList.add('hidden');
    mainSec.classList.remove('hidden');
  } catch (e) {
    loginError.textContent = e.message;
    loginError.classList.remove('hidden');
  }
});

document.getElementById('pwInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

// Auto-login if token exists
if (authToken) {
  loginSec.classList.add('hidden');
  mainSec.classList.remove('hidden');
}

// ==================== Post-action selector ====================

document.getElementById('postActions').addEventListener('click', e => {
  const btn = e.target.closest('.post-btn');
  if (!btn) return;
  document.querySelectorAll('.post-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  postAction = btn.dataset.action;
});

// ==================== Batch Download ====================

const startBtn = document.getElementById('startBtn');
const progressSec = document.getElementById('progressSec');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const progressCount = document.getElementById('progressCount');
const videoList = document.getElementById('videoList');
const logBox = document.getElementById('logBox');
const resultBar = document.getElementById('resultBar');
const resultText = document.getElementById('resultText');
const resultLink = document.getElementById('resultLink');

startBtn.addEventListener('click', async () => {
  const raw = document.getElementById('urlInput').value.trim();
  if (!raw) return alert('請輸入影片網址');

  const urls = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const subtitle = document.getElementById('subCheck').checked;

  startBtn.disabled = true;
  progressSec.classList.remove('hidden');
  resultBar.classList.remove('show');
  progressFill.style.width = '0%';
  progressLabel.textContent = '正在提交...';
  progressCount.textContent = '0/0';
  videoList.innerHTML = '';
  logBox.innerHTML = '';

  try {
    const res = await fetch(API_BASE + '/api/advance/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, subtitle, postAction })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.detail);

    const batchId = data.batchId;
    startPolling(batchId);
  } catch (e) {
    progressLabel.textContent = '錯誤: ' + e.message;
    startBtn.disabled = false;
  }
});

function startPolling(batchId) {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => poll(batchId), 1500);
}

async function poll(batchId) {
  try {
    const res = await fetch(API_BASE + '/api/advance/batch/' + batchId);
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success) return;
    const d = json.data;

    // Progress bar
    const pct = d.totalCount > 0 ? Math.round((d.completedCount / d.totalCount) * 100) : 0;
    progressFill.style.width = pct + '%';
    progressCount.textContent = d.completedCount + '/' + d.totalCount;

    const statusMap = {
      'parsing': '解析網址中...',
      'analyzing': '分析影片格式中...',
      'downloading': '下載中...',
      'processing': '後處理中...',
      'completed': '完成！',
    };
    progressLabel.textContent = statusMap[d.status] || d.status;

    // Video list
    if (d.videos && d.videos.length > 0) {
      videoList.innerHTML = d.videos.map(v => {
        const cls = v.status;
        const icon = v.status === 'completed' ? '✓' : v.status === 'error' ? '✗' : v.status === 'downloading' ? '⬇' : '·';
        const pctStr = v.status === 'downloading' ? ` ${Math.round(v.progress)}%` : '';
        const errStr = v.error ? ` — ${v.error.substring(0, 60)}` : '';
        return `<div class="video-item">
          <span class="title" title="${escHtml(v.title)}">${escHtml(v.title)}</span>
          <span class="status ${cls}">${icon}${pctStr}${errStr}</span>
        </div>`;
      }).join('');
    }

    // Log
    if (d.log && d.log.length > 0) {
      logBox.innerHTML = d.log.map(l => escHtml(l)).join('\n');
      logBox.scrollTop = logBox.scrollHeight;
    }

    // Done
    if (d.status === 'completed') {
      clearInterval(pollInterval);
      pollInterval = null;
      startBtn.disabled = false;
      if (d.resultType && d.resultType !== 'none') {
        resultBar.classList.add('show');
        const labels = { zip: '壓縮檔', folder: '資料夾', video: '影片' };
        const typeLabel = labels[d.resultType] || d.resultType;
        resultText.textContent = typeLabel + ': ' + (d.resultName || '下載');
        resultLink.href = API_BASE + '/api/advance/download/' + batchId;
      }
    }
  } catch (e) { /* ignore poll errors */ }
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
