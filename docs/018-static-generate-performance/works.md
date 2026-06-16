# Static Generate Performance & Lighter Runtime Works

## Milestone 1：runtime 改讀靜態 catalog，移除 client SQLite

日期：2026-06-16

### 工作摘要

- 將 app runtime content 讀取從 Nuxt Content `queryCollection()` 改為讀取 build-time 產出的 `public/api/content.json`。
- 保留 Nuxt SSG data fetching：server / prerender 階段直接讀 `public/api/content.json`，client fallback 才 `$fetch('/api/content.json')`，未使用全面 `server: false`。
- 新增商品 detail 專用資料載入與 transform，只把當頁 `ProductDetailView` 與最多 3 筆 related product cards 序列化進 payload。
- 新增 shell summary 載入，讓 layout / navigation 在商品 detail route 只需要 count、desktop category chips、category ids，不再透過共用 catalog path 帶入完整 catalog。
- 更新 smoke / unit / SEO source tests，反轉 runtime `queryCollection` baseline，補 detail payload 不含 raw catalog records 的防回歸測試。

### 主要檔案

- `app/composables/use-catalog-data.ts`
- `app/composables/use-catalog-shell-data.ts`
- `app/composables/use-product-detail-data.ts`
- `app/utils/fetch-public-content-payload.ts`
- `app/utils/public-content-payload.ts`
- `app/utils/published-products/catalog-shell-summary.ts`
- `app/utils/published-products/product-detail-payload.ts`
- `app/layouts/default.vue`
- `app/components/app-navigation.vue`
- `app/pages/products/[id].vue`
- `tests/nuxt-smoke.test.ts`
- `tests/published-products/product-detail.test.ts`
- `tests/launch-seo.test.ts`

### 驗收結果

- `pnpm test tests/nuxt-smoke.test.ts tests/published-products/product-detail.test.ts tests/launch-seo.test.ts`：通過，3 files / 42 tests passed。
- `pnpm test`：通過，33 files / 254 tests passed。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm generate`：通過，prerendered 141 routes。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- `.output/public/_nuxt`：未找到 `sqlite3*.wasm`、`sqlite3-worker`、`queryCollection` 指標。
- `.output/public/products/2026-06-02-sharp-65-inch-xled/_payload.json`：2676 bytes；未包含 raw `offers`、`llm_description`、`products` 或其他商品 id 指標。
- 以本機 static server 開啟 `.output/public`，用 agent-browser 驗證首頁、分類列表、商品詳情、搜尋、指南、連結頁可載入；首頁顯示 62 張商品卡，`computer-3c` 分類顯示 16 張商品卡，商品詳情 title 為 `Sharp 65吋 XLED｜DW嚴選`。

### 待辦與風險

- Nuxt Content module 已於 Milestone 2 移除；M1 當時 generate log 仍顯示 Content processing 的風險已解除。
- agent-browser console output 受既有 dev-server tabs 的 Vite HMR 訊息污染，本次以 static preview 的 DOM / title / route content 驗證為準。

## Milestone 2：移除 Nuxt Content，content-reader 為唯一來源

日期：2026-06-16

### 工作摘要

- 移除 `nuxt.config.ts` 的 Nuxt Content module，刪除舊 content collection 設定檔。
- 從 direct dependencies 與 built dependency 白名單移除 Nuxt Content / SQLite；新增 `.npmrc` 關閉 pnpm auto peer install，避免 `@nuxt/ui` optional peer resolution 在 lockfile 重新拉入 Content / SQLite package。
- 移除早期 `getPublishedProductsQuery()` Nuxt Content query skeleton 與對應 smoke test，避免保留第二套 content query 概念。
- 更新 smoke test，反轉 baseline：Nuxt UI 與 static preset 保留、Content module / config / package direct deps / runtime query 殘留不存在，並確認 `tests/product-schema.test.ts` 仍逐一 zod 驗證 products、guides、links。
- 更新 `content/AGENTS.md`、`docs/CONTENT.md`、root `AGENTS.md`，把 authoring 與 generated artifact 流程改為 `scripts/content-reader.ts`、`pnpm test`、`pnpm build:public-discovery` / `pnpm generate`。

### Red 階段

- `pnpm test tests/nuxt-smoke.test.ts`：預期失敗，4 個 smoke assertions failed：`nuxt_config.modules` 仍含 Content module、舊 content collection 設定檔仍存在、`package.json` 仍含 direct Content / SQLite deps 與 built dependency、source/docs/package 殘留 Content 指標。

### 驗收結果

- `pnpm test tests/nuxt-smoke.test.ts tests/product-schema.test.ts`：通過，2 files / 60 tests passed。
- `pnpm test`：通過，33 files / 256 tests passed。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm generate`：通過，prerendered 134 routes；generate log 未再顯示 Content processing。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- `.output/public/__nuxt_content`：不存在。
- `.output/public/_nuxt`：未找到 `sqlite3*.wasm` 或任何 `sqlite3` 命名資產。

### 待辦與風險

- `pnpm install --lockfile-only --config.auto-install-peers=false` 曾顯示 `@nuxt/ui` 內部 tiptap collaboration optional peer warning；目前功能與驗證皆通過，且 `.npmrc` 固定 `auto-install-peers=false` 以避免 optional Content / SQLite 被重新解析。
- lockfile 仍保留上游 package 的 peer 宣告文字（例如 `@nuxt/ui` metadata），但 importer 與 resolved package entries 已不再把 Content / SQLite 作為直接或實際安裝 dependency。

## Milestone 3：字型 deterministic 化

日期：2026-06-16

### 工作摘要

- 在 Nuxt config 以 `ui.fonts: false` 明確關閉 Nuxt UI 自動註冊的 Nuxt Fonts 行為，避免 build 階段解析 provider font。
- 將全站 base `font-family` 從 `Inter, 'Noto Sans TC'` 改為 deterministic system CJK stack：`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif`。
- 補 smoke source test，防止重新啟用 Nuxt UI fonts 或重新宣告 `Inter`／`Noto Sans TC` provider family expectation。

### Red 階段

- `pnpm test tests/nuxt-smoke.test.ts tests/app-config.test.ts`：預期失敗，2 個 assertions failed：`nuxt_config.ui?.fonts` 為 `undefined`，且 `variables.css` 仍宣告 `Inter, 'Noto Sans TC', system-ui, sans-serif`。

### 驗收結果

- `pnpm test tests/nuxt-smoke.test.ts tests/app-config.test.ts`：通過，2 files / 34 tests passed。
- `pnpm lint`：通過。
- `pnpm generate`：通過，prerendered 134 routes。
- `/tmp/opencode/dwselect-generate.log` 搜尋 `fonts.google.com`、`api.fontshare.com`、`api.fontsource.org`、`font provider`、`retry`：未命中。

### 待辦與風險

- 本 milestone 依規格不新增 self-host font dependency；實際字面會依使用者作業系統的繁中字型 fallback 呈現。

## Milestone 4：圖片 build-time 優化

日期：2026-06-16

### 工作摘要

- 新增 `scripts/build-content-images.ts`，以 `sharp` 在 build-time 讀取 published products / guides 的 referenced `image_file`，輸出 resized WebP 到 `public/images/products` 與 `public/images/guides`。
- 將 `resolveImageFileUrl()`、商品 detail / card、guide resource rows 與 search index 的本地圖片 URL 契約收斂為 `/images/<domain>/<stem>.webp`。
- 移除 `nuxt.config.ts` 中 raw `content/*/images` 的 Nitro `publicAssets` 映射，避免原檔混入公開輸出。
- 新增 `build:content-images` 並串入 `build` / `generate`，在 search index / public discovery / Nuxt generate 前先產生 public image assets。
- 新增 build pipeline 測試，覆蓋 WebP 輸出、resize 不放大小圖、missing warning、未引用 source image 不輸出。
- 修正 Guide runtime 圖片 fallback：公開 app / search view-model 只使用本地 `image_file` 產生的 `/images/guides/*.webp`；若 Guide 只有外部 `image_url`，runtime image 回傳 `null`，避免外部 fetch 與破圖。
- 依 review findings 收斂圖片契約：referenced published image 缺檔或轉檔失敗時 `build:content-images` 直接失敗；Product runtime / search 不再 fallback 外部 `image_url`，避免新增 runtime image fetch。

### Red 階段

- `pnpm test tests/build-content-images.test.ts`：預期失敗，`Cannot find module '../scripts/build-content-images'`。
- `pnpm test tests/nuxt-smoke.test.ts tests/search-index.test.ts tests/localize-content-images.test.ts`：預期失敗 3 個 assertions：package scripts 尚未串 `build:content-images`、`nuxt.config.ts` 仍映射 raw content image dirs、resolver 仍回傳 raw `.jpg` URL。

### 主要檔案

- `scripts/build-content-images.ts`
- `app/utils/content-images/resolve-image-file-url.ts`
- `app/utils/search/search-index.ts`
- `nuxt.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `tests/build-content-images.test.ts`
- `tests/nuxt-smoke.test.ts`
- `tests/search-index.test.ts`
- `tests/public-discovery.test.ts`
- `tests/published-products/product-detail.test.ts`
- `tests/published-products/resource-rows.test.ts`
- `tests/published-products/shared.test.ts`

### 驗收結果

- `pnpm test tests/build-content-images.test.ts`：通過，1 file / 1 test passed。
- `pnpm test tests/nuxt-smoke.test.ts tests/search-index.test.ts tests/localize-content-images.test.ts`：通過，3 files / 58 tests passed。
- `pnpm build:content-images`：通過，Optimized 63、Missing 0、Failed 0；若 referenced published image 缺檔或轉檔失敗，測試覆蓋會讓 build fail。
- 圖片大小：`content/products/images` 5.6M → `public/images/products` 3.0M；`content/guides/images` 204K → `public/images/guides` 48K。
- `pnpm generate`：通過，pipeline 先執行 `build:content-images`，`.output/public/images/products` 與 `.output/public/images/guides` 皆存在 WebP assets。
- `.output/public/images/products/2026-06-02-sharp-65-inch-xled.webp` 與 `.output/public/images/guides/2026-06-02-aeron-chair.webp`：檔案存在。
- `.output/public/search-index.json`：本地商品圖片 URL 為 `/images/products/*.webp`；Guide 外部 `scontent.ftpe8-2.fna.fbcdn.net` 圖片 URL 未進入 search index。
- agent-browser 正式驗收入口 `https://dwselect.toybox.local/`：首頁、分類、商品詳情、搜尋、指南、連結頁可載入；首頁 / 分類 / 商品詳情圖片皆為 `/images/products/*.webp`，指南頁只渲染 `/images/guides/2026-06-02-aeron-chair.webp`，各頁 broken image count 皆為 0。
- `pnpm test`：通過，34 files / 270 tests passed。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。

### 待辦與風險

- `public/images/**` 為 build script 產物；因 dev / preview / SSG 均透過 same-origin `/images/*` URL 讀取，本次保留在工作樹，與既有 `public/search-index.json`、`public/api/content.json` 類 generated public artifacts 一起管理。

## Milestone 5：CI build cache

日期：2026-06-16

### 工作摘要

- 在 `.github/workflows/static-generate.yml` 的 install step 後、品質閘門前加入 `actions/cache@v4`。
- 快取 `node_modules/.cache/nuxt` 與 `.nuxt`，讓 Nuxt build / type output 可在 CI warm build 重用。
- cache key 綁定 runner OS、Node 24 意圖、`pnpm-lock.yaml`、`nuxt.config.ts`、`app/**`、`scripts/**`、`content/**` hash；提供 restore key 作寬鬆 fallback。
- 更新 workflow source test，確認 cache step 位於品質閘門前，path / key / restore-keys 契約正確。

### Red 階段

- `pnpm test tests/static-generate-workflow.test.ts`：預期失敗，新增的 cache step assertion 找不到 `actions/cache@v4`，且 cache step 未位於 install 後與品質閘門前。

### 主要檔案

- `.github/workflows/static-generate.yml`
- `tests/static-generate-workflow.test.ts`

### 驗收結果

- `pnpm test tests/static-generate-workflow.test.ts`：通過，1 file / 4 tests passed。
- `pnpm test tests/static-generate-workflow.test.ts tests/nuxt-smoke.test.ts`：通過。
- 完整最終驗收：`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts` 皆通過。

### 待辦與風險

- CI cache 是否命中需在 GitHub Actions 第二次執行後才可實測；本次以 workflow 結構測試確認 cache key / path / step order 契約。

## Final Review & Verification

日期：2026-06-16

### Review 結果

- `ddd-reviewer` final review：No blocking findings。
- 已修正 review 提出的 3 個 important findings：圖片缺檔 / 轉檔失敗 fail-fast、Product 外部 `image_url` 不進 runtime / search、`docs/CONTENT.md` 與 `content/AGENTS.md` 更新為 WebP generated artifact 契約。

### 最終驗收結果

- `pnpm test`：通過，34 files / 270 tests passed。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm generate`：通過，`build:content-images` Optimized 63 / Missing 0 / Failed 0，prerendered 134 routes。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- `.output/public/__nuxt_content`：不存在。
- `.output/public/_nuxt/**/*sqlite*`：不存在。
- `public/search-index.json`：未包含 Guide 外部 Facebook CDN image URL。
- 圖片大小：`content/products/images` 5.6M → `public/images/products` 3.0M；`content/guides/images` 204K → `public/images/guides` 48K。
- agent-browser 正式入口 `https://dwselect.toybox.local/`：首頁、分類、商品詳情、搜尋、指南、連結皆可載入，broken image count 皆為 0。

## XReview Follow-up：legacy migration 與 fixture image 契約同步

日期：2026-06-16

### 工作摘要

- 修正 Product schema：published Product 才強制要求本地 `image_file`；所有 Product 仍拒絕 `image_url`，避免 Product runtime / search fallback 外部圖片。
- 修正 deprecated Google Sheet / compact schema migration：legacy row 沒有實際下載本地圖片時，輸出 `status: "draft"`、`image_file: null`、`image_url: null`、`published_at: null`，避免產出缺檔的 published content。
- 更新 public discovery fixture，改用本地 `image_file` 並建立 temp `content/products/images/` fixture，不再使用 external-only Product `image_url`。
- 更新 `docs/CONTENT.md` 與 `content/AGENTS.md`，補明 published Product 的本地圖片 requirement 與 draft 無圖安全策略。

### Red 階段

- `APP_URL=dwselect.toybox.local pnpm test tests/migrate-google-sheet-products.test.ts tests/migrate-product-compact-schema.test.ts tests/public-discovery.test.ts`：預期失敗 12 個 assertions，集中在 legacy migration / public discovery fixture 仍產生 external Product `image_url` 且缺 `image_file`。
- 更新測試期望後加跑 `tests/product-schema.test.ts`：預期失敗 11 個 assertions，其中 schema 仍錯誤要求 draft Product 必須有 `image_file`。

### 驗證結果

- `APP_URL=dwselect.toybox.local pnpm test tests/migrate-google-sheet-products.test.ts tests/migrate-product-compact-schema.test.ts tests/public-discovery.test.ts`：通過，3 files / 26 tests passed。
- `APP_URL=dwselect.toybox.local pnpm test tests/product-schema.test.ts tests/build-content-images.test.ts`：通過，2 files / 38 tests passed。
- `APP_URL=dwselect.toybox.local pnpm test tests/nuxt-smoke.test.ts tests/dev-server-script.test.ts tests/view-transition.test.ts`：通過，3 files / 37 tests passed。
- `APP_URL=dwselect.toybox.local pnpm test`：通過，34 files / 273 tests passed。

## Cross Review：多模型審查與後續修正

日期：2026-06-16

### Reviewer 組成

- `claude:opus`：完成，0 critical、2 important。
- `codex:gpt-5.5`：完成，0 critical、1 important。
- `gemini:pro`：完成，0 blocking、1 medium。

### Coordinator 驗證結果

- 已確認：Product schema 與 runtime/search 圖片契約不一致。Schema 允許 external-only Product，但 runtime/search 已要求本地 `image_file`，會造成 content validation 通過但 build/generate 才失敗。
- 已確認：`build-content-images` 的 WebP output stem collision 會 silent skip；同 domain `foo.jpg` 與 `foo.png` 會共用 `foo.webp`，可能顯示錯圖且 broken image 檢查抓不到。
- False positive：大寫副檔名 regex 問題不成立為 production gap，因為 `product-schema.ts` 同樣使用大小寫敏感 regex，`pnpm test` 會先擋下 `.JPG`，不是 validation 通過後 build 爆。

### 修正內容

- Product schema 改為 published Product 必須有本地 `image_file`，所有 Product 拒絕 `image_url`；draft legacy Product 可無圖，但不可使用 external Product image URL。
- Deprecated legacy migration 在沒有本地圖片時輸出 draft：`image_file: null`、`image_url: null`、`published_at: null`，避免產生缺圖的 published content。
- `build-content-images` 對同 domain output collision fail-fast，測試覆蓋 same stem 不同副檔名情境。
- Public discovery / migration fixtures 改成符合新 Product image 契約。
- `docs/013-content-file-relationships/spec.md`、`docs/CONTENT.md`、`content/AGENTS.md` 同步 Product 圖片契約：published Product 必須使用本地圖片，Guide / Link 的 external image 規則另行維持。

### 最終驗收結果

- `APP_URL=dwselect.toybox.local pnpm test`：通過，34 files / 273 tests passed。
- `APP_URL=dwselect.toybox.local pnpm lint`：通過。
- `APP_URL=dwselect.toybox.local pnpm typecheck`：通過。
- `APP_URL=dwselect.toybox.local pnpm generate`：通過，`build:content-images` Optimized 63 / Missing 0 / Failed 0，prerendered 134 routes。
- `APP_URL=dwselect.toybox.local node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- `.output/public/__nuxt_content`：不存在。
- `.output/public/_nuxt/**/*sqlite*`：不存在。
- `public/search-index.json`：未包含 Guide 外部 Facebook CDN image URL。
- 圖片大小：`content/products/images` 5.6M → `public/images/products` 3.0M；`content/guides/images` 204K → `public/images/guides` 48K。
- agent-browser 正式入口 `https://dwselect.toybox.local/`：首頁、分類、商品詳情、搜尋、指南、連結皆可載入，broken image count 皆為 0。
