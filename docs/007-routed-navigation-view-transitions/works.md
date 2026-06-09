# Works：Sprint 007 Routed Navigation 與 View Transition

## 2026-06-08

### Red

- 更新 `tests/published-products.test.ts`，新增 route path / query → `CompactAppState` 契約測試，覆蓋 `/`、`/guide`、`/search`、`/links`、invalid category fallback、tag label 過濾與 search query trim。
- 更新 `tests/nuxt-smoke.test.ts`，把 006 的 button tab / modal source smoke 改成 007 的 route page、`useCatalogData`、`NuxtLink` navigation、detail route、prerender route 與 view transition CSS 契約。
- 重寫 `tests/view-transition.test.ts`，不再測舊 `runViewTransition` helper，改測 Nuxt `experimental.viewTransition`、route code 不引用 helper、hero name / card group / reduced-motion CSS。
- 更新 `tests/e2e/compact-app.spec.ts`，覆蓋四 route 導航、商品詳情 navigation、商品詳情直連、unknown id not-found、query 還原、phone / tablet / desktop navigation。
- Red 驗證：`pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts tests/view-transition.test.ts` 預期失敗 14 tests，失敗點集中在缺 route pages、缺 composable、缺 route-state helper、navigation 仍是 button、detail 仍是 modal、Nuxt view transition 未啟用。

### Green

- `nuxt.config.ts` 啟用 `experimental.viewTransition: true`，並以 `content/products/*.json` 產生 `/products/:id` prerender route；四個主要分頁也列入 prerender。
- 新增 `app/composables/use-catalog-data.ts`，集中 products / categories / channels / links 的 Nuxt Content 載入。實作時修正 Nuxt composable context 問題：先同步建立所有 `useAsyncData` request，再 `Promise.all`，避免連續 `await useAsyncData` 造成 SSR / prerender 500。
- 新增 `app/layouts/default.vue`，抽出 compact app shell、top bar、`AppNavigation`、product count 與 theme toggle。`app/app.vue` 改為 `<NuxtLayout><NuxtPage /></NuxtLayout>`，確保 layout 實際 render。
- 將 `app/pages/index.vue` 拆成首頁 route，只處理 `?category=` 與首頁列表；新增 `guide.vue`、`search.vue`、`links.vue`、`products/[id].vue`。
- `app/components/app-navigation.vue` 改用 `NuxtLink`，active / `aria-current="page"` 由 route 決定。
- `app/components/product-card.vue` 改成連到 `/products/:id` 的 keyboard-focusable link，保留卡片與圖片 view transition name。
- `app/components/product-detail.vue` 移除 `UModal`，改為 detail page 使用的 presentational component；`products/[id].vue` 找不到商品時丟 Nuxt 404。
- `app/utils/published-products.ts` 新增 `getCompactAppStateFromRoute` 與 query parser，既有 `getCompactAppView` 對外行為維持不變。
- `app/assets/styles/catalog.css` 補 `product-card` view transition group、shared hero reduced-motion fallback、detail page 樣式與 link focus style。
- 移除未使用的 `app/utils/view-transition.ts`；route path / query navigation 全部交給 Nuxt 內建 same-document view transition。

### 修正紀錄

- `pnpm generate` 初次在 prerender 全 route 500。根因是 `useCatalogData` 內部連續 await Nuxt composable，第一個 await 後 Nuxt instance context 遺失。改成同步建立所有 request 後再 `Promise.all` 解決。
- detail route 初版在資料尚未 ready 時傳 `undefined` 給 `ProductDetail`。改成在 setup 中以已載入的 `all_products.value` 建立同步 `product`，找不到時直接 `createError({ statusCode: 404 })`。
- 使用者實機回報 product detail / route navigation 偶發 `500 Internal Server Error`，訊息為 `useHead() was called without provide context`。初步修正先處理 `products/[id].vue` 在 `await useCatalogData()` 後才呼叫 `useHead()` 的同類風險：新增 `tests/nuxt-smoke.test.ts` regression test，確認 `useHead()` 必須早於第一個 top-level `await useCatalogData()`，再將 `useHead()` 移到同步 setup 區段，以 `shallowRef` 承接載入後的 product / taxonomy，並在 template 用 `v-if` 避免 detail 初始 null。
- 後續使用者提供的完整 stack trace 確認 recurring `useHead()` 根因在 `@nuxt/ui/dist/runtime/plugins/colors.js`，不是 product detail page。Nuxt UI colors runtime plugin 在 client plugin 套用期間呼叫 `useHead()`，偶發缺少 head provide context。新增 `tests/nuxt-smoke.test.ts` regression test，確認 `nuxt.config.ts` 透過 `app:resolve` 移除 `runtime/plugins/colors`，並在 `app/assets/styles/variables.css` 補齊靜態 `--ui-color-*` 與 light / dark `--ui-*` token，保留 Nuxt UI 元件色彩變數但避開 runtime `useHead()` 路徑。
- `pnpm generate` 執行期間曾讓使用者看到 `null is not an object (evaluating 'currentRenderingInstance.ce')` 的 hydration error。判斷是 dev server / agent browser 還開著時 generate 重寫 `.nuxt` / build cache，造成瀏覽器拿到混合 client / server bundle；generate 完成後已完整重啟 dev server 與 agent-browser，未再重現。
- E2E 初版 selector 過寬：404 page 與多張 search result card 造成 strict mode violation，phone navigation 也需要鎖定 bottom tabs。收斂 selector 後通過。
- `pnpm generate` 會更新 `public/search-index.json` 的 `generated_at`；因內容未變，已還原 timestamp diff，避免無關 generated churn。

### 驗收

- `pnpm vitest run tests/nuxt-smoke.test.ts`：20 tests passed，含 product detail `useHead()` async context regression test 與 Nuxt UI colors plugin 移除 regression test。
- `pnpm test`：12 test files、106 tests passed。
- `pnpm generate`：成功 build search index（66 documents）並 prerender 146 routes，含 `/`、`/guide`、`/search`、`/links` 與全部 `/products/:id`。
- `.nuxt` plugin 掃描：`runtime/plugins/colors` / `nuxt-ui-colors` 不存在，結果為 `colors-plugin-absent`。
- `curl -k https://dwselect.toybox.local/`：`200`，remote / local 皆為 `10.0.4.105`，body 無 `Internal Server Error`、`useHead()`、`currentRenderingInstance` 或 `nuxt-ui-colors`。
- fresh agent-browser 以 `--ignore-https-errors` 直接連 `https://dwselect.toybox.local/`：首頁等待 30 秒後仍正常，無 `Internal Server Error`、`useHead()`、`currentRenderingInstance`，DOM 無 `#nuxt-ui-colors`，`.compact-app-shell` 存在。
- fresh agent-browser 直連 `/products/2026-06-02-blueair-3250空氣清淨機`：等待 10 秒後正常顯示詳情頁，無 `Internal Server Error`、`useHead()`、`currentRenderingInstance`，DOM 無 `#nuxt-ui-colors`。
- `pnpm test:e2e`：16 passed、2 skipped（wide desktop canvas test 只在 desktop project 執行，phone / tablet 為預期 skip）。
- `https://dwselect.toybox.local/products/2026-06-02-blueair-3250空氣清淨機`：GET 回 `200`，title 為 `Blueair 3250空氣清淨機｜DW嚴選`，body 無 `Internal Server Error` 或 `useHead()`。
- Chrome / Chromium E2E 已覆蓋 phone、tablet、desktop breakpoint、route navigation、detail direct route、unknown id not-found 與 query restore。
- Chromium transition contract 驗證：`document.startViewTransition` 存在；卡片圖與詳情 hero 的 `view-transition-name` 同名；card group class 為 `product-card`；`prefers-reduced-motion: reduce` 下 card / image transition name 皆為 `none`。

### Cross Review 與修正

- 跑 `/ddd.xreview`，三模型平行審查未提交的 007 變更（claude:opus、codex:gpt-5.5、gemini:pro）。共識：核心 route 化、URL query 契約、hero morph 配對、reduced-motion fallback 與 spec 一致，品質高、無 Critical。claude:opus 額外抓到三個 Important，coordinator 逐一讀程式碼驗證後採納兩項、消解一項。
- **修正 1：prerender 路由改 published 同源（根治 generate landmine）**。原 `nuxt.config.ts` 用 `readdirSync` 列全部 `content/products/*.json`，不分 status；但 detail 只取 `status==='published'`、非 published 商品 `throw createError(404)`。現況 66/66 published happy path 過關，但新增任一 draft/archived 商品時 `pnpm generate` 會把它排進 prerender 撞 404 使 build 失敗，且違反 tasks.md 第 50 行「prerender 清單包含全部 published 商品」契約。抽出純函式 `scripts/build-product-routes.ts::buildProductRoutes()`（讀檔→過濾 published→組 route），nuxt.config 改用之；新增 `tests/build-product-routes.test.ts` 4 案例（含「非 published 不入清單」回歸）。
- **修正 2：tag query 逗號硬化**。`guide.vue` 原本 `query: { tags: tags.join(',') }`、parser 用逗號 split，tag label 含逗號會 round-trip 拆錯。改用 Vue Router 原生 array query（重複 param `?tags=a&tags=b`）：寫入端傳 array，`published-products.ts::parseSelectedTags` 移除 `split(',')` 改為每個 query value 即一個完整 tag，接受 `string | string[]`。`tests/published-products.test.ts` 新增 3 案例（單 tag/多 tag/含逗號 round-trip），既有逗號契約測試更新為 array-native 形態。
- **修正 3：還原 colors plugin workaround**。先前用 `app:resolve` hook 過濾掉 Nuxt UI `runtime/plugins/colors` plugin、並在 `variables.css` 手抄 `@layer theme` 的 `--ui-*` token，是為了壓制 client 階段 `useHead() without provide context` 偶發 500。Coordinator 查明該錯真因是「同目錄跑兩個 dev server 互相覆蓋 Vite 快取、汙染模組圖」（見前述 `currentRenderingInstance.ce` 條目），colors.js 只是最早呼叫 `useHead()` 的受害者而非真兇。環境清理後（單一 dev server、清快取）還原 workaround：移除 `app:resolve` hook 與 `@layer theme` token block，移除 `nuxt-smoke.test.ts` 中斷言此 workaround 存在的測試（`[id].vue` 的「useHead 早於 top-level await」測試屬另一正當修正，保留）。
  - 還原後 `pnpm generate` 乾淨通過、無 `useHead`/`currentRenderingInstance`/`without provide context`，確認 workaround 不再需要。
  - **更正先前驗收條件**：上方第 41–44、46 行那些「`#nuxt-ui-colors` 不存在 / `colors-plugin-absent`」的成功條件，是當時拔掉 plugin 才成立的。還原後 Nuxt UI colors plugin 恢復正常運作、會正常注入 `#nuxt-ui-colors` style 元素，因此該元素「存在」才是正確狀態，舊條件已不適用。
- **延後項目（→ sprint 008）**：reviewer 另提 tag 應改用 stable id（現為 free-string label）。因 tag 目前無 id、需新建 tag taxonomy + schema + 資料遷移 + UI 對應，屬獨立 sprint 份量，另開 008 經 /ddd.plan 規劃，不併入本次。
- 驗收：`pnpm test` 13 檔 112 全綠；`pnpm generate` 成功 prerender 146 routes；實機 `https://dwselect.toybox.local/` 與商品詳情頁皆 HTTP 200、無錯誤關鍵字。

### 2026-06-09 dev hydration 事故復盤

- 症狀：使用者回報 `500 Internal Server Error`，訊息為 `useHead() was called without provide context`，stack 指到 `@nuxt/ui/dist/runtime/plugins/colors.js:55`。
- flow：`colors.js` 經 `#imports` 實際 import Nuxt wrapper `nuxt/dist/app/composables/head.js`，而不是直接 import `@unhead/vue`；client plugin list 中 `nuxt:head` 也早於 Nuxt UI colors plugin。`colors.js` 是 dev app initialization 失去 head provide context 時第一個爆炸的位置，不代表應直接修改 Nuxt UI colors production code。
- 定位：同時看到 browser console 有 Vite connection lost / reconnect 與 `currentRenderingInstance.ce` hydration mismatch；host 上曾存在本 repo dev server 與 `/app` 容器 dev server 兩組 Nuxt process。`pnpm generate` 在未改 code 狀態下可完整通過，表示 production prerender flow 不穩定重現此錯。
- 處置：未改 `nuxt.config.ts`、未移除 Nuxt UI colors plugin；經使用者確認後，只重啟 cwd 為 `/home/applepig/Dropbox/projects/dwselect` 且 listen `:3000` / `:24678` 的本 repo dev server，保留 `/app` 容器 process 不動。
- 驗證：重啟後 host 上只有本 repo dev server listen `0.0.0.0:3000` 與 HMR `:24678`；browser fresh reload 首頁無 `Internal Server Error` / `useHead()`，`.compact-app-shell` 存在、`.product-card` 62 張、`#nuxt-ui-colors` 正常存在；直連 `/products/2026-06-02-blueair-3250空氣清淨機` 無錯誤且 `.product-detail-page` 存在。

### 2026-06-09 Nuxt 4.4.8 head runtime hotfix

- 症狀：使用者瀏覽器在重啟 dev server 後仍可看到同一個 `useHead() was called without provide context`，stack 仍指向 `@nuxt/ui/dist/runtime/plugins/colors.js`。這代表單純清 dev server / Vite cache 不是完整修復。
- upstream：查到 `nuxt/ui#5229`（`Safari: useHead() was called without provide context`）描述同一 stack，原回報在 Safari / iOS Safari，comments 也有人在 Chrome 遇到並指出 cache 清除可暫解。該 issue 因 stale 關閉，沒有 Nuxt UI 正式 patch。`@nuxt/ui` 最新仍是 `4.8.2`。
- 根因：本 repo lockfile 安裝 `nuxt@4.4.7`，其 `package.json` direct dependency 是 `unhead: ^3.1.1`；但 Nuxt runtime 與 Nuxt UI colors plugin 仍解析 `@unhead/vue@2.1.15` / `unhead@2.1.15`。Nuxt `4.4.8` release note 明確包含「Revert unhead dependency back to v2」，正好對應這個 head runtime version mismatch。
- Red：新增 `tests/nuxt-smoke.test.ts` regression guard，確認 Nuxt direct `unhead` dependency 必須維持 v2。升級前 `pnpm test tests/nuxt-smoke.test.ts` 失敗：收到 `^3.1.1`，預期 `/^\^?2\./`。
- Green：執行 `pnpm add nuxt@^4.4.8`，更新 `package.json` 與 `pnpm-lock.yaml`；未 patch `node_modules`，未移除 Nuxt UI colors plugin。升級後 `pnpm why unhead` 顯示 Nuxt、Nitro、Nuxt UI 全部收斂到 `unhead@2.1.15`。
- 驗證：`pnpm test tests/nuxt-smoke.test.ts`：22 passed；`pnpm test`：13 files、125 tests passed；`pnpm generate`：成功 build search index（67 documents）並 prerender 140 routes；`node scripts/assert-runtime-google-sheet-clean.ts`：無輸出，通過。
- browser：重啟本 repo `:3000` dev server 後，log 顯示 Nuxt `4.4.8`。`agent-browser` 檢查 `https://dwselect.toybox.local/`：無 Nuxt error、`.compact-app-shell` 存在、`.product-card` 62 張、`#nuxt-ui-colors` 正常存在；檢查 `/products/2026-06-02-blueair-3250空氣清淨機`：title 正確、無 Nuxt error、`.product-detail-page` 與 `#nuxt-ui-colors` 存在。清 console 後重新載入，`agent-browser errors` 無輸出。
