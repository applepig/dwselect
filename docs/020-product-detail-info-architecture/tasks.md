# Tasks — M2/M3 Atomic Payload Migration

> 來源：spec.md M2/M3 + 2026-06-16 ADR 決策。本檔為 worker 施工藍圖；驗收條件以 spec.md 為準。
> 採「build-side 先 green、runtime-side 後 green」兩段循序，由同一 worker 連續執行，兩個 commit。

## 已決策（不需再問）

- payload 型別單一 source：`app/utils/public-content-payload.ts`；`scripts/public-content.ts` re-export，刪除重複定義。
- 三個 view model：`ProductCardView`／`ProductDetailView`／`RelatedProductCardView`（+`CategoryChipView`／`CategoryNavigationItem`）放 `app/utils/public-content-view-types.ts`。
- `popular_search_tags` 下沉進 payload `navigation`；刪除 dead 的 `CompactAppView.search`／`top_tags`／`getSearchProducts`。
- card 與 detail `price_label` 統一 `price.label ?? price_text`。
- RSS／sitemap 改吃 raw `source`，不吃 payload。
- 三個 composable 統一 key 單次 fetch + `computed` 切片。
- M2 順帶收斂 deferred：search-index 共用 `resolveProductImageUrl` 與單一 taxonomy label resolver（消除 image resolver／label map 各自重寫）。**不要**提前合併 build script I/O（那是 M4）。**不要**再動 M1 的 comparator。

## 新 PublicContentPayload 契約

```ts
type ProductCardView = {
  id; name; summary; image_url; category_id; category_label;
  channel_id; channel_label; price_label; tag_labels: string[]; published_at: string | null
}
type RelatedProductCardView = { id; name; image_url; category_label; channel_label }
type ProductDetailView = {
  id; name; summary; long_description; llm_description;
  hero_image_url; hero_alt; category_id; category_label; channel_id; channel_label;
  tag_labels: string[]; price_label; buy_url; fine_print; related_products: RelatedProductCardView[]
}
type CategoryChipView = { id /* category_id|'all' */; label /* short_label */; count: number }

type PublicContentPayload = {
  version; site: { name; url }
  products: { cards: ProductCardView[]; details_by_id: Record<string, ProductDetailView> }
  guides: CompactResourceRow[]
  links: CompactResourceRow[]
  navigation: {
    category_chips: CategoryChipView[]
    desktop_category_items: CategoryNavigationItem[]   // = category_chips 同源，不含 active
    popular_search_tags: CompactSearchTagGroups        // active 一律 false
    counts: { products: number }
  }
  taxonomies: PublicTaxonomies
}
```

- cards：`compareProducts`（canonical）排序。
- details_by_id：key = `extractContentId`；related 已 score 排序 + `slice(0,3)`，無 placeholder。
- 不得出現 `dw_says`、泛用 `description`、`buy_cta`、`title`、`hero_image`、related 的 `description:null`/`purchase_link:''`。

## old → new 欄位對映

- card：`image→image_url`、`category→category_label`、`channel→channel_label`、`price→price_label`、`tags→tag_labels`；移除 `description`、`purchase_link`。
- detail：`title→name`、`hero_image→hero_image_url`、`dw_says→summary`、`description→long_description`(永遠原值)、新增 `llm_description`、`category_id`、`tags→tag_labels`、`buy_cta.href→buy_url`(其餘 hardcode 在 component)。
- detail UI（M3 必要部分）：「DW 怎麼說」綁 `long_description || summary`；「AI 怎麼說」綁 `llm_description` 且 `v-if="detail.llm_description"`。**順序重排留 M5**，M3 只改欄位綁定維持原順序。

## 階段 A — 型別單一 source（先做，build red 起點）
1. 新增 `app/utils/public-content-view-types.ts`。
2. 改 `app/utils/public-content-payload.ts` 為新 shape。
3. 改 `scripts/public-content.ts`：刪重複型別、re-export；保留 `PUBLIC_CONTENT_VERSION`/`SITE_*`/`isPublished`。

## 階段 B — build-time mapper（build green 收尾）
4. 新增 `scripts/public-payload/`（kebab-case、無 barrel）：`taxonomy-labels.ts`、`map-product-card.ts`、`map-product-detail.ts`、`map-related-product-card.ts`、`map-resource-rows.ts`、`build-navigation.ts`、`build-public-content-payload.ts`。邏輯來源見對應現行 `published-products/*`。
5. 改 `scripts/build-public-discovery.ts`：用新組裝；**sitemap/RSS 改吃 `source.products`/`source.guides`**；counts 改數 cards/source。
6. 改 `scripts/build-search-index.ts`：共用 `taxonomy-labels.ts` 與 `resolveProductImageUrl`（移除 search-index 內 `resolveProductSearchImageUrl`／`getCategoryLabelMap` 等重複）。
7. **build-side 測試**：更新 `tests/public-discovery.test.ts`（payload 新 shape 斷言）、`tests/search-index.test.ts`（共用 helper 後行為應不變）；新增 payload shape pin（card/detail/related 欄位語意、無 placeholder、無 `dw_says`/`description`）。跑 `pnpm test` 相關子集 + typecheck → **build-side green，commit 1**。

## 階段 C/D/E — runtime 切換（runtime green 收尾）
8. 改 `compact-app.ts`：`getCompactAppView(payload, state)` 只做狀態套用（home 篩選、category_chips active flag、empty_reason、tabs）；刪 mapping 與 dead `search`/`top_tags`/`getSearchProducts`。
9. 改 `published-products/types.ts`：`home.products: ProductCardView[]`；刪 `PublishedProductCard`/old `ProductDetailView`/`search` 區塊；保留 `CompactResourceRow`/route state 型別。
10. 刪 `shared.ts`、`product-detail.ts`、`product-detail-payload.ts`、`catalog-shell-summary.ts`、`tags.ts`（popular tags 已下沉）；`resource-rows.ts` 只留 search 顯示 helper。
11. composable：`fetch-public-content-payload.ts` 型別已新；`use-catalog-data`/`use-catalog-shell-data`/`use-product-detail-data` 統一 key 單次 fetch + `computed` 切片（detail 取 `details_by_id[id] ?? null`）。
12. component/page：`product-card.vue`、`product-detail.vue`、`index.vue`/`guide.vue`/`links.vue`/`search.vue`/`products/[id].vue`、`app-navigation.vue`/`default.vue` 改欄位名與資料來源；`search.vue` 的 `popular_search_tags` 改讀 `payload.navigation.popular_search_tags`，移除 `all_products`/`runtime_taxonomies` 依賴。
13. **runtime-side 測試**：更新 `compact-app.test.ts`（新簽名、刪 dead 斷言）、`product-detail.test.ts`（改測 build mapper 或新欄位）、`shared/resource-rows/tags.test.ts`（移到 build mapper 或刪）、`nuxt-smoke.test.ts`（detail `llm_description` IA）；新增 runtime 狀態測試。跑全套 `pnpm test`、`pnpm typecheck`、`pnpm lint` → **runtime-side green，commit 2**。

## 陷阱清單
- sitemap/RSS 漏改吃 source → pubDate/lastmod 壞。
- composable 同 key 不同 transform 會衝突 → 用單一 fetch + computed。
- `pnpm generate` 順序：`build:public-discovery` 在 `nuxt generate` 前（nuxt-smoke 已 pin）。
- 不要提前合併 build script I/O（M4）、不要再動 comparator（M1）。
- M3 只改欄位綁定，IA 順序重排留 M5，避免 e2e 一次難 debug。

## 驗收（M2/M3 完成）
`pnpm test` 全綠、`pnpm typecheck`/`pnpm lint` exit 0、`pnpm generate` 成功產出新 shape `public/api/content.json`。detail page 的 agent-browser 視覺驗收屬 M5/M7。
