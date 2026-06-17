# DW嚴選

DW嚴選公開站使用 Nuxt SSG 與 Nuxt Content。商品資料放在 `content/products/*.json`，公開首頁只顯示 `status = "published"` 的商品。

## Local development

開發環境跑在 Docker 容器，透過 Traefik 自動路由到 `https://${APP_URL}/`（預設 `dwselect.toybox.local`）。環境設定放在未提交的 `.env`（參考 `.env.example`），`APP_URL` 為必填。

啟動與管理開發站：

```bash
./dev.sh start      # 啟動容器（NUXT_MODE=dev 跑含 HMR 的 dev server）
./dev.sh install    # 容器內 pnpm install，同步 package.json 變更
./dev.sh logs       # 看 Nuxt log
./dev.sh status     # 看容器狀態
```

不要直接在 host 上跑 `pnpm dev`——會與容器共用 Vite cache 造成 chunk hash 衝突。指令細節見 `CLAUDE.md`。

執行測試與檢查（`vitest.config.ts` 已載入 `.env`，不需手動帶 `APP_URL=` 前綴）：

```bash
pnpm test
pnpm lint
pnpm typecheck
```

產生公開站 build artifacts：

```bash
pnpm build:public-artifacts   # search index → public/search-index.json、discovery payload → public/api/content.json
pnpm build:content-images     # 本地化 content 圖片
```

`pnpm generate` 與 `pnpm build` 會先跑 `build:content-images` 與 `build:public-artifacts`，確保靜態輸出使用最新 Git-backed content；單獨的 `build:search-index`、`build:public-discovery` 仍保留為個別 CLI。

## Migration

Google Sheets TSV 只作為 legacy migration input 或參考來源，不應在公開站 client/runtime fetch。

`scripts/legacy/migrate-google-sheet-products.ts` 已 deprecated，僅保留給 cutover 前 legacy 資料追溯與測試，不是新版 product content importer。008 之後的公開內容以 Git-backed `content/products/*.json`、`content/guides/*.json`、`content/links/*.json` 與 taxonomy files 為 SSOT。

如需追溯 cutover 流程，可參考一次性 content domain migration script：

```bash
node scripts/legacy/migrate-content-domain-taxonomy.ts
```

legacy Google Sheets importer 的歷史用法如下；不要用它建立新內容：

```bash
node scripts/legacy/migrate-google-sheet-products.ts legacy/products.tsv --date 2026-06-02
```

## Static generate

產生靜態輸出：

```bash
pnpm generate
```

輸出位置是 `.output/public`。產生後可檢查公開 runtime 是否仍包含 Google Sheets TSV 指標：

```bash
node scripts/assert-runtime-google-sheet-clean.ts
```

## Production deploy / Cloudflare Pages

正式站部署由 GitHub Actions direct upload 到 Cloudflare Pages。push 到 `master` 會先執行 `pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate` 與 runtime Google Sheets 檢查，全部通過後才部署；pull request 只跑驗證，不會部署。

- Cloudflare Pages project：`dwselect`
- Build output：`.output/public`
- 正式網址：`https://dwselect.applepig.net/`
- Required GitHub secrets：`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`

首次外部設定時，需要在 Cloudflare Pages 設定 custom domain `dwselect.applepig.net`。若 `applepig.net` 不在同一個 Cloudflare 帳號的 DNS，請在該 DNS zone 新增 CNAME，指向 `dwselect.pages.dev`。

不要把 Cloudflare Account ID、API token 或其他 token value 寫進 repo；token 只應存放在 GitHub Actions secrets 或本機未提交的環境設定中。
