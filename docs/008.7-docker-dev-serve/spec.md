# dwselect Docker 化

## 目標

把 dwselect 的 dev/serve 環境包成 Docker container，透過 Traefik docker label 路由，消除 host port 曝露和 hardcode IP/URL 問題。以 `.env` 集中管理環境設定，讓開發環境可攜、安全、一鍵啟動。

## 非目標

- 不做 CI/CD pipeline 或遠端部署流程
- 不做多階段 Dockerfile 最佳化（production image 瘦身）
- 不做 nginx 替換 nuxt preview
- 不處理 Traefik 本身的設定遷移（file provider → docker label 的切換由使用者手動處理）

## User Story

作為開發者，我想要用 `./dev.sh start` 一鍵啟動 dwselect，自動在 Traefik 註冊路由，不需要手動設定 IP、port 或 host flag，以便安全且一致地在 `https://dwselect.toybox.local` 存取開發環境。

### 驗收條件

- [ ] `.env` 定義 `APP_URL` 和 `NUXT_MODE`，所有設定從這裡讀取
- [ ] `NUXT_MODE=dev` 時，container 跑 `nuxt dev` 並支援 HMR hot reload
- [ ] `NUXT_MODE` 未設定或非 `dev` 時，container 跑 `nuxt generate` + `nuxt preview`
- [ ] Container 透過 Traefik docker label 自動註冊路由，不需 file provider
- [ ] Container 不曝露 host port（不綁定 `0.0.0.0:<port>` 到 host）
- [ ] `nuxt.config.ts`、`playwright.config.ts` 從 `APP_URL` 環境變數讀取 host，不再 hardcode
- [ ] `package.json` 的 `dev` script 移除 `--host ::` flag
- [ ] `dev.sh` 提供 start/stop/restart/build/rebuild/logs/exec/shell/status/clean 子指令
- [ ] 既有測試更新後全部通過
- [ ] CLAUDE.md 的 Local Runtime 區段反映 Docker 化後的流程

## 相關檔案

- `nuxt.config.ts:39` — `vite.server.allowedHosts` hardcode `dwselect.toybox.local`
- `playwright.config.ts:9,14-15` — `baseURL` 和 `webServer.url` hardcode
- `tests/dev-server-script.test.ts` — 測試 `--host ::` 和 hardcode host
- `package.json:8` — `dev` script 含 `--host ::`
- `CLAUDE.md` — Local Runtime 區段

### 參考實作

- `/home/applepig/Dropbox/projects/5-aistudio/` — Dockerfile、docker-compose.dev.yml、dev.sh、.dockerignore

## 介面/資料結構

### `.env` 環境變數

```env
# 應用程式 URL（Traefik 路由用）
APP_URL=dwselect.toybox.local

# dev = nuxt dev（含 HMR）；空或其他值 = nuxt generate + preview
NUXT_MODE=dev
```

### Docker Compose labels（Traefik 整合）

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.dwselect.rule=Host(`${APP_URL}`)"
  - "traefik.http.routers.dwselect.entrypoints=websecure"
  - "traefik.http.routers.dwselect.tls=true"
  - "traefik.http.services.dwselect.loadbalancer.server.port=3000"
```

### docker-entrypoint.sh 行為

```
NUXT_MODE=dev  → exec pnpm dev
NUXT_MODE=*    → pnpm generate && exec pnpm preview
```

### nuxt.config.ts HMR 設定（dev mode in Docker）

```ts
vite: {
  server: {
    allowedHosts: [process.env.APP_URL ?? 'localhost'],
    hmr: {
      protocol: 'wss',
      host: process.env.APP_URL,
      clientPort: 443,
    },
  },
}
```

瀏覽器透過 `wss://${APP_URL}:443` 連回 Traefik，Traefik 代理 WebSocket 到 container port 3000。

## 邊界案例

- **缺少 `.env` 檔案**：`docker-compose.yml` 使用 `${APP_URL:-localhost}` 提供 fallback，確保 compose 不會因缺少 `.env` 直接報錯。`docker-entrypoint.sh` 在 `APP_URL` 為空時 fallback 到 `localhost`。
- **node_modules 不同步**：host 上 `package.json` 更新後，container 內的 anonymous volume 仍是舊的。`dev.sh install` 在 container 內重跑 `pnpm install`；`dev.sh rebuild` 清掉 volume 重建。
- **HMR 在 Docker 不通**：若 Nuxt 的 HMR WebSocket 不走 port 3000（而是獨立 port 24678），需要在 compose 加第二條 Traefik route 或 expose port。Milestone 2 驗證時若不通，fallback 到 expose 24678。
- **Playwright E2E 在 Docker 外跑**：E2E 測試仍在 host 上執行（Playwright 連到 Traefik URL），`playwright.config.ts` 的 `webServer` 區段在 Docker 模式下應 `reuseExistingServer: true`，不自行啟動 dev server。

## ADR

### ADR-1：單一 Dockerfile + NUXT_MODE 切換 vs. 分離的 dev/prod compose files

- **決策**：單一 Dockerfile + 單一 docker-compose.yml，用 `NUXT_MODE` 環境變數切換行為
- **原因**：dwselect 是個人靜態站，dev 和 build+serve 的 container 需求幾乎相同（同一 base image、同一 volume mount）。分離兩個 compose file（如 aistudio）增加維護成本但沒有對應收益。
- **替代方案**：aistudio 的雙 compose 模式（docker-compose.yml + docker-compose.dev.yml），每個有不同的 target stage 和 volume 設定。對需要精細控制 dev/prod 差異的專案更適合，但 dwselect 不需要。

### ADR-2：nuxt preview 作為 production serve

- **決策**：非 dev 模式用 `nuxt generate` + `nuxt preview` serve 靜態站
- **原因**：h3/Nitro 引擎效能對個人站流量綽綽有餘，零額外依賴，與 Nuxt 版本一起更新。
- **替代方案**：nginx 多階段 build，更輕量、更成熟的 cache-control/brotli，但增加 Dockerfile 複雜度和額外 config 維護。流量需求改變時再遷移。

## Milestones

### Milestone 1：Docker 基礎設施

> 範圍：新增 `.env.example`、`.dockerignore`、`Dockerfile`、`docker-entrypoint.sh`、`docker-compose.yml`；更新 `.gitignore`
> 驗證：`docker compose config` 不報錯；`docker compose build` 成功建立 image
> 預期結果：Docker 基礎設施檔案就位，image 可 build

- [x] 建立 `.env.example`（`APP_URL`、`NUXT_MODE`）
- [x] 建立 `.dockerignore`（參考 aistudio）
- [x] 建立 `Dockerfile`（node:20-alpine、pnpm、better-sqlite3 build tools）
- [x] 建立 `docker-entrypoint.sh`（NUXT_MODE 分支邏輯）
- [x] 建立 `docker-compose.yml`（Traefik labels、source mount、anonymous volumes）
- [x] 更新 `.gitignore`（加入 `.env`、排除 `.env.example`）

### Milestone 2：Codebase 環境變數遷移

> 範圍：`nuxt.config.ts`、`playwright.config.ts`、`package.json`、`tests/dev-server-script.test.ts`
> 驗證：`pnpm test` 全部通過
> 預期結果：所有 hardcode 的 `dwselect.toybox.local` 和 `--host ::` 被環境變數取代

- [x] `nuxt.config.ts` — `allowedHosts` 讀 `APP_URL`；加 `vite.server.hmr` 設定
- [x] `playwright.config.ts` — `baseURL` 和 `webServer.url` 讀 `APP_URL`；移除 `webServer.command` 的 `--host ::`
- [x] `package.json` — `dev` script 改為 `nuxt dev`（移除 `--host ::`）
- [x] `tests/dev-server-script.test.ts` — 更新測試斷言

### Milestone 3：dev.sh 管理腳本

> 範圍：新增 `dev.sh`
> 驗證：`./dev.sh` 印出 usage；`./dev.sh start` 啟動 container；`./dev.sh logs` 印出 log
> 預期結果：一鍵管理 Docker container 生命週期

- [x] 建立 `dev.sh`（start/stop/restart/build/rebuild/logs/exec/shell/install/status/clean）

### Milestone 4：文件更新

> 範圍：`CLAUDE.md` Local Runtime 區段
> 驗證：人工確認文件正確反映新流程
> 預期結果：CLAUDE.md 指引後續 session 正確操作 Docker 化的開發環境

- [x] 更新 CLAUDE.md 的 Local Runtime 區段
- [x] 更新 CLAUDE.md 的 Frontend Handoff 區段（若需要）
