# Works：公開前 SEO 與品牌整理

## 2026-06-15 ddd-developer

### TDD Red

- 新增 `tests/launch-seo.test.ts`，先驗證 favicon／OG image assets、根目錄 Vite `index.html` 移除、全站與頁面 SEO meta、商品頁 summary fallback 契約、`app/error.vue` 文案與回首頁行動。
- 同步更新既有 `tests/nuxt-smoke.test.ts` app title 契約，改為站台級 `SITE_TITLE`。
- 先執行 `pnpm test tests/launch-seo.test.ts`，預期失敗於缺少 `app/utils/seo-metadata.ts`，確認 Red state。

### Green

- 一次性下載 `https://applepig.idv.tw/favicon.ico` 至 `public/favicon.ico`，後續 build 不需 runtime fetch favicon 來源。
- 保留使用者提供的 `public/og-image.png`，並在 SEO constants 中固定 `SITE_OG_IMAGE = 'https://dwselect.applepig.net/og-image.png'`。
- 新增 `app/utils/seo-metadata.ts`，集中站台 URL、站名、description、title、OG image、canonical URL 與 description fallback。
- 更新 `app/app.vue`，加入 `htmlAttrs.lang = 'zh-Hant'`、favicon link、首頁 canonical baseline、站台 description、Open Graph 與 Twitter card。
- 更新首頁、`/guide`、`/links`、`/search`、商品詳情頁的 `useHead`／`useSeoMeta`，使用固定 production URL，不輸出 local dev domain。
- 商品詳情頁使用 `<商品名稱>｜DW嚴選`、商品 summary description；summary 空白時 fallback 到站台 description；OG/Twitter image 使用站台預設圖。
- 新增 `app/error.vue`，404 顯示「找不到頁面」與「回首頁」，其他錯誤顯示「發生錯誤」。
- 刪除根目錄 Vite 樣板 `index.html`。

### Refactor / 技術決策

- SEO constants/helper 只集中跨頁重複且容易出錯的 production URL 與 fallback，不導入 SEO module，也不重做 sprint 016 的 robots／sitemap／rss／llms／static API／GTM。
- `useSeoMeta` 在商品頁改用 computed refs 直接傳入；`pnpm typecheck` 顯示此 Nuxt 型別版本不接受 callback 形式。
- 同步更新 `tests/e2e/compact-app.spec.ts` 的首頁 title 與未知商品 404 預期，避免 E2E 仍綁定舊 Nuxt 預設錯誤畫面。

### 驗證結果

- `pnpm test tests/launch-seo.test.ts`：通過（7 tests）。
- `pnpm test`：通過（33 files，250 tests）。
- `pnpm lint`：通過。
- `pnpm typecheck`：第一次失敗於商品頁 `useSeoMeta(() => ...)` 型別不相容；改為 computed refs 後通過。
- `pnpm generate`：通過；出現既有 Vite／Tailwind sourcemap 與 Rollup pure annotation warnings，未造成失敗。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- 額外檢查 `.output/public/index.html` 與商品頁 HTML：確認 `zh-Hant`、production canonical、預設 OG image 與商品 title 出現在 generated output。

## 2026-06-16 ddd-developer E2E failure fix

### 根因

- Coordinator 驗收的 `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts` 失敗於未知商品 route：E2E 期待 `app/error.vue` 的「找不到頁面」，但畫面仍是 Nuxt 預設 error page。
- 先確認 Nuxt 4 resolver：本 repo 的 `srcDir` 是 `app/`，`#build/error-component.mjs` 會從 `app/error.vue` 載入；因此檔案位置正確，不應移到根目錄。
- Playwright `webServer.reuseExistingServer: true` 會沿用 Traefik 後方已跑 32 小時的 `dwselect-app` dev server；新增 `app/error.vue` 後需要重啟 container 才會重新掃描 error component。
- 重啟後 resolver 已載入 `app/error.vue`，但商品頁在 setup 直接 `throw createError({ statusCode: 404, statusMessage })` 時，SSR 仍落到 Nuxt dev 預設 error renderer；補上 `fatal: true` 與 `message` 後，Nuxt root 才會以 `#build/error-component.mjs` 渲染品牌化錯誤頁。

### 修正

- 更新 `app/pages/products/[id].vue`：未知商品改為 `throw createError({ statusCode: 404, message: '找不到商品', fatal: true })`，保留 404 狀態並讓 `app/error.vue` 實際接管畫面。
- 重啟 `docker compose restart app`，避免 E2E 因 `reuseExistingServer` 打到 stale Nuxt instance。
- E2E 原失敗案例修正後通過；同一次完整 E2E 首跑又在 `/search` 測試的 `waitUntil: 'networkidle'` timeout，但 error snapshot 顯示搜尋頁已完整渲染。依 Playwright best practice，將該測試初始 navigation 改為 `domcontentloaded`，後續仍以可見 UI／URL assertion 判斷 ready state。

### 驗證結果

- `pnpm test tests/launch-seo.test.ts`：通過（7 tests）。
- `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts`：第一次重跑原 404 case 已通過，但完整指令另有 `/search` networkidle timeout；調整等待策略後重跑通過（20 tests）。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。

## 2026-06-16 Coordinator 驗收

- 複核 diff 範圍：SEO meta、favicon／OG assets、`app/error.vue`、刪除 Vite `index.html`、launch SEO 測試、既有 smoke/E2E 契約更新與本文件包；未納入 `public/search-index.json` 的 timestamp-only generated churn。
- 驗收 E2E 修正：未知商品 route 實際顯示品牌化「找不到頁面」與「回首頁」，不再落到 Nuxt 預設 error page。
- 重跑 `pnpm test tests/launch-seo.test.ts`：通過，1 file / 7 tests passed。
- 重跑 `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts`：通過，20 tests passed，實際載入首頁、商品詳情、未知商品 404、搜尋與主要 desktop 路徑。
- 重跑完整品質閘門：`pnpm test` 通過，33 files / 250 tests passed；`pnpm lint` 通過；`pnpm typecheck` 通過；`pnpm generate` 通過；`node scripts/assert-runtime-google-sheet-clean.ts` 通過。
- 額外 generated HTML 檢查：`.output/public/index.html` 包含 `lang="zh-Hant"`、production canonical、`og:image` 與 `/favicon.ico`；商品頁 HTML 包含商品 title、product canonical 與預設 OG image。
