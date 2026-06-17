# Frontend-Ready Product Payload And Detail IA

## Goal

把 product content 到 UI 的資料流改成 build-time 產生 frontend-ready payload，避免 runtime 再把欄位重新命名、重組成多層 view model。完成後首頁、搜尋、商品詳情與 related products 都應讀取語意清楚、接近 UI 需求但不模糊 content 欄位的公開 payload。

同時整理商品詳情頁資訊架構，讓 detail page 顯示順序符合：產品名稱、分類／通路／標籤、價格、DW 怎麼說、AI 怎麼說。

## Problem

目前 data flow 是：

1. `content/products/*.json` 以 `Product` schema 儲存 raw content。
2. `scripts/build-public-discovery.ts` 產生 `public/api/content.json`，內容仍是完整 raw `Product[]`。
3. Nuxt runtime 讀取 public payload 後，再透過 `app/utils/published-products/*` 產生 `PublishedProductCard`、`ProductDetailView`、navigation counts、related products 等 runtime view model。
4. Vue components 使用 runtime view model 顯示畫面。

這對目前 app 過度抽象。本站是 SSG app，公開 runtime 不需要再做 product mapping；build process 可以一次產生 frontend-ready payload，runtime 只負責讀取與顯示。

## Current Bad Smells

- `summary` 在 detail runtime view model 被改名為 `dw_says`，把資料欄位和 UI 文案耦合。
- `long_description` 被改名為 `description`，但 content schema 已經刻意拒絕 legacy `description` 欄位，runtime 又重新引入模糊命名。
- `llm_description` 保留在 raw content 與 search hidden text，但沒有進商品詳情 UI contract。
- `PublishedProductCard` 同時給首頁、搜尋與 related products 使用，導致 related products 需要塞 `description: null`、`purchase_link: ''` 這類 placeholder。
- runtime fallback search 依賴 card model 的 `description`，實際上是 `long_description`，語意不清。
- `reference_url` 目前存在於 raw public payload，但沒有明確 runtime UI contract。

## Additional Bad Smells（2026-06-16 simplify review）

以下為 4-agent bad smell review 在原 spec scope 之外另外坐實的問題。它們在「mapping 下沉 build-time」之後仍會殘留，因為 search index 與 build script 是刻意保留的獨立 artifact，故獨立列出並納入 Milestones：

- **重複的共用邏輯**：`compareNullableTimestampDesc` 有 4 份副本（`published-products/shared.ts:103`、`product-detail.ts:97`、`resource-rows.ts:139`、`search/search-index.ts:442`）；product id 抽取（`split('/')` + `replace(/\.json$/)`）有 3 份（`shared.ts:137`、`product-detail.ts:56`、`search-index.ts:369`）；`compareText`、`getPrimaryOffer`、product image resolver、taxonomy label map 在 `search-index.ts` 各自重寫，未共用 `published-products` 版本。
- **composable cache key 分歧**：`use-catalog-data.ts`、`use-catalog-shell-data.ts`、`use-product-detail-data.ts` 各用不同 `useAsyncData` key 呼叫 `fetchPublicContentPayload`，同一份 `content.json` 被重複快取／載入。
- **build script 重複 I/O**：`build-public-discovery.ts` 與 `build-search-index.ts` 各自 `readPublicContentSource()`，重複讀檔與 filter／sort。
- **`isPublished` 散落**：`public-content.ts:51`（object 版）、`build-product-routes.ts:13`（file-path 版）與 runtime 多處 inline `status === 'published'` 並存。

注意量級：本站僅 62 筆 product，這些問題的成本主要在語意清晰度與維護性（多點維護、命名誤導），不是 runtime 效能；不以效能為修復理由。

## Non-Goals

- 不重新設計 content authoring 流程。
- 不在本 sprint 大規模填補 product content 文字。
- 不修改 `content/AGENTS.md` 已定義的撰寫責任：`summary`／`long_description` 由使用者提供，`llm_description` 由 Agent／AI 提供。
- 不新增 CMS、資料庫或 runtime API。
- 不更動 routing。
- 不一次重設整站視覺設計；detail UI 只做資訊架構必要整理。

## Content Field Semantics

Product content schema 現階段維持：

| 欄位 | 責任 | 用途 |
| --- | --- | --- |
| `summary` | 使用者 | 商品卡片短評、搜尋摘要、SEO fallback |
| `long_description` | 使用者 | 商品詳情頁「DW 怎麼說」主文 |
| `llm_description` | Agent／AI | 商品詳情頁「AI 怎麼說」與搜尋理解 |
| `search_aliases` | Agent／AI | search-only 命中輔助 |
| `model_numbers` | Agent／AI | search-only 命中輔助，可在未來規格區顯示 |
| `reference_url` | Agent／AI | 參考來源；本 sprint 先保留資料，是否顯示需明確設計 |

目前 content JSON 可能仍有 `summary === long_description`、`llm_description === ""` 的歷史資料；這是內容填充問題，不應讓 view model 以模糊命名掩蓋。

## Target Public Payload Shape

`public/api/content.json` 應改由 build process 產生 frontend-ready public view payload。命名可以在實作時微調，但需符合以下原則：

```ts
type PublicContentPayload = {
  version: number
  site: {
    name: string
    url: string
  }
  products: {
    cards: ProductCardView[]
    details_by_id: Record<string, ProductDetailView>
  }
  guides: CompactResourceRow[]
  links: CompactResourceRow[]
  navigation: {
    category_chips: CategoryChipView[]
    desktop_category_items: CategoryNavigationItem[]
    counts: {
      products: number
    }
  }
  taxonomies: PublicTaxonomies
}
```

### ProductCardView

Product card payload 應只包含首頁／搜尋 product card 實際需要的欄位，不包含 buy URL 或 detail-only 長文。

```ts
type ProductCardView = {
  id: string
  name: string
  summary: string
  image_url: string
  category_id: string
  category_label: string
  channel_id: string
  channel_label: string
  price_label: string
  tag_labels: string[]
  published_at: string | null
}
```

### ProductDetailView

Product detail payload 應保留 content 欄位語意，不再使用 `dw_says` 或泛用 `description`。

```ts
type ProductDetailView = {
  id: string
  name: string
  summary: string
  long_description: string
  llm_description: string
  hero_image_url: string
  hero_alt: string
  category_id: string
  category_label: string
  channel_id: string
  channel_label: string
  tag_labels: string[]
  price_label: string
  buy_url: string
  fine_print: string
  related_products: RelatedProductCardView[]
}
```

### RelatedProductCardView

Related products 應有獨立 payload，不重用完整 `ProductCardView` 並塞 placeholder。

```ts
type RelatedProductCardView = {
  id: string
  name: string
  image_url: string
  category_label: string
  channel_label: string
}
```

## UI Information Architecture

商品詳情頁內容順序：

1. 產品名稱：`name`
2. 分類／通路／標籤：`category_label`、`channel_label`、`tag_labels`
3. 價格：`price_label`
4. DW 怎麼說：`long_description`，若歷史資料為空可 fallback `summary`
5. AI 怎麼說：`llm_description`，空字串時不顯示
6. 購買 CTA：`buy_url` 與 `channel_label`
7. Fine print：`fine_print`

Back button 在 hero image 上的左右／上下內距需視覺對稱，mobile 與 desktop 都不應顯得偏移。

## Acceptance Criteria

- `public/api/content.json` 由 build process 直接輸出 frontend-ready payload，Nuxt runtime 不再從 raw `Product[]` 重新產生 product card／detail view model。
- Runtime product UI 不再使用 `dw_says` 或泛用 `description` 表示 product content 文字。
- Product detail payload 明確包含 `summary`、`long_description`、`llm_description`。
- Home product card 使用 `summary`，不需要 `long_description`、`llm_description` 或 buy URL。
- Detail page 使用 `long_description` 顯示「DW 怎麼說」，空值才 fallback `summary`。
- Detail page 使用 `llm_description` 顯示「AI 怎麼說」，空字串時不顯示該區塊。
- Related products 不再透過 `PublishedProductCard` 塞 `description: null` 或 `purchase_link: ''`。
- Search index 可保留獨立 build artifact；若仍需要 fallback client search，應使用清楚命名的 search payload，不依賴 card-only 欄位的模糊 `description`。
- 商品詳情頁 back button 視覺上左右／上下內距對稱。
- 現有首頁、搜尋、指南、連結、商品詳情 routes 維持可載入。

## Milestones

- [x] M1：抽出共用 helper 單一 source（product id 抽取、`compareNullableTimestampDesc`、`compareText`、`getPrimaryOffer`、`isPublished`），供 build payload 與 `search-index` 共用，消除重複副本；並把同名不同行為的 `compareProducts`／`compareGuides` 統一成單一 canonical comparator（product：category→date→name；guide：date→name，皆用 `compareText` tie-break），catalog 與 search 共用。image resolver 與 taxonomy label map 因行為差異 deferred 至 M2 一併處理。
- [x] M2：補 build-time payload mapper 與型別，產生 frontend-ready `cards`、`details_by_id`（含已排序 `related_products`）、navigation counts／resource rows；`ProductCardView`／`ProductDetailView`／`RelatedProductCardView` 三個獨立 model。
- [x] M3：改 Nuxt runtime composables／pages 使用 frontend-ready payload，移除 runtime product view model mapping 與 placeholder（`description: null`／`purchase_link: ''`）；統一 content payload 的 `useAsyncData` cache key。
- [x] M4：build script 去重——`build-public-discovery.ts` 與 `build-search-index.ts` 共用單次 `readPublicContentSource()` 輸出。
- [x] M5：重排 `ProductDetail` UI 資訊架構與 back button 樣式。
- [x] M6：更新 unit／smoke tests，鎖定欄位語意與避免 `dw_says`／`description` 回歸、避免共用 helper 再度分岔。
- [x] M7：執行 `pnpm test`、`pnpm lint`、`pnpm typecheck`、必要時 `pnpm generate`，並用 agent-browser 驗收 mobile／desktop detail page。

## ADR

- 決策：不先做 content schema migration。`summary`、`long_description`、`llm_description` 已由 `content/AGENTS.md` 定義責任，現階段問題在 runtime mapping 命名與分層過度。
- 決策：public payload 從 raw content payload 改成 frontend-ready payload，因為本站是 SSG app，build process 可一次完成 taxonomy label、primary offer、image URL、related products 與 navigation counts。
- 決策：保留 search index 作為獨立 artifact；search 有跨 content type 的需求，不必強迫和 product card payload 共用同一 model。
- 決策：`reference_url` 本 sprint 不強制顯示；先避免擴大 detail IA scope，後續可獨立定義「參考資料」區塊。
- 決策（2026-06-16，M2/M3 規劃）：`popular_search_tags` 為靜態衍生，下沉進 build payload（`navigation` 區塊）；`CompactAppView` 的 `search`／`top_tags` 與 `getSearchProducts` 經查證為 dead code（無 page 消費，search.vue 走 client-search index），一併刪除——同時清除「runtime fallback search 依賴 card `description`」這個 bad smell。
- 決策（2026-06-16，M2/M3 規劃）：product card 與 detail 的 `price_label` 統一為 `price.label ?? price_text`（card 原本只用 `price_text`，屬刻意小行為變更，測試 pin）。
- 決策（2026-06-16，M2/M3 規劃）：`PublicContentPayload` 型別收成單一 source（`app/utils/public-content-payload.ts`），build script re-export；RSS／sitemap 改吃 raw `source.products`／`source.guides`（payload 不再帶 raw `Product[]`）；三個 content composable 統一 `useAsyncData` key 單次 fetch、以 `computed` 取切片，避免同 key 不同 transform 衝突。M2/M3 採「build-side 先 green、runtime-side 後 green」兩段、兩個 commit。
- 決策（2026-06-16）：同名不同行為的 `compareProducts`／`compareGuides` 統一成單一 canonical comparator，而非改名保留差異。product 統一為 category→date→name、guide 為 date→name，tie-break 一律 `compareText`。後果：**搜尋 idle／baseline 的商品顯示順序由 date→name 改為 category→date→name，與首頁一致**（user-visible，刻意變更）。對應的 search-index 測試需在 Red 階段更新為新順序。
