# Public Payload 拆分：瘦身 content.json + per-id detail

## 目標

讓公開站資料的「打包粒度」對齊「使用粒度」，消除每頁 `_payload.json` 內嵌整站全量 detail 的問題（研究實測 ~308KB × N 份、位元級重複躺 CDN）。

具體達成兩層拆分：

1. **瘦身共用層** — `/api/content.json` 移除 `products.details_by_id` 與 `guides.details_by_id`，只保留列表與導覽所需的 cards / guide rows / links / navigation / taxonomies。此份由 layout 與所有列表頁共用，全站 load 一次。
2. **per-id detail 層** — 商品／指南完整 detail 改為每筆一個 static JSON（`/api/products/{id}.json`、`/api/guides/{id}.json`），點進詳情頁才載對應那一筆，各自獨立 cache。

連帶把 layout 麵包屑對「全量 detail」的依賴砍掉——改用 cards / rows 既有的精簡欄位 lookup。

3. **止血冗餘流量** — `<NuxtLink>` 全站預設改 `prefetchOn: { interaction: true, visibility: false }`（hover/focus 才預抓），消除「首頁一進站就背景狂 prefetch 幾十份 payload」這第二種冗餘（018 已點名為載入慢主因之一）。這與 detail 拆分同屬「處理 redundant data/traffic」，零風險一行設定，故併入本 sprint。（**註**：字串形式 `'interaction'` 不可用——Nuxt 4.4.8 的型別已排除 string；且需顯式寫 `visibility: false` 才能對抗 Nuxt defaults merge 把 `visibility` 補回 `true`。）

## 非目標

- 不改內容資料 schema、欄位或內容（`content/` 下 JSON / taxonomy 不動）。
- 不改搜尋：搜尋頁走獨立的 `public/search-index.json`，本來就不吃 content payload，不在範圍。
- 不改 discovery 輸出（`sitemap.xml` / `rss.xml` / `llms.txt` / `robots.txt`）的 schema。
- 不引入 SSR / Workers / 動態後端；維持 `nitro.preset: 'static'` SSG。
- 不做圖片優化、字型、CI cache（屬研究結論中的其他議題，非本 sprint）。
- 不嚴格拆成 shell / cards 兩個獨立檔（見 ADR-1）。

## User Story

作為 DW嚴選的使用者，我想要首頁與列表頁只下載它們真正用到的資料，以便初次載入更快、不再為了從未開啟的商品 detail 付出頻寬；點進某個商品時，只額外載入那一筆 detail。

作為站點維護者，我想要 detail 資料隨商品數成長時不再被複製進每一個 `_payload.json`，以便 build 產物與 CDN 邊緣快取不隨 N 線性膨脹。

### 驗收條件

- [ ] `/api/content.json` 的回應不含 `products.details_by_id` 與 `guides.details_by_id`；型別 `PublicContentPayload` 同步移除這兩個欄位。
- [ ] 新增 `/api/products/{id}.json` route，回應為單一 `ProductDetailView`；`/api/guides/{id}.json` 回應為單一 `GuideDetailView`。
- [ ] 商品詳情頁只 fetch 自己那一筆 detail（per-id `useAsyncData` key），不再載入整包 content payload。
- [ ] layout 麵包屑改用 cards（product）／rows（guide）的精簡欄位，移除對 `details_by_id` 的依賴；麵包屑顯示結果與現況一致。
- [ ] `pnpm generate` 後，列表頁（如首頁）的 `_payload.json` 不再含任何商品／指南 detail 內容，體積明顯下降。
- [ ] `pnpm generate` prerender 全部 product / guide detail json route，failOnError 維持有效（壞 id 或壞 content 讓 build 中止）。
- [ ] 不存在的 detail id：per-id route 回 404，詳情頁維持現有 `throw createError(404)` 行為。
- [ ] `<NuxtLink>` 全站預設 `prefetchOn: { interaction: true, visibility: false }`；首頁載入時不再自動背景 prefetch 全部站內連結的 payload／chunk。（字串形式 `'interaction'` 不可用：Nuxt 4.4.8 型別排除 string，且需顯式 `visibility: false` 對抗 defaults merge 把 `visibility` 補回 `true`。）
- [ ] 既有 unit test、E2E、`pnpm lint`、`pnpm typecheck`、`pnpm content:check` 全綠；實際打開首頁、商品詳情、指南詳情頁確認可用。

## 相關檔案

- `app/utils/public-content-payload.ts` — `PublicContentPayload` 型別，移除 `details_by_id` 兩欄。
- `scripts/public-payload/build-public-content-payload.ts` — 移除 `buildDetailsById` / `buildGuideDetailsById` 的 payload 組裝。
- `scripts/public-payload/map-product-detail.ts`、`map-guide-detail.ts` — per-id detail builder 複用既有 mapper（不改 mapper 本身）。
- `server/api/content.json.get.ts` — 既有共用 route（瘦身後即生效，route 本身可不改）。
- `server/api/products/[id].json.get.ts`、`server/api/guides/[id].json.get.ts` — 新增 per-id detail route。
- `app/utils/fetch-public-content-payload.ts` — 共用 payload fetch（型別瘦身）。
- `app/utils/`（新增）— per-id detail fetch helper。
- `app/composables/use-product-detail-data.ts`、`use-guide-detail-data.ts` — 改 per-id fetch。
- `app/composables/use-catalog-shell-data.ts` — 移除 details 回傳，改供麵包屑 lookup。
- `app/utils/breadcrumb/resolve-breadcrumb-items.ts` — 麵包屑 lookup 來源欄位改名（實作落點；`default.vue` 本就委派此 helper，未動）。
- `nuxt.config.ts` — prerender routes 加入 detail json routes；設定 `<NuxtLink>` 全站 `prefetchOn: { interaction: true, visibility: false }` 預設（確認 Nuxt 4 正確設定點，如 `experimental.defaults.nuxtLink`）。
- `scripts/build-product-routes.ts`、`scripts/build-guide-routes.ts` — 既有 detail 頁 route builder，比照產出 json route 清單。

## 既有資產盤點 / Reuse Map

| 既有資產 | 位置 | 本次如何沿用 |
|---|---|---|
| `ProductCardView` 已含 `name` / `category_id` / `category_label` | `app/utils/public-content-view-types.ts:3` | product 麵包屑改用 cards lookup，**零新資料**、不需保留全量 detail |
| `CompactResourceRow` 已含 `id` / `title` | `app/utils/published-products/types.ts:56` | guide 麵包屑改用 `guides.rows` lookup，**零新資料** |
| `mapProductDetail` / `mapGuideDetail` 已是 per-product/per-guide 純函式 | `scripts/public-payload/map-product-detail.ts`、`map-guide-detail.ts` | per-id detail builder 直接複用，不重寫 mapper |
| `/api/content.json` server route + prerender pattern | `server/api/content.json.get.ts`、`nuxt.config.ts:60` | per-id detail route 比照同 pattern 新增 |
| `readPublicContentSource()` + `createTaxonomyLabelResolver` | `scripts/content-reader.ts`、`app/utils/content/taxonomy-labels.ts` | per-id route 沿用同一 source 讀法與 label resolver |
| `buildProductRoutes` / `buildGuideRoutes`（產 detail 頁 HTML route） | `scripts/build-product-routes.ts`、`build-guide-routes.ts` | 比照產出 detail json route 清單餵 prerender |
| `useAsyncData` per-key cache pattern | `app/composables/use-product-detail-data.ts` | 改用 `detail-${id}` 為 key，沿用框架 dedupe |
| 詳情頁 `throw createError(404)` not-found 處理 | `app/pages/products/[id].vue:61` | per-id route 回 404 時行為不變，沿用 |

新建項目：(1) 兩個 per-id server route；(2) per-id detail builder（薄包裝，複用既有 mapper）；(3) per-id detail fetch helper。皆為拆分必需，無既有等價物（已搜尋 `server/api/`、`app/utils/fetch-*`、composables 確認）。

## 介面 / 資料結構

通訊協定：REST，static prerendered JSON（GET，same-origin），與既有 `/api/content.json` 一致。

### 瘦身後 `GET /api/content.json`

移除 `products.details_by_id`、`guides.details_by_id`，其餘不變：

```json
{
  "version": 1,
  "site": { "name": "DW嚴選", "url": "https://dwselect.applepig.net/" },
  "products": { "cards": [ /* ProductCardView[] */ ] },
  "guides": { "rows": [ /* CompactResourceRow[] */ ] },
  "links": [ /* CompactResourceRow[] */ ],
  "navigation": { "category_chips": [], "desktop_category_items": [], "popular_search_tags": {}, "counts": { "products": 62 } },
  "taxonomies": { "categories": [], "channels": [], "tags": [], "brands": [] }
}
```

### `GET /api/products/{id}.json`

```json
{
  "id": "homepod",
  "name": "...",
  "summary": "...",
  "long_description": "...",
  "category_id": "...",
  "category_label": "...",
  "related_products": [ /* RelatedProductCardView[] */ ]
}
```
（即單一 `ProductDetailView`。id 不存在 → 404。）

### `GET /api/guides/{id}.json`

回應為單一 `GuideDetailView`（`id` / `title` / `body` / `related_products` …）。id 不存在 → 404。

### App 端 fetch key 變化

- 共用 payload：`useAsyncData('public-content', fetchPublicContentPayload)`（不變，回傳型別瘦身）。
- product detail：`useAsyncData('product-detail-${id}', () => fetchProductDetail(id))`。
- guide detail：`useAsyncData('guide-detail-${id}', () => fetchGuideDetail(id))`。

### Layout 麵包屑 lookup

`use-catalog-shell-data.ts` 以瘦身後 payload 建立精簡 lookup 取代 `details_by_id`：

- product：`id → { name, category_id, category_label }`（取自 `products.cards`）
- guide：`id → { title }`（取自 `guides.rows`）

`default.vue` 麵包屑改讀這兩個 lookup；找不到時維持既有 fallback（「商品詳情」／「指南詳情」）。

## 邊界案例

- **Case 1：detail id 不存在**（手打 URL / 未發布 / 已下架）。per-id route 找不到 → 回 404；`useAsyncData` data 為 null → 詳情頁 `throw createError(404)`（行為不變）。
- **Case 2：壞 content / 壞 id 讓 prerender 失敗**。`failOnError: true` 維持有效，`pnpm generate` 以非零碼中止，不靜默產出殘缺站。
- **Case 3：麵包屑 lookup 找不到 id**（理論上不該發生——cards/rows 為全集）。維持既有 fallback label，不 throw。
- **Case 4：client 端從列表切到詳情**。共用 payload 已在記憶體（同 key cache 命中）；只額外 fetch 該筆 detail JSON（幾 KB），不重載整包。
- **Case 5：SEO head-before-async**。詳情頁 `useSeoMeta` 須維持在 `await` 前同步註冊、await 後以 `watchEffect` 填入 detail（既有 pattern，per-id fetch 後不可破壞）。

## ADR

### ADR-1：採兩層（瘦身 content.json + per-id detail），而非嚴格三層

- 決策：不把 shell（navigation+taxonomies+counts）與 cards 拆成兩個獨立檔，合併在瘦身後的 `/api/content.json`；只把 detail 拆成 per-id。
- 原因：首頁等列表頁本來就同時需要 navigation 與 cards，兩者體積都小；硬拆成兩檔會讓列表頁多發一個請求卻幾乎沒省到頻寬，屬過早拆分（YAGNI）。真正的 O(N) 膨脹來源是 detail，拆掉它即解決核心問題。
- 替代方案：研究藍圖的嚴格三層（shell / cards / details）。概念上更乾淨，但在本 codebase 的列表頁使用情境下增加請求數而無實益，故不採。使用者已於規劃確認採兩層。

### ADR-3：prefetch 改 `interaction` 而非全關

- 決策：`<NuxtLink>` 全站預設 `prefetchOn: { interaction: true, visibility: false }`，而非 `prefetch: false`。
- 原因：全關會讓每次站內換頁都得現抓 chunk（首次點擊略慢）；`interaction`（hover/focus 才抓）保留「點下去前已預載」的順暢感，同時消除「進站即背景狂抓」的冗餘流量。是省流量與換頁體感的折衷，使用者已確認採此。
- 替代方案：`prefetch: false`（最省但換頁略慢）、維持預設 viewport 自動 prefetch（冗餘流量大）。皆不採。

### ADR-2：per-id detail 沿用 server route + prerender，而非 build script 直接寫檔

- 決策：新增 `server/api/products/[id].json.get.ts` 等動態 route，靠 nuxt prerender 產 static JSON。
- 原因：與既有 `/api/content.json` 完全同一 pattern（dev 動態回應、generate prerender 成 static），dev/HMR 與 generate 行為一致，維護心智單一。
- 替代方案：在 `scripts/` 直接 `fs.writeFile` 出 detail JSON。可行但多一條與現有 pattern 平行的產出路徑（content 存取層雙軌正是 018 才剛收斂掉的 smell），不採。

## Milestones

> 使用者已選「一次到位」：不中途 commit，shell 瘦身與 detail 拆檔在同一 milestone 完成。

### Milestone 1: Payload 兩層拆分

> 範圍：`scripts/public-payload/`、`server/api/`、`app/utils/`（payload 型別與 fetch）、`app/composables/`（三個 data composable）、`app/layouts/default.vue`、`nuxt.config.ts`、對應測試。
> 驗證：`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm content:check`、`pnpm generate`；產物檢查列表頁 `_payload.json` 不含 detail；`pnpm test:e2e`；實際打開首頁／商品詳情／指南詳情頁。
> 預期結果：content.json 瘦身、per-id detail route 可取得單筆、詳情頁只載自己那筆、麵包屑顯示不變、首頁 payload 體積明顯下降。

- [ ] Red → Green → Refactor：`PublicContentPayload` 型別與 `build-public-content-payload` 移除 details（更新對應測試）。
- [ ] Red → Green → Refactor：per-id detail builder + `server/api/products/[id].json.get.ts`、`server/api/guides/[id].json.get.ts`（含 404）。
- [ ] Red → Green → Refactor：per-id detail fetch helper + `use-product-detail-data` / `use-guide-detail-data` 改 per-id key。
- [ ] Red → Green → Refactor：`use-catalog-shell-data` 改供麵包屑 lookup、`resolve-breadcrumb-items.ts` 改 lookup 來源欄位（`default.vue` 本就委派此 helper，未動）。
- [ ] `nuxt.config.ts` prerender 加入 detail json routes（沿用 route builder）；設定 `<NuxtLink>` 全站 `prefetchOn: { interaction: true, visibility: false }`。
- [ ] 全套檢查 + 實際開頁驗收（含確認首頁不再自動 prefetch）。

## 後續方向（靜態化路線圖，非本 sprint 範圍）

028 重新定位為「靜態化路線圖第 1 步」——本 sprint 打**資料層**冗餘（detail 拆分 + prefetch）。後續方向見 `research.md`：

- **028.5「runtime 瘦身」PoC**：在 links / guide-list 這類零互動頁試點 `experimental.noScripts`（不注入 hydration script、純送 SSR HTML），搭配 **cross-document view transition**（CSS `@view-transition { navigation: auto }`，非 Nuxt SPA `experimental.viewTransition`）。關鍵：noScripts 無 hydration，可從根本繞過 [[view-transition-ios-safari]] 記錄的 iOS Safari SPA hydration crash；cross-document VT 在不支援的瀏覽器漸進退化為整頁切換。需先驗證 detail 拆分（本 sprint）完成——SSR HTML 含完整內容後，detail 頁才有資格被 noScripts。
- 精簡 Nuxt UI（僅用到 8 種元件）、換 Astro 等列為長期 escape hatch，非當前痛點（framework runtime ~70–90KB gzip 經評估「不算太重」，非優先）。
