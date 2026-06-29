# 032 Code Health：去重與 magic string 收斂（plan / backlog）

> 狀態：plan / backlog，尚未開 spec。
> 來源：031 sprint 期間三組獨立 reviewer（跨檔重複、測試 smell、clean-code）的 findings 中，**屬 production code 去重／clean-code、且刻意排除在 031 之外**的部分，集中於此避免流失。
> 註：031 走 Design A（分類導航單一真相）時，已順手消除「三份 `?category=` reader」與約一半 `'all'` 用法；本 backlog 是**剩下**的部分。

## 為什麼獨立成 sprint

這些都是真實的維護負擔，但與 031 的「分類導航行為變更」是不同關注點。混進 031 會把一個可驗收的行為 sprint 撐成大重構、模糊完成定義。集中記錄，待 031 落地後另開 spec 處理。

---

## 主題 A：Taxonomy「種類」缺單一 SSOT（最高優先，根因）

clean-code 與跨檔重複 reviewer 都指向同一個根：`'category' | 'tag' | 'brand' | 'channel'`（kind）、`'/category/' | '/tag/' | …`（route 前綴）、各自的 label getter、404 message 四者邏輯上一一對應，卻散落多檔各寫一套 if／字串。這是公開站最容易出 **SEO 回歸** 的地方（漏改一處 → canonical 或 breadcrumb 錯置）。

### A1. 四個 taxonomy 頁幾乎逐行複製（severity: high）
- 位置：`app/pages/category/[id].vue`、`tag/[id].vue`、`brand/[id].vue`、`channel/[id].vue`（各約 73 行）
- 差異只有：route 前綴字串、`useTaxonomyPageData(kind, id)` 的 kind、`raw_id` 變數名、404 message 一句。其餘 `shallowRef`、canonical 推導、`meta_title`/`meta_description` computed（連 `=== null` fallback 分支）、整段 `useHead` + `useSeoMeta`、`createError(404)`、`watchEffect` 全相同。
- 為何咬人：SEO meta／canonical／404 任一處要改得同步改 4 檔，極易漏改造成各頁 SEO 行為分歧。
- 方向：抽 `useTaxonomyDetailPage(kind, { prefix, notFoundMessage })` composable 或薄 wrapper component；頁面只剩 kind／404 message。

### A2. 兩個 detail 頁同類複製（severity: med）
- 位置：`app/pages/products/[id].vue:17-57`、`guide/[id].vue:17-57`
- 差異：title 欄位（name/title）、canonical fallback（`/` vs `/guide`）、404 message。
- 方向：同 A1，可共用 detail 頁 SEO scaffolding helper。

### A3. SEO meta 樣板散落 10 頁（severity: med）
- 位置：A1/A2 六頁 + 靜態頁 `index.vue:63-84`、`guide/index.vue:27-48`、`links.vue:26-47`、`search.vue:80-101`
- `useHead(canonical)` + `useSeoMeta`（og/twitter 共 12 欄，含 `twitterCard: 'summary_large_image'`、`ogImage: SITE_OG_IMAGE`）整塊複製。`summary_large_image` 一串全站 11 檔重複。
- 方向：抽 `buildDefaultSeoMeta({ title, description, url, image })` helper 放進 `app/utils/seo-metadata.ts`（已是 SEO 常數 SSOT），10 頁共用。

### A4. `TAXONOMY_KINDS` 單一 mapping table（severity: med，與 A1 同根）
- 位置：`breadcrumb/resolve-breadcrumb-items.ts:31,56,60,145,149`、`select-taxonomy-items.ts:49,59,68`、`build-taxonomy-page-data.ts:58,62,66,92,96,109`、四個 taxonomy page 的 canonical／fetch、`guide-detail.vue:46`、`product-detail.vue:47`
- 新增一種 taxonomy 或改前綴，要動 breadcrumb prefix list、select if 鏈、build namespace/label if 鏈、page canonical 與 fetch 多處。`guide-detail`/`product-detail` 內 brand pill 還要手動避開 `/tag/` 走 `/category/`，正是字串散落的後遺症。
- 方向：建一張 `TAXONOMY_KINDS` 設定表（kind → prefix → label getter → 404 message），breadcrumb／select／build／pages 全從表驅動。
- 註：031 的 ADR 已假設 breadcrumb 的 `/category/` 分支正確，A4 是把該分支與其餘三 kind 一起收斂，**待 031 落地後再做以免衝突**。

---

## 主題 B：散落的 magic string / sentinel

### B1. `'all'` sentinel 散落（severity: med）
- 位置（031 後**剩餘**的）：`selectable-category-ids.ts:8`、`breadcrumb/resolve-breadcrumb-items.ts`（若 home 分支已刪則減少）、`types.ts:16,40`、`public-content-view-types.ts:72`、`build-navigation.ts:49`、`app-navigation.vue`（active 判定殘留）
- 代表「未篩選分類」的哨兵，以裸字串出現於多檔；拼錯不被型別擋（多處 runtime 比較）。
- 方向：抽 `const ALL_CATEGORIES_ID = 'all'`（放 taxonomy helper 或 view-types 同層），runtime 比較與 build-navigation 產 chip 都引用；型別維持 union 但以該常數 literal type 對齊。
- 註：031 移除 home filter 後會自然消掉約一半用法，B1 處理剩餘。

### B2. 導覽分頁設定重複兩份（severity: med）
- 位置：`compact-app.ts:15`（`COMPACT_APP_TABS`）vs `app-navigation.vue:85`（`nav_items`）
- 兩處都列 home/guide/search/links，label 與 icon 完全相同，差別只在 `app-navigation` 多帶 `to`。
- 方向：以單一 tab 設定（含 `to`）為 SSOT，`COMPACT_APP_TABS` 由它 `Omit<'to'>` 或直接共用。

### B3. 外部連結屬性與 row icon 字面值重複（severity: med）
- 位置：`resource-rows.ts:13-14,48-49,65,69`、`scripts/public-payload/map-resource-rows.ts:33,53-54`、`types.ts:68-69,101-102`
- `target: '_blank'` / `rel: 'noopener noreferrer'` 三件組在三處各寫一次；guide `i-lucide-book-open`、link `i-lucide-link` 跨 build-time mapper 與 client helper 重複。
- 方向：抽 `EXTERNAL_LINK_ATTRS` 常數／helper；row type→icon 用單一 map。
- 註：分屬 build-time payload 與 runtime row attr 兩個邊界，目前一致；若哪天要加 `nofollow` 三處要同步——是收斂的觸發點。

---

## 主題 C：低成本 clean-code（severity: low，可順手）

- C1. `route.params.id` 正規化 inline 重複六頁（`products/guide/category/tag/brand/channel [id].vue`）：`(Array.isArray(raw_id) ? raw_id[0] : raw_id) ?? ''`。若做 A1 composable 自然吸收。與 `extractContentId`（剝 `.json`/query）是不同關注點，別混。
- C2. search suggestion 上限 magic number `12`（`client-search.ts:56`），與同檔 `SEARCH_HISTORY_LIMIT = 12` 數值巧合相同但語意不同 → 抽 `SEARCH_SUGGESTION_LIMIT`。
- C3. `event.keyCode === 229`（`search-input.vue:74`）IME 組字哨兵，裸數字無註解 → `const IME_COMPOSITION_KEYCODE = 229` 或加 why 註解。
- C4. `Product['category_id'] | 'all'` 多處手寫（`compact-app.ts:60,108`、`types.ts:16,40`），已有 `CategoryChipView['id']` 同義 → 改引用以減少同形狀重定義。
- C5. `getSearchResultSections`（`resource-rows.ts:24-28`）用 `sections[0]!`/`[1]!`/`[2]!` 與宣告順序硬耦合 + non-null assertion → 改 `Map<type, label>` 直接建 section。

---

## 不收斂（reviewer 判定，記錄以免重複討論）

- 首頁分類篩選 vs taxonomy 頁篩選看似重疊，但 output shape／domain 不同（031 已用 Design A 移除前者，議題消失）。
- comparator 群（`compare-products/guides/links`）已正確共用 `compare-text`／`compare-nullable-timestamp-desc`；`createTaxonomyLabelResolver`、`extractContentId` 也已正確共用——這些是**正確收斂**，不要再抽。

---

## 測試品質 findings → 路由到 025（不在本 plan 範圍）

reviewer 的測試 smell findings 歸 `docs/025-test-quality-cleanup`（已有草稿 spec，AC3/AC5 已涵蓋 source-grep 測試與 adoption 測試）。其中 **025 草稿尚未明列、建議補進 025** 的新項：

- build-*-routes 四檔的 fixture/setup 完整複製（`makeContentDirs`/`writeAll`/`cleanup` 逐字重複 ×4，每個 `it` 散落 try/finally）→ 抽共用 test helper（`afterEach` 自動清理）。
- 兩套平行 fixture drift：`tests/published-products/fixtures.ts` vs `tests/public-discovery.test.ts` 各自定義 `base_product`/`base_guide`，欄位（slug、taxonomy id 命名）不一致 → 收斂重用。
- E2E flaky pattern：`compact-app.spec.ts` 的 `waitForTimeout(400/100)` 與 `networkidle` 同步點 → 改 web-first assertion 輪詢。（031 新寫 e2e 已在 AC13 要求不再引入。）
- `Sharp`/`電腦` 等與 seed content 耦合的搜尋 e2e → 至少加一次性「該關鍵字有結果」確認並 skip-with-reason。
