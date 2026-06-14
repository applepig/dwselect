# Production Cloudflare Pages Deploy

## 目標

建立 DW嚴選正式站部署流程：當 `master` 更新時，由 GitHub Actions 執行品質閘門、產生 Nuxt static output，並用 Wrangler direct upload 部署 `.output/public` 到 Cloudflare Pages，正式網址為 `https://dwselect.applepig.net/`。

## 非目標

- 不改 Nuxt app 的 runtime 架構；維持 `nitro.preset: 'static'` 與 SSG。
- 不把 build 交給 Cloudflare Git integration；CI/CD 控制權留在 GitHub Actions。
- 不新增 Cloudflare Functions、SSR、Workers API 或動態後端。
- 不變更 content model、商品資料、taxonomy 或 search index schema。
- 不在 repo 內儲存 Cloudflare Account ID、API token 或其他 secrets。
- 不把 PR preview deployment 納入本 sprint；PR 只做品質驗證。

## User Story

作為站點維護者，我想要 merge / push 到 `master` 後自動部署正式站，以便內容或程式碼更新能可靠、安全地發佈到 `dwselect.applepig.net`。

### 驗收條件

- [x] GitHub Actions 在 pull request 時執行品質驗證，但不部署 Cloudflare Pages。
- [x] GitHub Actions 在 `master` push 時執行 `pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`，全部通過後才部署。
- [x] Deploy job 使用 Cloudflare 官方建議的 Wrangler direct upload，部署目錄固定為 `.output/public`。
- [x] Deploy job 使用 GitHub Actions secrets `CLOUDFLARE_ACCOUNT_ID` 與 `CLOUDFLARE_API_TOKEN`，不把 secret value 寫入 repository。
- [x] Cloudflare CI token 以一次性 bootstrap token 透過 Cloudflare API 建立，正式 deploy token 只保存在 GitHub Actions secrets；bootstrap token 用後需撤銷或依短 TTL 失效。
- [x] Cloudflare Pages project 名稱固定為 `dwselect`，production branch 對應 `master`。
- [x] Cloudflare Pages custom domain 設定為 `dwselect.applepig.net`，並能以 HTTPS 開啟首頁。
- [x] `.output/public` 不包含 Google Sheets TSV runtime 指標。
- [x] README 或部署文件說明首次設定 Cloudflare Pages、GitHub secrets、custom domain 與部署驗證方式。

## 相關檔案

- `.github/workflows/static-generate.yml` — 目前已有 static generate workflow，但觸發 branch 是 `main`，需要改成 production deploy workflow 或調整為正確的 `master` 觸發。
- `package.json` — 定義 `pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate` 等 CI 指令。
- `nuxt.config.ts` — 維持 static preset、prerender routes 與 public assets 設定。
- `README.md` — 補充正式部署與 Cloudflare Pages 設定說明。
- `docs/CONTENT.md` — 既有 content / generated artifact 邊界參考。

## 介面／資料結構（API / Data Structure）

本 sprint 不新增 runtime API。CI/CD 介面如下：

- Protocol：GitHub Actions workflow + Cloudflare Pages API，透過 `cloudflare/wrangler-action` 呼叫 Wrangler。
- Input：GitHub repository push / pull request event。
- Secrets：`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`。
- Artifact：Nuxt static output `.output/public`。
- Deploy command：`pages deploy .output/public --project-name=dwselect`。

GitHub Actions secrets 不提供 JSON request / response；Cloudflare API response 由 Wrangler action 管理，workflow 只需依 action exit code 判定成功或失敗。

### Credential provisioning

- Bootstrap：使用 Cloudflare Dashboard 建立短效 `Create additional tokens` bootstrap token，暫放本機 `.env` 的 `CF_BOOTSTRAP_TOKEN`，只用於建立正式 CI deploy token。
- CI token：透過 Cloudflare API 建立 `dwselect-github-actions-pages-deploy` token，scope 限定 account `13d1b2ba390f1f8615248e2b444b259c`，permission group 使用 account-scoped `Pages Write`。
- GitHub secrets：用 GitHub CLI 寫入 `CLOUDFLARE_ACCOUNT_ID=13d1b2ba390f1f8615248e2b444b259c` 與 `CLOUDFLARE_API_TOKEN=<CI token>`。
- Secret handling：不得把 bootstrap token 或 CI token secret value 印在 log、文件或 commit diff；bootstrap token 用後需撤銷或確認短 TTL。

## 邊界案例

- Case 1：PR 觸發 workflow 時不得 deploy。處理方式：deploy job 加上 `if: github.event_name == 'push' && github.ref == 'refs/heads/master'` 或等價條件。
- Case 2：Cloudflare secrets 未設定或 token 權限不足。處理方式：品質閘門仍可執行，deploy job 失敗並在 GitHub Actions log 顯示缺少 credentials 或權限錯誤；文件需列出所需 token permission：Account / Cloudflare Pages / Edit。
- Case 3：`pnpm generate` 成功但 Google Sheets runtime assertion 失敗。處理方式：不得部署，需先修正 runtime source 或 generated output。
- Case 4：Cloudflare custom domain 已新增但 DNS 尚未生效。處理方式：deployment 可先在 `*.pages.dev` 驗證，正式驗收需等 `https://dwselect.applepig.net/` 回 200。
- Case 5：workflow 仍監聽 `main`。處理方式：本 sprint 明確修正為 `master`，因 GitHub remote HEAD branch 是 `master`。
- Case 6：bootstrap token 留在 `.env`。處理方式：`.env` 不得 commit；正式 CI token 建立並寫入 GitHub secrets 後，使用者需撤銷 bootstrap token 或確認其 TTL 已足夠短。

## ADR（Architecture Decision Record）

### ADR 1：用 GitHub Actions + Wrangler direct upload 部署 Cloudflare Pages

- 決策：正式部署由 GitHub Actions build / test / generate，再用 `cloudflare/wrangler-action` direct upload `.output/public`。
- 原因：專案已有 GitHub Actions static generate 基礎，且 DW嚴選公開站是 Nuxt SSG；讓 GitHub Actions 統一負責品質閘門與部署可避免 Cloudflare Git integration 與 GitHub CI 分散責任。
- 替代方案：Cloudflare Git integration。排除原因是 build / deploy 狀態會分散到 Cloudflare，且較難保證部署前完整跑本 repo 定義的 CI 等級驗證順序。

### ADR 2：production branch 使用 `master`

- 決策：`master` 是 production trigger branch。
- 原因：目前 GitHub remote HEAD branch 是 `master`，使用者也確認正式發佈以 `master` 為準；既有 workflow 寫 `main` 與 repo 實況不一致。
- 替代方案：改用 `main`。排除原因是需要額外搬移 GitHub default branch 與 branch protection，不是本 sprint 的必要價值。

### ADR 3：Cloudflare Pages project 名稱固定為 `dwselect`

- 決策：Cloudflare Pages project name 使用 `dwselect`，正式 custom domain 使用 `dwselect.applepig.net`。
- 原因：project name 簡短、與 repository / domain 對齊，deploy command 可穩定寫入 workflow。
- 替代方案：使用 `dwselect-production`。排除原因是目前沒有 staging / preview project 拆分需求，名稱會增加不必要的操作成本。

## Milestones

### Milestone 1：部署 workflow 設計與品質閘門

> 範圍：`.github/workflows/static-generate.yml` 或新的 Cloudflare Pages workflow、`package.json` 指令使用方式。
> 驗證：本機執行 `pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`。
> 預期結果：workflow 在 PR 與 `master` push 都先跑完整品質閘門，且 branch trigger 使用 `master`。

- [x] Red → Green → Refactor

### Milestone 2：Cloudflare Pages deploy job

> 範圍：GitHub Actions deploy job、Wrangler action 設定、GitHub deployment permission。
> 驗證：workflow YAML 只在 `refs/heads/master` push deploy；缺少 secrets 時能明確失敗；有 secrets 時部署 `.output/public` 到 `dwselect` Pages project。
> 預期結果：`master` push 通過品質閘門後自動產生 Cloudflare Pages production deployment。

- [x] Red → Green → Refactor

### Milestone 3：Cloudflare credential 與 Pages project

> 範圍：Cloudflare API token provisioning、GitHub repository secrets、Cloudflare Pages project `dwselect`。
> 驗證：`wrangler pages project list --json` 能以 GitHub Actions 同等 token 成功查詢；Pages project `dwselect` 存在。
> 預期結果：GitHub Actions 已具備部署所需 secrets，Cloudflare 帳號內已有 target Pages project。

- [x] Red → Green → Refactor

### Milestone 4：Cloudflare custom domain 與文件

> 範圍：custom domain `dwselect.applepig.net`、DNS / Pages custom domain 設定、README 部署說明。
> 驗證：`https://dwselect.applepig.net/` HTTPS 回 200；首頁可載入；`*.pages.dev` production deployment 與 custom domain 指向同一份 build。
> 預期結果：維護者能依文件重建 secrets / domain 設定，正式站可透過 custom domain 開啟。

- [x] Red → Green → Refactor

## Spec Self-Review

- 需求完整性：已涵蓋使用者提出的 GitHub CI/CD、`master` 發佈、自動 deploy、正式網址 `dwselect.applepig.net`、Cloudflare Pages 由我方設定。
- Placeholder 掃描：沒有 TBD 或空白段落；Cloudflare secret value 不應寫入 spec。
- 內部一致性：目標、驗收條件、ADR 與 Milestones 都使用 `master`、Wrangler direct upload、`.output/public`、project `dwselect`，credential provisioning 不暴露 secret value。
- Scope 檢查：範圍集中在部署 workflow、Cloudflare credentials、Cloudflare Pages project / domain 與文件，適合單一 sprint。
- 歧義檢查：PR 不部署、`master` push 才部署、Cloudflare Git integration 不採用，均已明確寫入。
