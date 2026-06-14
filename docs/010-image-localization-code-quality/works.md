# Sprint 010 工作紀錄

## 2026-06-12：接手 M1/M2 圖片本地化

### 完成範圍

- 完成 `scripts/localize-content-images.ts` 與 `tests/localize-content-images.test.ts` 驗收。
- 擴充 `app/utils/product-schema.ts`，讓 products / guides / links 的 `image_url` 接受 HTTP(S) URL 或 `/images/products/`、`/images/guides/` 站內路徑。
- 修正 `nuxt.config.ts` 的 `nitro.publicAssets.dir` 為絕對路徑，確認 `nuxt generate` 會輸出 `.output/public/images/products/` 與 `.output/public/images/guides/`。
- 實際 cutover 商品與指南圖片：`content/products/images/` 62 張、`content/guides/images/` 1 張。
- 重建 `public/search-index.json`，已本地化內容的 search document 使用 `/images/*`。

### 失敗圖片

- `content/guides/2026-06-02-日本米入門篇.json` 保留原 fbcdn 外連 URL。
- 重跑 `node scripts/localize-content-images.ts --timeout 5000` 結果：`localized: 0`、`skipped: 63`、`failed: 1`，失敗原因為 `HTTP 403`。

### Gate 與實際驗證

- `pnpm test tests/localize-content-images.test.ts tests/product-schema.test.ts`：29 passed。
- `pnpm test`：18 files、174 tests passed。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm generate`：通過；`.output/public/images/products` 有 62 張、`.output/public/images/guides` 有 1 張。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- `pnpm test:e2e`：45 passed、6 skipped。
- `agent-browser` 實際檢查首頁、商品詳情、指南、搜尋：本地圖片皆走 `/images/*`，`brokenLocal: []`；指南頁仍有 1 筆 fbcdn 外連，符合失敗 fallback。

### 額外修正

- 修正 `scripts/post-edit-hook.sh`：單檔 hook 直接呼叫 `pnpm exec eslint --fix --max-warnings=0 --no-ignore`，避免暫存 fixture 被 ESLint ignore warning 擋住自動修正。
- E2E 第一次因 `https://dwselect.toybox.local` Traefik 入口 `502 Bad Gateway` timeout；確認 app upstream 可通後重啟 Traefik，入口恢復 200，再完成 E2E。

### 下一步

- 接續 Milestone 3：taxonomy 單一來源。

## 2026-06-12：完成 M3-M6 與總驗收

### 完成範圍

- 完成 Milestone 3 taxonomy 單一來源：移除 search index build-time taxonomy fallback，`buildSearchIndexPayload` / `getSearchDocuments` 改為明確傳入 categories / channels / tags；新增 `tests/taxonomy-sync.test.ts` 鎖定 `CATEGORY_IDS`、`CHANNEL_IDS`、`DEFAULT_TAXONOMIES`、`DEFAULT_LINKS` 與 content SSOT 同步。
- 完成 Milestone 4 `published-products.ts` 拆分：改為 `app/utils/published-products/{types,shared,product-detail,compact-app,resource-rows,tags}.ts` 六個模組，不建立 barrel file；移除 production 未使用 catalog dead code；拆分 `tests/published-products/` 並新增 `tests/content-taxonomy-references.test.ts`。
- 完成 Milestone 5 `search.vue` 拆分：新增 `app/composables/use-search-page.ts` 與四個 `app/components/search/*` 子元件；`app/pages/search.vue` 降至 159 行，保留既有 class / DOM contract。
- 完成 Milestone 6 legacy 歸檔與 package metadata：三個 migration scripts 移至 `scripts/legacy/`，測試 import、`README.md`、`AGENTS.md` 路徑同步；`package.json` 補 `packageManager: pnpm@10.20.0` 與 `engines.node >= 22`。

### Bugfix 與本機 handoff 修正

- 修復 search direct URL 首載 hydration mismatch：`/search?q=...` 在 SSR 端不能載入 client search index，原本 server 渲染結果區、client 首次渲染 loading 區，造成 hydration warning；`useSearchPage` 在 non-client submitted query 時改維持 loading 狀態，新增單元測試鎖定。
- 修正 Traefik network 指定：`docker-compose.yml` 增加 `traefik.docker.network=web`，避免 Traefik 在多 network 環境選錯 upstream。compose 預設仍維持 production preview 路徑與 `Host(localhost)` fallback；本機 dev domain 由 `.env` 的 `NUXT_MODE=dev`、`APP_URL=dwselect.toybox.local` 指定。
- Traefik 502 根因：app upstream `172.18.0.5:3000` 可直連，但當下缺少 `.env`，app label 展開成 `Host(localhost)`，`dwselect.toybox.local` route 不再指向本 app；這是本機 handoff 環境狀態問題，不應改變 compose 預設。

### Gate 與實際驗證

- `pnpm test tests/use-search-page.test.ts`：先確認新增 SSR loading 測試 Red，再修復後 5 passed。
- `pnpm test`：25 files、173 tests passed。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm generate`：通過；仍有既有 sourcemap / Rollup `/* #__PURE__ */` warnings。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- `pnpm test:e2e`：最終 45 passed、6 skipped。過程中曾在 dev server 剛重啟或 generate 後 HMR 狀態下遇到搜尋結果載入 timeout；重跑單一失敗 case 通過，dev server warmup 後完整 E2E 通過。
- Frontend Handoff：`agent-browser` 檢查首頁、商品詳情、指南、連結、搜尋頁可載入；本地圖片 `/images/products/...` 透過 Traefik 回 200；全新 Playwright page 驗證 `/search?q=空氣` console messages 為空，hydration mismatch 已消失。

### 待確認

- Sprint 010 已完成並通過總驗收；等待 review 與 commit 授權。

## 2026-06-12：xreview findings 修正

### 完成範圍

- Issue #1：`SearchInput` 補上 `compositionstart` / `compositionend` guard，IME 組字期間不 emit `update:query`，composition end 後同步一次；保留 Enter 的 `isComposing` / `keyCode 229` guard。
- Issue #2：收緊 local `image_url` schema，只允許 `/images/products/<filename>.<ext>` 與 `/images/guides/<filename>.<ext>`，副檔名限定 `jpg`、`jpeg`、`png`、`webp`、`gif`、`avif`，拒絕空檔名、子目錄、無副檔名、`..`、query、hash 與非支援目錄。
- Issue #3：`localize-content-images` summary 新增 `warnings`，> 2 MB 圖檔照常寫入與改寫 JSON，但回報 `file_path`、`image_url`、`reason`、`size_bytes`；CLI summary 會輸出 warning 數與明細；spec 補正 Content-Type fallback 文案。
- E2E 穩定化：搜尋結果需載入 client search index，量測在 dev server 下可能約 5.3–5.7 秒才出現，超過 Playwright 預設 5 秒；`tests/e2e/compact-app.spec.ts` 新增 `SEARCH_RESULT_TIMEOUT_MS = 15_000` 並只套用在正向搜尋結果 assertions。

### 測試與驗證

- Red：`pnpm test tests/product-schema.test.ts tests/localize-content-images.test.ts tests/search-input-composition.test.ts tests/use-search-page.test.ts` 先確認新增測試失敗（summary 缺 warnings、schema 未收緊、composition helper 尚不存在）。
- Green：同一 Vitest 組合通過，4 files、39 tests passed。
- `pnpm lint:file -- app/components/search/search-input.vue app/utils/product-schema.ts app/utils/search/search-input-composition.ts scripts/localize-content-images.ts tests/product-schema.test.ts tests/localize-content-images.test.ts tests/search-input-composition.test.ts tests/use-search-page.test.ts tests/e2e/compact-app.spec.ts`：通過。
- lint 後重跑同一 Vitest 組合：4 files、39 tests passed。
- `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts -g "defers search input query updates until IME composition ends"`：通過。
- `pnpm test`：26 files、178 tests passed。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm generate`：通過；仍有既有 sourcemap / Rollup `/* #__PURE__ */` warnings。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- `pnpm test:e2e`：48 passed、6 skipped。

### 備註

- 因專案沒有 Vue component mount 工具，本次補 `tests/search-input-composition.test.ts` 鎖定 guard 純邏輯，並在既有 Playwright E2E 補 DOM event 覆蓋 SearchInput 實際頁面行為。
