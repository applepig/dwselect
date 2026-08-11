# Project Instructions

## Project Goal

- DW嚴選是公開靜態內容站，目標是用 Git-backed content 管理產品、指南與連結，讓使用者能清楚瀏覽推薦品項、研究內容與外部入口。
- 專案以 Nuxt SSG、Nuxt Content 與 static search index 為核心；公開站 runtime 不應依賴 Google Sheets、CMS 或外部資料 fetch。
- 內容資料的 SSOT 是 `content/` 下的 JSON 與 taxonomy files；文件 SSOT 是 `docs/<編號>-<名稱>/spec.md` 與對應 `works.md`。

## Operating Mode

- 開發遵循 Document Driven Development：需求先有 spec，實作時以測試描述驗收條件，完成後同步 works.md。
- 修改 production code 前先建立或更新測試；若是 bugfix，先重現、定位根因，再做最小修復。
- 不主動改無關架構、命名或格式；不要用 workaround 壓掉症狀，除非明確記錄風險與移除條件。
- Commit 需使用者明確授權；測試通過、generate 通過或頁面看過都不代表可以自動 commit。

## Commands

- 命令統一入口是 `./dev.sh <cmd>`；`package.json` scripts 多為其薄 wrapper，`pnpm <cmd>` 與 `./dev.sh <cmd>` 等價（CI 用 `pnpm`）。委派的有 `dev`/`test`/`lint`/`typecheck`/`generate`/`content:check`/`preview`。例外：`prepare`（pnpm 生命週期 hook）與殘留未用的 `build`（nuxt build，且 `dev.sh build`=Docker image build，命名衝突）維持直跑、不委派。
- 測試與檢查指令（`vitest.config.ts` 已用 `process.loadEnvFile()` 載入 `.env`，不必再手動帶 `APP_URL=` 前綴）：
  - `pnpm test`（單元測試）
  - `pnpm test:e2e`（Playwright E2E；需 dev/preview 服務可連線。**必須在 host 跑、不在 Alpine 容器內跑**——容器 base `node:22-alpine` 是 musl libc，無法執行 Playwright 的 glibc Chromium；host 已有 `~/.cache/ms-playwright` browser。它連既有容器 dev server（`toybox.local`），`reuseExistingServer:true` 故 dev server 活著時不會在 host 誤啟 `pnpm dev`。`baseURL` 由 `APP_URL` 組成。）
  - `pnpm lint`
  - `pnpm typecheck`（隔離 buildDir，可在常駐 dev 旁跑）
  - `pnpm generate`（SSG build；同上隔離）
  - `pnpm content:check`（content/ 資料 gate；改動內容 JSON / taxonomy 後跑）
- **Quality gate 依改動範圍分級，不要一律跑全套 verify**。判準是「這次改的東西，哪個 gate 真的會抓到它的錯」：

  | 改動範圍 | 該跑什麼 | 本機實測 |
  |---|---|---|
  | 只改 `content/**` JSON、taxonomy、content 圖片 | `pnpm content:check` | ~4.5s |
  | 只改 `docs/**`、`*.md`、`.claude/**`、`.opencode/**`、程式碼註解 | 不需要 gate | 0 |
  | 改 `app/`、`server/`、`scripts/`、`tests/`、`nuxt.config.ts`、依賴、CI 設定 | 全套 `./dev.sh exec ./dev.sh verify` | 3 分鐘起 |

  `content/**` 的 JSON 合法性、zod schema、taxonomy 參照與 published image guard 全部由 `content:check` 覆蓋（見 `scripts/content-check.mjs` 檔頭）。反過來，只要動到會進 build 的程式碼或設定，就跑全套，不要用「改很小」當理由跳過。
- **全套 quality gate 用 `./dev.sh exec ./dev.sh verify`** 在容器內跑（`test→lint→knip→typecheck→generate`，固定 production `APP_URL`），一輪測完再推；不要把 typecheck/generate deferred 到 CI 才發現紅。本機單步實測（熱快取）：`test` 27.6s、`lint` 11.4s、`knip` 9.1s、`typecheck` 21.0s、`generate` 112.7s。注意本機 `verify` **不含 E2E**，CI 才有。
- **CI 的耗時分布跟本機不一樣，不要用本機數字推論 CI**。CI 有 Nuxt build cache，`generate` 只要 44s；真正的大宗是 E2E。實測一輪 quality-gate（約 4.5 分鐘）：E2E 152s、Chromium 安裝 24s、`generate` 44s、`test` 14s、`typecheck` 7s、`lint` 5s、`knip` 2s。因此 CI 的省時關鍵是「這次改動需不需要跑 E2E」，不是 generate。`.github/workflows/static-generate.yml` 已依改動路徑條件式跳過不相關的步驟（見該檔的 Detect changed scopes step）。
- CI 沒有 `.env` 檔，靠 workflow job env 提供 `APP_URL`；`vitest.config.ts` 對 `.env` 不存在採容錯略過。

## Local Runtime

- 開發環境透過 Docker 容器執行，用 `./dev.sh start` 啟動，透過 Traefik docker label 自動註冊路由到 `https://${APP_URL}/`（預設 `dwselect.toybox.local`）。
- Host 分工：`dwselect.toybox.local` 是本機／開發站入口；`dwselect.applepig.net` 是正式站入口。CI、production build、deploy、SEO canonical 或任何公開正式環境設定，不要使用 `dwselect.toybox.local`。
- 環境設定集中在 `.env`（不進 git）：`APP_URL` 控制 Traefik 路由與 Vite allowedHosts；`NUXT_MODE=dev` 跑 dev server（含 HMR），未設定或其他值則跑 `nuxt generate` + `nuxt preview`。
- 容器管理用 `./dev.sh`（start/stop/restart/build/rebuild/logs/exec/shell/install/status/clean）；開發／建置子命令有 `dev`/`generate`/`typecheck`/`verify`/`test`/`lint`/`content-check`/`preview`。不要直接在 host 上跑 `pnpm dev`——應透過 Docker 容器（例外：Playwright e2e 在 host 跑 browser、連容器 dev server，那不是在 host 跑 dev server，見 Commands）。
- 一次性 build（`typecheck`/`generate`/`verify`）在容器內自動用隔離 buildDir（`.nuxt-build`）＋ Vite cacheDir，與常駐 dev 的 `.nuxt` 分離，可在 dev server 跑著時安全執行；`./dev.sh` 三態：容器內隔離、`CI=true` 用預設 `.nuxt`、純 host 引導進容器。隔離只在本機／容器生效，CI workflow 不需改。**唯一例外**：`verify` 鏈的 `knip` 步驟因 knip 只讀「預設」`.nuxt`（無視 `NUXT_BUILD_DIR`），會在容器內對預設 `.nuxt` 補一次 `nuxt prepare`——若 verify 在常駐 `nuxt dev` 容器內跑，這步與 live dev 輕度並行寫 `.nuxt`（prepare 冪等、不啟 Vite，最壞觸發一次 dev reload，非 chunk hash 毀損），故 knip 步驟的隔離保證不完全成立（見 `dev.sh` `cmd_knip` 註解）。
- 除錯 `toybox.local` 壞掉時，先用 `./dev.sh status` 確認容器狀態，再看 `./dev.sh logs` 查 Nuxt log；接著檢查 Traefik route/service 與 container 的 network 連線。
- `package.json` 的依賴更新後，用 `./dev.sh install`（container 內 `pnpm install`）同步；若 native module 版本不對，用 `./dev.sh rebuild` 重建 image 和 volumes。
- 不要在同一專案目錄同時跑兩個 Nuxt dev 實例（host + container），會共用 Vite cache 導致 chunk hash 衝突。

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
- `content/` — 內容資料 SSOT（JSON + taxonomy files）；Product 購買外部目標用 `offers[]`，非購買參考外部目標用 optional `reference_links: { title, url }[]`，不要再新增 legacy `reference_url`

## Frontend Handoff

- 開發到一段落後，尤其是 frontend、navigation、routing、layout、static generate 或可見 UI 變更，交還使用者前必須實際打開網頁看過。
- 只跑 unit tests、E2E tests、`pnpm generate` 或 build 不足以代表可交還；需要確認實際頁面可載入，且主要互動沒有明顯壞掉。
- 若本機或測試網域無法開啟，必須明確回報阻塞原因與未完成的人工檢查，不可把未看過的頁面當作已驗收。
