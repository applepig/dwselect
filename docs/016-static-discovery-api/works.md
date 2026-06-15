# Works：靜態探索檔與公開資料 API

## 2026-06-15 ddd-developer

### 完成內容

- 新增 build-time 共用 content reader，讓 search index 與 public discovery/API 使用同一套 `content/`、`content/taxonomies/` 讀取流程。
- 新增 `buildPublicContentPayload()`，輸出 `version`、site metadata、published-only products/guides/links 與完整 taxonomy definitions。
- 新增 `scripts/build-public-discovery.ts`，產生 `public/robots.txt`、`public/llms.txt`、`public/sitemap.xml`、`public/rss.xml`、`public/api/content.json`。
- 更新 `package.json`，讓 `pnpm build` 與 `pnpm generate` 先跑 `build:search-index`，再跑 `build:public-discovery`。
- 新增 `tests/public-discovery.test.ts` 覆蓋 payload、published-only、穩定排序、缺少 content dir、TXT/XML/JSON 產物、XML escape、RSS 排序、CLI 與 package script 串接。

### 技術決策

- 正式公開 URL 固定使用 `https://dwselect.applepig.net/`，不讀取 dev host 或 runtime config，避免把 `dwselect.toybox.local` 寫入公開 artifacts。
- API payload 保留既有 schema 欄位，不新增 legacy `category` 或自由字串 `tags`。
- products/guides/links 使用 `status === 'published'` 過濾；taxonomy definitions 完整公開，並依 `sort_order`、`id` 穩定排序。
- sitemap root routes 固定包含 `/`、`/guide`、`/search`、`/links`；product detail URL 來自 published products，`lastmod` 使用 `updated_at`。
- RSS item 來自 published products、guides、links，依 `published_at` 新到舊排序；`published_at = null` 的內容排在最後，`pubDate` 使用 `updated_at` fallback。
- XML 輸出集中使用 escape，避免 `&`、`<`、`>`、引號破壞 sitemap/RSS。
- 本 sprint 依需求產生 `llms.txt`，未產生 `agents.txt`。

### TDD 紀錄

- Red：`pnpm test tests/public-discovery.test.ts` 初次失敗於 `Cannot find module '../scripts/public-content'`，確認測試先行。
- Green：新增 public content/discovery scripts 後，單檔測試一度失敗於 sitemap `lastmod`；改用 `updated_at` 後通過。
- 契約補強：補上 RSS `pubDate` 保留 `+0800` offset 的測試，先確認失敗於 UTC `+0000` 輸出，再修正格式化邏輯。
- Refactor：`scripts/build-search-index.ts` 改用共用 content reader，避免 search index 與 API/discovery 的讀檔邏輯 drift。

### 驗證結果

- `pnpm test tests/public-discovery.test.ts`：通過，5 tests passed。
- `pnpm test`：通過，32 files / 243 tests passed。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm generate`：通過；`.output/public` 包含 `robots.txt`、`llms.txt`、`sitemap.xml`、`rss.xml`、`api/content.json`。Build 過程有既有 Vite/Rollup sourcemap／pure annotation warnings，未造成失敗。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。

### 已知限制

- 本 sprint 僅產生靜態檔，未新增 runtime handler；內容更新後需透過 build/generate 重新產生 artifacts。

## 2026-06-15 Coordinator 驗收

- 複核 diff 範圍：新增 build-time scripts、public artifacts、`tests/public-discovery.test.ts`、`package.json` script 串接與本文件包；既有髒檔 `nuxt.config.ts`、`tests/app-config.test.ts` 保留未處理。
- 驗收 `llms.txt` 取代 `agents.txt`：`.output/public/llms.txt` 存在，`.output/public/agents.txt` 不存在。
- 重跑 `pnpm test tests/public-discovery.test.ts`：通過，1 file / 5 tests passed。
- 重跑 `pnpm generate`：通過，確認先執行 `build:search-index` 與 `build:public-discovery`，`.output/public` 包含 `robots.txt`、`llms.txt`、`sitemap.xml`、`rss.xml`、`api/content.json`。
- 重跑完整品質閘門：`pnpm test` 通過，32 files / 243 tests passed；`pnpm lint` 通過；`pnpm typecheck` 通過；`node scripts/assert-runtime-google-sheet-clean.ts` 通過。
