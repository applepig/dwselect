# AGENTS.md

## Project Goal

- DW嚴選是公開靜態內容站，目標是用 Git-backed content 管理產品、指南與連結，讓使用者能清楚瀏覽推薦品項、研究內容與外部入口。
- 單一 Nuxt 4 SSG app，不是 monorepo；以 Nuxt SSG、Nuxt Content 與 static search index 為核心，主要 app entrypoint 在 `app/`。公開站 runtime 不應依賴 Google Sheets、CMS 或外部資料 fetch。
- 內容資料的 SSOT 是 `content/` 下的 JSON 與 taxonomy files；文件 SSOT 是 `docs/<編號>-<名稱>/spec.md` 與對應 `works.md`。

## Operating Mode

- 開發遵循 Document Driven Development：需求先有 spec，實作時以測試描述驗收條件，完成後同步 works.md。
- 修改 production code 前先建立或更新測試；若是 bugfix，先重現、定位根因，再做最小修復。
- 不主動改無關架構、命名或格式；不要用 workaround 壓掉症狀，除非明確記錄風險與移除條件。
- Commit 需使用者明確授權；測試通過、generate 通過或頁面看過都不代表可以自動 commit。

## Commands

- 安裝：`pnpm install`；CI 使用 Node 24 與 `pnpm install --frozen-lockfile`。
- 命令統一入口是 `./dev.sh <cmd>`；`package.json` scripts 多為其薄 wrapper，`pnpm <cmd>` 與 `./dev.sh <cmd>` 等價（CI 用 `pnpm`）。委派的有 `dev`/`test`/`lint`/`typecheck`/`generate`/`content:check`/`preview`。例外：`prepare`（pnpm 生命週期 hook）與殘留未用的 `build`（nuxt build，且 `dev.sh build`=Docker image build，命名衝突）維持直跑、不委派。
- 測試與檢查指令（`vitest.config.ts` 已用 `process.loadEnvFile()` 載入 `.env`，不必再手動帶 `APP_URL=` 前綴）：
  - `pnpm test`（單元測試，排除 `tests/e2e/**`；單檔：`pnpm test tests/product-schema.test.ts`）
  - `pnpm test:e2e`（Playwright E2E；需 dev/preview 服務可連線。**必須在 host 跑、不在 Alpine 容器內跑**——容器 base `node:22-alpine` 是 musl libc，無法執行 Playwright 的 glibc Chromium；host 已有 `~/.cache/ms-playwright` browser。它連既有容器 dev server（`toybox.local`），`reuseExistingServer:true` 故 dev server 活著時不會在 host 誤啟 `pnpm dev`。`baseURL` 由 `APP_URL` 組成，`workers: 1`，projects 是 `phone`、`tablet`、`desktop`；單一 project：`pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts`。）
  - `pnpm lint`（`--max-warnings=0`；單檔自動修正用 `pnpm lint:file -- <file>`）
  - `pnpm format`（`eslint . --fix`，使用 ESLint `@stylistic`，不使用 Prettier）
  - `pnpm typecheck`（`nuxt typecheck`，隔離 buildDir，可在常駐 dev 旁跑；fresh checkout 先由 `prepare: nuxt prepare` 產生 `.nuxt` types/config）
  - `pnpm generate`（SSG build；同上隔離。純 host 會被擋下引導進容器，CI 自動放行；要在 host 強制直跑需設 `DWSELECT_ALLOW_HOST_GENERATE=1`）
  - `pnpm content:check`（content/ 資料 gate；改動內容 JSON / taxonomy 後跑）
- **Quality gate 依改動範圍分級，不要一律跑全套 verify**。判準是「這次改的東西，哪個 gate 真的會抓到它的錯」：

  | 改動範圍 | 該跑什麼 | 本機實測 |
  |---|---|---|
  | 只改 `content/**` JSON、taxonomy、content 圖片 | `pnpm content:check` | ~4.5s |
  | 只改 `docs/**`、`*.md`、`.claude/**`、`.opencode/**`、程式碼註解 | 不需要 gate | 0 |
  | 改 `app/`、`server/`、`scripts/`、`tests/`、`nuxt.config.ts`、依賴、CI 設定 | 全套 `./dev.sh exec ./dev.sh verify` | 3 分鐘起 |

  `content/**` 的 JSON 合法性、zod schema、taxonomy 參照與 published image guard 全部由 `content:check` 覆蓋（見 `scripts/content-check.mjs` 檔頭）。反過來，只要動到會進 build 的程式碼或設定，就跑全套，不要用「改很小」當理由跳過。
- **全套 quality gate 用 `./dev.sh exec ./dev.sh verify`** 在容器內跑（`test→lint→knip→typecheck→generate`，固定 production `APP_URL`），一輪測完再推；不要把 typecheck/generate deferred 到 CI 才發現紅。本機單步實測（熱快取）：`test` 27.6s、`lint` 11.4s、`knip` 9.1s、`typecheck` 21.0s、`generate` 112.7s；冷快取或與常駐 dev 併行會到 5 分鐘以上。注意本機 `verify` **不含 E2E**，CI 才有。
- **CI 的耗時分布跟本機不一樣，不要用本機數字推論 CI**。CI 有 Nuxt build cache，`generate` 只要 44s；真正的大宗是 E2E。實測一輪 quality-gate（約 4.5 分鐘）：E2E 152s、Chromium 安裝 24s、`generate` 44s、`test` 14s、`typecheck` 7s、`lint` 5s、`knip` 2s。因此 CI 的省時關鍵是「這次改動需不需要跑 E2E」，不是 generate。`.github/workflows/static-generate.yml` 已依改動路徑條件式跳過不相關的步驟（見該檔的 Detect changed scopes step）。
- CI 沒有 `.env` 檔，靠 workflow job env 提供 `APP_URL`；`vitest.config.ts` 對 `.env` 不存在採容錯略過。

## Local Runtime

- 開發環境透過 Docker 容器執行，用 `./dev.sh start` 啟動，透過 Traefik docker label 自動註冊路由到 `https://${APP_URL}/`（預設 `dwselect.toybox.local`）。
- **禁止使用 `localhost`、`127.0.0.1`、`0.0.0.0` 存取 dev server 或作為測試 URL。** 唯一正確的入口是 `https://${APP_URL}/`：`nuxt.config.ts` 讀取 `APP_URL` 設定 Vite `allowedHosts`，未設定會直接報錯中斷，其他 host 會 403 或連不上。
- Host 分工：`dwselect.toybox.local` 是本機／開發站入口；`dwselect.applepig.net` 是正式站入口。CI、production build、deploy、SEO canonical 或任何公開正式環境設定，不要使用 `dwselect.toybox.local`。
- 環境設定集中在 `.env`（不進 git）：`APP_URL` 控制 Traefik 路由與 Vite allowedHosts；`NUXT_MODE=dev` 跑 dev server（含 HMR），未設定或其他值則由 container PID 1 跑 `pnpm build:public-discovery`、`node scripts/assert-content-images.ts`、`nuxt generate` 後進入 `nuxt preview`。要切到 build preview 需重建 service（`NUXT_MODE=build ./dev.sh restart`）。
- 容器管理用 `./dev.sh`（start/stop/restart/build/rebuild/logs/exec/shell/install/status/clean）；開發／建置子命令有 `dev`/`generate`/`typecheck`/`verify`/`test`/`lint`/`content-check`/`preview`。`pnpm dev`＝`./dev.sh dev`，在 host 上執行會啟動 Docker app service 並追 log；不要在 host 直接跑 `nuxt dev`（例外：Playwright e2e 在 host 跑 browser、連容器 dev server，那不是在 host 跑 dev server，見 Commands）。
- 一次性 build（`typecheck`/`generate`/`verify`）在容器內自動用隔離 buildDir（`.nuxt-build`）＋ Vite cacheDir，與常駐 dev 的 `.nuxt` 分離，可在 dev server 跑著時安全執行；`./dev.sh` 三態：容器內隔離、`CI=true` 用預設 `.nuxt`、純 host 引導進容器。隔離只在本機／容器生效，CI workflow 不需改。**唯一例外**：`verify` 鏈的 `knip` 步驟因 knip 只讀「預設」`.nuxt`（無視 `NUXT_BUILD_DIR`），會在容器內對預設 `.nuxt` 補一次 `nuxt prepare`——若 verify 在常駐 `nuxt dev` 容器內跑，這步與 live dev 輕度並行寫 `.nuxt`（prepare 冪等、不啟 Vite，最壞觸發一次 dev reload，非 chunk hash 毀損），故 knip 步驟的隔離保證不完全成立（見 `dev.sh` `cmd_knip` 註解）。
- 除錯 `toybox.local` 壞掉或 Bad Gateway 時，先用 `./dev.sh status` 確認容器狀態，再看 `./dev.sh logs` 查 Nuxt log；接著檢查 Traefik route/service/upstream 與 Nuxt 是否 listen 在正確 address。不要只看到任一 `nuxt` 或 `node` process 就當成本專案 dev server。
- `package.json` 的依賴更新後，用 `./dev.sh install`（container 內 `pnpm install`）同步；若 native module 版本不對，用 `./dev.sh rebuild` 重建 image 和 volumes。
- 不要在同一專案目錄同時跑兩個 Nuxt dev 實例（host + container），會共用 Vite cache 導致 chunk hash 衝突；未確認目前沒有正確 dev server 前，不要自行啟動第二個。

## Content Model

- Products：`content/products/*.json`；Guides：`content/guides/*.json`；Links：`content/links/*.json`；taxonomy 在 `content/taxonomies/{categories,channels,tags,brands}.json`。
- Schema 與 taxonomy reference 驗證集中在 `app/utils/product-schema.ts` 與 `tests/product-schema.test.ts`。
- Content 讀取集中在 `scripts/content-source/`（async 全讀 `read-public-content-source.ts`、sync 最小讀 `read-taxonomy-items.ts`／`read-published-content-stems.ts`）。
- `id` 必須等於 JSON 檔名 stem；timestamps 使用 `YYYY-MM-DDTHH:mm:ss+08:00` 這類含 timezone offset 格式。
- Product 使用 `category_id`、`tag_ids`（含 brand IDs）、`offers[]`（購買外部目標）與 optional `reference_links: { title, url }[]`（非購買參考外部目標）；Guide／Link 使用 `category_ids`、`tag_ids`；不要新增 legacy `category`、`channel_id`、`reference_url` 或自由字串 `tags`。
- `status = "published"` 才能出現在首頁、指南、連結、category counts 與 search index。
- `content/taxonomies/links.json` 不是 runtime links SSOT；runtime links 來自 `content/links/*.json`。
- Facebook 連結（含 `facebook.com/share/p/*` 短網址）一律用 `agent-browser` 開來讀，不用 `curl`／WebFetch：`curl` 只拿得到截斷的 og 摘要，未登入的 headless session 就讀得到全文與作者留言。
- 原 Google Sheets TSV importer 已移除（與 ADR-11 的 content id ASCII kebab 約束不相容），不要重新引入。

## Search And Static Output

- Catalog payload 由 Nuxt server route `GET /api/content.json`（`server/api/content.json.get.ts`）即時從 `content/` 產生，納入 published products、guides、links 與 taxonomy；app 端 server 與 client 都用 `$fetch('/api/content.json')`，`pnpm generate` 會 prerender 成 `.output/public/api/content.json`。
- Search index 由 Nuxt server route `GET /search-index.json`（`server/routes/search-index.json.get.ts`）產生，納入 published products、guides、links；client MiniSearch fetch 同一個 URL，`pnpm generate` 一樣 prerender 成 static file。
- 圖片由 `@nuxt/image` 處理：`nuxt.config.ts` 設 `image.dir = '../content'` 指向專案根的 `content/`，UI 用 `<NuxtImg :src="image_url" format="webp">`（外部 http 連結圖仍用原生 `<img>`）；dev 由 IPX 即時最佳化，`pnpm generate` 用 ipxStatic 輸出到 `.output/public/_ipx`。
- `build:content-images`、`build:search-index`、`build:public-artifacts` 是 legacy CLI，不再是 generate 的必要前置步驟。
- `public/api/content.json`、`public/search-index.json`、`public/images/**`，以及 sitemap、rss、robots、llms 等 discovery 檔都已 gitignore 並從版控移除；discovery 檔由 `pnpm build:public-discovery` 在 build／dev 時即時產生，deploy 以 `.output/public` 為準。

## Routing And UI

- Static prerender routes 在 `nuxt.config.ts`：`/`、`/guide`、`/search`、`/links` 與所有 `/products/:id`，product routes 由 `scripts/build-product-routes.ts` 從 `content/products/` 建出。
- App routes：`/` 首頁、`/guide` 指南、`/search?q=` 搜尋、`/links` 連結、`/products/:id` 商品詳情。
- Navigation 使用 `NuxtLink`；mobile bottom nav 與 tablet rail 是四個主要入口，desktop sidebar 會展開 product categories。
- Nuxt 已啟用 `experimental.viewTransition: true`；做轉場時遵守 progressive enhancement 與 `prefers-reduced-motion` fallback，不要新增手寫全域轉場狀態機。

## Code Style — Styling SSOT

樣式只有一套真相，動工前先盤點既有資產再決定，禁止平行造第二套：

- **每個元素只挑一套樣式來源**：要嘛直接用 Nuxt UI 元件的預設外觀，要嘛用 `catalog.css` 的 BEM-like class；不要用 Nuxt UI 元件再疊手寫 CSS／Tailwind utility 去覆蓋它注入的樣式（例如 `UBadge` 外層硬蓋 `padding` 就是反例）。
- **共用視覺原子用既有元件**，例如 pill 一律用 `app/components/catalog-pill.vue`，不要為相似外觀新開元件——第三次重複才抽象。
- **顏色與版面走 `app/assets/styles/catalog.css` 的 `--dw-*` token**，顏色一律用 token 以支援 light/dark theme 反相，禁止寫死色值。
- **改視覺缺陷時掃同類**：修顏色／間距等問題必須一併處理對稱或同類的兄弟元件，不要只改被指名的那一個。

## Architecture Map

新增邏輯或樣式前先查既有資產所在，避免重複造輪子：

- `app/utils/content/` — 共用 comparator、id 抽取、taxonomy label 等 helper
- `scripts/public-payload/` — build-time frontend-ready payload mapper
- `app/assets/styles/catalog.css` — 公開站主要樣式（`--dw-*` token 定義於 `variables.css`）
- `content/` — 內容資料 SSOT（見 Content Model）

## Frontend Handoff

- 開發到一段落後，尤其是 frontend、navigation、routing、layout、static generate 或可見 UI 變更，交還使用者前必須實際打開網頁看過。
- 只跑 unit tests、E2E tests、`pnpm generate` 或 build 不足以代表可交還；需要確認實際頁面可載入，且主要互動沒有明顯壞掉。
- 若本機或測試網域無法開啟，必須明確回報阻塞原因與未完成的人工檢查，不可把未看過的頁面當作已驗收。
