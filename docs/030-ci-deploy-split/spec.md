# 030 CI deploy 拆分為獨立 workflow

> 狀態：實作完成（待使用者確認 + commit）
> 建立日期：2026-06-27
> 分支：接續 `028-payload-split`（PR #9）

## 背景

PR #9 的 checks 會出現 `Static Generate / deploy ... skipping`，語意上像是「有東西沒跑成功」。根因是 `static-generate.yml` 把 `quality-gate` 與 `deploy` 放同一個 workflow，`deploy` 用 `if: github.event_name == 'push' && github.ref == 'refs/heads/master'` 守門；PR 觸發的是 `pull_request` 事件，條件不符，GitHub Actions 就把 job 標成 `skipping`。

這是 GitHub Actions 的固有行為：只要 `deploy` job 屬於 PR 會觸發的 workflow，條件不符就一定顯示 skip，無法在保留同一 job 的前提下隱藏。唯一乾淨解是讓 deploy 不屬於 PR 觸發的 workflow。

## 目標

1. PR 的 checks 只列 quality-gate，不再出現 skip 的 deploy。
2. deploy 只在 push master 時觸發，行為與拆分前等價（generate 後推 Cloudflare Pages）。

## 非目標

- 不改 Cloudflare Pages 專案設定、secrets、部署目標（`--project-name=dwselect --branch=master`）。
- 不改 quality-gate 的把關內容（test/lint/typecheck/generate/assert）。

## ADR

### ADR-1：方案 A — deploy workflow 自給自足

deploy 拆成獨立 `deploy.yml`（`on: push: branches: [master]`），自己 checkout + install + generate + 部署，**不依賴** quality-gate 的 artifact。

**替代方案 B（workflow_run + 跨 run 抓 artifact）已否決**：可省一次 generate，但跨 run 抓 artifact 寫法繞、易踩權限/條件坑，且耦合兩個 workflow。

**取捨依據（benchmark PR run `28249316099`）**：quality-gate 全程 85s，其中 generate step 僅 26s。方案 A 在 master push 時多一次 install+generate，估多約 30s wall clock，且只發生在 merge 後、不影響 PR 迭代。用 30s 換兩個 workflow 各自單純、互不耦合，划算。

### ADR-2：移除 quality-gate 的 artifact upload

`Upload static artifact` step 原本只為餵 deploy 的 `download-artifact`。deploy 改自給自足後 artifact 無消費者，移除以免 dead weight（YAGNI）。

## 驗收條件

1. PR（`pull_request` 事件）的 checks 不再出現 `deploy`，只剩 `Static Generate / quality-gate`。（推上去實測）
2. push 到 master 時 `Deploy` workflow 觸發，generate 成功並部署到 Cloudflare Pages。（merge 後實測）
3. 兩個 workflow YAML 語法合法。（本機 parse 通過）

## Milestones

- **M1 — 拆檔**：新增 `.github/workflows/deploy.yml`（自給自足）；`static-generate.yml` 移除 `deploy` job 與 `Upload static artifact` step。對映驗收 1/2/3。

## 風險與注意

- **本機無法完整驗證 CI 行為**：驗收 1/2 須等實際推上去 / merge 後觀察。
- **deployments 權限**：原 `deploy` job 的 `permissions: deployments: write` 移至 `deploy.yml`；quality-gate 保留 `contents: read`。
