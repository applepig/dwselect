# Sprint 6 Works：DW嚴選 Compact App Redesign

## 2026-06-07

### Spec 前置決策

- 使用者確認 `/goal` 範圍是完成整個 Sprint 6，而不是只產出 spec。
- 使用者確認現有 `plan.md` 與 `research.md` 已足夠重現 handoff design；本次先將其固化成 `spec.md`，通過審閱後才進入 TDD 實作。
- 使用者確認 content migration 可採破壞式更新；若出問題，以 Git 回溯。
- 使用者確認 links tab 第一版只需要一筆指向 `https://applepig.idv.tw` 的連結。
- 使用者要求實作時走 TDD，且在實作前查 Nuxt v4 官方文件，因為 Nuxt v4 近期改動快。

### 現況探索

- 目前分支為 `feat/006-dwselect-compact-app-redesign`。
- 探索時文件包已有 `plan.md` 與 `research.md`，尚未有 `spec.md`；本次已建立 `spec.md`。
- `docs/PRD.md` 與 `docs/TECHSTACK.md` 不存在；技術棧依 `package.json`、現有 code 與 AGENTS.md 判定。
- 專案目前使用 Nuxt 4.2.2、Nuxt UI 4.8.2、Nuxt Content 3.7.1、MiniSearch 7.2.0、Vitest 4.0.14。
- 現有 content 有 66 筆 published 商品，分類分布為：3C 9、居家 17、廚房 13、影音 9、電腦 13、食材 5。
- 真實 `purchase_url` host 包含 PChome、momo、Amazon JP、Amazon US、Costco 與多個其他通路；第一波未列入 mapping 的 host 會落到 `other`。
- 真實 `price_text` 包含純數字、`/kg`、日幣、美元文字、範圍與模糊文案，因此 spec 採多幣別／單位／label 價格模型。

### Nuxt 官方文件查核

- Nuxt Content v3 collection 由 `content.config.ts` 定義；加入 config 後，只會 import collection source pattern 命中的檔案。`data` collection 適合 JSON / YAML 結構化資料，且 collection schema 可用 `@nuxt/content` 匯出的 `z` 定義。
  - 參考：https://content.nuxt.com/docs/collections/define
  - 參考：https://content.nuxt.com/docs/collections/types
- `queryCollection` 是 auto-imported utility，可在 Vue / Nitro 查 collection；支援 `.where()`、`.order()`、`.all()`、`.first()` 等 query builder 方法。現有 `queryCollection('products').where(...).order(...).all()` 方向仍符合文件。
  - 參考：https://content.nuxt.com/docs/utils/query-collection
- Nuxt 4 `useAsyncData` 會把 SSR 取得的資料放入 Nuxt payload，handler 應回傳 truthy value 並保持 side-effect free；若 handler 回傳 `undefined` / `null`，可能造成 client 端重複請求。實作時要讓 collection query fallback 成空陣列，而不是讓資料為 `undefined`。
  - 參考：https://nuxt.com/docs/4.x/api/composables/use-async-data
- Nuxt UI v4 theming 以 Tailwind CSS v4、CSS variables 與 Nuxt UI semantic tokens 為核心。Redesign 可用 `:root` / `.dark` CSS variables 定義 `--dw-*` tokens，同時視需要覆寫 `--ui-*` tokens。
  - 參考：https://ui.nuxt.com/getting-started/theming
- Nuxt UI v4 `UModal` 支援 `v-model:open`、`fullscreen`、`scrollable`、`dismissible`、`overlay` 等 props；phone detail 可用 fullscreen modal，tablet / desktop 可用一般 modal 與自訂 content class。
  - 參考：https://ui.nuxt.com/docs/components/modal
- Nuxt UI v4 `UColorModeButton` 可直接切換 light / dark mode；若要自訂行為，也可用 Nuxt color mode 的 `.dark` / `.light` class 套用 CSS theme。
  - 參考：https://ui.nuxt.com/docs/components/color-mode-button
  - 參考：https://color-mode.nuxtjs.org/
- Nuxt UI v4 `UApp` 應包住整個 app，提供 overlay、tooltip、toast 等 provider；本 sprint 使用 modal / tooltip 類互動時，需更新 `app/app.vue`。
  - 參考：https://ui.nuxt.com/docs/components/app

### Milestone 1：Schema evolution、taxonomy 與 content migration

- TDD Red：先更新 `tests/product-schema.test.ts`、`tests/published-products.test.ts`，並新增 `tests/migrate-product-compact-schema.test.ts`。初次執行 `pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/migrate-product-compact-schema.test.ts` 失敗，主要 failure 為 migration script 尚不存在、Product schema 仍要求舊 `category`、taxonomy schema 未輸出、published-products 仍從舊 category 取值。
- 實作：新增 strict Product price schema，Product 改用 `price`、`summary`、`channel_id`、`category_id`，並移除舊 `category`。新增 channel/category/link taxonomy schema 與 content JSON。
- 實作：新增 `scripts/migrate-product-compact-schema.ts`，提供 `inferChannelId()`、`getMigratedCategoryId()`、`parseProductPrice()`、`getCompactProductMigration()` 與 CLI migration。已執行 migration，輸出 `Products migrated: 66`。
- 技術決策：taxonomy JSON 採 `{ "items": [...] }` 包裝，而不是頂層 array。原因是 Nuxt Content 官方 JSON data collection 文件指出 data collection 的 JSON 檔頂層應是單一 object，頂層 array 會造成 query time invalid result。
- 技術決策：`app/utils/published-products.ts` 保留既有 UI 仍使用的 `category` 顯示欄位，但來源改為 category definition label；同時新增 `category_id`、`channel_id`、`channel`、`summary` 給後續 compact app 使用。
- 相依修正：`scripts/migrate-google-sheet-products.ts` 改用 compact migration helper 產出新版 Product shape，避免 legacy cutover 測試與新版 strict schema 衝突。`tests/nuxt-smoke.test.ts` 與 search-index temp fixture 只對齊新版 schema，不調整 MiniSearch contract。
- 最終測試：`pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/migrate-product-compact-schema.test.ts` 通過，3 files / 30 tests passed。
- 完整測試：`pnpm test` 通過，11 files / 73 tests passed。

### Milestone 2：Search contract 與 static generate 更新

- TDD baseline：修改測試前，`pnpm test tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts` 通過，3 files / 20 tests passed，代表既有測試尚未覆蓋新版 search contract。
- TDD Red：更新 `tests/search-index.test.ts`、`tests/client-search.test.ts`、`tests/nuxt-smoke.test.ts` 後，同一指令失敗，3 files failed，8 tests failed。主要 failure 為 search document / suggestion 仍輸出舊 `category`、沒有 `category_label` / `channel_label`，以及 `public/search-index.json` 尚未重建成新版欄位。
- 實作：`app/utils/search/search-index.ts` 的 `SearchDocument` 改為新版 contract，search fields 納入 `name`、`summary`、`description`、`category_label`、`channel_label`、`tags`；store fields 改為 `id`、`name`、`category_label`、`channel_label`、`price_text`、`image_url`。
- 實作：`SearchSuggestion.category` 保留給現有 UI，但來源改為 `category_label`；同步新增 `category_label`、`channel`、`channel_label` 給後續 compact app 使用。
- 實作：`scripts/build-search-index.ts` 讀取 `content/taxonomies/categories.json` 與 `content/taxonomies/channels.json`，將 taxonomy label 傳入 index builder；temp products dir 測試缺 taxonomy 檔時使用 search-index 的預設 mapping，但 taxonomy JSON 格式錯誤會直接失敗。
- 產物：執行 `pnpm build:search-index` 更新 `public/search-index.json`，輸出 `Search index written: public/search-index.json`、`Documents: 66`。
- 最終測試：`pnpm test tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts` 通過，3 files / 21 tests passed。
- 完整測試：`pnpm test` 通過，11 files / 74 tests passed。

### Milestone 3：Compact app shell 與四個 tabs

- Nuxt 官方文件查核：本次實作前重新確認 Nuxt 4 `useAsyncData`、Nuxt Content `queryCollection`、Nuxt UI v4 `UApp`、`UColorModeButton` 與 theming 文件。實作採 `UApp` 包住 `NuxtPage`、`UColorModeButton` 作 theme toggle，CSS tokens 以 `:root` / `.dark` 定義，`useAsyncData` handler 維持 side-effect free 並 fallback 空陣列。
- TDD Red：先更新 `tests/published-products.test.ts` 與 `tests/nuxt-smoke.test.ts`，執行 `pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts` 失敗，2 files failed，11 tests failed。主要 failure 為 `getCompactAppView` 尚不存在、首頁仍是舊 `UInputMenu` catalog、`UApp` 尚未包住 app、compact component 檔案不存在、breakpoint CSS 與 light/dark tokens 尚未建立。
- View-model 實作：`app/utils/published-products.ts` 新增 `CompactAppView`、四個 tab、home category chips、guide AND tag filter、top tags、search query filtering 與安全 link row mapping。保留既有 catalog helper，避免影響舊測試。
- UI 實作：拆出 `app-navigation.vue`、`theme-toggle.vue`、`product-card.vue`、`tag-explorer.vue`、`link-panel.vue`，並重構 `app/pages/index.vue` 成 compact app shell。商品卡只提供 Milestone 3 placeholder click；detail sheet / modal、buy CTA 與 View Transition 仍留給 Milestone 4。
- CSS 實作：重寫 `variables.css` 與 `catalog.css`，建立 warm light / warm dark `--dw-*` tokens，同時保留 teal、rose、amber 多色輔助 token。Responsive navigation 使用 phone `<768px` bottom tabs、tablet `768–1199px` left rail（96px）、desktop `>=1200px` sidebar（232px）與 sticky top bar；hit target 至少 44px，長文字使用 wrap、ellipsis 或 line clamp。
- Playwright infra：執行 `pnpm add -D @playwright/test`，新增 `playwright.config.ts`、`tests/e2e/compact-app.spec.ts` 與 `test:e2e` script。執行 `pnpm exec playwright install chromium` 成功。E2E smoke 覆蓋 phone / tablet / desktop nav、首屏、tab 切換、搜尋 placeholder `在找什麼嗎？™` 與 link row `https://applepig.idv.tw`。
- Playwright 修正：第一次 E2E 因 Nuxt dev lock 失敗，改用 `NUXT_IGNORE_LOCK=1`；tablet project 一開始使用 WebKit device 但只安裝 Chromium，後改為所有 project 使用 Chromium。tab 切換曾因 custom event 與舊 HMR overlay 造成 click 無效，最後改為 `selectTab` function prop 並設 Playwright 單 worker，避免初次 Vite transform 時的 race。
- 最終指定測試：`pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts` 通過，2 files / 33 tests passed。
- Playwright smoke：`pnpm test:e2e` 通過，6 tests passed（phone、tablet、desktop 各 2 tests）。
- 完整測試：`pnpm test` 通過，11 files / 83 tests passed。新增 Playwright 後，Vitest script 已排除 `tests/e2e/**`，E2E 由 `pnpm test:e2e` 負責。
- Build 驗證：`pnpm build` 通過；`pnpm build:search-index` 輸出 `Documents: 66`，Nuxt prerender `/` 成功並產生 `.output/public`。

### Milestone 4：Product detail、View Transition 與 responsive polish

- Nuxt 官方文件查核：本次實作前重新確認 Nuxt UI v4 `UModal` 支援 `v-model:open`、`fullscreen`、`scrollable`、`dismissible`、`overlay`，並確認 `UApp` 是 overlay / modal provider 的 app wrapper。Nuxt 4 View Transitions 仍屬 experimental，文件也提醒 `document.startViewTransition` 需以支援度判斷使用。
- TDD Red：先更新 `tests/published-products.test.ts`、`tests/nuxt-smoke.test.ts`，新增 `tests/view-transition.test.ts`，並擴充 `tests/e2e/compact-app.spec.ts`。初次執行 `pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts tests/view-transition.test.ts` 失敗，3 files failed，主要 failure 為 `getProductDetail` 不是 function、`app/utils/view-transition.ts` 不存在、`app/components/product-detail.vue` 不存在、首頁尚未接 `<ProductDetail>` 與 `runViewTransition`。
- View-model 實作：`app/utils/published-products.ts` 新增 `ProductDetailView` 與 `getProductDetail()`，輸出 canonical product id、hero image、channel/category label、price label、`DW 怎麼說`、description、tags、buy CTA label / href / target / rel 與 fine print。
- View Transition 實作：新增 `app/utils/view-transition.ts`，由 `runViewTransition()` 集中處理 `document.startViewTransition()`。瀏覽器不支援、SSR 沒有 document，或 `prefers-reduced-motion: reduce` 時，會同步執行 state update，不讓 unsupported browser throw。
- UI 實作：新增 `app/components/product-detail.vue`，以 Nuxt UI `UModal` controlled open state 顯示 detail。Phone 使用 fullscreen sheet，tablet / desktop 使用 modal；內容包含 hero、channel badge、category、title、price、`DW 怎麼說` callout、description、tags、buy CTA 與 fine print，並提供 `關閉商品詳情` button。
- 整合：`app/pages/index.vue` 新增 `selected_product_id`、`selected_product_detail`、`detail_open` 與 phone media query state；商品卡 click 透過 `runViewTransition()` 開啟 detail，關閉也走同一 helper。`product-card.vue` aria label 改為「查看 <商品> 詳情」，image tile 加上 `view-transition-name`。
- Responsive polish：`catalog.css` 新增 detail sheet / modal、hero tile、callout、tag list、CTA 與 focus state 樣式。長商品名稱、長 summary、長 tag、長價格 label 使用 `overflow-wrap: anywhere`、`word-break: break-word`、固定 hit target 與 line clamp，避免撐破 card、chip 或 detail overlay。
- 最終指定測試：`pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts` 通過，2 files / 35 tests passed。
- View Transition helper 測試：`pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts tests/view-transition.test.ts` 通過，3 files / 39 tests passed。
- Playwright smoke：`pnpm test:e2e` 通過，9 tests passed（phone、tablet、desktop 各 3 tests），覆蓋首屏、tab 切換、detail 開啟、buy CTA href / target / rel 與 close button。
- 完整測試：`pnpm test` 通過，12 files / 89 tests passed。
- Static generate：`pnpm generate` 通過；`pnpm build:search-index` 輸出 `Search index written: public/search-index.json`、`Documents: 66`，Nuxt prerender `/`、`/200.html`、`/404.html`、`/__nuxt_content/products/sql_dump.txt` 與 payload 成功，產生 `.output/public`。Build 期間僅出現 sourcemap 與 Rollup pure annotation warning。

### UI polish 修正：卡片、top bar 與寬螢幕欄寬

- 問題：使用者依 `02-c-detail-toggle` 設計稿比對後指出 ProductCard / detail 大多是原生 HTML 加自訂 CSS，Nuxt UI 元件使用不足；channel 與 pricing 標示不如設計稿清楚；`.compact-top-bar` 有底色但水平 padding 不足；desktop 寬螢幕右側有大片留白。
- Red：新增 `tests/nuxt-smoke.test.ts` source/layout contract，先失敗於 `product-card.vue` 沒有 `<UCard>` / `<UBadge>`，並補上 3440px desktop Playwright gutter check。
- 修正：`product-card.vue` 改用 `UCard` 與 `UBadge`，channel / price 移回 image tile overlay；`product-detail.vue` 的 channel/category 與 buy CTA 改用 `UBadge` / `UButton`；`.compact-main` 移除水平 padding，改由 `.compact-top-bar` 與 `.compact-panel` 各自承擔一致 padding。
- 修正：desktop grid 從固定 4 欄改為 `repeat(auto-fit, minmax(clamp(280px, 10vw, 400px), 1fr))`，讓 card target size 落在 280～400px，並在 3440px 寬螢幕維持多欄展開。
- 修正：price badge 維持使用 `--dw-accent`，並將 light / dark accent token 調回設計稿橘色系 `#ec7a2b` / `#ff8a3d`，避免偏紅。

### XReview confirmed issues 修正

- 已確認四項修正方向：搜尋 tab 要使用 `/search-index.json` 的 MiniSearch static index 並能 fallback；production runtime taxonomy 要從 `content/taxonomies/*.json` 載入；detail 只有 `description !== summary` 才顯示 description；新增 `other`／「其他」category，空白或未知匯入分類歸到 `other` 並提供 warning。
- TDD 計畫：先補 `published-products`、`client-search`、`nuxt-smoke`、`product-schema`、`search-index`、`migrate-product-compact-schema`、`migrate-google-sheet-products` 測試，確認 red 後再做最小 production 修改。
- TDD Red：執行 `pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts tests/migrate-google-sheet-products.test.ts tests/migrate-product-compact-schema.test.ts`，預期失敗 13 tests，涵蓋 schema enum 尚未接受 `other`、taxonomy JSON 缺 `other`、首頁未呼叫 `getClientSearchResults()`、runtime 未 query taxonomy collections、detail description 未條件式顯示、migration / importer 尚未 fallback unknown category。
- 實作：`content.config.ts` 註冊 `categories`、`channels`、`links` data collections；`app/pages/index.vue` 以 `useAsyncData` / `queryCollection` 載入 taxonomy JSON 與 links，傳給 `getCompactAppView()` / `getProductDetail()`，並在 search query 變更時呼叫 `getClientSearchResults()`，成功以 result ids 回填商品卡，失敗時將 ids 設為 `null` 走 Nuxt Content loaded products fallback。
- 實作：`getCompactAppView()` 新增 `search_result_ids` contract；`getProductDetail()` 在 `description === summary` 時回傳 `description: null`，`ProductDetail` 以 `v-if` 條件式渲染 description。
- 實作：新增 category taxonomy `other`／「其他」；Product schema、view-model default taxonomy、search index default taxonomy 支援 `other`；migration helper 將空白或未知 category 歸到 `other`；Google Sheet importer 於 summary warnings 記錄 fallback 原因。
- 最終指定測試：`pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts tests/migrate-google-sheet-products.test.ts tests/migrate-product-compact-schema.test.ts` 通過，7 files / 87 tests passed。
- 完整 Vitest：`pnpm test` 通過，12 files / 101 tests passed。
- Static generate：`pnpm generate` 通過，`build:search-index` 輸出 `Documents: 66`，Nuxt Content 處理 5 collections 與 69 files，prerender `/`、taxonomy sql dumps、products sql dump 與 payload 成功。Build 期間僅出現既有 sourcemap 與 Rollup pure annotation warnings。
- Playwright smoke：第一次 `pnpm test:e2e` 有 phone 第一個 smoke 在 `waitForLoadState('networkidle')` 超時，但 log 顯示 `load` 已 fired，且同輪其他 phone/tablet/desktop 互動測試通過；清除 artifact 後重跑 `pnpm test:e2e` 通過，10 passed / 2 skipped。
