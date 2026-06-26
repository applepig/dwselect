# 030 CI deploy 拆分 — 工作紀錄

## 摘要

把 `static-generate.yml` 裡靠 `if` 守門的 `deploy` job 拆成獨立 `deploy.yml`（`on: push: branches: [master]`），讓 PR 的 checks 不再出現 `deploy ... skipping`。deploy 改自給自足（自己 generate），不依賴跨 run artifact。

## 變更檔案

- `.github/workflows/deploy.yml`（新增）：`on: push: branches: [master]`；checkout → setup pnpm/node 24 → `pnpm install --frozen-lockfile` → restore Nuxt cache → `pnpm generate`（帶 `APP_URL=dwselect.applepig.net`、`DWSELECT_ALLOW_HOST_GENERATE=1`）→ `cloudflare/wrangler-action@v3` 部署。`permissions: contents: read, deployments: write`。
- `.github/workflows/static-generate.yml`：移除 `deploy` job 與只為餵它而存在的 `Upload static artifact` step。現純做 PR/push 的 quality-gate。

## 驗證

- 本機 YAML parse：`deploy.yml`、`static-generate.yml` 皆 OK（未裝 actionlint，退回 python `yaml.safe_load`）。
- benchmark（PR run `28249316099`）：quality-gate 全程 85s，generate step 26s；方案 A 估多約 30s wall clock（只在 master push）。

## 待驗（須推上去 / merge 後實測，本機無法驗）

- 驗收 1：PR checks 不再出現 `deploy`，只剩 `Static Generate / quality-gate`。
- 驗收 2：push master 時 `Deploy` workflow 觸發、generate 成功並部署 Cloudflare Pages。

## 待辦

- 待使用者授權後 commit + push（注意：working tree 另有未提交的 `CLAUDE.md` 改動，非本次範圍，commit 時勿混入）。
