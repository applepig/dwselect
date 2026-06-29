# 029 Build 環境隔離 + dev.sh 統一命令入口

> 狀態：已確認 + 實作完成（M1–M5 全綠，待 commit）
> 建立日期：2026-06-26
> 分支：接續 `028-payload-split`（PR #9）

## 背景

PR #9 的 CI 反覆紅燈，暴露兩個結構問題：

1. **dev 與 build 共用 `.nuxt` / Vite cache**：本機/容器跑著常駐 `nuxt dev`（持有 `buildDir=.nuxt`、`vite.cacheDir=node_modules/.cache/vite`）時，無法在同一份 repo 跑 `typecheck` / `generate` / `build`——會 chunk hash 互踩、弄壞 dev server。結果是 `typecheck` / `generate` 一直 deferred 到 CI，本機驗不了，PR 推上去才發現紅。
2. **命令四散**：開發/建置命令散落在 `package.json` scripts、`pnpm exec nuxt …`、`./dev.sh` 三處，語意重疊又互不一致（例如 `./dev.sh build` 是重建 Docker image，`pnpm build` 是 `nuxt build`，毫無關係）。

本 sprint 目標：讓常駐 dev 與一次性 build/test 在同一份 repo 互不阻擋，並把命令收斂到 `dev.sh` 單一入口，使「平常用 dev mode、又能隨時對齊 CI 跑完整檢查」成為日常。

## 命令分類（SSOT）

| 類別 | 命令 | 碰 `.nuxt`/Vite cache | 需隔離 |
|------|------|:---:|:---:|
| **DEV**（常駐，佔用方） | `nuxt dev` | ✅ 持有 | — |
| **BUILD**（一次性） | `nuxt typecheck` / `generate` / `build` / `prepare` | ✅ | ✅ |
| **BUILD**（讀 `.output`） | `nuxt preview` | ⬜ | — |
| **中性**（隨時可跑） | `test`(vitest node) / `lint` / `content:check` / `build:public-*`(產 `public/` artifacts) / `test:e2e` | ⬜ | — |
| **DEPLOY** | CI `deploy` job → Cloudflare Pages（本機無對應命令） | — | — |
| **容器編排** | `dev.sh start/stop/restart/build/rebuild/logs/exec/shell/install/status/clean` | — | — |

> 只有 **BUILD（碰 `.nuxt`）那組** 需要與常駐 dev 隔離。中性那組（含 `test`/`lint`）本就不碰 buildDir，隨時可跑。

## 目標

1. **buildDir / Vite cacheDir 可由環境變數覆寫**，預設值不變（dev 行為零影響）。
2. **BUILD 類命令在「本機/容器」自動使用隔離目錄**（`.nuxt-build` / `node_modules/.cache/vite-build`），與常駐 dev 的 `.nuxt` 分離。
3. **`dev.sh` 成為唯一命令入口**：`package.json` scripts 收斂成委派 `./dev.sh <cmd>` 的薄 wrapper，命令只有一套真相。
4. **提供對齊 CI 的本機一鍵驗證**（`./dev.sh verify`）：依 CI 順序跑 `test → lint → typecheck → generate`，帶隔離 env 與 production `APP_URL`，跑完不擾動常駐 dev。

## 非目標

- 不改 deploy 流程與 Cloudflare Pages 設定。
- 不重寫測試套件（025 的範疇）；本 sprint 只新增隔離相關的最小測試。
- 不追求「host 直接跑 build」；純 host 的 BUILD 類一律引導進容器（沿用現狀紀律，避免污染共用 cache）。
- 不改變 CI 在乾淨環境用預設 `.nuxt` 的行為（CI 無常駐 dev，不需隔離）。

## User Story

- 作為開發者，我在容器裡開著 `nuxt dev`（HMR）的同時，能跑 `./dev.sh typecheck` / `./dev.sh generate` 驗證,不會弄壞 dev server，也不必停掉它。
- 作為開發者，推 PR 前我能跑 `./dev.sh verify` 在本機重現 CI 的 quality-gate，把問題一輪修完再推，而不是推上去等 CI 紅。
- 作為維護者，我只需記住 `./dev.sh <cmd>`，不必分辨某個動作該用 `pnpm` 還是 `dev.sh`。

## ADR

### ADR-1：dev.sh 為唯一入口，package.json 委派
`package.json` 的 `dev`/`generate`/`typecheck`/`preview`/`test`/`lint`/`content:check` 改為 `./dev.sh <cmd>`。`build:public-*` 等底層 node script 保留原樣（被 dev.sh 內部呼叫）。理由：單一入口、隔離 env 只在一處注入。

**兩個委派例外**（實作時確認）：
- `prepare`（`nuxt prepare`）**不委派**：它是 pnpm 生命週期 hook，`pnpm install` 後自動觸發，必須能在 host／CI／容器任何環境直跑，不能走 dev.sh 的 docker 分支。
- `build`（`nuxt build`）**不委派**：全專案無任何使用（SSG 走 generate，不用 SSR build），且與 `dev.sh build`（Docker image build）命名衝突。維持殘留現狀，於 usage 標註 `dev.sh build` ≠ nuxt build；真要委派留待後續並先改名。

### ADR-2：三態環境判斷決定是否隔離
dev.sh 的 BUILD 類命令依環境自動分流：
- **容器內**（`/.dockerenv` 或 `DWSELECT_IN_CONTAINER=1`）：本機開發環境，常駐 dev 可能在跑 → 注入 `NUXT_BUILD_DIR=.nuxt-build`、`VITE_CACHE_DIR=node_modules/.cache/vite-build`。
- **CI**（`CI=true`，GitHub Actions 自動設）：乾淨環境、無 dev server → 用預設 `.nuxt`，不隔離（與 workflow cache key 一致）。
- **純 host**（非容器、非 CI）：BUILD 類引導進容器（`docker compose exec`），不在 host 直跑。

理由：隔離只對「有常駐 dev」的本機/容器有意義；CI 維持預設 `.nuxt` 讓 workflow 的 cache 與既有設定**完全不用動**，風險最低。

### ADR-3：buildDir / cacheDir 在 nuxt.config env-driven
```ts
buildDir: process.env.NUXT_BUILD_DIR || '.nuxt',
vite: { cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.cache/vite', /* 既有 plugin 不動 */ },
```
未設環境變數時與現狀完全相同。

### ADR-4：verify 對齊 CI
`./dev.sh verify` 在容器內依序跑 `test → lint → typecheck → generate`，注入隔離 env 與 `APP_URL=dwselect.applepig.net`（對齊 CI 的 production host，符合「build/generate 不用 toybox.local」紀律）。host 端的 `verify` 透過 `docker compose exec` 進容器執行。

### ADR-5：沿用既有 fake-command fixture 測試
不引入 dry-run 分支。沿用 `tests/dev-server-script.test.ts` 既有的 fake-command + call-log fixture（假 `pnpm`/`nuxt`/`docker`/`node` 記錄收到的 args 與 env），讓 fake `nuxt`/`pnpm` 印出收到的 `NUXT_BUILD_DIR`/`VITE_CACHE_DIR`/`APP_URL` 以斷言三態分流與 env 注入。理由：測真實命令組裝比另闢 dry-run 分支更貼近行為，且重用既有資產。
**同時修正**：`runDevSh` helper 需清掉洩漏的 `CI`，否則 GitHub Actions 的 `CI=true` 會讓「純 host」案例誤入 CI 分支而紅。

### ADR-6：is_container 的強制 host 接縫（實作時新增）
`is_container` 加入 `DWSELECT_IN_CONTAINER=0` → 強制回傳「非容器」。理由：`verify` 在容器內會跑 `pnpm test`，而 `dev-server-script.test.ts` 的 host 案例靠 `is_container` 判斷；容器內 `/.dockerenv` 恆存在會使 host 案例無法測。測試 helper 預設注入 `DWSELECT_IN_CONTAINER='0'` 模擬 host，容器態案例覆寫成 `'1'`。這讓整個測試套件能在容器內（即 `verify` 的 test 步）正確執行。

## 驗收條件

1. nuxt.config 未設 `NUXT_BUILD_DIR`/`VITE_CACHE_DIR` 時，buildDir 仍為 `.nuxt`、cacheDir 仍為 `node_modules/.cache/vite`。（自動測試）
2. 容器態（`DWSELECT_IN_CONTAINER=1`）`./dev.sh typecheck`，fake 命令記錄到 `NUXT_BUILD_DIR=.nuxt-build`、`VITE_CACHE_DIR=…/vite-build`。（自動測試）
3. CI 態（`CI=true`）`./dev.sh typecheck` 直跑工具、無隔離 env（用預設 `.nuxt`）、不嘗試進 docker。（自動測試）
4. 容器態 `./dev.sh verify` 的 call log 序列為 `test → lint → typecheck → generate`，且 typecheck/generate 帶 `APP_URL=dwselect.applepig.net`。（自動測試）
5. `package.json` 的對應 scripts 內容為 `./dev.sh <cmd>` 委派。（自動測試／或 lint 級檢查）
6. **操作驗證**：容器內常駐 `nuxt dev` 時，`./dev.sh typecheck`、`./dev.sh generate` 能成功完成且 dev server 仍正常（HMR 未壞、頁面可載入）。
7. **操作驗證**：`./dev.sh verify` 在本機跑完 `test/lint/typecheck/generate` 全綠（即 CI quality-gate 等價）。
8. CI workflow 不需修改即維持綠燈（或僅最小調整，於 works 記錄）。

## Milestones

- **M1 — nuxt.config env 化**：buildDir/cacheDir 改吃環境變數 + `.gitignore` 加 `.nuxt-build`（`.nuxt*` 涵蓋）。對映驗收 1。
- **M2 — dev.sh 三態分流 + 隔離注入 + dry-run 接縫**：抽 BUILD 類共用執行函式，實作 ADR-2/5。對映驗收 2/3。
- **M3 — verify 命令**：實作 ADR-4。對映驗收 4。
- **M4 — package.json 收斂委派**：scripts 改為 `./dev.sh <cmd>`。對映驗收 5；確認 CI workflow 仍綠（驗收 8）。
- **M5 — 操作驗證 + typecheck fix 並入**：容器內常駐 dev 下跑通 `verify`，含 028 遺留的 `extract-content-id.ts` typecheck fix；全綠後一次推。對映驗收 6/7。

## 風險與注意

- **CI 行為改變風險**：M4 把 `pnpm test/lint/...` 改委派 dev.sh 後，CI step（`run: pnpm test`）行為依賴 dev.sh 在 `CI=true` 下正確直跑。需在 M4 驗證 CI 仍綠；若有落差，最小調整 workflow 並記錄。
- **entrypoint chown 清單**：`cmd_entrypoint` 目前只 mkdir/chown `.nuxt .output node_modules`；若 `.nuxt-build` 在容器內由 root 建立需一併納入，避免 node 使用者寫入失敗。M2 處理。
- **`DWSELECT_ALLOW_HOST_GENERATE`**：現由 CI generate step 使用；M2/M4 改用 `CI=true` 判斷後，保留相容或同步調整 workflow，二擇一於 works 記錄。
