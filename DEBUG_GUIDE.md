# 專案除錯設定指南

本專案為一個單一的 `index.html` 檔案，不含任何建置步驟，因此除錯流程非常直接。

## 快速開始

### 1. 啟動開發伺服器
在專案根目錄下執行以下指令，這會在本機的 3000 埠啟動一個網頁伺服器。
```bash
npm start
```

### 2. 在 VS Code 中開始除錯
1.  在 VS Code 中，按下 `F5` (或前往左側的「執行和除錯」面板)。
2.  在出現的下拉選單中，選擇 **"Launch Chrome against localhost"**。
3.  VS Code 將會自動開啟一個新的 Chrome 視窗，並載入 `http://localhost:3000`。
4.  現在你可以在 `index.html` 內的 `<script>` 區塊中設定中斷點，並開始除錯。

## 除錯設定檔 (`.vscode/launch.json`)

為了實現上述功能，你的 `.vscode/launch.json` 檔案應包含以下設定。如果檔案不存在，可以手動建立。

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

- **`type: "chrome"`**: 指定使用 VS Code 的 Chrome 除錯器。
- **`request: "launch"`**: 表示我們要啟動一個新的 Chrome 實例。
- **`name`**: 在除錯選單中顯示的名稱。
- **`url`**: 要在瀏覽器中開啟的網址，對應到 `npm start` 啟動的伺服器。
- **`webRoot`**: 專案的根目錄，讓除錯器能正確地將網頁上的資源對應回本地檔案。

## 除錯技巧

### 設定中斷點
- 在程式碼行號左側點擊即可設定中斷點。
- 或將游標移至某行，按下 `F9` 快速設定/取消中斷點。

### 除錯控制
- `F5`: 繼續執行到下一個中斷點。
- `F10`: 逐步執行，但不進入函式內部。
- `F11`: 逐步執行，並進入函式內部。
- `Shift+F11`: 跳出目前所在的函式。
- `Shift+F5`: 停止除錯。

### 監看變數
在除錯過程中，可以將變數新增至左方面板的「監看式」區域，以持續追蹤其值的變化。

### 條件中斷點
在一個中斷點上按右鍵，選擇「編輯中斷點」，你可以設定一個條件（例如 `this.search_term === '#PCHome'`），只有當條件成立時，程式才會在該中斷點暫停。

## 常見問題

### Chrome 無法啟動
請確認你的電腦上已安裝 Google Chrome 瀏覽器。

### 404 錯誤處理
如果在開發者工具中看到關於 `.well-known/appspecific/com.chrome.devtools.json` 的 404 錯誤，這是正常的，可以安全地忽略。這是 Chrome DevTools 的一個內部請求，與應用程式功能無關。

### 無法連接到 localhost
請確認開發伺服器正在執行中。你應該能在終端機看到 `npm start` 的執行紀錄。