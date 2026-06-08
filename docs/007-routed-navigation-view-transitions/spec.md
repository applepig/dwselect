# Sprint 007：Routed Navigation 與 View Transition

## 文件狀態

本 sprint 的執行 SSOT 是本 `spec.md`。`research.md` 只保留調研背景與候選方案，不代表最終實作方向；若兩者看似衝突，以本文件 ADR 與 Milestones 為準。

`works.md` 是開工後的工作日誌與驗收紀錄，尚未進入實作前不要求存在；開始執行 Milestone 後再建立並同步更新。

## 目標

把 DW嚴選 compact app 從「單頁狀態機」改造成 route 驅動：四個分頁（首頁、指南、搜尋、連結）與商品詳情都有可分享、可前進後退的 perma url，並以 Nuxt 內建 view transition 取代現有手寫版 `runViewTransition`，讓「列表 → 詳情」與「切換分類 / tag」都有自然轉場。

設計原則：view transition 視為 progressive enhancement，**體驗對齊 Chrome、但程式碼在任何瀏覽器都不能爆掉**——不支援或 `prefers-reduced-motion` 時安全退回直接切換。

本 sprint 不動 006 已穩定的資料契約（Product schema、taxonomy、search index），只把「狀態的真相來源」從 component ref 搬到 URL，並重排 component / page 結構以支撐路由。

## 非目標

- 不引入新前端 module（明確排除 Nuxt Pages Plus / route-driven modal）。
- 不改 Product schema、taxonomy JSON、MiniSearch search index contract（006 契約凍結）。
- 不為 Firefox / Safari 的 view transition 差異做額外補償（PE，安全 fallback 即可）。
- 不新增 cross-document view transition（`@view-transition { navigation: auto }`）。
- 不採用 Chromium-only 的進階 API 作為核心轉場依賴（`element.startViewTransition()`、nested groups）。
- 不做商品詳情的完整 SEO meta（og:image / 結構化資料）；本 sprint 僅設最小 `title`。完整 SEO 另開 sprint。
- 不改 theme toggle、links、search index 的既有行為。
- 不從 static generate 改成 SSR 動態 server；維持 `nitro.preset: 'static'`。
- 不新增 sort 控制項（compact app 目前無 sort UI，不在本 sprint 擴張）。

## User Story

作為 DW嚴選讀者，我想要每個分頁與每個商品詳情都有獨立、可分享、可用瀏覽器前進後退的網址，並在切換分頁、分類與開啟商品時看到自然的轉場，以便分享特定商品給朋友、用網址直接進入某個篩選狀態，並獲得接近 app 的順暢瀏覽體驗。

### 驗收條件

- [x] 四個分頁各有獨立 path：`/`（首頁）、`/guide`（指南）、`/search`（搜尋）、`/links`（連結）；分頁切換以 client-side 導航完成，**不重新載入頁面**（延續 006 約束）。
- [x] 商品詳情有獨立 path `/products/:id`，`:id` 為商品 catalog id（檔名 stem）；直接貼此網址可 render 完整詳情頁，不需先經過列表。
- [x] 不存在的商品 id（`/products/<未知>`）顯示 Nuxt scope 的 not-found 狀態，不白屏、不丟未捕捉錯誤。
- [x] 首頁分類選擇反映在 query（`/?category=<category_id>`，省略代表 `all`）；指南多選 tag 反映在 query（`/guide?tags=<label,label,...>`，逗號分隔的 tag label、AND 篩選；本 sprint 不新增 tag id taxonomy）；搜尋字串反映在 query（`/search?q=<query>`）。重新整理或分享該網址能還原同樣的篩選 / 搜尋結果。
- [x] `AppNavigation`（desktop sidebar / tablet rail / phone bottom tab）改用 `NuxtLink`，active 狀態由當前 route 決定，`aria-current="page"` 對應正確分頁。
- [x] 商品卡點擊改為導航到 `/products/:id`（`NuxtLink` 或 `navigateTo`），不再以 ref 開 `UModal`；卡片仍是可鍵盤聚焦的連結，hit target ≥ 44px。
- [x] `nuxt.config.ts` 啟用 `experimental.viewTransition: true`；在 Chrome，列表 → 詳情導航出現 hero 圖 morph（商品卡圖片與詳情 hero 圖兩端掛**同一個** `view-transition-name`）。
- [x] 在 Chrome，於首頁切換分類或在指南切換 tag 時，product grid 以 view transition 自然重排：留存項目位移補間、移除項目退場、新增項目進場。
- [x] `prefers-reduced-motion: reduce` 時退回無 morph 的單純切換；不支援 view transition 的瀏覽器安全退回直接切換、**不丟錯誤**。
- [x] 既有 view-model 純函式（`getCompactAppView` 等）對外行為不變；其 state 來源從 component ref 改為由 route path + query 推導。
- [x] 商品資料、taxonomy、search index、theme、links 的既有行為與既有測試維持通過。
- [x] `pnpm generate` 能產出含四個分頁與全部 `/products/:id` 的 static site；所有商品詳情頁於 build 時 prerender。
- [x] 所有新增 / 修改的驗收條件先有失敗測試（Red）再實作到通過（Green）。
- [x] `pnpm test` 通過。
- [x] Playwright smoke 覆蓋：四個 route 導航、商品詳情直連、未知 id 的 not-found、query 還原篩選 / 搜尋、phone / tablet / desktop breakpoint。

## 相關檔案

- `docs/007-routed-navigation-view-transitions/research.md` — view transition 與路由化技術調研。
- `nuxt.config.ts` — 新增 `experimental.viewTransition: true`。
- `app/app.vue` — 已是 `<UApp><NuxtPage />`，不需改。
- `app/layouts/default.vue` — 新增，compact app 外殼（top bar + `AppNavigation` + panel slot），四個 list page 共用。
- `app/pages/index.vue` — 改為首頁分頁（home），讀 `?category=` query。
- `app/pages/guide.vue` — 新增，指南分頁，讀 `?tags=` query。
- `app/pages/search.vue` — 新增，搜尋分頁，讀 `?q=` query，client 端載入 search index。
- `app/pages/links.vue` — 新增，連結分頁。
- `app/pages/products/[id].vue` — 新增，商品詳情獨立 route page，含 not-found 處理與 prerender。
- `app/composables/use-catalog-data.ts` — 新增，封裝 products + taxonomies + links 的 `useAsyncData` 載入，供各 page 共用。
- `app/components/app-navigation.vue` — `selectTab` callback 改 `NuxtLink`，active 由 route 決定。
- `app/components/product-card.vue` — 點擊改導航 `/products/:id`；圖片 `view-transition-name` 維持 `product-image-${id}` 唯一命名。
- `app/components/product-detail.vue` — 從 `UModal` 內容改為可被 detail page 使用的 presentational component；hero 圖補上 `view-transition-name: product-image-${id}`。
- `app/utils/published-products.ts` — view-model 純函式維持；必要時新增由 route state 組 `CompactAppState` 的小 helper。
- `app/utils/view-transition.ts` — 重新定位：route path / query 變更交給 Nuxt 內建 view transition；若沒有非 route local state 轉場需求，移除此 helper。
- `app/assets/styles/catalog.css` — 補列表重排 group 轉場、hero morph 與 reduced-motion 保險絲；移除 / 調整僅 root cross-fade 的舊規則。
- `middleware/disable-vue-transitions.global.ts` — 新增（若需要），避免 Vue page/layout transition 與 view transition 衝突。
- `tests/published-products.test.ts` — view-model 行為不變的回歸驗證；新增 route state → CompactAppState 對應測試。
- `tests/nuxt-smoke.test.ts` — 新增 route 結構、prerender route 清單、query 契約驗證。
- `tests/view-transition.test.ts` — 既有 helper 測試；依 helper 角色調整。
- Playwright smoke 設定與測試 — 擴充 route 導航、直連、not-found、query 還原。

## 介面／資料結構（URL 契約）

本 sprint 不新增 REST / SSE / WebSocket，資料通訊維持 Nuxt Content static data collection 與 static JSON search index。本 sprint 新增的「介面」是 **URL 契約**：

### Route（path）

| Path | 分頁 / 用途 | 對應 view-model `active_tab` |
|------|------------|------------------------------|
| `/` | 首頁 | `home` |
| `/guide` | 指南 | `guide` |
| `/search` | 搜尋 | `search` |
| `/links` | 連結 | `links` |
| `/products/:id` | 商品詳情 | —（獨立詳情頁） |

`:id` = 商品 catalog id（`content/products/<id>.json` 的檔名 stem，等同 `getCatalogProductId(product)`）。

### Query

| 所在 path | Query | 範例 | 語意 |
|-----------|-------|------|------|
| `/` | `category` | `/?category=kitchen` | 首頁分類 chip；省略或 `all` 代表全部 |
| `/guide` | `tags` | `/guide?tags=咖啡,露營` | 多選 tag label，逗號分隔，AND 篩選；省略代表未選；目前 tag 是 Product schema 的自由字串，不是 stable id |
| `/search` | `q` | `/search?q=磨豆機` | 搜尋字串；空字串顯示熱門 tag empty state |

### Query 寫入與 history policy

- 分類 chip 與 guide tag chip 是明確使用者導航，更新 query 時使用 `router.push`，讓瀏覽器上一頁可回到前一個篩選狀態。
- 搜尋輸入是連續文字編輯，輸入過程以 debounce 後的 `router.replace` 寫入 `?q`，避免每個字元污染 history；點熱門 tag 或明確提交搜尋時才可使用 `router.push`。
- 所有 path / query navigation 都由 Nuxt `experimental.viewTransition: true` 接管 same-document view transition；不再用手寫 `runViewTransition` 包 route/query 更新。

### Route state → CompactAppState 對應

view-model 仍吃既有 `CompactAppState`，由 route 推導：

```ts
// 概念示意，非最終簽章
type CompactAppState = {
  active_tab?: 'home' | 'guide' | 'search' | 'links' // 由 path 決定
  home_category_id?: string | 'all'                   // 由 / 的 ?category 決定
  selected_tags?: string[]                            // 由 /guide 的 ?tags 拆解，值為 tag label
  search_query?: string                               // 由 /search 的 ?q 決定
  search_result_ids?: string[] | null                // client search 結果，維持既有機制
}
```

## 邊界案例

- 直連 `/products/<不存在的 id>`：顯示 Nuxt scope 的 not-found 狀態（優先用 `createError({ statusCode: 404 })` 或等價 Nuxt error page 流程），不白屏、不丟未捕捉錯誤；`pnpm generate` 不因未知 id 失敗。
- `/?category=<不存在的 category_id>`：視為無效，退回 `all`（顯示全部），不報錯。
- `/guide?tags=` 含不存在或空白 tag label：過濾掉無效 tag；若過濾後無商品，顯示既有「這組 tag 暫時沒東西」empty state 並可清除。
- `/search?q=` 為空或只有空白：顯示熱門 tag empty state（延續 006 行為）。
- 直連 `/search?q=foo`：static / 首次 render 時 client search index 尚未載入，需 client hydrate 後載入 `/search-index.json` 再回填；載入失敗時 fallback 到 Nuxt Content 已載入商品資料，不白屏。
- `prefers-reduced-motion: reduce`：所有 view transition 退回無動畫的直接切換（含 hero morph 與列表重排）。
- 非 Chrome 或不支援 view transition 的瀏覽器：Nuxt 內建自帶 feature-detect，導航正常、無 morph、不報錯。
- 同頁列表一次重排大量卡片：以 `view-transition-class` 統一 duration（0.2–0.35s）控制成本；必要時僅對視口內 / 鄰近卡片參與 morph，避免一次 morph 過多 snapshot 造成卡頓。
- Safari swipe-back 等 UA 原生手勢轉場：Nuxt 內建 `hasUAVisualTransition` 偵測會 skip 自訂 transition，避免雙重轉場（走內建即免費獲得）。
- 從詳情 `/products/:id` 按瀏覽器上一頁：回到來源 list route 並還原其 query 篩選狀態。

## ADR（Architecture Decision Record）

### ADR 1：商品詳情採獨立 route page，而非 route-driven modal

- 決策：詳情是標準 Nuxt page `app/pages/products/[id].vue`，點商品卡導航過去。
- 原因：以最低成本同時拿到 perma url、可直連、SEO 友善，並讓「卡片圖 ↔ 詳情 hero」用最原生的 same-document 路由 morph；不需引入額外 module 或 nested route 機制。
- 替代方案：route-driven modal（保留桌機「詳情疊在列表上」的 app 感）。排除原因：需引入 Nuxt Pages Plus 或自行實作背景 route + child route，複雜度高；桌機疊加感非本 sprint 必要價值，使用者已選獨立 route page。

### ADR 2：主結構走 path，可選篩選 / 搜尋狀態走 query

- 決策：`/`、`/guide`、`/search`、`/links`、`/products/:id` 走 path；`category`、`tags`、`q` 走 query。
- 原因：path 提供語意化 perma url、SEO 與 Nuxt view transition 的 `(to, from)` 方向性判斷；分類 / tag / 搜尋字串是可組合的可選狀態，適合 query。
- 替代方案：全部狀態做成 path（如 `/home/kitchen`）。排除原因：可組合的篩選會造成 route 爆炸與語意混亂。

### ADR 3：view transition 走 Nuxt 內建 same-document，不採 cross-document

- 決策：`experimental.viewTransition: true`，依賴 Nuxt 內建在 client-side 路由切換時包 `document.startViewTransition`。
- 原因：與 `nitro.preset: 'static'` 完全相容（hydrate 後仍是 SPA 導航），且自帶 reduced-motion 尊重與 `hasUAVisualTransition` 防雙重轉場。
- 替代方案：cross-document（`@view-transition { navigation: auto }`）。排除原因：與內建 same-document 模型互斥，SPA 導航不觸發整頁載入故不生效，且 Firefox 未預設啟用。

### ADR 4：跨頁 hero morph 用穩定唯一 `view-transition-name`，不用 `match-element`

- 決策：商品卡圖與詳情 hero 圖兩端都掛 `view-transition-name: product-image-${id}`（同名）。同頁列表重排沿用同一組唯一 name。
- 原因：`match-element` 只能配對「同頁、同身份」的元素，跨 route 時新舊頁的卡片與 hero 是不同元素、身份不同，無法配對成 morph 對。既有商品 id 可直接當穩定唯一 name，一組命名同時服務「同頁重排位移補間」與「跨頁 hero morph」，比 `match-element` 更可控一致。
- 替代方案：`match-element` 自動命名。排除原因：跨頁失效，且本專案已有穩定 id，自動命名反而失去對 morph 對的控制。

### ADR 5：Chrome-first progressive enhancement，非 Chrome 安全 fallback

- 決策：view transition 的設計與驗收標準以 Chrome 為準；實作一律 feature-detect，不支援者退回直接切換。
- 原因：view transition 本質是 PE，使用者已確認體驗對齊 Chrome 即可，不為 Firefox / Safari 差異（如 types 退回 cross-fade）做額外補償。
- 替代方案：跨瀏覽器一致的自製動畫。排除原因：成本高且偏離 PE 精神，與使用者決策不符。

### ADR 6：抽 `useCatalogData` composable 共用資料載入

- 決策：新增 composable 封裝 products + taxonomies + links 的 `useAsyncData`，供四個 list page 與 detail page 共用。
- 原因：路由化把單一 page 的資料載入變成五個 page 重複；五處重複已達抽象門檻，集中可避免 key 與載入邏輯不一致。
- 替代方案：每個 page 各自 `useAsyncData`。排除原因：重複且易因 `useAsyncData` key 不同步造成 hydration 不一致（006 曾處理過 catalog hydration ordering）。

### ADR 7：static generate 階段 prerender 全部 `/products/:id`

- 決策：`pnpm generate` 時 prerender 所有商品詳情 route。
- 原因：nitro static 需在 build 時產生每個詳情頁 HTML，支撐直連、SEO 與避免首次進入白屏。
- 替代方案：詳情頁 client-only render。排除原因：失去直連 SEO，且首次載入會白屏。
- 備註：透過 Nuxt Content 既有商品清單產生 prerender route 清單（route rules 或 nitro prerender hook），不手動維護路由表。

## Milestones

### Milestone 1：Route 骨架、資料 composable 與導航

> 預期結果：四個分頁成為獨立 route，共用 layout 外殼與 `useCatalogData`；`AppNavigation` 以 `NuxtLink` 導航，切換不重新載入頁面。
> 驗證方式：`pnpm test tests/nuxt-smoke.test.ts tests/published-products.test.ts` 與 Playwright route 導航 smoke。

- [x] 撰寫 / 更新測試（Red）：route 結構存在、四個 path 可達、導航為 client-side（不 full reload）、`aria-current` 正確、route → `CompactAppState` 對應。
- [x] 新增 `app/layouts/default.vue` 抽出 top bar + `AppNavigation` + panel slot。
- [x] 新增 `app/composables/use-catalog-data.ts`，集中 products / taxonomies / links 載入。
- [x] 將 `index.vue` 拆成 `/`（home）、`/guide`、`/search`、`/links` 四個 page，沿用 `getCompactAppView` 純函式。
- [x] `app-navigation.vue` 改 `NuxtLink`，active 由 route 決定。
- [x] Refactor 並確認測試維持通過。

### Milestone 2：商品詳情獨立 route page

> 預期結果：`/products/:id` 可直連 render 完整詳情；未知 id 顯示 not-found；商品卡改導航。
> 驗證方式：`pnpm test tests/nuxt-smoke.test.ts`、`pnpm generate`，Playwright 詳情直連與 not-found smoke。

- [x] 撰寫 / 更新測試（Red）：`/products/:id` 直連 render、未知 id not-found、卡片連結指向正確 path、prerender route 清單含全部商品、generate 不因未知 id 失敗。
- [x] 新增 `app/pages/products/[id].vue`，以 `useCatalogData` + `getProductDetail` 取得詳情；未知 id 走 not-found。
- [x] 將 `product-detail.vue` 從 `UModal` 內容改為 presentational component，供 detail page 使用；移除 fullscreen modal 專用邏輯。
- [x] `product-card.vue` 點擊改導航 `/products/:id`，維持鍵盤可聚焦與 hit target。
- [x] 設定 nitro prerender 全部商品 route。
- [x] Refactor 並確認測試維持通過。

### Milestone 3：篩選 / 搜尋狀態 query 化（perma url）

> 預期結果：首頁分類、指南 tag、搜尋字串都反映在 query，重新整理 / 分享能還原狀態。
> 驗證方式：`pnpm test tests/published-products.test.ts`，Playwright query 還原 smoke。

- [x] 撰寫 / 更新測試（Red）：`?category` / `?tags` / `?q` 與 view-model state 雙向對應、無效值 fallback、reload 還原、搜尋輸入 debounce 後以 `replace` 寫 query 且不逐字污染 history。
- [x] 首頁 category chip 改寫入 / 讀取 `?category`。
- [x] 指南 tag 多選改寫入 / 讀取 `?tags`（逗號分隔的 tag label，過濾無效 tag）。
- [x] 搜尋字串改寫入 / 讀取 `?q`；輸入過程 debounce 後以 `router.replace` 更新 query，client search 由 route query 觸發載入 / 回填。
- [x] Refactor 並確認測試維持通過。

### Milestone 4：View transition 接線與 polish

> 預期結果：列表 → 詳情 hero morph、分類 / tag 切換列表自然重排；reduced-motion 與非 Chrome 安全 fallback。
> 驗證方式：`pnpm test`、`pnpm generate`，Chrome 手動驗收 morph 與重排，Playwright reduced-motion / fallback smoke。

- [x] 撰寫 / 更新測試（Red）：reduced-motion 與不支援環境的 fallback 行為、CSS 契約（hero morph name、列表 group class）。
- [x] `nuxt.config.ts` 啟用 `experimental.viewTransition: true`。
- [x] 詳情 hero 圖補 `view-transition-name: product-image-${id}`，與卡片圖配對 morph。
- [x] 補 `catalog.css`：列表重排 `view-transition-class` group 轉場、reduced-motion 保險絲；調整舊 root-only 規則。
- [x] 視需要新增 `middleware/disable-vue-transitions.global.ts` 避免 Vue transition 衝突。
- [x] 重新定位 / 收斂 `app/utils/view-transition.ts`：route path / query 變更都走 Nuxt 內建 view transition；若沒有非 route local state 轉場需求則移除。
- [x] 以 Chrome 手動驗收 hero morph 與分類 / tag 切換重排；確認非 Chrome 與 reduced-motion 安全 fallback。
- [x] 執行 `pnpm test` 與 `pnpm generate`，更新 `spec.md` Milestones 狀態與 `works.md`，等待使用者確認後才 commit。
