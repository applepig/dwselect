# Tasks：Sprint 007 Routed Navigation 與 View Transition

## 文件狀態

本 `tasks.md` 依已確認的 `spec.md` 拆解。`spec.md` 仍是需求 SSOT；本文件只負責執行順序、派工邊界與驗收方式。

## Decision Gate

判定：需要獨立 `tasks.md`。

原因：本 sprint 同時修改 Nuxt route 結構、shared data composable、URL query state、商品詳情 route、static prerender、view transition CSS 與 Playwright smoke。雖然都屬於同一個 compact app route 化功能群，仍有明確跨模組依賴與可平行工作線，直接塞在 `spec.md` Milestones 會讓派工與驗收邊界不清楚。

不拆 sprint 的理由：所有工作都服務同一個可展示結果：DW嚴選 compact app 從 component ref 狀態機改為 route-driven perma url，並以 Nuxt 內建 view transition 串起列表、篩選與詳情。拆 sprint 會留下半成品 URL 或半成品詳情頁，反而提高整合風險。

## Milestone 1：Route 骨架、資料 composable 與導航契約（序列）

> 預期結果：`/`、`/guide`、`/search`、`/links` 成為獨立 route，共用 compact app layout 與 `useCatalogData`；`AppNavigation` 改用 `NuxtLink`，active 與 `aria-current="page"` 由 route 決定。
> 驗證方式：`pnpm test tests/nuxt-smoke.test.ts tests/published-products.test.ts`，以及 Playwright route 導航 smoke 的 Red/Green。

- [x] Task 1.1：撰寫 route shell 測試（Red）
  - 範圍：`tests/nuxt-smoke.test.ts`、`tests/e2e/compact-app.spec.ts`
  - 覆蓋：四個 page 檔案存在、`AppNavigation` 使用 `NuxtLink`、tab 導航改變 URL 且不 full reload、三個 breakpoint 導航仍可見。
- [x] Task 1.2：撰寫 route state → `CompactAppState` 測試（Red）
  - 範圍：`tests/published-products.test.ts`
  - 覆蓋：`/`→`home`、`/guide`→`guide`、`/search`→`search`、`/links`→`links`，未知 path fallback 到 `home` 或呼叫端不使用。
- [x] Task 1.3：實作 shared data 與 route state helper（Green）
  - 範圍：`app/composables/use-catalog-data.ts`、`app/utils/published-products.ts`
  - 契約：集中 products / categories / channels / links 的 `useAsyncData` key；新增小型 helper 只負責由 route path / query 組 `CompactAppState`，不改既有 view-model 對外行為。
- [x] Task 1.4：實作 layout 與四個 route page（Green）
  - 範圍：`app/layouts/default.vue`、`app/pages/index.vue`、`app/pages/guide.vue`、`app/pages/search.vue`、`app/pages/links.vue`
  - 契約：top bar、theme toggle、navigation 外殼搬到 layout；四個 page 只負責各自 panel 與 route state。
- [x] Task 1.5：實作 `AppNavigation` route 導航（Green）
  - 範圍：`app/components/app-navigation.vue`
  - 契約：移除 `selectTab` callback；desktop sidebar、tablet rail、phone bottom tab 都使用 `NuxtLink`；active 由目前 route 推導，`aria-current="page"` 只出現在當前分頁。
- [x] Task 1.6：Milestone 1 驗收與整理
  - 驗證：`pnpm test tests/nuxt-smoke.test.ts tests/published-products.test.ts`
  - 文件：若開始 implementation，建立 / 更新 `docs/007-routed-navigation-view-transitions/works.md`，記錄 Red/Green 與任何規格偏差。

## Milestone 2：商品詳情獨立 route page

> 預期結果：商品卡導向 `/products/:id`；詳情頁可直連 render；未知 id 走 Nuxt not-found；`pnpm generate` prerender 所有商品詳情 route。
> 驗證方式：`pnpm test tests/nuxt-smoke.test.ts`、`pnpm generate`，以及 Playwright 詳情直連 / unknown id smoke。

### 🔀 可平行工作線

**[A] Detail Route 與 Prerender** — `isolation: worktree`

> 範圍：`app/pages/products/[id].vue`、`nuxt.config.ts`、`tests/nuxt-smoke.test.ts`
> 依賴：Milestone 1 的 `useCatalogData` 與 route shell 已完成。
> 介面契約：`:id` 使用 `getCatalogProductId(product)` 對齊 `content/products/<id>.json` stem；未知 id 使用 Nuxt `createError({ statusCode: 404 })` 或等價流程；prerender route 清單包含全部 published 商品。
> 驗證方式：`pnpm test tests/nuxt-smoke.test.ts`、`pnpm generate`

- [x] Task 2A.1：撰寫 detail route 與 prerender 測試（Red）
- [x] Task 2A.2：實作 `app/pages/products/[id].vue` 與最小 `title` meta（Green）
- [x] Task 2A.3：設定 static generate prerender 全部 `/products/:id`（Green）

**[B] Card Link 與 Detail Presentational Component** — `isolation: worktree`

> 範圍：`app/components/product-card.vue`、`app/components/product-detail.vue`、`app/assets/styles/catalog.css`、`tests/nuxt-smoke.test.ts`
> 依賴：Milestone 1 的 route shell 已完成；detail page 可接收 `ProductDetailView`。
> 介面契約：`ProductCard` 是可鍵盤聚焦的連結，href 指向 `/products/:id`；`ProductDetail` 不再包 `UModal`，只 render detail article 與外部購買 CTA。
> 驗證方式：`pnpm test tests/nuxt-smoke.test.ts`

- [x] Task 2B.1：撰寫 card href 與 modal 移除測試（Red）
- [x] Task 2B.2：將 `ProductCard` 改為 `NuxtLink` / link component（Green）
- [x] Task 2B.3：將 `ProductDetail` 改為 presentational component（Green）

### 🔗 匯合點

- [x] Task 2.4：合併 [A]、[B] 並補 Playwright detail smoke
  - 範圍：`tests/e2e/compact-app.spec.ts`
  - 覆蓋：首頁商品卡點擊後 URL 為 `/products/:id`、直連第一個商品詳情可見、未知 id 顯示 not-found 且無 vite error overlay。
- [x] Task 2.5：Milestone 2 驗收與文件同步
  - 驗證：`pnpm test tests/nuxt-smoke.test.ts`、`pnpm generate`
  - 文件：更新 `works.md` 與 `spec.md` Milestone 2 狀態。

## Milestone 3：篩選 / 搜尋狀態 query 化

> 預期結果：首頁 category、指南 tags、搜尋 q 都由 URL query 驅動；重新整理、分享與瀏覽器前進後退能還原同樣狀態。
> 驗證方式：`pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts`，以及 Playwright query 還原 smoke。

### 🔀 可平行工作線

**[A] Query Parser 與 View-model Contract** — `isolation: worktree`

> 範圍：`app/utils/published-products.ts`、`tests/published-products.test.ts`
> 依賴：Milestone 1 的 route state helper 已存在。
> 介面契約：`/?category=` 無效值 fallback `all`；`/guide?tags=` 解析逗號分隔 tag label 並過濾空白 / 不存在 tag；`/search?q=` trim 後對應 `search_query`。
> 驗證方式：`pnpm test tests/published-products.test.ts`

- [x] Task 3A.1：撰寫 query parser 與 fallback 測試（Red）
- [x] Task 3A.2：實作 query parser / serializer helper（Green）

**[B] Page Query 寫入與 Search Hydration** — `isolation: worktree`

> 範圍：`app/pages/index.vue`、`app/pages/guide.vue`、`app/pages/search.vue`、`tests/nuxt-smoke.test.ts`
> 依賴：Milestone 1 的 page split 已完成；Task 3A 的 helper 介面已定義。
> 介面契約：category / tag chip 使用 `router.push`；搜尋輸入 debounce 後使用 `router.replace`；熱門 tag 明確選擇可使用 `router.push`；client search index 載入失敗時 fallback 到 content products，不白屏。
> 驗證方式：`pnpm test tests/nuxt-smoke.test.ts`

- [x] Task 3B.1：撰寫 page query 寫入與 debounce source-level 測試（Red）
- [x] Task 3B.2：實作 category / tags query navigation（Green）
- [x] Task 3B.3：實作 search q debounce replace 與 hydrate 回填（Green）

### 🔗 匯合點

- [x] Task 3.4：補 Playwright query 還原 smoke
  - 範圍：`tests/e2e/compact-app.spec.ts`
  - 覆蓋：`/?category=<有效 category>` 顯示對應 active chip；`/guide?tags=<有效 tag>` 還原 selected tag；`/search?q=<query>` hydrate 後顯示搜尋結果；browser back/forward 還原前一個 query 狀態。
- [x] Task 3.5：Milestone 3 驗收與文件同步
  - 驗證：`pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts`
  - 文件：更新 `works.md` 與 `spec.md` Milestone 3 狀態。

## Milestone 4：Nuxt View Transition 接線、fallback 與最終驗收（序列）

> 預期結果：Nuxt 內建 same-document view transition 啟用；商品卡圖與詳情 hero 圖 shared-element morph；分類 / tag 切換時 product grid 有自然重排；reduced-motion 與不支援瀏覽器安全 fallback。
> 驗證方式：`pnpm test`、`pnpm generate`、Playwright smoke，Chrome 手動驗收 hero morph 與 grid reorder。

- [x] Task 4.1：撰寫 view transition 契約測試（Red）
  - 範圍：`tests/view-transition.test.ts`、`tests/nuxt-smoke.test.ts`
  - 覆蓋：`nuxt.config.ts` 啟用 `experimental.viewTransition: true`；route/query 不再依賴手寫 `runViewTransition`；CSS 含 hero `view-transition-name`、列表 `view-transition-class`、reduced-motion 保險絲。
- [x] Task 4.2：啟用 Nuxt view transition 並收斂 helper（Green）
  - 範圍：`nuxt.config.ts`、`app/utils/view-transition.ts`、`tests/view-transition.test.ts`
  - 契約：route path / query 轉場交給 Nuxt；若無非 route local state 使用者，移除 helper 與測試；若保留 helper，只能服務非 route local state。
- [x] Task 4.3：補 shared-element 與 grid transition CSS（Green）
  - 範圍：`app/components/product-card.vue`、`app/components/product-detail.vue`、`app/assets/styles/catalog.css`
  - 契約：卡片圖與詳情 hero 兩端同名 `product-image-${id}`；列表項目有穩定唯一 transition name 與 group class；`prefers-reduced-motion: reduce` 下關閉動畫。
- [x] Task 4.4：視需要停用 Vue page/layout transition 衝突（Green）
  - 範圍：`middleware/disable-vue-transitions.global.ts`
  - 契約：只在 client 且支援 `document.startViewTransition` 時停用 `to.meta.pageTransition` / `to.meta.layoutTransition`。
- [x] Task 4.5：補最終 Playwright smoke 與 reduced-motion coverage
  - 範圍：`tests/e2e/compact-app.spec.ts`、`playwright.config.ts`（若需要）
  - 覆蓋：四 route 導航、detail 直連、unknown id not-found、query 還原、phone / tablet / desktop breakpoint、reduced-motion 下沒有錯誤。
- [x] Task 4.6：完整驗收、手動 Chrome 檢查與文件同步
  - 驗證：`pnpm test`、`pnpm generate`、`pnpm test:e2e`
  - 手動檢查：Chrome 列表 → 詳情 hero morph；首頁 category 與 guide tag 切換 grid reorder；非 Chrome / reduced-motion fallback 不丟錯誤。
  - 文件：更新 `spec.md` 所有完成 checkbox 與 `works.md`，等待使用者確認後才 commit。

## 平行執行策略

- Milestone 1 必須序列完成，因為它建立 layout、route page 與 shared composable，是後續所有工作線的共同基礎。
- Milestone 2 的 [A] detail route / prerender 與 [B] card / detail component 可平行，因為主要寫入檔案不重疊，匯合點再補 E2E。
- Milestone 3 的 [A] helper contract 與 [B] page query 寫入可短暫平行，但 [B] 必須遵守 [A] 在 Red 測試中定義的 helper 介面；若介面仍不穩，先完成 [A] 再派 [B]。
- Milestone 4 必須序列整合，因為 view transition 牽動 route、CSS、component 與 E2E，並且需要手動 Chrome 驗收。

## Self-Review

- Spec 覆蓋度：本 tasks 覆蓋四個 route、商品詳情 route、unknown id not-found、query state、`NuxtLink` navigation、card link、Nuxt `experimental.viewTransition`、shared hero name、grid reorder、reduced-motion fallback、static prerender、`pnpm test`、`pnpm generate` 與 Playwright smoke。
- 非目標保護：未新增 frontend module、未改 Product schema / taxonomy / MiniSearch contract、未採 cross-document view transition、未導入 Chromium-only scoped VT、未新增 sort UI、未改 SSR 模式。
- TDD 一致性：每個 milestone 都先列 Red 測試 task，再列 Green implementation task；最終驗收要求更新 `spec.md` 與 `works.md`。
- 平行邊界：M2 與 M3 的平行線以不重疊主要寫入檔案為原則；共用 E2E 檔案集中在匯合點處理，避免 worktree 合併衝突。
