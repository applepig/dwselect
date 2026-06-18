# Works

## 2026-06-18：Content API 與圖片 SSG 化（Milestones 1–3）

### Scope

- 將公開內容 API（`/api/content.json`）與 search index（`/search-index.json`）改由 Nuxt server routes 產生，並透過 `nuxt generate` prerender 成 static files。
- 圖片改用 `@nuxt/image`（`<NuxtImg>` + IPX），dev 即時最佳化、generate 輸出 optimized 靜態圖，移除「content 更新後必須手動跑 `build:content-images` 才能預覽」的步驟。
- 將 `public/api/content.json`、`public/search-index.json`、`public/images/**` 從 Git tracking 移除並 gitignore；舊 build scripts 降為 legacy。

### Changes

**M1 — Server routes 取代 generated JSON artifacts**

- 新增 `server/api/content.json.get.ts`：`defineEventHandler` → `readPublicContentSource()` → `buildPublicContentPayload(source)`，與既有 build script 共用同一組 mapping。
- 新增 `server/routes/search-index.json.get.ts`：`readPublicContentSource()` → `buildSearchIndexPayload(...)`，維持 `/search-index.json` URL。
- `app/utils/fetch-public-content-payload.ts` 改為 universal `$fetch('/api/content.json')`，移除 server side 直接讀 `public/api/content.json` 的 primary path。
- `nuxt.config.ts` `nitro.prerender.routes` 加入 `/api/content.json`、`/search-index.json`。
- `scripts/build-public-discovery.ts` 不再寫 `public/api/content.json`（避免與 prerender 輸出衝突），只產 `sitemap.xml`／`rss.xml`／`robots.txt`／`llms.txt`；counts 改用 published 清單長度；保留 `mkdir(public_dir)`。

**M2 — Nuxt Image content 圖片 pipeline**

- `nuxt.config.ts` 加入 `@nuxt/image` module 與 `image.dir = '../content'`（@nuxt/image 以 `resolve(srcDir, dir)` 解析，Nuxt 4 srcDir 為 `app/`，故指向專案根的 `content/`）。
- `app/utils/content-images/resolve-image-file-url.ts` 改為回傳 source path `/{products|guides}/images/{file}`（保留原副檔名），不再轉成 generated WebP URL。`resolveProductImageUrl`／`resolveGuideImageUrl`／search index 自動沿用新形狀。
- `app/components/product-card.vue`、`product-detail.vue`（hero + related）的 `<img>` 改 `<NuxtImg format="webp">`，保留既有 class 與 `@error`／broken-image fallback。
- `app/components/resource-list.vue`：本地圖（`/` 開頭，guide／search 結果）走 `<NuxtImg format="webp">`，外部 http 連結圖（link）維持原生 `<img>`（`isLocalImageSource` 判斷）。
- `package.json`：`build`／`generate` 改為 `pnpm build:public-discovery && node scripts/assert-content-images.ts && nuxt build|generate`；`build:content-images`、`build:search-index`、`build:public-artifacts` 保留為 legacy CLI（非 dev／generate 必要步驟）；devDependencies 加 `@nuxt/image`。

**M3 — SSG generate、gitignore 與文件**

- `.gitignore` 加 `public/api/content.json`、`public/search-index.json`、`public/images/`，並 `git rm --cached` 移除這些（共 61 個檔，sitemap／rss／robots／llms 仍 tracked）。
- 文件更新：`README.md`、`docs/CONTENT.md`、`AGENTS.md`、`content/AGENTS.md` 同步新 pipeline（server route API、`@nuxt/image`、新 generate 指令、image_url 形狀）。

**測試**

- 更新所有受影響 contract：`nuxt-smoke`（modules 含 `@nuxt/image`、`image.dir`、prerender 含兩條 route、fetch helper 不再讀檔、generate/build script、README）、`public-discovery`（移除 content.json 期望 + 反向斷言）、`search-index`／`client-search`／`public-payload/*`（image_url 改 source path）、`map-product-detail` 等。
- 新增 `tests/server-content-routes.test.ts`：source-contract（route 用 shared reader/mapper）+ 用真實 `content/` 跑 `readPublicContentSource → buildPublicContentPayload / buildSearchIndexPayload`，驗證新 image_url 形狀。

### Decisions

- **扁平 `image_url`（語意改為 source path），不改成 spec 範例的巢狀 `image:{src,alt}`**：spec 範例只列 3 欄是簡化示意、spec 文字標明「Response shape 可調整」、且 search 段落明確保留 `image_url`。改成巢狀會大幅波及型別／mapper／components／測試而無實益（YAGNI）。對外消費者契約變更為「image src 是 source path，不保證是 optimized asset URL」，符合 spec Case 4。
- **舊 build scripts 保留為 legacy 而非刪除**：符合 spec「若仍保留 script，只作 legacy／相容工具」。
- **discovery 檔（sitemap/rss/robots/llms）維持 build 產生且仍 tracked**：不在本 sprint 的 untrack 範圍內。
- **search 結果圖片的 static 覆蓋（Case 3）**：search 結果透過 `ResourceList` render，本地圖用與卡片／指南列表相同的 `<NuxtImg format="webp">` modifiers；由於每個 published product 必出現在首頁卡片＋detail 頁、每個 guide 必出現在 `/guide`（皆 prerender），對應 `_ipx` 變體在 build 期已產生，client 端 search 取用同一 URL 即命中。

### Adversarial review（multi-agent workflow）findings 與修正

跑了 5 維度（nitro-routes／nuxt-image／build-pipeline／tests-contract／spec-conformance）平行審查 + high/critical 獨立驗證。確認的問題與處置：

- **[已修] Case 1 fail-fast**：`nitro.prerender` 缺 `failOnError`（Nitro 預設 false），content JSON 不合法時 route 回 500 但 `nuxt generate` 仍 exit 0 靜默產出殘缺站。→ 加 `nitro.prerender.failOnError: true` + nuxt-smoke 斷言。
- **[已修] Case 2 缺圖 guard 回歸**：舊 `build-content-images` 有 `existsSync` 擋缺圖，降級後安全網消失；`@nuxt/image`／ipxStatic 缺來源圖只會 production 404、不保證 generate 失敗。→ 新增 `scripts/assert-content-images.ts`（published product/guide 的 `image_file` 存在性檢查），加入 `build`／`generate` 鏈與 CI（`pnpm generate` 內含），並補單元測試。對真實 content：59 checked、0 missing。
- **[已修] 殘留 generated artifacts 污染**：工作目錄殘留的 `public/api/content.json`、`public/search-index.json`、`public/images/**` 會在 dev shadow server route、在 generate 因 Nuxt `ignoreUnprefixedPublicAssets` 讓 prerender skip→`.output` 落地陳舊複本。→ 已 `trash-put` 刪除（皆 gitignored，可重建）。
- **[已修] 測試補強**：server route 補 Case 1（壞 JSON→reader throw）+ Case 5（archive 即時排除）reader 層測試；修 `use-search-page.test.ts` stale `image_url` 形狀。
- **[已知約束] Case 3**：search 結果本地圖的 `_ipx` 覆蓋，依賴「每個 published product 必在首頁卡片＋detail 頁 render、每個 guide 必在 `/guide` render」這個 invariant（皆 prerender、與 search 用相同 `format="webp"` modifiers→同一 `_ipx` URL）。`crawlLinks` 為預設 false，若日後出現只在 search 顯示、且未被任何 prerender 頁面 render 的本地圖，static 站會 404；目前內容架構成立。
- **[已知/刻意] sitemap/rss/robots/llms 仍 tracked 且由 `build:public-discovery` 在 generate 時重寫**：不在本 sprint 的 untrack 範圍（spec 只 untrack content.json/search-index/images）；rss/sitemap 含時間戳，generate 後可能有 diff 需一併 commit。
- **[已修] `@nuxt/image` 已進 `pnpm-lock.yaml`**：後續已在可安裝環境更新 lockfile，`pnpm generate` 可執行並通過。

### Verification

- `pnpm test`：**347 passed（48 files）**。
- `pnpm lint`：**clean（no warnings）**。
- `node scripts/assert-content-images.ts`（真實 content）：**59 checked, 0 missing**。
- `pnpm generate`：**通過**；產生 `.output/public/api/content.json`、`.output/public/search-index.json` 與 `_ipx` optimized images。

### Handoff

1. `pnpm typecheck` 與 `node scripts/assert-runtime-google-sheet-clean.ts` 可作為提交後的完整 CI 補驗證。
2. 開 `https://dwselect.toybox.local/` 人工確認首頁卡片、商品詳情 hero／related、指南列表、search 結果圖片可載入，且 dev 改 content JSON／圖片後重新請求即反映。

## 2026-06-19：Hotfix — content dev HMR 自動刷新

### 問題描述

- **症狀**：`docs/022-content-dev-hmr` 的目標是 content authoring dev HMR，但實作只讓 `/api/content.json` 重新請求時讀到最新 content，已開頁面不會在 `content/` JSON 或圖片變更後自動刷新。
- **預期行為**：Nuxt dev server 偵測 `content/` JSON／本地圖片變更後，透過 Vite HMR 通知 client，已開頁面 refresh `public-content` async data；search index cache 也要失效，避免搜尋仍用舊索引。
- **影響範圍**：本機 content authoring dev preview；production generate／static output 不受影響。

### 根因分析

- **根因**：M1／M2 只把 content API 與圖片改成 dev 可重新請求的 Nuxt routes／Nuxt Image，沒有註冊 Vite dev watcher，也沒有 client HMR listener 呼叫 `refreshNuxtData('public-content')`。
- **定位過程**：比對 spec User Story 與驗收條件後，確認 `server/api/content.json.get.ts` 每次會重新讀檔，但 `app/composables/*` 只用 `useAsyncData('public-content')`，沒有 watcher、plugin 或 HMR event；`app/utils/search/client-search.ts` 也會快取 search index promise。
- **受影響檔案**：`nuxt.config.ts`、`app/plugins/content-hmr.client.ts`、`app/utils/search/client-search.ts`、`tests/nuxt-smoke.test.ts`。

### 修復內容

- **修了什麼**：新增 Vite dev plugin `dwselect-content-hmr` 監看 `content/**/*.json` 與 `content/**/images/**/*`，在 add/change/unlink 時送出 `dwselect:content-updated` custom HMR event；新增 client plugin 收到 event 後 reset search index cache 並 `refreshNuxtData('public-content')`。
- **測試**：新增 `nuxt-smoke` regression，驗證 dev watcher、custom HMR event、client refresh 與 search index reset contract。
- **驗證結果**：`pnpm test tests/nuxt-smoke.test.ts` 通過，36 passed。
