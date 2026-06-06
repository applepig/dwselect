# Works：Public Site UI + Search

## 2026-06-06

### 規劃啟動

- 使用者確認可採保守預設快速啟動 Sprint 2，不等待額外 UI 設計稿。
- Sprint 2 聚焦 public catalog baseline 與搜尋，不納入 Wishlist、Dark Mode、商品詳情 modal、View Transition、inside editing、remote agent 或 price monitoring。
- 沿用 `docs/002-git-backed-content-roadmap/research.md` 的 Search 技術決策：Nuxt UI `UInputMenu`、MiniSearch build-time index、client lazy load、`Intl.Segmenter` + bigram fallback。
- 建立分支 `feat/003-public-site-ui-search` 與文件包 `docs/003-public-site-ui-search/`。

### Spec self-review

- Placeholder 掃描：`spec.md` 無 `TBD`、`待確認`、空白段落。
- 內部一致性：目標、非目標、驗收條件、Data Structure、ADR 與 Milestones 均指向 Sprint 2 public catalog + search baseline。
- Scope 檢查：範圍刻意排除 `001-revamp` 中較大的 Wishlist、Dark Mode 與商品詳情 modal，適合單一 sprint。
- 歧義檢查：Search index 明確定義為 static JSON，不新增 REST / SSE / WebSocket API；搜尋、分類與排序的組合狀態列入驗收與邊界案例。

### Milestone 1 開發日誌

- 派工：由 `ddd-developer` worker 執行 Milestone 1，修改範圍限制在 `app/utils/published-products.ts` 與 `tests/published-products.test.ts`。
- Red：新增 catalog view 測試後，第一次執行 `pnpm test tests/published-products.test.ts` 有 6 個新增測試失敗、3 個既有測試通過；失敗原因為 `getCatalogView is not a function`。
- Green：新增 `CatalogSort`、`CatalogState`、`getCatalogView()`、category/count/sort options、empty reason，以及 query/category/sort pure helper；`PublishedProductCard` 補上 description、tags、published_at，供後續 UI/Search 使用。
- Refactor：`getGroupedPublishedProducts()` 改為共用 card grouping helper，維持 published-only mapping 與 catalog 狀態組合都在 pure helper 中處理。
- 驗收：Coordinator 執行 `pnpm test tests/published-products.test.ts` 通過，1 個 test file、9 tests；執行 `pnpm test` 通過，6 個 test files、30 tests；`git diff --check -- app/utils/published-products.ts tests/published-products.test.ts` 無輸出。

### Milestone 2 開發日誌

- 派工：由 `ddd-developer` worker 執行 Milestone 2，修改範圍限制在 search utilities、build script、search tests、dependency 與 static index artifact。
- Red：新增 `tests/search-tokenizer.test.ts` 與 `tests/search-index.test.ts` 後，第一次執行 `pnpm test tests/search-tokenizer.test.ts tests/search-index.test.ts` 失敗；失敗原因為找不到 `minisearch` package 與 `app/utils/search/search-tokenizer` module。
- Green：新增 `app/utils/search/search-tokenizer.ts`，以 `Intl.Segmenter('zh-Hant')` 為主、CJK bigram fallback；新增 `app/utils/search/search-index.ts`，提供 published-only document mapping、MiniSearch payload build/load/query 與 UI suggestion shape。
- Build：新增 `scripts/build-search-index.ts` 與 `pnpm build:search-index`，並讓 `pnpm build`、`pnpm generate` 先產生 `public/search-index.json`；新增 `minisearch` dependency。
- 驗收：Coordinator 執行 `pnpm test tests/search-tokenizer.test.ts tests/search-index.test.ts` 通過，2 個 test files、7 tests；執行 `pnpm test` 通過，8 個 test files、37 tests；`pnpm build:search-index` 成功寫入 `public/search-index.json`，Documents: 1；`pnpm generate` 成功；`node scripts/assert-runtime-google-sheet-clean.ts` 通過；`git diff --check` 無輸出。

### Milestone 3 開發日誌

- 派工：由 `ddd-developer` worker 執行 Milestone 3，修改範圍包含首頁、catalog styles、Nuxt UI 設定、client search helper 與 Nuxt smoke tests。
- Red：更新 `tests/nuxt-smoke.test.ts` 後，第一次執行 `pnpm test tests/nuxt-smoke.test.ts` 有 3 個失敗；失敗點為 `@nuxt/ui` module 未啟用、首頁沒有 `<UInputMenu`、`app/utils/search/client-search.ts` 不存在。
- Green：啟用 `@nuxt/ui` module，首頁改為正式 catalog layout，加入 `UInputMenu` 搜尋列、category controls、sort select、商品卡片、搜尋/無商品空狀態；新增 `app/utils/search/client-search.ts`，透過 dynamic import 路徑 lazy fetch `/search-index.json`。
- Refactor：首頁狀態以 `getCatalogView()` 彙整 category、sort、counts 與 sections；搜尋結果只透過 suggestion ids 篩選商品，避免 template 直接處理 raw Product 狀態組合。
- 驗收：Coordinator 執行 `pnpm test` 通過，8 個 test files、40 tests；`pnpm generate` 成功並產生 `.output/public`；`node scripts/assert-runtime-google-sheet-clean.ts` 通過；`git diff --check` 無輸出。抽查 `.output/public/index.html` 可見 catalog header、搜尋 input、分類、排序與商品卡片；compiled output 顯示 MiniSearch/client search helper 位於獨立 chunk，未與首頁主 chunk 合併。

### Milestone 4 開發日誌

- 派工：由 `ddd-developer` worker 執行 Milestone 4，修改範圍包含首頁 loading/failure 狀態、responsive CSS、Nuxt smoke tests 與 README static search index 說明。
- Red：更新 `tests/nuxt-smoke.test.ts` 後，第一次執行 `pnpm test tests/nuxt-smoke.test.ts` 有 3 個失敗；失敗點為缺少 `role="status"`、缺少 desktop media query、README 未記錄 `pnpm build:search-index`。
- Green：首頁補上搜尋狀態 live region、loading/failure/empty 文案；`catalog.css` 補齊 phone/tablet/desktop responsive styles、長文字換行與 focus-visible states；README 補 static index generate 指令。
- Refactor：保持 catalog helper 與 UI 分工，CSS 只處理版面與狀態呈現；未新增額外 component 抽象。
- 驗收：Coordinator 執行 `pnpm test tests/nuxt-smoke.test.ts` 通過，1 個 test file、8 tests；執行 `pnpm test` 通過，8 個 test files、43 tests；`pnpm generate` 通過；`node scripts/assert-runtime-google-sheet-clean.ts` 通過；`git diff --check` 無輸出。

### Hotfix：toybox host allowlist

- 症狀：使用者開啟 `https://dwselect.toybox.local/` 時，Vite 回報 host 不在 allowlist。
- 根因：`pnpm dev` 已用 `--host ::` 對 LAN 開放，但 Nuxt/Vite `server.allowedHosts` 未包含 Traefik 開發網域。
- Red：新增 `tests/dev-server-script.test.ts` 檢查 `nuxt.config.ts` 的 `vite.server.allowedHosts` 必須包含 `dwselect.toybox.local`，第一次執行單檔測試失敗。
- Green：在 `nuxt.config.ts` 加入 `vite.server.allowedHosts: ['dwselect.toybox.local']`。
- 驗證：`pnpm test tests/dev-server-script.test.ts` 通過，`pnpm test` 通過，`pnpm generate` 通過，`node scripts/assert-runtime-google-sheet-clean.ts` 通過，`curl -I -H 'Host: dwselect.toybox.local' http://127.0.0.1:3000/` 回 `200 OK`。

### Hotfix：agent-browser 與實機互動驗收

- 工具：使用者授權 sudo 後，將 `agent-browser` 從 0.8.6 更新到 0.27.1，並安裝 `fonts-noto-cjk`，讓 headless Chromium 可正確渲染繁中文字型。
- 搜尋綁定問題：agent-browser 實測發現 `UInputMenu` 輸入「範例」後 input 會被清空；根因是 Nuxt UI `InputMenu` 的輸入文字 model 是 `searchTerm`，不是預設 `modelValue`。修復為 `v-model:search-term="search_query"`，並新增 smoke test 鎖定此 contract。
- 搜尋結果對齊問題：修正綁定後，MiniSearch 找到 1 筆建議但商品列表顯示 0 張卡；根因是 Nuxt Content runtime 將 product `id` 變成 `products/products/<file>.json`，但 build-time search index 使用原始 JSON `id`。新增 `getCatalogProductId()` canonical helper，讓 UI filter 與 search index 用同一個 product id。
- 實機 500 回報：使用者在 iPad 看到 `500 Internal Server Error` 與 `useHead() was called without provide context`；Coordinator 直接測 `https://dwselect.toybox.local/` 與 iPad Safari User-Agent 一度回 `200 OK`，重啟 dev server 時短暫出現 Traefik `502`，改以 PTY 重新啟動 `pnpm dev` 並等到 Vite client/server built 後，`127.0.0.1:3000`、`10.0.4.105:3000`、`https://dwselect.toybox.local/` 均回 `200 OK`，body 無 `Internal Server Error` 或 `useHead`。
- 範例圖問題：agent-browser 截圖發現 sample content 使用 `https://example.com/product.jpg` 造成 broken image；改為 `https://placehold.co/1200x800/e5ded1/12304d.png?text=DW+Select`，重新執行 `pnpm build:search-index`，並確認 image resource natural size 為 1200 × 800。
- 最終驗收：`pnpm test` 通過，8 個 test files、45 tests；`pnpm generate` 通過；`node scripts/assert-runtime-google-sheet-clean.ts` 通過；`git diff --check` 無輸出；agent-browser mobile screenshot 無文字或控制項重疊，搜尋「範例」後 input 保留、MiniSearch 找到 1 筆、商品卡維持 1 張。

## 2026-06-07

### XReview 修正：搜尋、canonical id、排序與日期

- Findings：xreview 指出主商品列表使用 autocomplete 建議結果，會被 12 筆顯示上限截斷；`loadClientSearchIndex()` 會永久快取 rejected promise；build-time search index 使用 JSON 內部 `id`，與 catalog canonical id 來源耦合；Segmenter-built index 與 fallback query 需要整合測試；日期格式缺少固定 timezone；排序 enum 不應提供獨立 `category` option。
- 使用者決策：拆分完整搜尋結果與 autocomplete 建議；失敗後重置 lazy-load promise；search document id 以檔名 stem 為準；tokenizer 先補整合測試，若失敗再最小修正；日期格式指定 `Asia/Taipei`；`category` 作為 implicit default，不提供獨立 sort option。
- Red：新增／更新 `published-products`、`search-index`、`client-search`、`format-published-date` 測試後，第一次執行相關測試出現預期失敗：缺少 `getCatalogSearchProducts()`、autocomplete 預設仍為 8 筆、完整 query 仍被 limit、rejected promise retry 失敗、build output id 仍使用 JSON 內部 id、日期 helper 尚不存在、sort options 仍包含 `category`。
- Green：首頁 watcher 改取完整 `getClientSearchResults()`，`search_suggestions` 只保留前 12 筆；主列表透過完整 search result id 集合篩選；client lazy loader catch 後重置 promise；build script 讀 JSON 時用檔名 stem 覆寫 `id`；新增 `formatPublishedDate()` 並指定 `timeZone: 'Asia/Taipei'`；移除 `category` sort option，invalid `category` sort fallback 到 `default`。
- 測試補強：覆蓋 13 筆以上搜尋命中、命中商品落在 autocomplete limit 之外仍可被 category 篩出、第一次 fetch 失敗第二次成功、JSON 內部 id 與檔名 stem 不同時輸出檔名 stem、Segmenter-built index 搭配 fallback-tokenized query、Asia/Taipei 日期格式。
- 驗證：`pnpm test tests/published-products.test.ts tests/search-tokenizer.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/format-published-date.test.ts` 通過，5 個 test files、25 tests；`pnpm test tests/published-products.test.ts tests/search-tokenizer.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/format-published-date.test.ts tests/nuxt-smoke.test.ts` 通過，6 個 test files、33 tests；`pnpm test` 通過，10 個 test files、53 tests；`pnpm build:search-index -- --out /tmp/opencode/dwselect-search-index-xreview.json` 通過，Documents: 1。
