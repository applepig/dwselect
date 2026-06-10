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
