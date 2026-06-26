# 029 Build 環境隔離 — 工作紀錄

## 摘要

讓常駐 `nuxt dev` 與一次性 build（typecheck/generate）在同一份 repo 互不阻擋，並把命令收斂到 `dev.sh` 單一入口。同時並入 028 遺留、導致 PR #9 CI 紅的 `extract-content-id.ts` typecheck fix。

## 變更檔案

- `nuxt.config.ts`：`buildDir` / `vite.cacheDir` 改吃 `NUXT_BUILD_DIR` / `VITE_CACHE_DIR`，未設時維持 Nuxt 預設。
- `dev.sh`：
  - 新增 `can_run_build_here`（三態：容器內／CI／顯式放行）與 `run_nuxt_isolated`（容器內注入 `.nuxt-build` + `node_modules/.cache/vite-build`）。
  - 新增子命令 `typecheck` / `verify` / `test` / `lint` / `content-check` / `preview`。
  - `cmd_generate` 改用 `can_run_build_here`；`cmd_generate_inner` 的 `nuxt generate` 改走 `run_nuxt_isolated`。
  - `is_container` 加 `DWSELECT_IN_CONTAINER=0` 強制 host 接縫（讓測試能在容器內跑）。
  - entrypoint 的 mkdir/chown 清單加入 `.nuxt-build`。
  - usage 更新，標註 `dev.sh build` ≠ nuxt build。
- `package.json`：`test`/`lint`/`typecheck`/`content:check`/`preview` 委派 `./dev.sh <cmd>`（`dev`/`generate` 先前已委派）。`prepare`/`build` 維持直跑（見 spec ADR-1 例外）。
- `.gitignore`：加 `.nuxt-build`。
- `app/utils/content/extract-content-id.ts`：028 typecheck fix（`split('?')[0]` 在 `noUncheckedIndexedAccess` 下 possibly undefined → destructuring 預設值）。
- 測試：`tests/build-env-isolation.test.ts`（新增，nuxt.config 預設值）；`tests/dev-server-script.test.ts`（新增 typecheck 三態 + verify 序列 + package.json 委派；helper 改注入 `DWSELECT_IN_CONTAINER='0'` 並清 `CI`；entrypoint chown 斷言加 `.nuxt-build`）；`tests/lint-config.test.ts`（lint/typecheck 改委派值）。

## 驗證

- Host：`pnpm exec vitest run --exclude tests/e2e/**` → **555 passed**。
- 容器內常駐 dev 旁：`./dev.sh exec ./dev.sh typecheck` → exit=0、`.nuxt-build` 生成（隔離成立、028 fix 生效）。
- 容器內：`dev-server-script.test.ts` 16 passed（host 接縫在容器內也成立）。
- **對齊 CI 一鍵**：`./dev.sh exec ./dev.sh verify` → exit=0（test 555 → lint → typecheck 隔離 → generate **Prerendered 516 routes / Generated .output/public**）。
- 常駐 dev server：隔離 build 後 `https://dwselect.toybox.local/` 仍回 **HTTP 200**；`.nuxt`/`.nuxt-build`/`.output` 三者並存。

## CI 影響

CI workflow（`static-generate.yml`）**未修改**。`run: pnpm test/lint/typecheck/generate` 命令名不變，內容委派 dev.sh 後：test/lint 直跑工具；typecheck 在 `CI=true`（非容器）走預設 `.nuxt`；generate 沿用 workflow 既有的 `DWSELECT_ALLOW_HOST_GENERATE=1`。隔離只在「有常駐 dev」的本機/容器生效，CI 乾淨環境用預設 `.nuxt`，與 workflow cache key 一致。

## 待辦

- 待使用者授權後 commit + push（一輪修完再推；含 028 typecheck fix）。
- 後續（非本 sprint）：若要委派 `build`/`prepare`，需先解 `dev.sh build` 命名衝突與生命週期 hook 限制。
