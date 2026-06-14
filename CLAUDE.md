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

## Local Runtime

- 開發環境透過 Docker 容器執行，用 `./dev.sh start` 啟動，透過 Traefik docker label 自動註冊路由到 `https://${APP_URL}/`（預設 `dwselect.toybox.local`）。
- 環境設定集中在 `.env`（不進 git）：`APP_URL` 控制 Traefik 路由與 Vite allowedHosts；`NUXT_MODE=dev` 跑 dev server（含 HMR），未設定或其他值則跑 `nuxt generate` + `nuxt preview`。
- 容器管理用 `./dev.sh`（start/stop/restart/build/rebuild/logs/exec/shell/install/status/clean）。不要直接在 host 上跑 `pnpm dev`——應透過 Docker 容器。
- 除錯 `toybox.local` 壞掉時，先用 `./dev.sh status` 確認容器狀態，再看 `./dev.sh logs` 查 Nuxt log；接著檢查 Traefik route/service 與 container 的 network 連線。
- `package.json` 的依賴更新後，用 `./dev.sh install`（container 內 `pnpm install`）同步；若 native module 版本不對，用 `./dev.sh rebuild` 重建 image 和 volumes。
- 不要在同一專案目錄同時跑兩個 Nuxt dev 實例（host + container），會共用 Vite cache 導致 chunk hash 衝突。

## Frontend Handoff

- 開發到一段落後，尤其是 frontend、navigation、routing、layout、static generate 或可見 UI 變更，交還使用者前必須實際打開網頁看過。
- 只跑 unit tests、E2E tests、`pnpm generate` 或 build 不足以代表可交還；需要確認實際頁面可載入，且主要互動沒有明顯壞掉。
- 若本機或測試網域無法開啟，必須明確回報阻塞原因與未完成的人工檢查，不可把未看過的頁面當作已驗收。
