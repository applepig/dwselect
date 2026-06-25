# DW嚴選

DW嚴選公開站使用 Nuxt SSG、Nuxt server routes 與 `@nuxt/image`。商品資料放在 `content/products/*.json`，公開首頁只顯示 `status = "published"` 的商品。

## Local development

分工：**測試與檢查跑在 host，dev server 跑在 Docker 容器**。

安裝 host 依賴（跑測試、lint、typecheck、build artifacts 用）：

```bash
pnpm install
```

啟動與管理 dev server（Docker 容器透過 Traefik 自動路由到 `https://${APP_URL}/`，預設 `dwselect.toybox.local`；環境設定放在未提交的 `.env`，參考 `.env.example`，`APP_URL` 為必填）：

```bash
./dev.sh start      # 啟動容器（NUXT_MODE=dev 跑含 HMR 的 dev server）
./dev.sh install    # package.json 變更後同步容器內依賴
./dev.sh logs       # 看 Nuxt log
./dev.sh status     # 看容器狀態
```

不要直接在 host 上跑 `pnpm dev`——會與容器共用 Vite cache 造成 chunk hash 衝突。指令細節見 `CLAUDE.md`。

執行測試與檢查（host，`vitest.config.ts` 已載入 `.env`，不需手動帶 `APP_URL=` 前綴）：

```bash
pnpm test
pnpm lint
pnpm typecheck
```

公開內容 API 與圖片由 Nuxt server routes 與 `@nuxt/image` 即時提供，dev 不需手動重建 artifacts：

- `GET /api/content.json`：Nuxt server route，從 `content/` 即時產生 published products／guides／links／taxonomy／navigation payload。
- `GET /search-index.json`：Nuxt server route，產生 client MiniSearch 需要的 payload。
- 圖片：`@nuxt/image`（`<NuxtImg format="webp">` + IPX，source dir 指向 `content/`）。dev 即時最佳化來源圖片，不需先跑 `build:content-images`。

`pnpm generate` 會先產生 discovery 檔（sitemap／rss／robots／llms）、檢查 published content 的本地圖片來源是否存在，接著 prerender 頁面與 `/api/content.json`、`/search-index.json` 到 `.output/public`，並輸出頁面實際使用的 optimized images 到 `.output/public/_ipx`，production 不需 server runtime。`build:content-images`、`build:search-index`、`build:public-artifacts` 降為 legacy CLI，已不是 dev／generate 的必要步驟。

`public/api/content.json`、`public/search-index.json`、`public/images/**` 改由上述流程產生，已不再進 Git；正式 static output 以 `pnpm generate` 的 `.output/public` 為準。

## Migration

Google Sheets TSV 只作為 legacy migration input 或參考來源，不應在公開站 client/runtime fetch。

原 Google Sheets TSV importer（`scripts/legacy/migrate-google-sheet-products.ts`）已移除——它會產生含 CJK 的 slug，與 content id 強制 ASCII kebab（ADR-11）的 schema 不相容；cutover 早已完成，公開內容以 Git-backed `content/products/*.json`、`content/guides/*.json`、`content/links/*.json` 與 taxonomy files 為 SSOT。

如需追溯 cutover 流程，可參考一次性 content domain migration script：

```bash
node scripts/legacy/migrate-content-domain-taxonomy.ts
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
