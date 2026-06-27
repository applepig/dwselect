# Works: Taxonomy 導航單一真相 + View Transition 重啟

## Milestone 1: 分類導航單一化（移除 home filter 與三 reader）

### 技術決策

- 首頁 `/` 不再承載分類篩選狀態；`getCompactAppView` 永遠使用 payload 中全部已上架商品，category chip 僅作為導向 taxonomy 專屬頁的導航入口。
- 分類導覽單一目標統一為 `/category/{id}`：桌機 sidebar、首頁 category chip、商品 breadcrumb 全部改用同一路徑；`all` 保留導向 `/`。
- 保留既有 `/category/[id].vue`、taxonomy page data 與 `getSelectableCategoryIds` 等資產；本 milestone 不新增 routing 或共用模組。
- `nuxt-ui-component-adoption.test.ts` 的首頁 chip 舊 source-grep 斷言改為 happy-dom render DOM 斷言，避免保留 `@click` 導航字串契約。

### 問題與解法

- Red 階段確認 compact-app 與 breadcrumb 單元測試會因舊 `home_category_id`、首頁 category breadcrumb 與 `/?category=` breadcrumb link 失敗。
- 移除 `compact-app.ts` 的 `parseCategoryId` 與 home category filter，並收斂 `CompactAppState`／`CompactRouteStateOptions` 型別。
- 移除 `app-navigation.vue` 的 `getActiveCategoryId` 與 `route.query.category` 判定，改以 `route.path` 判斷 `/` 與 `/category/{id}` active。
- 移除 `resolve-breadcrumb-items.ts` 的 `resolveActiveHomeCategoryLabel`，首頁 breadcrumb 固定回 `[]`，商品分類 crumb 改為 `/category/{id}`。
- 移除 `index.vue` 的 `router.push({ query: { category } })`、`active_home_category_key` 與 home results `<Transition>`，category chip 改為 `UButton :to`。

### 測試結果

- Red：`pnpm test tests/published-products/compact-app.test.ts tests/breadcrumb/resolve-breadcrumb-items.test.ts` → 2 files failed，5 tests failed（預期失敗：舊 `?category=` reader／breadcrumb 行為）。
- Green：`pnpm test tests/published-products/compact-app.test.ts tests/breadcrumb/resolve-breadcrumb-items.test.ts` → 2 files passed，26 tests passed。
- 受影響測試：`pnpm test tests/published-products/compact-app.test.ts tests/breadcrumb/resolve-breadcrumb-items.test.ts tests/nuxt-ui-component-adoption.test.ts tests/published-products/selectable-category-ids.test.ts tests/nuxt-smoke.test.ts` → 5 files passed，81 tests passed。
- 最終：`pnpm test` → 75 files passed，558 tests passed。
- 最終：`pnpm typecheck` → 通過（命令結束無錯誤輸出）。
- 額外自查：`pnpm lint` → 通過。

## Hotfix: iPad Safari 搜尋頁 viewport 高度

### 技術決策

- 將 app shell、tablet rail、desktop sidebar 的 `min-height` 從 `100vh` 改為 `100dvh`，與既有 product detail sheet 的 dynamic viewport 策略一致，避免 iPad Safari 把 browser chrome 納入 `vh` 而讓可見頁面被撐高。

### 問題與解法

- 症狀：iPad 上搜尋 tab 內容不足時仍出現垂直捲軸。
- 根因：`.compact-app-shell`、`.compact-app-rail`、`.compact-app-sidebar` 使用 `100vh`，Safari 的 layout viewport 高度大於實際 visual viewport，外層 shell 被撐高造成空白捲動。
- 解法：只替換 shell/navigation 相關的 viewport 單位，不調整搜尋頁內容或 layout 結構。

### 測試結果

- Red：`pnpm test tests/nuxt-smoke.test.ts` → 1 failed（新增 dynamic viewport contract 時，`catalog.css` 仍有 `100vh`）。
- Green：`pnpm test tests/nuxt-smoke.test.ts` → 38 tests passed。

## Milestone 2: 舊連結相容 + E2E 遷移（非 URL find-replace）

### 技術決策

- 舊 `/?category={id}` 僅在首頁 mount 後作 client soft redirect，合法 id 判定重用 `useCatalogData().category_ids` 的 selectable category set；invalid、empty、`all` 與 array query 留在首頁全部。
- E2E 不做 URL 字串 find-replace，而是依新頁面契約遷移：分類 grid 量 `/category/{id}` taxonomy 頁、刪除 home results transition 舊契約、sidebar 與 breadcrumb 改斷言 `/category/{id}`。
- `navigateTo` 在 mount 後透過 `nuxt_app.runWithContext` 執行，避免 async callback 跨過 `await` 後離開 Nuxt context 而在真瀏覽器沒有導頁。

### 問題與解法

- Red 階段確認新增 legacy redirect component/E2E 測試時，valid `/?category=computer-3c` 仍停在首頁。
- 根因是初版 `onMounted(async () => { await catalog_data; navigateTo(...) })` 在真瀏覽器中跨 async boundary 後沒有可靠保留 Nuxt context；改為先取得 `useNuxtApp()`，在 `catalog_data.then(...)` 內用 `runWithContext(() => navigateTo(...))`。
- 028 split 相關 request monitor timeout 的根因是 E2E 綁到瀏覽器直接請求 `/api/products|guides/{id}.json`；實際 Nuxt client navigation 會先請求 detail route 的 `_payload.json`，payload 內 async data 仍由 per-id detail route 產生。測試改驗「首頁不預抓 detail route payload／API，點擊後只抓該 detail route payload」。

### 測試結果

- Red：`pnpm test tests/nuxt-ui-component-adoption.test.ts` → 新增 valid redirect 測試時失敗（`navigateTo` 0 calls）。
- Red：`pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts -g "soft redirects valid legacy category query"` → 1 failed（URL 停在 `/?category=computer-3c`）。
- Green：`pnpm test tests/nuxt-ui-component-adoption.test.ts` → 16 tests passed。
- Green：`pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts -g "soft redirects valid legacy category query"` → 1 passed。
- 028 focused E2E：`pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts -g "fetches a single product detail json"` → 1 passed。
- 028 focused E2E：`pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts -g "fetches a single guide detail json"` → 1 passed。
- Desktop E2E：`pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts` → 24 passed，2 skipped。
- Full E2E：`pnpm test:e2e` → 66 passed，12 skipped。
- M2 focused E2E：`pnpm test:e2e tests/e2e/compact-app.spec.ts -g "soft redirects|sparse category|mobile header lightweight|safe buy CTA|restores category taxonomy|expands product categories|desktop product grid"` → 11 passed, 10 skipped。
- Unit regression：`pnpm test` → 75 files passed，564 tests passed（worker 執行）。
- Typecheck：`pnpm typecheck` → 通過（worker 執行）。
- Content check：`pnpm content:check` → 13 files passed，141 tests passed。
- SSG：`NUXT_MODE=build ./dev.sh restart` 完成 prerender，logs 顯示 `Prerendered 516 routes` 與 `Generated public .output/public`；抽查 `.output/public/category/`、`.output/public/api/content.json`、`.output/public/search-index.json` 皆存在。
- Runtime guard：`node scripts/assert-runtime-google-sheet-clean.ts` → 通過（無錯誤輸出）。
