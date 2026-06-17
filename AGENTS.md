# AGENTS.md

## Repo Facts

- 單一 Nuxt 4 SSG app，不是 monorepo；主要 app entrypoint 在 `app/`，內容由 `scripts/content-reader.ts` 讀取 Git-backed JSON 並產生 public payload。
- 公開 runtime 不應 fetch Google Sheets、CMS 或外部資料來源；內容 SSOT 是 Git-backed `content/` JSON 與 taxonomy files。
- Sprint 規格 SSOT 是 `docs/<編號>-<名稱>/spec.md`，完成紀錄在同資料夾 `works.md`；改 production code 前先補或更新測試。
- 可見 UI、navigation、routing、layout、generate 相關變更交還前，除了測試外也要實際打開頁面確認可載入。

## Commands

- 安裝：`pnpm install`；CI 使用 Node 24 與 `pnpm install --frozen-lockfile`。
- Dev server：`pnpm dev` 等同 `nuxt dev --host ::`；**瀏覽器只能用 `https://${APP_URL}/` 進入**（預設 `dwselect.toybox.local`），禁止使用 `localhost`、`127.0.0.1`、`0.0.0.0` 或任何其他 host——`nuxt.config.ts` 讀取 `APP_URL` 環境變數設定 Vite `allowedHosts`，未設定會直接報錯中斷，其他 host 會被 Vite 擋掉。
- Unit／integration：`pnpm test`，會跑 Vitest 並排除 `tests/e2e/**`。
- 單一 Vitest 檔：`pnpm test tests/product-schema.test.ts`。
- E2E：`pnpm test:e2e`；Playwright 預設以 `https://dwselect.toybox.local` 為 `baseURL`，必要時自行啟動 `pnpm dev --host ::`，透過 Traefik 實際入口測試，`workers: 1`，projects 是 `phone`、`tablet`、`desktop`。
- 單一 E2E project：`pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts`。
- Lint：`pnpm lint` 等同 `eslint . --max-warnings=0`；單檔自動修正用 `pnpm lint:file -- <file>`。
- Format：`pnpm format` 等同 `eslint . --fix`，使用 ESLint `@stylistic`，不使用 Prettier。
- Typecheck：`pnpm typecheck` 固定走 `nuxt typecheck`，fresh checkout 先由 `prepare: nuxt prepare` 產生 `.nuxt` types/config。
- Static generate：`pnpm generate` 會先跑 `pnpm build:search-index` 與 `pnpm build:public-discovery` 再 `nuxt generate`，輸出到 `.output/public`。
- CI 等級驗證順序：`pnpm test` → `pnpm lint` → `pnpm typecheck` → `pnpm generate` → `node scripts/assert-runtime-google-sheet-clean.ts`。

## Content Model

- Products：`content/products/*.json`；Guides：`content/guides/*.json`；Links：`content/links/*.json`；taxonomy 在 `content/taxonomies/{categories,channels,tags}.json`。
- Schema 與 taxonomy reference 驗證集中在 `app/utils/product-schema.ts` 與 `tests/product-schema.test.ts`。
- Build-time content 讀取集中在 `scripts/content-reader.ts`；公開 runtime 使用 `public/api/content.json` 靜態 payload。
- `id` 必須等於 JSON 檔名 stem；timestamps 使用 `YYYY-MM-DDTHH:mm:ss+08:00` 這類含 timezone offset 格式。
- Product 使用 `category_id`、`channel_id`、`tag_ids`；Guide／Link 使用 `category_ids`、`tag_ids`；不要新增 legacy `category` 或自由字串 `tags`。
- `status = "published"` 才能出現在首頁、指南、連結、category counts 與 search index。
- `content/taxonomies/links.json` 不是 runtime links SSOT；runtime links 來自 `content/links/*.json`。
- Google Sheets TSV importer `scripts/legacy/migrate-google-sheet-products.ts` 是 deprecated legacy-only，不可用來建立新版內容。

## Search And Static Output

- Search index 由 `scripts/build-search-index.ts` 產生到 `public/search-index.json`，納入 published products、guides、links。
- Public discovery payload 由 `scripts/build-public-discovery.ts` 產生到 `public/api/content.json`，納入 published products、guides、links 與 taxonomy。
- 內容或 taxonomy 變更後要跑 `pnpm build:search-index` 與 `pnpm build:public-discovery`，或直接跑 `pnpm generate` 讓 index、payload 與 SSG 一起更新。
- `node scripts/assert-runtime-google-sheet-clean.ts` 會掃 runtime source 與 `.output/public`，確保公開 runtime 沒有 Google Sheets TSV 指標。

## Routing And UI

- Static prerender routes 在 `nuxt.config.ts`：`/`、`/guide`、`/search`、`/links` 與所有 `/products/:id`，product routes 由 `scripts/build-product-routes.ts` 從 `content/products/` 建出。
- App routes：`/` 首頁、`/guide` 指南、`/search?q=` 搜尋、`/links` 連結、`/products/:id` 商品詳情。
- Navigation 使用 `NuxtLink`；mobile bottom nav 與 tablet rail 是四個主要入口，desktop sidebar 會展開 product categories。
- Nuxt 已啟用 `experimental.viewTransition: true`；做轉場時遵守 progressive enhancement 與 `prefers-reduced-motion` fallback，不要新增手寫全域轉場狀態機。

## Local Runtime Gotchas

- **禁止使用 `localhost`、`127.0.0.1`、`0.0.0.0` 存取 dev server 或作為測試 URL。** 唯一正確的入口是 `https://dwselect.toybox.local/`。Dev server 跑在 Docker 容器裡、經 Traefik 反向代理，Vite `allowedHosts` 也只接受 `dwselect.toybox.local`，用其他 host 會 403 或連不上。E2E 測試的 `baseURL` 同樣是 `https://dwselect.toybox.local`。
- `toybox.local` 壞掉或 Bad Gateway 時，先查 Traefik route/service/upstream 與 Nuxt 是否 listen 在正確 address；不要只看到任一 `nuxt` 或 `node` process 就當成本專案 dev server。
- 未確認目前沒有正確 dev server 前，不要自行啟動第二個 dev server；若需啟動，先說明預定 listen address。
