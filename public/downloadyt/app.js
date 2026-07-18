/**
 * DownloadYT — Frontend Application
 * Flow: Paste URL → auto-analyze → select format → download → auto-save
 */
const API_BASE = window.BASE_PATH || '';
const AUTH_HEADERS = { 'Content-Type': 'application/json' };

// ==================== State ====================
let currentVideoInfo = null;
let selectedFormat = null;
let currentTaskId = null;
let progressInterval = null;
let analyzing = false;

// ==================== DOM ====================
const videoUrlInput = document.getElementById('videoUrl');
const loadingEl = document.getElementById('loading');
const videoInfoEl = document.getElementById('videoInfo');
const downloadSectionEl = document.getElementById('downloadSection');
const errorEl = document.getElementById('error');
const errorMessageEl = document.getElementById('errorMessage');
const downloadBtn = document.getElementById('downloadBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const videoFormatsEl = document.getElementById('videoFormats');
const audioFormatsEl = document.getElementById('audioFormats');

// ==================== Helpers ====================
function hideAll() {
  loadingEl.classList.add('hidden');
  videoInfoEl.classList.add('hidden');
  downloadSectionEl.classList.add('hidden');
  errorEl.classList.add('hidden');
}

function showLoading() {
  hideAll();
  loadingEl.classList.remove('hidden');
  loadingEl.classList.add('section-enter');
}

function showError(message) {
  hideAll();
  errorMessageEl.textContent = message;
  errorEl.classList.remove('hidden');
  errorEl.classList.add('section-enter');
  errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function getResolutionLabel(fmt) {
  const height = fmt.height || 0;
  const quality = fmt.quality_label || '';
  if (quality && quality !== 'unknown') return quality;
  if (height >= 4320) return '8K';
  if (height >= 2160) return '4K';
  if (height >= 1440) return '2K';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  if (height >= 240) return '240p';
  if (height >= 144) return '144p';
  return `${height}p`;
}

function getUniqueFormatsFromList(formats) {
  if (!formats || formats.length === 0) return [];
  const seen = new Map();
  for (const fmt of formats) {
    const height = fmt.height || 0;
    const ext = fmt.ext || 'mp4';
    const hasAudio = fmt.has_audio || false;
    const hasVideo = fmt.has_video || false;
    const isCombined = hasVideo && hasAudio;
    const key = isCombined ? `combined-${height}-${ext}` : `${height}-${ext}-${hasVideo ? 'v' : 'a'}`;
    const existing = seen.get(key);
    if (!existing ||
        (ext === 'mp4' && existing.ext !== 'mp4') ||
        (ext === existing.ext && fmt.filesize > existing.filesize)) {
      seen.set(key, fmt);
    }
  }
  return Array.from(seen.values()).sort((a, b) => (b.height || 0) - (a.height || 0));
}

// ==================== Rendering ====================
function renderFormats(data) {
  let info, formats;
  if (data.info) {
    info = data.info;
    formats = data.formats;
  } else {
    info = data;
    formats = data.formats || [];
  }

  currentVideoInfo = info;
  selectedFormat = null;
  downloadBtn.disabled = true;
  currentTaskId = null;

  document.getElementById('videoThumbnail').src = info.thumbnail || '';
  document.getElementById('videoTitle').textContent = info.title || '';
  document.getElementById('videoMeta').textContent =
    `${info.uploader || ''} • ${info.duration_formatted || ''}`;

  const uniqueFormats = getUniqueFormatsFromList(formats);

  const hdContainer = document.getElementById('hdFormats');
  const sdContainer = document.getElementById('sdFormats');
  const mp3Container = document.getElementById('mp3Options');

  hdContainer.innerHTML = '';
  sdContainer.innerHTML = '';
  mp3Container.innerHTML = '';

  uniqueFormats.forEach(fmt => {
    const height = fmt.height || 0;
    if (height === 0 && !fmt.has_audio) return;
    if (fmt.ext !== 'mp4') return;

    const hasVideo = fmt.has_video || false;
    const hasAudio = fmt.has_audio || false;
    if (hasAudio && !hasVideo) return;

    const isHD = height >= 720;
    const container = isHD ? hdContainer : sdContainer;

    const div = document.createElement('div');
    div.className = 'format-option';
    div.dataset.formatId = fmt.format_id;
    div.dataset.height = height;
    const label = getResolutionLabel(fmt);
    div.innerHTML = `<span class="quality">${label}</span>`;
    div.addEventListener('click', () => selectFormat(div, fmt.format_id, 'video'));
    container.appendChild(div);
  });

  // M4A options
  const m4aOptions = [
    { id: 'm4a_best', label: 'M4A 高品質', quality: '~128kbps AAC' }
  ];
  m4aOptions.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'format-option';
    div.dataset.formatId = opt.id;
    div.innerHTML = `<span class="quality">${opt.label}</span><span class="size">${opt.quality}</span>`;
    div.addEventListener('click', () => selectFormat(div, opt.id, 'audio'));
    mp3Container.appendChild(div);
  });
}

function selectFormat(element, formatId, type) {
  document.querySelectorAll('.format-option').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');
  selectedFormat = { formatId, type };
  downloadBtn.disabled = false;
}

// ==================== API Calls ====================
async function analyzeVideo() {
  const url = videoUrlInput.value.trim();
  if (!url || analyzing) return;

  const youtubePatterns = [
    /youtube\.com\/watch/i, /youtu\.be\//i,
    /youtube\.com\/embed\//i, /youtube\.com\/v\//i,
    /youtube\.com\/shorts\//i
  ];
  if (!youtubePatterns.some(p => p.test(url))) return;

  analyzing = true;
  showLoading();

  try {
    const response = await fetch(API_BASE + '/api/formats', {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ url })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.detail || '取得影片資訊失敗');

    hideAll();
    videoInfoEl.classList.remove('hidden');
    videoInfoEl.classList.add('section-enter');
    renderFormats(result.data);
    // Smooth scroll to video info section
    setTimeout(() => videoInfoEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  } catch (error) {
    showError('取得影片資訊失敗：' + error.message);
  }
  analyzing = false;
}

async function startDownload() {
  if (!selectedFormat || !currentVideoInfo) return;

  downloadSectionEl.classList.remove('hidden');
  downloadSectionEl.classList.add('section-enter');
  downloadSectionEl.classList.remove('progress-complete');
  downloadBtn.disabled = true;

  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const progressStatus = document.getElementById('progressStatus');

  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  progressStatus.textContent = '正在開始下載...';

  // Smooth scroll to progress section
  setTimeout(() => downloadSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  try {
    const response = await fetch(API_BASE + '/api/download', {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        url: videoUrlInput.value.trim(),
        format_id: selectedFormat.formatId,
        title: currentVideoInfo.title || ''
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.detail || '下載請求失敗');

    currentTaskId = result.task_id;

    progressInterval = setInterval(async () => {
      try {
        const resp = await fetch(API_BASE + '/api/progress/' + currentTaskId, { headers: AUTH_HEADERS });
        const data = await resp.json();
        if (!data.success) return;

        const d = data.data;
        progressFill.style.width = `${d.percent}%`;
        progressText.textContent = `${d.percent}%`;

        if (d.status === 'downloading') {
          progressStatus.textContent = `下載中... ${d.percent}%`;
        } else if (d.status === 'processing') {
          progressStatus.textContent = '正在處理檔案...';
        } else if (d.status === 'completed') {
          progressStatus.textContent = '下載完成！自動儲存中...';
          clearInterval(progressInterval);
          downloadBtn.disabled = false;
          downloadSectionEl.classList.add('progress-complete');
          // Auto-download to browser
          setTimeout(() => {
            window.location.href = API_BASE + '/api/downloaded/' + currentTaskId;
          }, 600);
        } else if (d.status === 'error') {
          progressStatus.textContent = `錯誤: ${d.message}`;
          clearInterval(progressInterval);
          downloadBtn.disabled = false;
        }
      } catch (e) {
        console.error('Progress fetch error:', e);
      }
    }, 1000);
  } catch (error) {
    showError(error.message);
    downloadBtn.disabled = false;
  }
}

// ==================== Event Listeners ====================

// Format selection delegation
videoFormatsEl.addEventListener('click', (e) => {
  const option = e.target.closest('.format-option');
  if (!option) return;
  const formatId = option.dataset.formatId;
  if (formatId) selectFormat(option, formatId, 'video');
});

audioFormatsEl.addEventListener('click', (e) => {
  const option = e.target.closest('.format-option');
  if (!option) return;
  const formatId = option.dataset.formatId;
  if (formatId) selectFormat(option, formatId, 'audio');
});

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    videoFormatsEl.classList.toggle('active', tab === 'video');
    audioFormatsEl.classList.toggle('active', tab !== 'video');
  });
});

// Download button
downloadBtn.addEventListener('click', startDownload);

// Auto-analyze: on Enter
videoUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') analyzeVideo();
});

// Auto-analyze: on paste
videoUrlInput.addEventListener('paste', () => {
  setTimeout(analyzeVideo, 100);
});

// ==================== Cookie Management (optional) ====================
async function checkCookieStatus() {
  const statusEl = document.getElementById('cookieStatus');
  if (!statusEl) return;
  try {
    const response = await fetch(API_BASE + '/api/cookies', { headers: AUTH_HEADERS });
    const result = await response.json();
    statusEl.textContent = result.hasCookie ? '✓ Cookie 已上傳' : '⚠ 未上傳 Cookie';
    statusEl.className = result.hasCookie ? 'success' : '';
  } catch (e) {
    statusEl.textContent = '⚠ 無法檢查 Cookie 狀態';
    statusEl.className = 'error';
  }
}

async function refreshCookie() {
  const statusEl = document.getElementById('cookieStatus');
  const btn = document.getElementById('refreshCookieBtn');
  if (!statusEl || !btn) return;
  statusEl.textContent = '正在刷新...';
  btn.disabled = true;

  try {
    const response = await fetch(API_BASE + '/api/cookies/refresh', {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ browser: 'chrome' })
    });
    const result = await response.json();
    statusEl.textContent = result.success ? '✓ Cookie 刷新成功' : '✗ 刷新失敗';
    statusEl.className = result.success ? 'success' : 'error';
  } catch (e) {
    statusEl.textContent = '✗ 刷新失敗: ' + e.message;
    statusEl.className = 'error';
  }
  btn.disabled = false;
}

const refreshCookieBtn = document.getElementById('refreshCookieBtn');
if (refreshCookieBtn) refreshCookieBtn.addEventListener('click', refreshCookie);

// ==================== Advance Button ====================
const advanceBtn = document.getElementById('advanceBtn');
if (advanceBtn) {
  advanceBtn.addEventListener('click', () => {
    const pw = prompt('請輸入管理密碼：');
    if (!pw) return;
    fetch(API_BASE + '/api/advance/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    }).then(r => r.json()).then(data => {
      if (data.success) {
        sessionStorage.setItem('advanceToken', data.token);
        window.location.href = API_BASE + '/advance';
      } else {
        alert('密碼錯誤');
      }
    }).catch(() => alert('驗證失敗'));
  });
}

// ==================== Help Modal ====================
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpClose = document.getElementById('helpClose');
if (helpBtn && helpModal) {
  helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
  helpClose.addEventListener('click', () => helpModal.classList.add('hidden'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.add('hidden');
  });
}

// ==================== Init ====================
checkCookieStatus();
