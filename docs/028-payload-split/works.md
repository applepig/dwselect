# 028 Public Payload 拆分 — 工作紀錄

## 範圍

Sprint 028 Milestone 1「Payload 兩層拆分」，一次到位（不中途 commit）。兩層拆分 + prefetch 收斂：

1. 瘦身共用層：`/api/content.json` 移除 `products.details_by_id` / `guides.details_by_id`。
2. per-id detail 層：新增 `/api/products/{id}.json`、`/api/guides/{id}.json`。
3. 麵包屑改用 cards / rows 精簡欄位 lookup。
4. `<NuxtLink>` 全站預設 `prefetchOn: { interaction: true }`（ADR-3）。

實作以 spec Milestone 的 5 個 R→G→R substep 推進；複用既有 `mapProductDetail` / `mapGuideDetail`（未改）、`readPublicContentSource`、`createTaxonomyLabelResolver`、`buildProductRoutes` / `buildGuideRoutes`、`content.json.get.ts` route pattern、`useAsyncData` per-key cache。

## 變更（依檔案）

### 新增

- `scripts/public-payload/build-detail-by-id.ts` — per-id detail builder（薄包裝）。`buildProductDetail(source, id)` / `buildGuideDetail(source, id)`：published-only 過濾，以 `extractContentId` 比對 id，複用既有 mapper；找不到回 `null`（→ route 404）。
- `server/api/products/[id].json.get.ts` — per-id product detail route。比照 `content.json.get.ts`：`getRouterParam(event, 'id')` → `readPublicContentSource()` → `buildProductDetail()`；`null` → `createError({ statusCode: 404 })`。
- `server/api/guides/[id].json.get.ts` — 同上，guide 版。
- `app/utils/fetch-product-detail.ts` — `fetchProductDetail(id)`，universal `$fetch<ProductDetailView>('/api/products/${id}.json')`。
- `app/utils/fetch-guide-detail.ts` — `fetchGuideDetail(id)`，guide 版。

### 修改

- `app/utils/public-content-payload.ts` — `PublicContentPayload` 移除 `products.details_by_id` 與 `guides.details_by_id`；同步移除不再用到的 `GuideDetailView` / `ProductDetailView` import。
- `scripts/public-payload/build-public-content-payload.ts` — 移除 `buildDetailsById` / `buildGuideDetailsById` 與其組裝、相關 import；保留 cards / rows / links / navigation / taxonomies。
- `app/composables/use-product-detail-data.ts` — 改用 `useAsyncData('product-detail-${id}', () => fetchProductDetail(id))`，不再載入整包 payload。
- `app/composables/use-guide-detail-data.ts` — 改用 `useAsyncData('guide-detail-${id}', ...)`。
- `app/composables/use-catalog-shell-data.ts` — 移除 `product_details_by_id` / `guide_details_by_id` reference，改建 `product_breadcrumb_by_id`（id → name/category_id/category_label，取自 cards）與 `guide_breadcrumb_by_id`（id → title，取自 rows）。
- `app/layouts/default.vue` — 麵包屑改讀 `product_breadcrumb_by_id` / `guide_breadcrumb_by_id`；fallback（「商品詳情」/「指南詳情」）與輸出契約不變（logic-only，未動樣式）。
- `nuxt.config.ts` — prerender 加入 `product_detail_json_routes` / `guide_detail_json_routes`（由既有 route builder 推導，published-only 同源，`failOnError` 維持有效）；新增 `experimental.defaults.nuxtLink.prefetchOn: { interaction: true }`。

### 測試（新增 / 更新）

- 新增 `tests/public-payload/build-detail-by-id.test.ts` — per-id builder：單筆 detail、related 只取 published、missing id / unpublished → null（product + guide 各 4 例）。
- 新增 `tests/fetch-detail-helpers.test.ts` — per-id fetch helper 走 universal `$fetch`、route 契約、無 server-only 讀檔。
- 更新 `tests/server-content-routes.test.ts` — payload 不再含 `details_by_id`；新增兩個 per-id route source 斷言（reader + builder + `getRouterParam` + 404）。
- 更新 `tests/public-discovery.test.ts` — 斷言 payload 不含 `details_by_id`；detail 形狀斷言改用 `buildProductDetail`。
- 更新 `tests/public-payload/map-product-detail.test.ts` — `details_by_id assembly` describe 改用 `buildProductDetail`（missing id → null）。
- 更新 `tests/nuxt-smoke.test.ts` — 詳情 composable per-id key、shell breadcrumb lookup、layout lookup 來源；新增 per-id detail JSON prerender 數量斷言與 `prefetchOn: { interaction: true }` 斷言。

未刪除任何既有測試案例（只重寫已過時的斷言內容）。

## Host 檢查結果

- `node_modules/.bin/nuxt prepare` — OK（types generated in .nuxt）。
- `pnpm test`（`vitest run --exclude 'tests/e2e/**'`）— 56 files / 412 passed（baseline 399，+13）。
- `pnpm lint`（`eslint . --max-warnings=0`）— clean。

## Deferred 到 Docker/CI（本 host 無法驗證）

- `pnpm typecheck`（vue-tsc 在此 host MODULE_NOT_FOUND，工具鏈問題，非程式碼）。
- `pnpm generate`（SSG build），完成後檢查：
  - 列表頁（如首頁）的 `_payload.json` 不再含任何商品／指南 detail 內容，體積明顯下降。
  - 每筆 published 商品／指南都有 `/api/products/{id}.json`、`/api/guides/{id}.json` 產物。
  - `failOnError` 對壞 id / 壞 content 仍會讓 generate 以非零碼中止（spec Case 1 / Case 2）。
- `pnpm content:check`（本 sprint 未動 content/，預期不受影響，仍應跑過）。
- `pnpm test:e2e`（需 dev/preview 服務）。
- 實際開頁人工檢查：
  - 首頁可載入；DevTools Network 確認進站時不再自動背景 prefetch 全部站內連結的 payload／chunk（hover/focus 才抓）。
  - 商品詳情頁可載入、只額外 fetch 自己那筆 `/api/products/{id}.json`、麵包屑顯示與現況一致。
  - 指南詳情頁同上（`/api/guides/{id}.json`）。
  - 手打不存在的 detail id → 詳情頁 404（spec Case 1）。

## 風險 / 注意

- per-id route 回 404 時 `$fetch` reject，`useAsyncData` 的 `data` 維持 null，詳情頁既有 `throw createError(404)` 接手——此路徑在 SSR/prerender 下的精確行為（error 是否被 useAsyncData 吞掉成 null）需 generate / E2E 實機確認。
- prefetchOn 設定點採 `experimental.defaults.nuxtLink`（Nuxt runtime 以 `defineNuxtLink(nuxtLinkDefaults)` 套到全站 `<NuxtLink>`，已從 nuxt dist 原始碼確認）；實際 prefetch 行為仍須開頁用 Network 面板驗證。
- **Review 修正（2026-06-25）**：全站 default 的 `prefetchOn` 原誤設為字串 `'interaction'`。Nuxt 4.4.8 的 `NuxtLinkOptions.prefetchOn` 型別為 `Exclude<NuxtLinkProps['prefetchOn'], string>`（排除字串），runtime 全站 default 走 `options.prefetchOn?.[mode]`，字串值會讓 `visibility` / `interaction` 兩個 mode 都讀到 `undefined` → prefetch 完全不觸發（等同全關），且 CI typecheck 報型別錯。已更正為物件 `{ interaction: true }`：關閉 visibility 自動預抓、開啟 interaction（hover/focus）預抓，符合 ADR-3 意圖。

## 驗收修正（2026-06-25，Blocking bug）

獨立驗證 generate 時抓到一個會讓 `pnpm generate` 全滅的 blocking bug，原實作只跑 unit test／lint 就把 generate「deferred 到 Docker/CI」，從未實跑，故漏掉。

- **症狀**：`pnpm generate` 在 prerender per-id detail route 階段，**每一筆** `/api/products/{id}.json`、`/api/guides/{id}.json` 都回 404 → `failOnError` 中止 build。
- **根因**：route handler 用 `getRouterParam(event, 'id')` 取 id，但此專案的 h3 1.15.11 / rou3 0.8.1 把檔名 token `[id].json` 整段解析成**單一 param `id.json`**（值含副檔名），`getRouterParam(event, 'id')` 回 `undefined`。實測 debug：`params = {"id.json":"<id>.json"}`。builder 本身正確（plain node 直接呼叫 OK），route 註冊也對（`/api/products/:id.json`）。
- **修法**：兩個 route 改用 `decodeURIComponent(extractContentId(event.path))` 由 `event.path` 末段去副檔名還原 id（與 detail 頁 route builder 同一套 id 推導）；`decodeURIComponent` 處理 dev 模式瀏覽器對 CJK guide id 的百分比編碼（prerender 走原始 unicode，no-op）。
- **測試漏洞與補強**：原 route 測試全是原始碼字串斷言（連 `getRouterParam(event, 'id')` 這行 bug 都斷言進去），從未透過 router 實跑。新增 `tests/server/detail-route-id-resolution.test.ts`，以 nitro 實際 request path（ascii／原始 unicode／百分比編碼 CJK／不存在 id）驗 id 還原與 builder 串接；更新 `tests/server-content-routes.test.ts` 的兩條過時斷言為 `extractContentId(event.path)`。

### 驗證結果（2026-06-25）

- `pnpm test` 416 passed（+4）、`pnpm lint`、`pnpm typecheck`、`pnpm content:check` 全綠。
- Node 22 容器 `pnpm generate`：per-id detail route 全數產出（71 product + 11 guide JSON，含 CJK `日本米入門篇`），各為單一 detail；`content.json` 瘦身 56K、無 `details_by_id`。
- dev 模式容器（指向本 worktree）開頁：首頁／商品詳情／CJK 指南詳情／detail JSON route 全 200，不存在 id → 404，麵包屑顯示真實 category＋名稱（走新 lookup）。
- **環境限制**：本機 `pnpm generate` 的 HTML 頁 prerender 因 `#internal/nuxt/paths` 全 500（host Node 24 與 Docker Node 22、committed HEAD 皆同，與 028 無關，屬 toolchain）。故「列表頁 `_payload.json` 瘦身」與「首頁不自動 prefetch」需 CI generate 或瀏覽器 DevTools 確認，本機未能驗。
