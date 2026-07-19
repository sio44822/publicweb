/**
 * SendContent 客戶端程式
 * 
 * 程式功能：
 * - 處理 QR Code 配對和輸入房間號配對
 * - 傳送和接收文字訊息
 * - 上傳和接收檔案
 * 
 * 執行流程概述：
 * 1. 頁面載入時，檢查 URL 是否帶有 sid (會話 ID)
 * 2. 如果有 sid，表示是加入會話，執行 joinSession()
 *    - 如果沒有 sid，表示要建立新房間，執行 createSession()
 * 3. 建立/加入會話後，等待配對
 * 4. 配對成功後，顯示傳送/接收介面
 * 5. 使用者可以傳送文字或上傳檔案
 * 6. 接收端會即時顯示收到的文字或檔案
 * 
 * 使用的技術：
 * - Socket.IO Client: WebSocket 即時通訊
 * - Fetch API: HTTP 請求 (建立房間、上傳檔案)
 * - URLSearchParams: 解析 URL 參數
 */

// ============================================
// 初始化 Socket.IO 客戶端
// ============================================

// 建立 Socket.IO 客戶端連線
// 這會自動連線到伺服端的 Socket.IO 伺服器
const BASE_PATH = window.BASE_PATH || '';
const socket = io({ path: BASE_PATH + '/socket.io' });

// ============================================
// URL 參數解析
// ============================================

// 解析 URL 查詢參數
const urlParams = new URLSearchParams(window.location.search);

// 取得會話 ID (sid)
// 如果 URL 中沒有 sid，則為 null
// 例如：?sid=xxxx-xxxx-xxxx
const sessionId = urlParams.get("sid");

// ============================================
// 全域變數
// ============================================

// 儲存所有收到的文字訊息
let receivedTexts = [];

// 目前的標籤頁 (text: 文字, file: 檔案)
let currentTab = "text";

// 是否已完成配對
let paired = false;

// 目前的房間號
let currentRoomCode = "";

// ============================================
// 程式入口 - init()
// ============================================

/**
 * init() - 初始化函式
 * 
 * 用途：程式的主要入口點，在頁面載入後執行
 * 
 * 執行流程：
 * 1. 檢查是否有 sessionId
 *    - 有：呼叫 joinSession() 加入現有會話
 *    - 無：呼叫 createSession() 建立新會話
 * 2. 設定標籤頁切換功能
 * 3. 設定事件監聽器
 */
function init() {
  // 根據是否有 sessionId 決定流程
  if (sessionId) {
    // 有 sessionId：加入已存在的會話
    joinSession(sessionId);
  } else {
    // 無 sessionId：建立新會話
    createSession();
  }
  
  // 設定標籤頁切換功能
  setupTabs();
  
  // 設定按鈕和輸入框的事件監聽器
  setupEventListeners();
}

// ============================================
// 會話建立 - createSession()
// ============================================

/**
 * createSession() - 建立新房間
 * 
 * 用途：向伺服器請求建立新房間，並自動加入
 * 
 * 執行流程：
 * 1. 發送 GET 請求到 /api/room
 * 2. 伺服器回傳：QR Code 圖片、房間號、sid、URL
 * 3. 顯示 QR Code 和房間號
 * 4. 自動加入房間 (自己也要加入)
 * 5. 監聽配對狀態事件 (paired/waiting)
 * 
 * API 呼叫：GET /api/room
 * Socket.IO 事件：
 * - paired: 配對成功
 * - waiting: 等待第二台裝置
 */
async function createSession() {
  try {
    // 發送請求建立房間
    const response = await fetch(BASE_PATH + "/api/room");
    const data = await response.json();
    
    // 儲存房間號
    currentRoomCode = data.code;
    
    // 顯示 QR Code 圖片
    document.getElementById("qrcode").innerHTML = '<img src="' + data.qr + '" alt="QR Code">';
    
    // 顯示房間號
    document.getElementById("room-code").textContent = data.code;
    
    // 自動加入房間 (自己也要加入)
    if (socket.connected) {
      socket.emit("join", { sid: data.sid });
    } else {
      // 如果還沒連線，等待連線後加入
      socket.on("connect", function() {
        socket.emit("join", { sid: data.sid });
      });
    }
    
    // 監聽配對成功事件
    socket.on("paired", function(data) {
      paired = true;
      receivedTexts = [];  // 清除之前的訊息
      if (data.code) {
        currentRoomCode = data.code;
      }
      document.getElementById("current-room-code").textContent = currentRoomCode;
      showApp();  // 顯示主要應用介面
    });
    
    // 監聽等待事件
    socket.on("waiting", function(data) {
      document.getElementById("room-code").textContent = data.code;
      updateStatus("waiting", "");
    });
    
  } catch (err) {
    console.error("Error creating session:", err);
  }
}

// ============================================
// 會話加入 - joinSession()
// ============================================

/**
 * joinSession(sid) - 加入已存在的房間
 * 
 * 用途：透過 sessionId 加入已存在的房間
 * 
 * 執行流程：
 * 1. 檢查 socket 是否已連線
 * 2. 發送 join 事件到伺服器
 * 3. 監聽配對狀態事件
 * 
 * @param {string} sid - 會話 ID
 * 
 * Socket.IO 事件：
 * - paired: 配對成功
 * - waiting: 等待第二台裝置
 * - connect_error: 加入失敗
 */
function joinSession(sid) {
  // 如果已連線，直接加入
  if (socket.connected) {
    socket.emit("join", { sid });
  } else {
    // 否則等待連線後加入
    socket.on("connect", function() {
      socket.emit("join", { sid });
    });
  }
  
  // 監聽配對成功事件
  socket.on("paired", function(data) {
    paired = true;
    receivedTexts = [];  // 清除之前的訊息
    if (data.code) {
      currentRoomCode = data.code;
    }
    document.getElementById("current-room-code").textContent = currentRoomCode;
    showApp();  // 顯示主要應用介面
  });
  
  // 監聽等待事件
  socket.on("waiting", function(data) {
    // 儲存房間號
    if (data.code) {
      currentRoomCode = data.code;
    }
    updateStatus("waiting", "等待第二台裝置加入...");
  });
  
  // 監聽連線錯誤事件
  socket.on("connect_error", function() {
    updateStatus("error", "加入失敗，請重新掃描");
  });
}

// ============================================
// 配對碼加入 - joinByCode()
// ============================================

/**
 * joinByCode() - 透過房間號加入房間
 * 
 * 用途：使用者輸入四位數房間號來加入房間
 * 
 * 執行流程：
 * 1. 取得的入的房間號
 * 2. 驗證房間號是否為四位數
 * 3. 發送 POST 請求到 /api/room/join
 * 4. 加入成功則跳轉到房間頁面
 * 5. 加入失敗則顯示錯誤訊息
 * 
 * API 呼叫：POST /api/room/join
 * Request Body: { code: string }
 * Response: { success: boolean, sid?: string }
 */
function joinByCode() {
  // 取得的入的房間號
  const code = document.getElementById("code-input").value.trim();
  
  // 驗證房間號
  if (!code || code.length !== 4) {
    alert("請輸入四位數房間號");
    return;
  }

  // 禁止輸入自身房間號
  if (currentRoomCode && code === currentRoomCode) {
    alert("無法加入自己的房間");
    return;
  }
  
  // 發送 POST 請求
  fetch(BASE_PATH + "/api/room/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // 加入成功，跳轉到房間頁面
      window.location.href = BASE_PATH + "/?sid=" + data.sid;
    } else {
      alert("房間號錯誤");
    }
  })
  .catch(err => {
    console.error(err);
    alert("加入失敗");
  });
}

// ============================================
// UI 顯示控制函式
// ============================================

/**
 * showApp() - 顯示主要應用介面
 * 
 * 用途：配對成功後，隱藏配對區塊，顯示傳送/接收區塊
 * 
 * 執行流程：
 * 1. 隱藏 #connect-section (配對區)
 * 2. 顯示 #app-section (應用區)
 */
function showApp() {
  // 隱藏配對區塊
  document.getElementById("connect-section").classList.add("hidden");
  // 顯示應用區塊
  document.getElementById("app-section").classList.remove("hidden");
}

/**
 * updateStatus(type, message) - 更新狀態顯示
 * 
 * 用途：更新狀態訊息的文字和樣式
 * 
 * @param {string} type - 狀態類型 (waiting, error, success)
 * @param {string} message - 狀態訊息文字
 */
function updateStatus(type, message) {
  const statusEl = document.getElementById("status");
  statusEl.className = "status " + type;  // 設定樣式類別
  statusEl.textContent = message;          // 設定文字
}

// ============================================
// 標籤頁設定 - setupTabs()
// ============================================

/**
 * setupTabs() - 設定標籤頁切換
 * 
 * 用途：切換「文字」和「檔案」標籤頁
 * 
 * 執行流程：
 * 1. 為每個標籤按鈕點擊事件
 * 2. 移除所有標籤的 active 類別
 * 3. 移除所有標籤內容的 active 類別
 * 4. 為點擊的標籤和對應內容加入 active 類別
 * 5. 更新 currentTab 變數
 */
function setupTabs() {
  document.querySelectorAll(".tab").forEach(function(tab) {
    tab.addEventListener("click", function() {
      // 移除所有標籤的 active 類別
      document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
      // 移除所有標籤內容的 active 類別
      document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); });
      
      // 為點擊的標籤加入 active 類別
      tab.classList.add("active");
      // 為對應的標籤內容加入 active 類別
      document.getElementById(tab.dataset.tab + "-tab").classList.add("active");
      
      // 更新目前的標籤
      currentTab = tab.dataset.tab;
    });
  });
}

// ============================================
// 事件監聽器設定 - setupEventListeners()
// ============================================

/**
 * setupEventListeners() - 設定按鈕和 Socket.IO 事件
 * 
 * 用途：為所有互動元素設定事件監聽器
 * 
 * 設定的事件：
 * 1. 傳送文字按鈕 - click → sendText()
 * 2. 上傳檔案按鈕 - click → sendFile()
 * 3. 加入配對按鈕 - click → joinByCode()
 * 4. 配對碼輸入框 - keypress (Enter) → joinByCode()
 * 5. receive-text 事件 - Socket.IO → addReceivedItem()
 * 6. receive-file 事件 - Socket.IO → addReceivedItem()
 */
function setupEventListeners() {
  // 傳送文字按鈕
  document.getElementById("send-text-btn").addEventListener("click", sendText);
  
  // 上傳檔案按鈕
  document.getElementById("send-file-btn").addEventListener("click", sendFile);
  
  // 檔案選擇變更時更新顯示
  document.getElementById("file-input").addEventListener("change", function() {
    renderSelectedFiles(Array.from(this.files));
  });
  
  // 加入配對按鈕
  document.getElementById("join-btn").addEventListener("click", joinByCode);
  
  // 配對碼輸入框 - 支援 Enter 鍵提交
  document.getElementById("code-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      joinByCode();
    }
  });
  
  // 文字輸入框 - 支援 Enter 鍵傳送
  document.getElementById("message-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  });
  
  // 返回首頁按鈕
  document.getElementById("back-home-btn").addEventListener("click", function() {
    window.location.href = BASE_PATH + "/";
  });
  
  // 監聽收到文字的事件
  socket.on("receive-text", function(data) {
    addReceivedItem("text", data.text);
  });
  
  // 監聽收到檔案的事件
  socket.on("receive-file", function(data) {
    addReceivedItem("file", data);
  });
}

// ============================================
// 傳送功能 - sendText(), sendFile()
// ============================================

/**
 * sendText() - 傳送文字訊息
 * 
 * 用途：將輸入的文字傳送給配對的另一台裝置
 * 
 * 執行流程：
 * 1. 取得輸入框的文字
 * 2. 驗證是否有文字且已配對
 * 3. 發送 send-text 事件到伺服器
 * 4. 清空輸入框
 * 
 * Socket.IO 事件：send-text
 * 傳送資料：{ text: string }
 */
function sendText() {
  const input = document.getElementById("message-input");
  const text = input.value;
  
  // 驗證：必須有文字且已配對（檢查移除空白後是否為空）
  if (!text || !paired) return;
  if (!text.replace(/\s/g, '')) return;
  
  // 發送文字到伺服器
  socket.emit("send-text", { text: text });
  
  // 清空輸入框
  input.value = "";
}

/**
 * sendFile() - 上傳並傳送檔案
 * 
 * 用途：上傳檔案到伺服器，然後將檔案資訊傳給配對的裝置
 * 
 * 執行流程：
 * 1. 取得選擇的檔案
 * 2. 驗證是否有檔案且已配對
 * 3. 建立 FormData 物件
 * 4. 發送 POST 請求到 /api/upload 上傳檔案
 * 5. 伺服器回傳檔案資訊後，發送 send-file 事件
 * 6. 清空檔案輸入框
 * 
 * API 呼叫：POST /api/upload
 * Request: multipart/form-data
 * Response: { filename, originalName, path }
 * 
 * Socket.IO 事件：send-file
 * 傳送資料：{ filename, originalName, path }
 */
async function sendFile() {
  const input = document.getElementById("file-input");
  const files = input.files;
  
  // 驗證：必須有檔案且已配對
  if (!files.length || !paired) return;
  
  const sendBtn = document.getElementById("send-file-btn");
  sendBtn.disabled = true;
  sendBtn.textContent = "上傳中...";
  
  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(BASE_PATH + "/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      
      socket.emit("send-file", data);
    }
    
    input.value = "";
    renderSelectedFiles([]);
  } catch (err) {
    console.error("Upload error:", err);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "上傳並傳送";
  }
}

function renderSelectedFiles(files) {
  const container = document.getElementById("selected-files");
  if (!files.length) {
    container.innerHTML = "";
    return;
  }
  
  container.innerHTML = files.map((file, index) => `
    <div class="selected-file-item">
      <span class="file-name">${escapeHtml(file.name)}</span>
      <button type="button" class="remove-file" data-index="${index}">✕</button>
    </div>
  `).join("");
  
  container.querySelectorAll(".remove-file").forEach(btn => {
    btn.addEventListener("click", function() {
      const index = parseInt(this.dataset.index);
      const dt = new DataTransfer();
      const input = document.getElementById("file-input");
      
      Array.from(input.files).forEach((file, i) => {
        if (i !== index) dt.items.add(file);
      });
      
      input.files = dt.files;
      renderSelectedFiles(Array.from(input.files));
    });
  });
}

// ============================================
// 接收功能 - addReceivedItem()
// ============================================

/**
 * addReceivedItem(type, content) - 新增接收到的項目
 * 
 * 用途：在接收區顯示收到的文字或檔案
 * 
 * 執行流程：
 * 1. 取得接收列表元素
 * 2. 移除「尚無收到訊息」的提示
 * 3. 建立新的項目元素
 * 4. 如果是文字：顯示文字內容並儲存到陣列
 * 5. 如果是檔案：顯示檔案名稱和下載連結
 * 6. 將新項目插入到列表頂端
 * 7. 更新複製按鈕
 * 
 * @param {string} type - 項目類型 (text 或 file)
 * @param {string|object} content - 文字內容或檔案資訊
 */
function addReceivedItem(type, content) {
  const list = document.getElementById("received-list");
  const emptyMsg = list.querySelector(".empty-msg");
  if (emptyMsg) emptyMsg.remove();
  
  // 建立新的項目元素
  const item = document.createElement("div");
  item.className = "received-item " + type;
  
  if (type === "text") {
    // 儲存文字到陣列
    receivedTexts.push(content);
    
    // 顯示文字內容 (使用 escapeHtml 防止 XSS)
    const contentDiv = document.createElement("div");
    contentDiv.className = "content";
    contentDiv.textContent = content;
    
    // 建立複製按鈕
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "複製";
    copyBtn.addEventListener("click", function() {
      // 嘗試使用 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(content).then(function() {
          copyBtn.textContent = "已複製";
          setTimeout(function() {
            copyBtn.textContent = "複製";
          }, 1500);
        }).catch(function(err) {
          // Clipboard API 失敗，使用備用方案
          copyToClipboard(content, copyBtn);
        });
      } else {
        // 不支援 Clipboard API，使用備用方案
        copyToClipboard(content, copyBtn);
      }
    });
    
    item.appendChild(contentDiv);
    item.appendChild(copyBtn);
  } else {
    // 顯示檔案資訊：檔名 + 下載連結
    const downloadLink = document.createElement("a");
    downloadLink.className = "download-btn";
    downloadLink.textContent = "下載";
    downloadLink.addEventListener("click", function(e) {
      e.preventDefault();
      fetch(content.path)
        .then(resp => resp.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = content.originalName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        })
        .catch(err => {
          console.error("下載失敗:", err);
          alert("下載失敗");
        });
    });
    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    const filenameSpan = document.createElement("span");
    filenameSpan.className = "filename";
    filenameSpan.textContent = content.originalName;
    fileInfo.appendChild(filenameSpan);
    fileInfo.appendChild(downloadLink);
    item.appendChild(fileInfo);
  }
  
  // 插入到列表頂端
  list.insertBefore(item, list.firstChild);
}

/**
 * copyToClipboard - 使用備用方式複製文字
 * 
 * 用途：當 Clipboard API 不可用時，使用 textarea 方式複製
 * 
 * @param {string} text - 要複製的文字
 * @param {HTMLElement} btn - 按鈕元素
 */
function copyToClipboard(text, btn) {
  // 建立臨時的 textarea 元素
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand("copy");
    btn.textContent = "已複製";
    setTimeout(function() {
      btn.textContent = "複製";
    }, 1500);
  } catch (err) {
    console.error('複製失敗:', err);
    alert("複製失敗，請手動複製");
  }
  
  document.body.removeChild(textarea);
}

/**
 * updateCopyButton - 更新複製按鈕顯示
 * 
 * 用途：根據頁面上的文字數量顯示/隱藏複製按鈕
 */


// ============================================
// 安全函式 - escapeHtml()
// ============================================

/**
 * escapeHtml(text) - HTML 跳脫
 * 
 * 用途：將文字中的特殊 HTML 字元轉換為實體
 * 防止 XSS (跨站腳本攻擊)
 * 
 * 執行流程：
 * 1. 建立一個 div 元素
 * 2. 將文字設為元素的 textContent
 * 3. 取出元素的 innerHTML (會自動跳脫)
 * 4. 回傳跳脫後的字串
 * 
 * @param {string} text - 要跳脫的文字
 * @returns {string} 跳脫後的文字
 * 
 * 例如：
 * - < 會轉換為 &lt;
 * - > 會轉換為 &gt;
 * - & 會轉換為 &amp;
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// 啟動程式
// ============================================

// 等待 DOM 載入完成後執行 init()
document.addEventListener("DOMContentLoaded", init);
