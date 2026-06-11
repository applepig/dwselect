# 008.7 Docker Dev Serve — 工作紀錄

## Milestone 1：Docker 基礎設施

- 單一 Dockerfile（node:20-alpine），不用多階段 build
- `docker-entrypoint.sh` 依 `NUXT_MODE` 切換：`dev` → `pnpm dev`，否則 → `pnpm generate && pnpm preview`
- `docker-compose.yml` 用 `${APP_URL:-localhost}` 做 Traefik label 替換，anonymous volumes 保護 node_modules/.nuxt/.output
- 不 expose host port，全靠 Traefik `web` network 連線
- `.gitignore` 加入 `.env`

## Milestone 2：Codebase 環境變數遷移

- `nuxt.config.ts`：`allowedHosts` 改讀 `process.env.APP_URL ?? 'localhost'`；新增 `vite.server.hmr`（protocol: wss、clientPort: 443）讓 HMR WebSocket 走 Traefik
- `playwright.config.ts`：`baseURL` 和 `webServer.url` 改用 template literal 讀 `APP_URL`；`webServer.command` 移除 `--host ::`
- `package.json`：`dev` script 從 `nuxt dev --host ::` 改為 `nuxt dev`
- `tests/dev-server-script.test.ts`：更新斷言驗證 env var fallback 行為
- 全部 165 tests passed

## Milestone 3：dev.sh 管理腳本

- 參考 aistudio 的 dev.sh，調整為：移除 COMPOSE_FILE 變數、pnpm install、從 .env 讀 APP_URL 顯示提示
- 子指令：start/stop/restart/build/rebuild/logs/exec/shell/install/status/clean

## Milestone 4：文件更新

- CLAUDE.md Local Runtime 區段改寫為 Docker 化流程：`./dev.sh start` 啟動、`.env` 設定、container 管理指令
- Frontend Handoff 區段未修改（內容仍適用）

## 驗收：Frontend Handoff

- container `dwselect-app` 穩定運作，Traefik 路由 `https://dwselect.toybox.local/` 回 200（178KB SSR）
- 實際以瀏覽器開啟驗收：
  - 首頁渲染完整——header、`62 件`、分類 chips（居家 17／廚房 13／電腦 9／3C 9／影音 9／食材 4）、商品卡片（圖片／價格／描述）、底部 nav，client hydration 無異常
  - 商品詳情頁 `/products/2026-06-02-blueair-3250空氣清淨機` routing 正常——back button、商品大圖＋尺寸標註、tag chips、標題、價格皆正確
- 結論：Docker 化後可見頁面與主要互動正常，008.7 可交還

## 收尾雜項

- 清除 `tests/post-edit-hook.test.ts` 被中斷時殘留的孤兒臨時目錄
- `.gitignore` 加入 `tests/post-edit-hook-fixture-*/`，避免測試中斷時的臨時目錄污染 git status
