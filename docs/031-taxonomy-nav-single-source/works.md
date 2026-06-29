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

### Follow-up: legacy redirect 改 history replace（修上一頁陷阱）

#### 技術決策

- `index.vue` 的 legacy `/?category={id}` soft redirect 由預設 history push 改為 `navigateTo(\`/category/${id}\`, { replace: true })`。redirect 去向（valid → `/category/{id}`、invalid／empty／array 留首頁）完全不變，只改 history 寫入方式。
- 根因：push 會在歷史堆疊插入額外 entry。使用者從舊書籤 `/?category={valid}` 進站被 push 前進到 `/category/{id}` 後，按瀏覽器上一頁回到 `/?category={id}`，index.vue 重新 mount 又 push 前進，在兩頁間來回彈跳出不去。ADR-2 的書籤連續性目的被此 trap 反噬，replace 消除多餘 entry 即解。

#### 問題與解法

- e2e 守門斷言設計：因 push（buggy）版 goBack 會回到 `/?category=` 後再被 onMounted 彈回 `/category/{id}`，單純斷言「URL 不是 ?category」在 buggy 版會因彈跳而變綠、無法穩定 Red。改為先 `goto('/')` 建立 home base entry，redirect 後 `goBack()` 斷言能回到 home `/`：replace 生效可逃回首頁（綠），push trap 被彈回 `/category` 永遠到不了 `/`（紅）。此斷言同時蘊含「不會回到舊 query URL」且能穩定 Red。

#### 測試結果

- 新增 e2e：`tests/e2e/compact-app.spec.ts` desktop-only `legacy category redirect replaces history so the back button is not trapped`（緊接既有 valid/invalid redirect 測試之後）。
- e2e 實機驗證受環境阻擋：dev 容器為 Alpine Linux（musl libc），Playwright 內建 Chromium 為 glibc build（需 `/lib64/ld-linux-x86-64.so.2` 與 `libglib-2.0` 等），在 musl 上 spawn ENOENT 無法啟動；容器原本未安裝任何 browser（印證 e2e 正常於 CI ubuntu 跑）。Red／Green 兩步皆無法在本 session 實機驗證，須於 CI／glibc 環境執行。
- Typecheck：`./dev.sh typecheck` → 通過（exit 0），確認 `navigateTo(..., { replace: true })` 簽章合法。

## Milestone 3: View Transition 重啟 spike（待實機驗證）

### 技術決策

- 依 M3 spike 範圍，暫時將 `nuxt.config.ts` 的 `experimental.viewTransition` 從 `false` 翻為 `true`，讓使用者可進行實機 iPad Safari 驗證。
- `app/assets/styles/catalog.css` 既有 `@media (prefers-reduced-motion: no-preference)` 與 `@media (prefers-reduced-motion: reduce)` guard 已涵蓋 product-card view-transition class/name、page fade transition 與 `animation: none` 保險絲；本次測試確認契約存在，未修改 CSS。
- 本狀態不是 AC10 PASS：實機 iPad Safari hydration 與轉場尚未驗證。若使用者實機 PASS 未被記錄，merge／上線前必須 revert 或維持 `viewTransition: false`；FAIL 或未驗證皆不得 ship `true`。
- 測試品質修正：移除讀取 `spec.md` 並 `toContain` 文件文字的 source-grep 型假斷言，以符合 AC13 精神；待實機驗證狀態改由本 works 記錄。

### 測試結果

- Red：`pnpm test tests/view-transition.test.ts tests/nuxt-smoke.test.ts` → 2 files failed，3 tests failed（預期失敗：`nuxt.config.ts` 仍為 `viewTransition: false`）。
- Green／Refactor：`pnpm test tests/view-transition.test.ts tests/nuxt-smoke.test.ts` → 2 files passed，41 tests passed。
- Typecheck：`pnpm typecheck` → 通過（命令完成且無錯誤輸出）。
- Browser smoke：`agent-browser` 透過 `https://dwselect.toybox.local/` 開啟首頁與 `/category/computer-3c`，兩頁皆可載入且未見未捕獲錯誤輸出；此檢查不取代 iPad Safari 實機驗證。

### 未驗證

- 使用者實機 iPad Safari 全新分頁驗證 hydration 與轉場：尚未執行。
- `prefers-reduced-motion: reduce` 在實機 iPad Safari 下的無動畫行為：尚未手動驗證；目前僅以 CSS 契約測試確認 fallback 存在。

## Codex PR #10 review 收尾（2026-06-29）

PR #10 的 Codex 自動 review 共留 6 條 P2 finding。前 3 條（content HMR 不刷 per-id detail cache、deploy 未 gate 在 quality workflow 後、slug 變必填但 AGENTS.md 未記）已於 f97efdb 處理。本次收尾剩餘 3 條，並一併修一條同類兄弟缺陷。

### 技術決策

- **Finding 4 — guide `image_url` fallback 在 detail/列表 payload 被丟棄**：`resolveGuideImageUrl()` 只解析 `image_file`，忽略 schema 允許的外部 `image_url` fallback，導致只填 `image_url` 的 guide 在 `/guide/{id}` hero 與列表縮圖退化成 fallback icon。改為 `resolveImageFileUrl(...) ?? guide.image_url ?? null`（本地優先、否則外部、皆無才 null）。
- **兄弟缺陷 — search index 的 `resolveGuideSearchImageUrl()`**：同一缺陷 class（丟棄 guide external url），雖 search 結果 UI 目前不顯示圖、零可見影響，經使用者裁定比照 Finding 4 一併修，保兩個 guide 圖片 resolver 行為一致。
- **Finding 5 — discovery 檔契約衝突**：`.gitignore` 已 ignore 並移除追蹤 sitemap/rss/robots/llms（上游 0567da5 刻意，deploy 以 `.output/public` 為準），但 AGENTS.md 仍寫「維持 tracked」。經使用者裁定保留 gitignore 現狀、改 AGENTS.md 對齊（移除會 stale 的 dead copy 描述）。
- **Finding 6 — guide 圖片檔名與 id 不符**：`2026-06-02-japanese-rice-intro` 的 `image_file` 指向 `2026-06-02-japanese-rice.jpg`（027 CJK guide 遷移遺留），違反 `{id}.{ext}` 慣例。圖檔 git rename 為 `2026-06-02-japanese-rice-intro.jpg` + 同步 `image_file` 欄位。

### 測試結果

- Finding 4 走 TDD：新增 `tests/resolve-guide-image-url.test.ts`（local 優先／external fallback／both 優先 local／皆 null）Red（fallback case 回 null）→ Green。
- 連帶更正兩個把舊 bug 行為編碼成 spec 的既有測試：`tests/public-payload/map-resource-rows.test.ts`、`tests/search-index.test.ts`（後者三處斷言＋測試名）。
- `pnpm test` 599 passed、`pnpm lint` 0 error、`pnpm content:check` 143 passed。
- typecheck / generate：host 限制 deferred，依使用者裁定靠 PR #10 push 後 CI quality-gate 驗。

### 未驗證

- frontend handoff：japanese-rice guide 圖片 rename 後的 hero 圖實機顯示未開頁面確認（host 開不了 toybox.local，使用者選擇靠 CI）。風險低——實體檔存在、`image_file` 指向正確、content:check image guard 通過。
