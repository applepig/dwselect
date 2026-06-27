# Taxonomy 導航單一真相 + View Transition 重啟

## 目標

- 全站分類／taxonomy 導航統一走專屬頁 `/category|tag|brand|channel/{id}`，消除 `?category=` query string 組 URL 的用法。
- 移除首頁「就地篩 grid」機制與其衍生的三份重複 `?category=` 讀取邏輯（已行為分歧，見 ADR-1），讓「依分類瀏覽」只剩一條真相：taxonomy 專屬頁。
- 重新評估並（若驗證通過）重啟 View Transition，讓分類導航的換頁有轉場，補回失去就地篩選的順手感。

## 非目標

- **不重構 taxonomy 頁的 SEO scaffolding 重複**（4 個 taxonomy 頁 + 2 個 detail 頁的 `useHead`/`useSeoMeta` 整段複製）。reviewer 已標記，列入「後續建議」，本 sprint 不碰。
- **不收斂 `'all'` sentinel 與 route-prefix/kind magic string**（除了本次因刪除 home filter 自然消失的部分）。同列後續。
- **不改 tag/brand/channel 頁本身的行為**，僅確保它們是分類以外 taxonomy 的既有單一入口（本次主修 category）。
- 不引入新的 routing 樣式或新元件；以刪除與 rewire 為主。

## User Story

作為瀏覽 DW嚴選的使用者，我點任何分類入口（桌機 sidebar、手機分類 chip、商品 breadcrumb、detail 頁 pill）都會到同一個分類頁 `/category/{id}`，看到一致的內容與可分享的網址，換頁時有流暢轉場。

### 驗收條件

- [ ] AC1：桌機 sidebar 的分類連結 `:to` 指向 `/category/{id}`（`all` 指向 `/`），不再產生 `/?category=`。
- [ ] AC2：手機／平板首頁分類 chip 改為 **anchor 連結**（`UButton :to` / `NuxtLink`）指向 `/category/{id}`（`全部` 回 `/`），不再 `router.push({ query })` 或 `@click` 導航——確保可爬、可右鍵開新分頁，與 sidebar 一致。
- [ ] AC3：商品 breadcrumb 的分類層 `to` 指向 `/category/{id}`，不再是 `{ path: '/', query: { category } }`。
- [ ] AC4：首頁 `/` 恆顯示全部已上架商品；`getCompactAppView` 不再依 category 篩選 home grid。
- [ ] AC5：移除三份重複的 `?category=` 讀取邏輯：`compact-app.ts` 的 `parseCategoryId`、`app-navigation.vue` 的 `getActiveCategoryId`、`resolve-breadcrumb-items.ts` 的 `resolveActiveHomeCategoryLabel`，且 `getCompactAppStateFromRoute` 不再 parse `query.category`。
- [ ] AC6：sidebar 分類 active 態改判 `route.path === '/category/' + id`（在 `/category/{id}` 頁高亮對應項），不再依賴 `route.query`；`all` 項在 `route.path === '/'`（首頁）時 active，避免首頁無任何分類高亮。
- [ ] AC7：首頁 breadcrumb 不再顯示分類標題（`resolveBreadcrumbItems('/')` 回 `[]`）。
- [ ] AC8：舊連結相容——直接造訪 `/?category={valid-id}` 時，index.vue 掛載時 `navigateTo('/category/{id}')`；`/?category={invalid}` 則落到首頁全部（見 邊界案例）。此 redirect 的「單一合法 id」判定**重用單一受控來源**（`useCatalogData` 的 `category_ids` set + 一個 array→單值 guard），是過渡期刻意保留、集中於 index.vue mount 的**唯一** category-query reader，不得在他處再長一份（見 ADR-1）。
- [ ] AC9：全站 grep 不再有 `?category=` 形式的組 URL（`router.push`/`:to`/`navigateTo`），搜尋的 `?q=` 不在此限。
- [ ] AC10：View Transition flag 在乾淨冷啟動環境下重啟後，由使用者實機 iPad Safari 驗證，產出二元結果：**PASS → 保留 `viewTransition: true` 並記錄通過環境**；**FAIL 或未完成實機驗證 → merge／上線前必須維持或 revert 回 `false`，並記錄 crash／未驗證狀態與 cross-document VT fallback 評估**。（M3 為 spike；不得讓未驗證的 `viewTransition: true` 隨 M1–M2 上線，見 ADR-3。）
- [ ] AC11：`prefers-reduced-motion: reduce` 時不套用轉場動畫。
- [ ] AC12：對應單元測試與 E2E 全數對齊新行為（不得保留斷言舊 `?category=` 契約的測試為綠）。
- [ ] AC13：本 sprint 因改動觸及的測試，不得新增或保留 source-grep 型假斷言（特別是 `nuxt-ui-component-adoption.test.ts` 對 index.vue chip 的縮排敏感 `not.toContain`／`@click` 字串斷言）——改為 render 後 DOM 斷言；新寫 E2E 一律用 web-first assertion（`toBeVisible`/`toHaveURL` 輪詢），不引入新的 `waitForTimeout`/`networkidle` 時間賭注。
- [ ] AC14：移除 index.vue 因 home 恆顯示全部而失效的 vestigial `<Transition>`（`active_home_category_key` 恆為 `'all'`、轉場永不觸發），不留死碼。

## 相關檔案

- `app/components/app-navigation.vue` — sidebar 分類 `:to` 與 active 判定；刪 `getActiveCategoryId`
- `app/utils/published-products/compact-app.ts` — 移除 home category filter 與 `parseCategoryId`；`getCompactAppStateFromRoute` 去除 category 分支
- `app/pages/index.vue` — chip 改 anchor 連結至 `/category/{id}`；移除 `onCategoryChipClicked` 的 query push 與 home_category 狀態；移除恆 `'all'` 的 vestigial `<Transition>`（AC14）；舊 `?category=` redirect（重用 `useCatalogData` 的 `category_ids`，AC8）
- `app/utils/breadcrumb/resolve-breadcrumb-items.ts` — 商品 breadcrumb `to` 改 `/category/{id}`；刪 `resolveActiveHomeCategoryLabel` 與 home `/` category 分支
- `app/utils/published-products/types.ts` — `CompactAppState.home_category_id`、`CompactRouteStateOptions.category_ids` 等隨之收斂
- `nuxt.config.ts` — `experimental.viewTransition` flag
- `app/assets/styles/catalog.css` — 既有 VT CSS（inert，重啟後生效）；視需要加 reduced-motion guard
- 測試：`tests/published-products/compact-app.test.ts`、`tests/breadcrumb/resolve-breadcrumb-items.test.ts`、`tests/e2e/compact-app.spec.ts`、`tests/nuxt-ui-component-adoption.test.ts`（含對 index.vue chip 的 source 斷言）

## 既有資產盤點 / Reuse Map

| 既有資產 | 位置 | 本次如何沿用 |
|---|---|---|
| `/category/{id}` 專屬頁 | `app/pages/category/[id].vue` | 直接複用為分類瀏覽唯一目的地，不動 |
| `buildTaxonomyPageData` / `selectPublishedTaxonomyItems` | `app/utils/published-products/` | 分類頁的篩選＋404＋label 已完整，複用 |
| `useTaxonomyPageData` | composable | 分類頁資料來源，複用 |
| breadcrumb taxonomy 分支 | `resolve-breadcrumb-items.ts:64-68,120-155` | `/category/` 已正確處理，複用；僅刪 home 分支 |
| sidebar `NuxtLink` 結構 | `app-navigation.vue:11-22` | 已是 NuxtLink，僅改 `:to` 與 active 判定 |
| `getSelectableCategoryIds` | `selectable-category-ids.ts` | sidebar/chip 的合法分類來源，續用 |
| VT CSS + `view-transition-name` 綁定 | `catalog.css`、`product-card.vue`、`product-detail.vue` | 停用後保留 inert，重啟 flag 即生效，複用 |
| `--dw-*` token | `catalog.css` / `variables.css` | 樣式 SSOT，不新增色值 |
| `navigateTo` | Nuxt 內建 | 舊 `?category=` redirect 用，無需新工具 |

新建項目：**無新模組**。本 sprint 以刪除（三 reader + home filter）與 rewire（`:to`）為主，加上一行 VT flag 與 reduced-motion guard。已搜尋 `app/utils/`、`scripts/public-payload/` 確認分類瀏覽邏輯已存在於 taxonomy 頁，無需新造。

## 介面 / 資料結構

無新增 API。受影響的型別收斂（移除而非新增）：

```ts
// types.ts — CompactAppState 移除 home_category_id
export type CompactAppState = {
  active_tab?: CompactAppTabId
  search_query?: string
}
```

舊連結相容（client 端，非伺服器 redirect；靜態站無 server route）：

```
GET /?category=computer-3c   → index.vue 掛載時 navigateTo('/category/computer-3c')（client soft redirect）
GET /?category=not-a-real    → 留在 /，顯示全部（不 redirect、不報錯）
```
> 註：靜態站無 server，此為 client mount 的 soft redirect，crawler 看到的不是真 302。判定來源見 AC8（重用 `category_ids`）。

## 邊界案例

- **Case 1：舊 `/?category={valid}`**（既有書籤／已分享連結）→ index.vue 掛載時偵測到合法 category id（重用 `category_ids`），`navigateTo('/category/{id}')` soft redirect，維持書籤連續性。
- **Case 2：`/?category={invalid}` 或 `?category=`/`?category=all`** → 不 redirect、不報錯，正常顯示首頁全部。
- **Case 3：array query `?category=a&category=b`** → 視為無效（取不到單一合法 id），留在首頁全部。此處正是舊三 reader 分歧的來源，統一為「非單一合法 id 即全部」。
- **Case 4：`/category/{invalid}`** → 既有 404 行為不變（`taxonomy_page_data === null` → `createError(404)`）。
- **Case 5：iPad Safari + VT-on hydration** → 若重現 crash 或實機驗證未完成，merge／上線前回退或維持 `viewTransition: false` 並記錄，不阻塞 M1–M2 以 VT-off 落地（見 ADR-3）。
- **Case 6：`prefers-reduced-motion: reduce`** → 不套轉場。

## ADR

### ADR-1：分類瀏覽單一機制 = `/category/{id}` 專屬頁（Design A）
- **決策**：移除首頁就地篩選，所有分類入口導向 `/category/{id}`。
- **原因**：現況有兩套「依分類篩商品」（首頁陽春版 vs taxonomy 完整版）與三份「讀＋驗 `?category=`」邏輯，且三份**已行為分歧**（array 處理不同、驗證來源一個用 `category_chips` 一個用 `desktop_category_items`），會造成「商品篩到了但 breadcrumb 標題不顯示」這類使用者＋SEO 可見矛盾。單一機制一次根除。
- **替代方案**：Design B（首頁保留就地篩 local state + History API、其餘走專屬頁）。不選——桌機（專屬頁含 products+guides+links）與手機（首頁篩只 products）會看到不同分類內容（viewport-split），且 `history.replaceState` 不更新 `route.query`，breadcrumb 需把 page local state plumb 進 layout，耦合更醜。

### ADR-2：舊 `?category=` 以 client soft redirect 相容
- **決策**：index.vue 掛載時，若 `?category=` 是合法 id（判定重用 `category_ids` 單一來源，AC8）就 `navigateTo('/category/{id}')`。
- **原因**：**UX／書籤連續性**——`/?category=X` 是既有使用者可能存的書籤／已分享的連結，soft redirect 把它無痛導到單一真相頁。註：home canonical 一律指向 `/`（`getCanonicalUrl('/')`），`?category=X` 從未作為獨立 URL 被索引，故**非** SEO 流量理由（修正初稿誇大）。
- **替代方案**：直接忽略 query（顯示全部）會默默吃掉舊連結意圖，不選；靜態站無 server，無法做真 301，故為 client soft redirect。

### ADR-3：View Transition 重啟——以實機驗證作唯一裁決（預期大機率回退）
- **決策**：在乾淨冷啟動（無 dev/preview 並存、清 Vite cache）環境下把 `experimental.viewTransition` 設回 `true`，由使用者在 **實機 iPad Safari 全新分頁** 驗證 hydration，以該結果作為**唯一裁決**。Supersede `docs/007-routed-navigation-view-transitions/works.md` 的原停用決策（不論結果，本 ADR 取代其判定依據）。
- **原因（誠實版）**：先前停用的隔離測試確有方法論瑕疵——同時改了「flag off」與「清快取冷啟動」兩個變因，未分離，無法排除 dev/preview 共用 Vite cache 的 chunk-hash 衝突（CLAUDE.md 已警告同目錄雙 Nuxt 實例）。**但**這不足以推翻 WebKit-bug 結論：pinned memory 列了 React #35336、SvelteKit #10835、Angular #62491 三個**跨框架、跨 build tooling** 的獨立重現，它們不可能都中 dwselect 的 Vite cache 衝突——這批證據仍強烈指向 WebKit 層級 bug。故本次**不抱「應是 cache 問題」的信心**，僅以分離變因後的單次實機驗證裁決，**預期大機率 FAIL／回退**。
- **替代方案**：(a) 維持停用——不選，使用者要求驗一次並補回換頁順暢感；(b) cross-document 原生 VT（`@view-transition { navigation: auto }`，不走 hydration 視窗的 `document.startViewTransition`，理論上避開該 crash class）——列為 FAIL 時的 fallback 評估，不在本 sprint 實作。

> 後續建議（reviewer surfaced，非本 sprint）：production code 去重／clean-code 項目完整記於 **`docs/032-codehealth-dedup/plan.md`**；測試品質項目歸 **`docs/025-test-quality-cleanup`**。本 sprint 不碰，僅在觸及的測試遵守 AC13。

## Milestones

### Milestone 1: 分類導航單一化（移除 home filter 與三 reader）
> 範圍：`compact-app.ts`、`index.vue`、`app-navigation.vue`、`resolve-breadcrumb-items.ts`、`types.ts`
> 驗證：`pnpm test`（compact-app、breadcrumb 單元測試先轉紅→改實作→綠）；`pnpm typecheck`
> 預期結果：首頁恆顯示全部；sidebar/chip/breadcrumb 皆指向 `/category/{id}`；三份 `?category=` reader 刪除；`grep '?category='` 僅剩（待 M2 處理的）相容 redirect

- [x] Red → Green → Refactor

### Milestone 2: 舊連結相容 + E2E 遷移（非 URL find-replace）
> 範圍：`index.vue`（redirect）、`tests/e2e/compact-app.spec.ts` 及其他壓在 `?category=` 的 e2e
> ⚠️ 注意：多數受影響 e2e 測的是「home 在 `?category=` 下的 grid／transition」——這是 AC4 整個刪掉的行為，**不是改 URL 字串**。`/?category=X` 之後會 redirect 到 `/category/X`（另一個頁面、另一套 DOM），需逐條判斷遷移／刪除：
> - L105-159「sparse category tablet 3-col」：goto `/?category=network` 量 home grid → **遷到 `/category/network` 量該頁 grid**
> - L161-188「category-keyed result transition contract」：前提是 home-results transition + sidebar 點回 `/?category=` → **刪除**（home transition 已隨 AC14 移除）
> - L744-756「expands product categories in desktop sidebar」：expect `/?category=av-theater` → **改斷言導航到 `/category/av-theater`**
> - L770-820「desktop product grid columns fluid」：goto `/?category=network` 量 home grid → **遷到 `/category/network` 或改測首頁全部**
> - L472-498「restores category and search state from query strings」：desktop home sidebar active / mobile chip aria-pressed → **category 部分刪除或改測 `/category/{id}` active；保留 search `?q=` 部分**
> - L333 product detail breadcrumb `href` matches `/\?category=.+/` → **改 `/category/{id}`（AC3）**
> 驗證：`pnpm test:e2e`（需 dev/preview 服務）；手動造訪舊 `/?category=computer-3c` 確認 redirect；`pnpm generate` 確認 SSG prerender 未破壞，至少抽查 `.output/public/category/{id}`、`.output/public/api/content.json`、`.output/public/search-index.json` 皆產生；CI 等級再跑 `node scripts/assert-runtime-google-sheet-clean.ts`
> 預期結果：舊 `?category={valid}` redirect 到專屬頁；e2e 逐條遷移／刪除完成、無測舊契約卻意外綠者（AC12）；static output 含 taxonomy 頁、catalog payload 與 search index；`pnpm content:check` 不受影響

- [ ] Red → Green → Refactor

### Milestone 3: View Transition 重啟（spike／不得未驗證上線）
> 範圍：`nuxt.config.ts`（flag）、`catalog.css`（reduced-motion guard）
> 性質：**spike**，依賴使用者實機手動驗證，無法進 `./dev.sh verify` 自動 gate；不阻塞 M1–M2 以 `viewTransition: false` 落地與上線。除非 PASS 已記錄，否則 merge／上線前必須維持或 revert `viewTransition: false`（FAIL 或未驗證皆不得 ship `true`）。
> 驗證：乾淨冷啟動（清 cache、無雙 Nuxt 實例）→ **使用者在實機 iPad Safari 全新分頁驗 hydration 與轉場**；`prefers-reduced-motion` 下無動畫
> 預期結果（二元，AC10）：PASS → 保留 `viewTransition: true` 並記錄通過環境；FAIL 或未完成實機驗證 → revert／維持 `false`、記錄 crash／未驗證狀態與 cross-document VT fallback 評估

- [ ] 翻 flag → 實機驗證 → 依結果保留或 revert
