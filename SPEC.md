# DW嚴選推坑專區 - 重構規格書 (SPEC.md)

這份文件旨在記錄 `index.html` 的現代化重構。重構的目標是**維持單一檔案、無須打包**的結構，同時導入現代瀏覽器技術、移除外部函式庫依賴，並改善使用者介面。

## 1. 資料庫結構 (DB Schema)

Google Sheet 提供的資料應包含以下欄位。除了 `name` 之外，所有欄位皆為可選 (nullable)。

- `name`: (String, 必要) 商品名稱。
- `brand`: (String) 品牌。
- `desc`: (String) 商品描述。
- `category`: (String) 分類。
- `tags`: (String) 以空白分隔的標籤字串。
- `price_value`: (Number) 價格的數值，用於排序或計算。
- `price`: (String) 顯示用的價格文字，例如「$1,000」或「洽詢」。
- `link_url`: (String) 購買連結。
- `img_url`: (String) 商品圖片連結。
- `reference`: (String) 參考資料連結。

## 2. 整體架構

專案遵循 `.gemini/GEMINI.md` 中定義的**零建置 (Zero-Build)**與**原生技術優先**原則。

- **移除 Vue.js:** 已放棄 Vue.js 框架，所有 DOM 操作與狀態管理由原生 JavaScript (ES6+) 取代，大幅減少了專案的初始載入時間。
- **移除 `public-google-sheets-parser`:** 不再使用此套件。改為直接使用 `fetch` API 呼叫 Google Sheets API 的 `publishedTsv` 端點，並自行解析 TSV (Tab-Separated Values) 資料。這去除了外部依賴，並讓我們對資料處理有更完全的掌控。
- **程式碼組織:**
    - HTML, CSS, JavaScript 繼續存在於同一個 `index.html` 檔案中。
    - JavaScript 程式碼被包裝在 `<script type="module">` 標籤內，以啟用 ES Modules 功能。
    - 程式碼被組織成一個主要的 `App` 類別，負責管理應用程式的狀態、資料獲取和主要 UI 渲染。

## 3. 核心功能

### 3.1. 資料載入與解析

- **Google Sheets 資料源:** 維持不變，繼續使用 Google Sheets 作為後台資料庫。
- **資料獲取:**
    - 使用 `fetch` API 向 Google Sheets 的 TSV 發布端點發送請求。
    - 實作了 `parseTSV` 函式來處理回傳的 TSV 字串，將其轉換為 JavaScript 物件陣列。
- **資料處理:**
    - `tags` 的處理邏輯（加上 `#` 前綴、根據連結產生標籤）已移至資料解析階段。
    - `desc` 欄位的換行符 `
` 轉換為 `<br>` 的邏輯也在解析時完成。

### 3.2. 搜尋與篩選

- **狀態管理:** 搜尋關鍵字 (`search_term`) 是 `App` 類別的一個屬性。
- **篩選邏輯:**
    - `filter_items` 方法根據 `search_term` 回傳符合條件的項目陣列。
    - 邏輯為：空字串顯示全部、`#` 開頭的搜尋標籤、否則搜尋名稱與描述。
- **URL同步:** 使用 `history.replaceState` 來將搜尋關鍵字同步到 URL 的 hash 中，方便使用者分享與返回。
- **搜尋介面改善:**
    - 已棄用 `<datalist>`，改為在搜尋框底下動態生成一個建議清單 `<div>`。
        1. 當使用者在搜尋框輸入時，如果內容包含 `#`，則顯示符合的標籤建議。
        2. 如果不含 `#`，則不顯示建議。
        3. 使用者可以點擊建議清單中的標籤來直接進行搜尋。
        4. 這提供了更清晰的 UI，並明確區分了兩種搜尋模式。

### 3.3. 彈出視窗 (Popover)

已使用瀏覽器原生的 **Popover API** 來取代舊的 `aside` + `mask` 實作。

- **HTML 結構:**
    - 將舊的 `<aside>` 元素改為一個具有 `popover` 屬性的 `<article id="item-popover">`。
    - 觸發彈窗的商品卡片本身透過 JavaScript 的 `showPopover()` 方法觸發。
    - 關閉按鈕則呼叫 `hidePopover()` 方法。
- **優點:**
    - **無須手動管理狀態:** 瀏覽器會自動處理顯示/隱藏、`Esc` 鍵關閉、點擊外部關閉等行為。
    - **頂層渲染 (Top-Layer Rendering):** Popover 元素被渲染在一個特殊的頂層，天然地蓋在所有其他內容之上，解決了 `z-index` 的困擾。
    - **更好的無障礙性 (Accessibility):** 原生支援焦點管理。

## 4. UI/UX 改善

### 4.1. 全域樣式與體驗

- **深色/淺色主題 (Dark/Light Theme):**
    - 使用 CSS 的 `prefers-color-scheme` media query 來偵測使用者的系統設定。
    - 在 `:root` 中定義了兩套不同的顏色變數，實現了自動主題切換。
- **讀取中指示器 (Loading Indicator):**
    - 頁面中有一個全頁覆蓋的 `<div id="loader">` 作為讀取畫面。
    - 當 `App` 類別成功獲取並渲染完資料後，此 `<div>` 會被隱藏。

### 4.2. 彈出視窗 (Popover) 內容排版

採用了更緊湊、更具結構的卡片式設計。

- **圖片:**
    - 遵守 `aspect-ratio: 1 / 1`，確保所有商品圖片都呈現為正方形，維持視覺上的一致性。
- **佈局:**
    - 價格與參考資料並列，作為次要資訊。
    - 描述放在標題下方。
    - 標籤 (Tags) 放在內容的中間部分。
    - 在彈出視窗的最底部，放置一個橫跨整個寬度的、顯眼的「購買連結」按鈕。

- **版面配置圖:**
```
+------------------------------------------------+
|                                    [關閉按鈕 X] |
| +--------------------------------------------+ |
| |                                            | |
| |           [ 商品圖片 (1:1) ]             | |
| |                                            | |
| +--------------------------------------------+ |
|                                                |
| <h4>商品名稱</h4>                             |
| <p class="price">...</p>                        |
| <p class="description">商品描述...</p>         |
|                                                |
| <div class="tags">                             |
|   <span>#Tag1</span> <span>#Tag2</span>        |
| </div>                                         |
|                                                |
| <div class="actions">                          |
|   <a href="..." class="button cta">購買連結</a>   |
|   <a href="..." class="button btn-outline">參考資料</a> |
| </div>                                         |
+------------------------------------------------+
```

### 4.3. 字體與樣式

- **Google Fonts:**
    - `<link>` 標籤已加上 `&display=swap`，確保在網路字體載入完成前，瀏覽器會先用備用字體渲染文字。
    - CSS `font-family` 宣告中優先指定系統預設字體作為備案。
- **CSS 變數:**
    - 擴大了 CSS 變數的使用範圍，將顏色、字體、間距等都納入變數管理。
- **互動回饋:**
    - 為卡片、按鈕等加上了 `transition` 效果，提供互動感。