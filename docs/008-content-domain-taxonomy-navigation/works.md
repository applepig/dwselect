# Sprint 008 Works

## 2026-06-08：Milestone 1 Schema、taxonomy 與 validation tests

### Red

- 更新 `tests/product-schema.test.ts`，新增 product `tag_ids` contract、guide schema、link schema、tags dictionary、category `nav_visible` metadata、missing tag/category reference validation 測試。
- 更新 `tests/published-products.test.ts`，將 helper fixture 切到 `tag_ids`，並明確區分「new schema contract」與「pre-migration legacy content」。
- Red 驗證：`pnpm test tests/product-schema.test.ts tests/published-products.test.ts` 預期失敗，失敗原因包含 product schema 仍要求 legacy `tags`、缺少 `guide_schema`／`link_schema`／`tag_taxonomy_schema`／`validateContentTaxonomyReferences`、view-model helper 仍讀取 `product.tags`。

### Green

- 更新 `app/utils/product-schema.ts`：Product schema 改為 `tag_ids`，新增 Guide／Link／Tag schema，Category schema 補 `nav_visible`，並新增 `validateContentTaxonomyReferences` cross-reference helper。
- 更新 `content.config.ts`：新增 `guides`、`links`、`tags` collections，`links` 改指向 `content/links/*.json` 的 Link content schema。
- 新增 `content/taxonomies/tags.json`，提供初始 tags dictionary；更新 `content/taxonomies/categories.json` 補 `nav_visible`。
- 更新 `app/utils/published-products.ts` 與必要 fallback fixture，讓 Product view-model 讀取 `tag_ids`，Link view-model 由 `summary` 對應既有 row subtitle。
- 更新 `app/composables/use-catalog-data.ts` 最小配合新 links collection shape；更新 `app/utils/search/search-index.ts` 的 Product tag 欄位來源與 CategoryDefinition fallback shape。

### Refactor／技術決策

- Cross-reference validation 放在 schema/domain helper，UI helper 不負責判斷 taxonomy 是否存在。
- Milestone 1 不做 content migration；真實 `content/products/*.json` 仍保留 legacy `tags`，測試以 pre-migration 區塊明確記錄，不放寬新的 `product_schema`。
- `content/taxonomies/links.json` 未移除，保留給後續 migration／deprecation 處理；runtime links SSOT 已在 collection 設定切到 `content/links/*.json`。

### 測試結果

- `pnpm test tests/product-schema.test.ts tests/published-products.test.ts`：通過，2 files，46 tests。

## 2026-06-09：Milestone 2 Content migration 與資料整理收斂

### Red

- 前一輪 migration 後，Coordinator 驗收 `pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/search-index.test.ts` 時失敗 1 個 stale 測試：`tests/published-products.test.ts > pre-migration product content > should keep real product content documented separately until Milestone 2 migration`。
- 本輪先重跑同一命令確認 Red：實際 products 已為 62 筆，但 stale 測試仍期待 pre-migration 的 66 筆與 legacy `tags`。
- 檢查 `tests/product-schema.test.ts` 與 `tests/search-index.test.ts` 後，確認 guides／links migration 產物已有覆蓋：product／guide／link domain 歸位、schema validation、taxonomy cross-reference、legacy platform/root category tags 移除，以及 static search index 與 product cutover count 對齊。

### Green

- 更新 `tests/published-products.test.ts` 的 content 驗收為 post-migration contract：products 為 62 筆，不包含 `2026-06-02-日本米入門篇`、`2026-06-02-aeron-chair`、`2026-06-02-b18`、`2026-06-02-altwork-station`，並保留 `2026-06-02-ikea充電線` 與 `2026-06-02-三菱重工冷氣`。
- 同一測試改為驗證 product content 使用 `tag_ids`，且不再包含 legacy `tags`。
- 未修改 UI pages、navigation 或 production code；本次只做 Milestone 2 收斂測試與文件同步。

### Refactor／Migration summary

- Moved content：`日本米入門篇`、`Aeron Chair` 已自 products 移到 `content/guides/`；`B18`、`Altwork Station` 已自 products 移到 `content/links/`；`applepig-home` 已自 legacy taxonomy links 移到 `content/links/applepig-home.json`。
- Removed legacy tags：platform/channel labels（`PCHome`、`momo`、`日亞`、`美亞`）不進 `tag_ids`，由 `channel_id` 或 link URL 表達；root category labels（`居家`、`電腦`、`廚房`、`3C`、`影音`、`食材`）不進 `tag_ids`，由 `category_id`／`category_ids` 表達。
- Discarded noisy tags：未經人工 mapping 的 legacy tags 不升級為 `tag_ids` 或 category URL，避免把 `網路設備`、`線材`、`水波爐` 等不穩定標籤公開成分類契約。
- Empty `tag_ids`：允許 migration 後內容保留空陣列；`IKEA充電線` 與 `三菱重工冷氣` 的 `tag_ids` 已驗證為空陣列，符合「不為填滿 tag 而保留錯誤 tags」的邊界案例。

### 測試結果

- 前一次整合測試失敗：`pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/search-index.test.ts`：1 failed，原因是 stale pre-migration 測試期待 66 筆與 legacy `tags`。
- 修復後整合測試：`pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/search-index.test.ts`：通過，3 files，58 tests。
- Milestone 2 指定命令：`pnpm test tests/product-schema.test.ts tests/search-index.test.ts`：通過，2 files，29 tests。

## 2026-06-09：Milestone 3 View-model、pages 與 search index 更新

### Red

- 更新 `tests/published-products.test.ts`、`tests/search-index.test.ts`、`tests/client-search.test.ts` 與 `tests/nuxt-smoke.test.ts`，覆蓋 flat category filter、guide list、link list、mixed content search documents、product search result 的 price/channel/image 欄位、non-published exclusion 與外連安全屬性。
- Red 驗證：`pnpm test tests/published-products.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts` 預期失敗，失敗點包含 `/guide` 仍是 product tag explorer、`/search` 仍只渲染 product cards、static search index 仍是舊 product-only artifact。

### Green

- 更新 `app/composables/use-catalog-data.ts`，同時載入 products、guides、links、categories、channels、tags。
- 更新 `app/utils/published-products.ts`，新增 guide/link view-model、tag label lookup、taxonomy-driven category chips，並讓 `/guide` route state 不再解析 tag query。
- 更新 `app/pages/guide.vue` 為 published guides list，外部 guide CTA 使用 `target="_blank"` 與 `rel="noopener noreferrer"`。
- 更新 `app/pages/links.vue` 使用 `content/links/*.json` 的 published links，並保留 empty state。
- 更新 `app/pages/search.vue` 為 mixed search results，支援 product／guide／link result，product result 保留價格、通路與圖片，external result 使用安全外連屬性。
- 更新 `app/utils/search/search-index.ts` 與 `scripts/build-search-index.ts`，search document 使用 `document_id = "<type>:<content_id>"`，並納入 products、guides、links 與 tag/category/channel labels。
- 執行 `pnpm build:search-index`，重產 `public/search-index.json`，結果為 67 published mixed documents。

### Refactor／技術決策

- Mixed search result rendering 直接消費 `SearchSuggestion`，避免 page 重新 lookup raw taxonomy。
- Client search 載入失敗或 SSR 階段仍可 fallback 到已載入 product view-model，維持原本商品搜尋不白屏的行為。
- 第一個 M3 subagent 達步數上限後只完成部分 Green；第二個 subagent 空回報。Coordinator 接手收斂剩餘問題，未再派第三個 subagent。

### 測試結果

- `pnpm build:search-index`：通過，輸出 `Documents: 67`。
- `pnpm test tests/published-products.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts`：通過，4 files，66 tests。
- `pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts`：通過，5 files，85 tests。

## 2026-06-09：Milestone 4 Responsive navigation IA

### Red

- 更新 `tests/nuxt-smoke.test.ts`，覆蓋 mobile／tablet top-level nav order、desktop product category list、category link source contract 與 `aria-current` 來源。
- 更新 `tests/e2e/compact-app.spec.ts`，將 guide route 驗收改為 guide list，search route 驗收改為 mixed search result，並新增 desktop sidebar category navigation smoke。
- Red 驗證重點：既有 `AppNavigation` 三個 breakpoint 使用同一組 nav items，順序仍是首頁、指南、搜尋、連結，desktop 沒有產品分類列表。

### Green

- 更新 `app/components/app-navigation.vue`：mobile／tablet nav 順序改為首頁、指南、連結、搜尋；desktop sidebar 改為直接列出「全部」與 taxonomy visible categories，並保留指南、連結、搜尋入口。
- Desktop category links 寫入 `/` 或 `/?category=<id>`，active state 由 route path 與 query 判斷；目前 category link 才加 `aria-current="page"`。
- 更新 `app/assets/styles/catalog.css`，新增 `.desktop-category-items`、`.desktop-route-items`、`.desktop-category-link` 與 `.nav-count` 樣式。

### Refactor／技術決策

- Desktop sidebar 不顯示「首頁」top-level route，而是直接展開與 mobile 首頁 category pills 一致的產品分類。
- Mobile bottom tabs 與 tablet rail 不顯示產品分類，避免小螢幕 hit target 與導覽層級過多。
- 此 milestone 由 coordinator 直接收斂，未再派 subagent。

### 測試結果

- `pnpm test tests/nuxt-smoke.test.ts`：通過，1 file，21 tests。
- `pnpm test:e2e`：通過，17 passed，4 skipped。

## 2026-06-09：Milestone 5 Static generate 與文件同步

### Red

- 執行 `pnpm test` 時發現 legacy migration tests 失敗，主因是 `scripts/migrate-product-compact-schema.ts` 仍把 legacy `tags` 傳入新版 strict `product_schema`，且未產生必要的 `tag_ids`。
- 失敗測試集中在 `tests/migrate-google-sheet-products.test.ts` 與 `tests/migrate-product-compact-schema.test.ts`，錯誤包含缺少 `tag_ids` 與不允許 legacy `tags`。

### Green

- 更新 `scripts/migrate-product-compact-schema.ts`，丟棄 legacy `tags`，保留既有 `tag_ids` 或補空陣列，讓 legacy helper 輸出符合新版 Product schema。
- 更新 `scripts/migrate-google-sheet-products.ts`，新增 deprecated notice，並在 migration summary 顯示 legacy-only 狀態。
- 更新 legacy migration tests，改為驗證 deprecated importer 不再輸出平台/root category tags，且輸出新版 `tag_ids` contract。
- 更新 `README.md` Migration 區塊，明確標記 Google Sheet importer deprecated，並說明 008 之後以 Git-backed content domains 與 taxonomy files 為 SSOT。

### Refactor／技術決策

- 保留 legacy importer 可測、可追溯，但不把它升級成新版 content importer；避免重新引入平台／分類 free-string tags。
- `scripts/migrate-content-domain-taxonomy.ts` 只作為已完成的一次性 migration 參考，不作為日常新增內容流程。
- `pnpm generate` 會先執行 `pnpm build:search-index`，因此 `public/search-index.json` 已同步重產為 67 筆 mixed documents。

### 測試結果

- `pnpm test tests/migrate-google-sheet-products.test.ts tests/migrate-product-compact-schema.test.ts`：通過，2 files，21 tests。
- `pnpm test`：通過，13 files，124 tests。
- `pnpm generate`：通過，重產 `public/search-index.json`，`Documents: 67`，Nuxt prerender 140 routes。
