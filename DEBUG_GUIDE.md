# Cursor 除錯設定指南

## 快速開始

### 1. 啟動開發伺服器
```bash
npm start
```

### 2. 在 Cursor 中開始除錯
1. 按 `F5` 或點擊左側的除錯圖示
2. 選擇 "Launch Chrome against localhost"
3. 點擊開始除錯

## 除錯設定說明

### 瀏覽器除錯
- **Launch Chrome against localhost**: 自動啟動 Chrome 並連接到 localhost:3000
- **Attach to Chrome**: 連接到已開啟的 Chrome 實例（需要以除錯模式啟動）
- **Launch Edge against localhost**: 使用 Edge 瀏覽器除錯

### Node.js 除錯
- **Debug with Node.js**: 除錯 Node.js 應用程式

## 除錯技巧

### 設定中斷點
1. 在程式碼行號左側點擊設定中斷點
2. 或使用 `F9` 快速設定/取消中斷點

### 除錯控制
- `F5`: 繼續執行
- `F10`: 逐步執行（不進入函數）
- `F11`: 逐步執行（進入函數）
- `Shift+F11`: 跳出函數
- `Shift+F5`: 停止除錯

### 監看變數
1. 在除錯面板中右鍵點擊變數
2. 選擇 "Add to Watch"
3. 或直接在 Watch 面板中新增表達式

### 條件中斷點
1. 右鍵點擊中斷點
2. 選擇 "Edit Breakpoint"
3. 輸入條件表達式

## 常見問題

### Chrome 無法啟動
確保已安裝 Chrome 瀏覽器，或改用 Edge 除錯設定。

### 404 錯誤處理
如果看到 `.well-known/appspecific/com.chrome.devtools.json` 的 404 錯誤，這是正常的。我們已經建立了對應的設定檔來解決這個問題。

### 無法連接到 localhost
檢查開發伺服器是否正在執行：
```bash
npm start
```

### Source Maps 問題
如果除錯時顯示的是編譯後的程式碼，請確保：
1. 專案有正確的 source maps
2. 在 launch.json 中啟用了 sourceMaps

## 進階設定

### 自訂除錯設定
編輯 `.vscode/launch.json` 來調整除錯設定：

```json
{
    "name": "Custom Debug",
    "type": "chrome",
    "request": "launch",
    "url": "http://localhost:3000",
    "webRoot": "${workspaceFolder}",
    "sourceMaps": true,
    "userDataDir": "${workspaceFolder}/.vscode/chrome-debug-profile"
}
```

### 除錯 Vue.js 應用程式
由於您的專案使用 Vue.js，建議：
1. 安裝 Vue DevTools 瀏覽器擴充功能
2. 在除錯時同時使用 Vue DevTools 和 Cursor 除錯器
3. 使用 Vue.js 的 `debugger` 語句在特定位置中斷

### 效能除錯
使用 Chrome DevTools 的 Performance 標籤來分析效能問題，配合 Cursor 除錯器進行程式碼層級的除錯。 