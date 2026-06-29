# 028 Public Payload 拆分 — 工作紀錄

## 範圍

Sprint 028 Milestone 1「Payload 兩層拆分」，一次到位（不中途 commit）。兩層拆分 + prefetch 收斂：

1. 瘦身共用層：`/api/content.json` 移除 `products.details_by_id` / `guides.details_by_id`。
2. per-id detail 層：新增 `/api/products/{id}.json`、`/api/guides/{id}.json`。
3. 麵包屑改用 cards / rows 精簡欄位 lookup。
4. `<NuxtLink>` 全站預設 `prefetchOn: { interaction: true, visibility: false }`（ADR-3）。

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
- `app/utils/breadcrumb/resolve-breadcrumb-items.ts` — `BreadcrumbShellData` 與 `resolveProductBreadcrumb` / `resolveGuideBreadcrumb` 改讀 `product_breadcrumb_by_id` / `guide_breadcrumb_by_id`（原 `*_details_by_id`）；fallback（「商品詳情」/「指南詳情」）與輸出契約不變（logic-only，未動樣式）。`app/layouts/default.vue` **未修改**——它本就委派 `resolveBreadcrumbItems(route.path, route.query, catalog_shell_data)`，麵包屑落點在此 helper，不在 layout（早期紀錄誤寫為 default.vue，已更正）。
- `nuxt.config.ts` — prerender 加入 `product_detail_json_routes` / `guide_detail_json_routes`（由既有 route builder 推導，published-only 同源，`failOnError` 維持有效）；新增 `experimental.defaults.nuxtLink.prefetchOn: { interaction: true, visibility: false }`。

### 測試（新增 / 更新）

- 新增 `tests/public-payload/build-detail-by-id.test.ts` — per-id builder：單筆 detail、related 只取 published、missing id / unpublished → null（product + guide 各 4 例）。
- 新增 `tests/fetch-detail-helpers.test.ts` — per-id fetch helper 走 universal `$fetch`、route 契約、無 server-only 讀檔。
- 更新 `tests/server-content-routes.test.ts` — payload 不再含 `details_by_id`；新增兩個 per-id route source 斷言（reader + builder + `getRouterParam` + 404）。
- 更新 `tests/public-discovery.test.ts` — 斷言 payload 不含 `details_by_id`；detail 形狀斷言改用 `buildProductDetail`。
- 更新 `tests/public-payload/map-product-detail.test.ts` — `details_by_id assembly` describe 改用 `buildProductDetail`（missing id → null）。
- 更新 `tests/nuxt-smoke.test.ts` — 詳情 composable per-id key、shell breadcrumb lookup、layout lookup 來源；新增 per-id detail JSON prerender 數量斷言與 `prefetchOn: { interaction: true, visibility: false }` 斷言。

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
- **Review 修正（2026-06-25）**：全站 default 的 `prefetchOn` 原誤設為字串 `'interaction'`。Nuxt 4.4.8 的 `NuxtLinkOptions.prefetchOn` 型別為 `Exclude<NuxtLinkProps['prefetchOn'], string>`（排除字串），runtime 全站 default 走 `options.prefetchOn?.[mode]`，字串值會讓 `visibility` / `interaction` 兩個 mode 都讀到 `undefined` → prefetch 完全不觸發（等同全關），且 CI typecheck 報型別錯。當時更正為物件 `{ interaction: true }`，但後續驗收發現此寫法仍會被 Nuxt defaults merge 補回 `visibility: true`；已於 2026-06-26 再修為 `{ interaction: true, visibility: false }`。

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

## 驗收修正（2026-06-26，NuxtLink defaults merge）

- **症狀**：`nuxt.config.ts` 設定 `experimental.defaults.nuxtLink.prefetchOn: { interaction: true }` 後，Nuxt 4.4.8 resolved config / build template 仍變成 `prefetchOn: { interaction: true, visibility: true }`，首頁初載仍會 visibility prefetch 多個站內連結 `_payload.json` / chunk，違反 AC「全站預設 interaction-only、首頁不再自動背景 prefetch 全部站內連結 payload/chunk」。
- **根因**：Nuxt 會把專案 `experimental.defaults.nuxtLink.prefetchOn` 與內建 defaults 做物件 merge；只宣告 `{ interaction: true }` 不會覆蓋內建 `visibility: true`，所以 build 產物的 `#build/nuxt.config.mjs` / runtime `nuxtLinkDefaults` 仍保留 visibility prefetch。
- **修法**：production config 明確設定 `prefetchOn: { interaction: true, visibility: false }`，讓 merge 後的 resolved defaults 仍為 interaction-only。
- **測試補強**：`tests/nuxt-smoke.test.ts` 不再只斷言 source config；新增 `loadNuxt({ dev: false, ready: false })` resolved config 斷言，要求 `nuxt.options.experimental.defaults.nuxtLink.prefetchOn` 等於 `{ interaction: true, visibility: false }`，可抓出 Nuxt defaults merge 把 `visibility` 補回 `true` 的問題。
- **驗證結果**：Red phase `pnpm test tests/nuxt-smoke.test.ts` 先失敗於缺少 `visibility: false`；修正後同命令 37 passed。另跑 `pnpm lint`、`pnpm typecheck`，皆無錯誤。
- **當時未跑項目**：此輪一開始未跑 `pnpm generate`，原因是工作區已有使用者／其他 agent 修改的 `public/rss.xml`、`public/sitemap.xml`，而 `pnpm generate` 會先執行 `build:public-discovery` 並可能改寫這些非本任務檔案。後續已在下一節補上 Docker build mode generate 與 bundle 片段驗證。

## 驗收修正（2026-06-26，Docker generate ownership）

- **症狀**：host 跑 `pnpm generate` 時遇到 `EACCES: permission denied, unlink '.output/nitro.json'`；檢查發現 host `.output` / `.output/nitro.json` 為 `root:root`。後續改用 build mode container 跑 generate 時又遇到 `EBUSY: resource busy or locked, rmdir '/app/.output'`。
- **根因**：`docker-entrypoint.sh` 以 root 執行 `pnpm generate && pnpm preview`，且 compose bind-mount 專案到 `/app`，導致 container 產出的 `.output` 可能直接落在 host workspace 並成為 root-owned。另一方面，compose 同時把 `/app/.output` 宣告成 Docker volume mountpoint，Nuxt generate 需要重建 `.output` 時無法刪除 mountpoint，因此出現 EBUSY。
- **修法**：把 runtime command 分流集中到 `dev.sh`：`pnpm dev` → `./dev.sh dev`，本機 host `pnpm generate` 不再作為日常入口，避免誤以為需要在 dev mode 手動 generate。dev mode 走 HMR；build mode 只在 Docker app service 啟動時，由 container PID 1 依 008.7 既有 lifecycle 自行執行 generate + preview。container 內的 build mode 才跑 `pnpm build:public-discovery`、`node scripts/assert-content-images.ts`、`pnpm exec nuxt generate`；CI 若需要 host runner 直接產 artifact，必須明確設定 `DWSELECT_ALLOW_HOST_GENERATE=1`。`docker-entrypoint.sh` 只委派到 `dev.sh entrypoint`；entrypoint 若是 root，先 `chown` runtime dirs 後用 `su-exec node` 降權再執行。`Dockerfile` 補 `bash`（供 `dev.sh` shebang）與 `su-exec`。`docker-compose.yml` 移除 `/app/.output` volume，讓 `.output` 是可刪建的 project bind-mount 目錄。
- **測試補強**：`tests/dev-server-script.test.ts` 改成行為測試，而非 source string 斷言：用 fake `docker` / `pnpm` / `nuxt` 驗證 host `./dev.sh generate` 會拒絕直接 generate、不跑 Docker 或 host Nuxt；host `./dev.sh dev` 會以 `NUXT_MODE=dev` recreate service；用 fake `pnpm` / `node` 驗證 container generate 與 CI opt-in 會跑真正 pipeline；用 fake `id` / `chown` / `su-exec` 驗證 root entrypoint 先降權再跑 project command。
- **實機驗證**：修回既有 `.output` ownership 為 `applepig:applepig`；`docker compose build app && docker compose up -d --force-recreate app` 後，build mode container 完成 generate 並進入 `pnpm preview`，process user 為 `node`；host `.output`、`.output/nitro.json`、`.output/public/api/content.json` 皆維持 `applepig:applepig`。產物檢查：`content.json` 61,635 bytes、無 `details_by_id`、71 product JSON、11 guide JSON；client bundle `nuxtLinkDefaults` 為 `prefetchOn:{interaction:!0,visibility:!1}`。
- **驗證結果**：`pnpm test` 73 files / 535 passed、`pnpm lint`、`pnpm typecheck`、`pnpm content:check`、`node scripts/assert-runtime-google-sheet-clean.ts` 全通過。build preview 實際打開首頁與商品詳情頁成功：首頁 71 張商品卡；`/products/2026-06-02-apple-homepod-large` 顯示詳情與 breadcrumb `DW嚴選>影音劇院>HomePod（第 2 代）`。2026-06-26 追加 `agent-browser` 驗證：首頁 `/api/content.json` 不含 `details_by_id` / `llm_description`，首頁初載未觀察到 `/api/products/` 或 `/api/guides/` detail JSON visibility prefetch；`/api/products/2026-06-02-apple-homepod-large.json` 回 200 且含 `llm_description`；mobile viewport 390×844 首頁可載入並顯示 71 個商品連結與 mobile nav。

## xreview 後續：E2E 測試債修復（2026-06-26）

xreview 抓到 AC41「E2E 全綠」未達成：實跑 `pnpm test:e2e` 為 41 passed / 14 skipped / **20 failed**。

- **歸屬釐清（非 s28 造成）**：`rg details_by_id app/ server/` 為零——runtime 無任何 code 依賴被瘦身掉的欄位；taxonomy/search/list 頁全走 `fetchPublicContentPayload` 讀 cards/rows/links/navigation/taxonomies（s28 原封保留）。唯一 E2E 檔 `tests/e2e/compact-app.spec.ts` 最後修改在 c5e737c（027 taxonomy），s28 commit cefab14 未碰。20 個失敗實際訊息確認為兩類：(A) 斷言寫死當下內容（network 分類卡數寫死 2、搜 Sharp 期望英文品名、popular count 門檻、`Panasonic 6`、detail tag pill nth(1)、guide row 必有圖），被內容成長打破；(B) 027 taxonomy 行為已改、斷言過時（popular tag 與 detail tag pill 改深連 `/tag/{id}`、channel pill 深連 `/channel/`、taxonomy 頁標題移至 layout breadcrumb）。s28 功能性 E2E（`:51` shell、`:293` 詳情+related 3+breadcrumb、`:371` 直連 route+404、`:310` 圖片 fallback）全綠，per-id 拆分核心路徑無回歸。
- **修法**：派 `ddd-developer`（sonnet）只改 `tests/e2e/compact-app.spec.ts`，把斷言由「內容快照」改為「結構／契約」：數量類改驗版面契約並對齊真實常數（`POPULAR_TAG_MIN_COUNT=3`）；027 行為類更新為實際 taxonomy 深連與 breadcrumb 標題契約；guide row 媒體槽改 `img`/`fallback-icon` 擇一；順帶移除一條 027 前就失效的舊斷言（guide row 被當 external `target="_blank"`，實為 internal link）。`:105` tablet 因 Vue `mode="out-in"` transition 競態而 flaky，改用明確 settle 訊號（`.home-results` 無 `-active` class 且 grid 卡數等於 active chip 的 `.chip-count`，UI 衍生非寫死）。
- **驗證結果**：整檔 `pnpm exec playwright test` **61 passed / 0 failed / 14 skipped**（skipped 為 viewport 條件 skip，正常）；原 flaky 條 `--repeat-each` 壓測累計 19+ 次連綠。未改任何 production code、未動既有 passing 測試。AC41 E2E 條件達成。

## xreview 後續：文件 SSOT 更正（2026-06-26）

- **README build preview 指令**：`README.md` 與 `dev.sh` cmd_generate hint 原寫 `NUXT_MODE=build ./dev.sh restart`，但 `cmd_restart` 只 `docker compose restart`，不 recreate 也不套用 `NUXT_MODE`。兩處改為 `NUXT_MODE=build docker compose up -d --force-recreate app`（即 `cmd_start_mode` 內部實作；`dev-server-script.test.ts` 未斷言此 hint，無測試影響）。
- **breadcrumb 落點**：本檔與 spec 早期誤記 028 改了 `app/layouts/default.vue`，實際 `default.vue` 未動（本就委派 `resolveBreadcrumbItems`）；真實落點為 `app/utils/breadcrumb/resolve-breadcrumb-items.ts`（lookup 欄位 `*_details_by_id`→`*_breadcrumb_by_id`）＋ `use-catalog-shell-data.ts`（建 lookup）。works.md 變更清單與 spec「相關檔案」/Milestone 已更正。

## xreview 修正（2026-06-26，027+028 複驗）

第二輪 cross review（claude:opus + codex:gpt-5.5；gemini:pro 因 `IneligibleTierError` 環境問題失敗）抓到 0 Critical、4 Important、4 Minor，全經 coordinator 讀碼驗證、無 False Positive，使用者逐條決策後派 `ddd-developer` 以 TDD 一次修復。本機 `pnpm test` 547 passed（baseline 535，+12）、`pnpm lint` clean（coordinator 親跑複驗）。

### xreview 修正（028 相關）

- **[Important] channel_id 參照完整性缺口**：`validateContentTaxonomyReferences`（`app/utils/product-schema.ts`）原只驗 category/tag，不驗 `offers[].channel_id`；但 `build-channel-routes` 無條件把所有 offer 引用的 channel 變 prerender 路由，typo channel 經 namespace guard→404→`failOnError` 中止整個 generate，而 content:check 放行、本機 generate 跑不動 → 零偵測。修法：validator 新增 `channels` 入參與 `offers[].channel_id ∈ channels.json` 驗證（field `'channel_id'`），`content-taxonomy-references.test.ts`／`product-schema.test.ts` 補 red 斷言；真實 content 仍 0 violation。→ 綠。
- **[Important] per-id route handler 從未被實際 request 執行**：原 `detail-route-id-resolution.test.ts`／`server-content-routes.test.ts` 只 `toContain` 原始碼字串＋測試內複製 id 還原邏輯，handler 本體（`decodeURIComponent(extractContentId(event.path))`→builder→`createError(404)`）從未跑——與 028 第一版 generate 全 404 同款覆蓋漏洞。修法：新增 `tests/server/detail-route-handler.test.ts`，stub nitro 全域（`defineEventHandler`/`createError`/`setHeader`）後動態 import 真 route、帶 `event.path` 呼叫 default handler，product/guide 各覆蓋「published id→200 還原」「不存在→throw 404」；E2E `compact-app.spec.ts` 加 network assertion（首頁初載無 detail prefetch、導航時請求對應 `/api/{products,guides}/{id}.json`，**執行 deferred 需 dev/preview 服務**）。既有測試未刪。→ 綠。
- **[Important] 028 spec SSOT 仍記 `prefetchOn: 'interaction'` 字串形式**：spec line 14/40 等改為 `{ interaction: true, visibility: false }` 並補註記（字串不可用、需顯式 visibility:false 對抗 defaults merge）；實作 `nuxt.config.ts:79` 本就正確、未動。
- **[Important] dev.sh restart 不套用 NUXT_MODE**：`AGENTS.md:21` 的 `NUXT_MODE=build ./dev.sh restart` 因 `cmd_restart` 只 `docker compose restart`（不 recreate、不注入 mode）而無效。依使用者裁決「修 restart 行為」：`cmd_restart` 改為 `NUXT_MODE` 有值時走 `cmd_start_mode`（`--force-recreate` + 套 mode），未設定維持輕量 restart；`tests/dev-server-script.test.ts` 補兩條 fake-docker 行為測試。AGENTS/README/dev.sh hint 三處對齊為 `NUXT_MODE=build ./dev.sh restart`（推翻 2026-06-26 早前改用 explicit compose 指令的決定）。→ 綠。
- **[Minor] chown uid==1000 假設**：`cmd_entrypoint` 的 `chown -R node:node` 隱含 host uid==container node uid(1000)；加 Why 註解＋README 提醒（行為不變）。
- **[Minor] extractContentId 遇 query string 失效**：`extract-content-id.ts` 取末段後先切 `?` 再去 `.json`（dev fetch 帶 query 不再誤 404，prerender 無 query 不受影響）；`extract-content-id.test.ts` 補 query 案例。→ 綠。

### Deferred（Docker gate，本機 toolchain 跑不動）

`pnpm typecheck`／`content:check`／`generate`／`test:e2e`。風險低：#1 把 `channels` 改為 required input，唯一呼叫者是測試（無 production caller）；#4 (b) E2E 依既有 Playwright pattern 撰寫，lint 已過語法。

## PR #9 Codex inline review P2 修正（2026-06-27）

- **OG image local content path 破圖**：`getOgImageUrl()` 對 `/products/images/...`、`/guides/images/...`（含無 leading slash 與前後空白）改回 `SITE_OG_IMAGE`，避免 SSG 未輸出的 source path 進入 OG metadata；外部 `http(s)` 圖片與非 content relative path 行為維持不變。測試：`tests/seo-metadata.test.ts`。
- **Guide search result 導向舊外部來源**：guide search document 改為 `href: /guide/{id}`、`external: false`；link document 仍維持外部 URL。測試：`tests/search-index.test.ts`。
- **Sitemap 缺 guide detail pages**：`build-public-discovery` 將 published guides 加入 sitemap，URL 為 `/guide/{id}`，`lastmod` 取 `guide.updated_at`；draft guide 不輸出。測試：`tests/public-discovery.test.ts`。
- **`dev.sh test` 未 forwarding args**：`cmd_test "$@"` 保留 `--exclude 'tests/e2e/**'` 並追加剩餘參數，case dispatch 對 `test` 先 `shift` 再傳入。測試：`tests/dev-server-script.test.ts` fake pnpm 驗證 `./dev.sh test tests/product-schema.test.ts --runInBand` 參數完整傳到 Vitest。

### 驗證結果（2026-06-27）

- Red phase：`pnpm exec vitest run --exclude 'tests/e2e/**' tests/seo-metadata.test.ts tests/search-index.test.ts tests/public-discovery.test.ts tests/dev-server-script.test.ts` → 4 files failed / 7 tests failed（對應四項 P2）。
- Green phase：同命令 → 4 files / 61 tests passed。
- 最終指定入口驗證：`pnpm test tests/seo-metadata.test.ts tests/search-index.test.ts tests/public-discovery.test.ts tests/dev-server-script.test.ts` → 4 files / 61 tests passed。
