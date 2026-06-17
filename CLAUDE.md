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

- 測試與檢查指令（`vitest.config.ts` 已用 `process.loadEnvFile()` 載入 `.env`，不必再手動帶 `APP_URL=` 前綴）：
  - `pnpm test`（單元測試）
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm generate`（SSG build）
- CI 沒有 `.env` 檔，靠 workflow job env 提供 `APP_URL`；`vitest.config.ts` 對 `.env` 不存在採容錯略過。

## Local Runtime

- 開發環境透過 Docker 容器執行，用 `./dev.sh start` 啟動，透過 Traefik docker label 自動註冊路由到 `https://${APP_URL}/`（預設 `dwselect.toybox.local`）。
- Host 分工：`dwselect.toybox.local` 是本機／開發站入口；`dwselect.applepig.net` 是正式站入口。CI、production build、deploy、SEO canonical 或任何公開正式環境設定，不要使用 `dwselect.toybox.local`。
- 環境設定集中在 `.env`（不進 git）：`APP_URL` 控制 Traefik 路由與 Vite allowedHosts；`NUXT_MODE=dev` 跑 dev server（含 HMR），未設定或其他值則跑 `nuxt generate` + `nuxt preview`。
- 容器管理用 `./dev.sh`（start/stop/restart/build/rebuild/logs/exec/shell/install/status/clean）。不要直接在 host 上跑 `pnpm dev`——應透過 Docker 容器。
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
- `content/` — 內容資料 SSOT（JSON + taxonomy files）

## Frontend Handoff

- 開發到一段落後，尤其是 frontend、navigation、routing、layout、static generate 或可見 UI 變更，交還使用者前必須實際打開網頁看過。
- 只跑 unit tests、E2E tests、`pnpm generate` 或 build 不足以代表可交還；需要確認實際頁面可載入，且主要互動沒有明顯壞掉。
- 若本機或測試網域無法開啟，必須明確回報阻塞原因與未完成的人工檢查，不可把未看過的頁面當作已驗收。
