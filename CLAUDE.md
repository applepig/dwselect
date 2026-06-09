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

- 專案入口通常透過 `https://dwselect.toybox.local/` 經 Traefik 反向代理到本機或容器內 Nuxt dev server。
- 除錯 `toybox.local` 壞掉時，先看 Traefik route/service 與 upstream 狀態，再沿路追到 container、process、port 與 Nuxt log；不要先從瀏覽器症狀直接猜 dev server 問題。
- 若 `toybox.local` 回 `Bad Gateway`，優先檢查 Traefik 是否能連到目標 service/port，以及 Nuxt dev server 是否真的 listen 在該 upstream address。
- 不要只因為看到 `nuxt` 或 `node` process 就判定是本專案 dev server；必須確認 route 對應的 service、upstream、container identity、cwd 或 compose project，避免把其他專案的 dev server 當成本專案。
- 未確認目前沒有正確 dev server 前，不要自行啟動第二個 dev server；若需要啟動，先說明 upstream 目前無 listener 與預定 listen address。

## Frontend Handoff

- 開發到一段落後，尤其是 frontend、navigation、routing、layout、static generate 或可見 UI 變更，交還使用者前必須實際打開網頁看過。
- 只跑 unit tests、E2E tests、`pnpm generate` 或 build 不足以代表可交還；需要確認實際頁面可載入，且主要互動沒有明顯壞掉。
- 若本機或測試網域無法開啟，必須明確回報阻塞原因與未完成的人工檢查，不可把未看過的頁面當作已驗收。
