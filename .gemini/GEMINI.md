# 通用前端開發原則 (v2.0)

## 核心理念

我們信奉並實踐一種務實的極簡主義。我們堅信，可以直接在瀏覽器中運作的原生技術是構建高效能、高可靠性應用的基石。我們的目標是編寫出「一次編寫，處處執行」的最終產品，專注於解決真實問題，而非陷入工具鏈的泥沼。

## 原則一：堅持零建置 (Zero-Build Philosophy)

所有程式碼都應當是最終產品。我們不使用任何需要編譯、轉譯或打包的工具（如 Webpack, Babel, Sass）。開發流程即是部署流程，專案中的 `.js`, `.css`, `.html` 檔案應可直接被瀏覽器理解並執行。

## 原則二：封裝是關鍵——從程式碼到 DOM 的全面隔離

良好的封裝是軟體品質的基石。我們在兩個層面執行嚴格的封裝。

### 程式碼封裝 (Code Encapsulation)

- 所有功能單元都應以 JavaScript class 進行封裝，將狀態和相關行為組織在一起。
- 利用原生 ES Modules 的模組作用域來避免全域污染。

### DOM 封裝 (DOM Encapsulation)

- 所有 UI 元件必須是符合 W3C 標準的「自訂元件 (Custom Elements)」。
- 元件的 HTML 結構與 CSS 樣式必須被封裝在 Shadow DOM 內部。
- 強制使用 `attachShadow({ mode: 'open' })`。`open` 模式在提供強大隔離性的同時，保留了除錯和擴展的彈性。

### 範例：一個名為 `<dw-btn>` 的按鈕元件

#### 命名規範

自訂元件標籤名必須包含連字號 (`-`)，並使用統一的前綴（如 `dw-`）避免與未來的標準 HTML 標籤衝突。

#### 實作 (dw-btn.js)

```javascript
const template = document.createElement('template');
template.innerHTML = `
  <style>
    /* :host 用於設定元件本身（即 <dw-btn>）的樣式 */
    :host {
      display: inline-block; /* 讓元件表現得像按鈕 */
      --dw-btn-bg-color: #f0f0f0; /* 提供可供外部覆寫的 CSS 變數 */
      --dw-btn-text-color: #333;
    }

    /* :host([attribute]) 用於根據屬性切換樣式 */
    :host([variant="primary"]) {
      --dw-btn-bg-color: #007bff;
      --dw-btn-text-color: #ffffff;
    }

    :host([disabled]) {
      --dw-btn-bg-color: #e0e0e0;
      --dw-btn-text-color: #a0a0a0;
      pointer-events: none;
      cursor: not-allowed;
    }

    button {
      /* 使用繼承自 :host 的變數 */
      background-color: var(--dw-btn-bg-color);
      color: var(--dw-btn-text-color);
      border: 1px solid #ccc;
      padding: 10px 16px;
      border-radius: 4px;
      cursor: pointer;
      transition: filter 0.2s;
      width: 100%; /* 填滿 :host */
    }

    button:hover {
      filter: brightness(0.9);
    }
  </style>
  <button part="button">
    <slot></slot>
  </button>
`;

class DwBtn extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  // 其他方法如 connectedCallback, attributeChangedCallback 等
}

window.customElements.define('dw-btn', DwBtn);
```

## 原則三：語意化的 HTML 與現代化的 CSS

### HTML

- 優先使用語意化標籤 (`<main>`, `<nav>`, `<article>`, `<footer>` 等) 來構建頁面結構，提升可訪問性 (Accessibility) 和 SEO。
- 元件的內部結構應同樣遵循語意化原則。

### CSS

- 所有樣式定義在 Shadow DOM 內的 `<style>` 標籤中。
- 積極使用現代 CSS 功能，因為我們不需考慮舊版瀏覽器的相容性問題。
- **CSS 變數 (Custom Properties):** 這是元件主題化和外部客製化的主要方式。
- **CSS Nesting:** 可以使用原生 CSS 巢狀結構來組織樣式，增加可讀性。
- **Layout:** 優先使用 Flexbox 和 Grid 進行佈局。
- **選擇器:** 善用 `:host`, `:host()`, `::slotted()`, `::part()` 等與 Shadow DOM 相關的強大選擇器。

## 原則四：打造清晰流暢的 API

元件的公開介面應該是直觀、易用且可預測的。

### 屬性 vs. 特性 (Properties vs. Attributes)

- 使用 HTML Attributes (如 `<dw-btn variant="primary">`) 來接收靜態的、聲明式的設定。
- 使用 JavaScript Properties/Methods (如 `btn.data = {...}`) 來處理複雜的資料或觸發行為。

### Getter/Setter 模式

針對 JavaScript Properties 使用 getter 和 setter。

### 鏈式調用

setter 方法應回傳 `this` 以支援鏈式調用。

## 原則五：擁抱現代原生 JavaScript

- **模組管理:** 強制使用原生 ES Modules (`import`/`export`) 進行模組化管理。
- **非同步操作:** 全面使用 `Promise` 和 `async/await`。
- **善用現代語法:** 積極使用 `let`/`const`、箭頭函式、解構賦值、可選鏈 (`?.`)、空值合併運算子 (`??`)、`Map`、`Set` 等。

## 原則六：貫徹開發紀律

- **日誌系統:** 所有類別都應包含 `debug` 旗標或方法來控制 `console` 輸出。
- **錯誤處理:** 所有可能失敗的操作都必須被 `try...catch` 或 `.catch()` 妥善處理。
- **文件註釋:** 所有公開的 class、方法和屬性必須使用 JSDoc 格式進行註釋。

## 原則七：務實的單元測試 (單一 `index.html` 專案)

在只有一個 `index.html` 的專案中，我們採用一種輕量級的測試策略，直接在瀏覽器中執行測試。

### 理念

我們的目標是利用同一個 `index.html`，但在不同的模式下（正常瀏覽 vs. 測試）載入不同的腳本，以驗證元件的公開 API 是否能正確地影響其內部狀態和 DOM，以及事件是否被正確觸發。

### 測試流程

1.  **修改 `index.html`**

    在 `index.html` 中加入一個 script，用來判斷 URL 是否包含 `?test` 參數。如果包含，就動態載入 Mocha、Chai 和測試腳本。

    ```html
    <!DOCTYPE html>
    <html>
    <head>
      <title>My App</title>
      <!-- 你的 CSS -->
    </head>
    <body>
      <!-- 你的 HTML -->
      <div id="mocha"></div>

      <!-- 你的應用程式程式碼 -->
      <script type="module" src="./src/main.js"></script>

      <!-- 測試載入器 -->
      <script>
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('test')) {
          const mochaScript = document.createElement('script');
          mochaScript.src = 'https://unpkg.com/mocha/mocha.js';
          document.head.appendChild(mochaScript);

          const chaiScript = document.createElement('script');
          chaiScript.src = 'https://unpkg.com/chai/chai.js';
          document.head.appendChild(chaiScript);

          const testScript = document.createElement('script');
          testScript.type = 'module';
          testScript.src = './test/main.test.js';
          document.body.appendChild(testScript);

          mochaScript.onload = () => {
            chaiScript.onload = () => {
              mocha.setup('bdd');
              mocha.run();
            };
          };
        }
      </script>
    </body>
    </html>
    ```

2.  **建立測試檔案**

    在專案根目錄下建立一個 `test` 資料夾，並在其中建立 `main.test.js` 檔案。

    ```javascript
    // test/main.test.js
    const expect = chai.expect;

    describe('My App', function() {
      it('should have a title', function() {
        expect(document.title).to.equal('My App');
      });

      // 更多測試...
    });
    ```

3.  **執行測試**

    在瀏覽器中打開 `index.html?test` 即可看到測試結果。

## 原則八：策略性地使用依賴

我們不盲目地「重新造輪子」，但對引入外部依賴保持極度謹慎。

### 引入原則

只有當一個函式庫能解決一個非核心但又相當複雜的問題時（例如：Markdown 渲染、HTML 安全過濾、複雜的日期處理），才考慮引入。

### 篩選標準

- 必須提供可直接在瀏覽器中使用的 ES Module 或 UMD 版本。
- 應該是輕量級、零依賴或依賴極少的。
- 必須是廣泛使用、積極維護且聲譽良好的專案。

### 管理方式

將外部依賴的 `<script>` 統一管理，並在文件中明確註明其用途與版本。

## 原則九：效能導向設計

高效能不是事後優化，而是要在設計之初就融入考量。

- **事件控制:** 對於 `scroll`, `resize`, `input` 等頻繁觸發的事件，使用 `debounce` 或 `throttle` 進行控制。
- **懶載入 (Lazy Loading):** 對於圖片、影片或非首屏的元件，使用 `IntersectionObserver` API 實現懶載入。
- **DOM 操作:** 避免頻繁的單一 DOM 操作。使用 `DocumentFragment` 進行批次更新，以減少頁面的重排（reflow）和重繪（repaint）。
- **耗時計算:** 對於會阻塞主執行緒的複雜計算，考慮使用 Web Workers 將其移至背景執行緒。

## 原則十：程式碼風格指南

為了確保專案程式碼的一致性與可讀性，我們遵循以下風格指南。

### 命名慣例

- **變數 (Nouns):** 對於表示資料、物件等名詞性質的變數，統一使用 `snake_case` 命名法。
  ```javascript
  // Good
  const user_data = { name: 'John', age: 30 };
  const item_list = ['apple', 'banana'];

  // Bad
  const userData = { name: 'John', age: 30 };
  const itemList = ['apple', 'banana'];
  ```

- **函式／方法 (Verbs):** 對於表示動作、操作等動詞性質的函式或方法，統一使用 `camelCase` 命名法。
  ```javascript
  // Good
  function getUserProfile(userId) {
    // ...
  }

  const vm = new Vue({
    methods: {
      updateItems() {
        // ...
      }
    }
  });

  // Bad
  function get_user_profile(userId) {
    // ...
  }
  ```

### 程式碼格式

- **縮排:** 使用 Tab 進行縮排，一個 Tab 等於 4 個空白字元。
- **分號:** 在 JavaScript 中，每個語句的結尾都應加上分號。
- **引號:** 字串應優先使用雙引號 (`