# Sprint 008：Content Domain Taxonomy 與 Navigation IA

## 文件狀態

本 sprint 的執行 SSOT 是本 `spec.md`。008 接在 006 的 compact app schema-first redesign 與 007 的 routed navigation 後面，不重新設計視覺，也不改 static deployment 模型。

## 目標

將目前混在 `content/products/*.json` 的內容整理成三個 content domain：產品、指南、連結。同步建立 tags dictionary，讓 tags 從自由字串變成穩定 `tag_ids`，並調整 responsive navigation IA：mobile bottom nav 顯示首頁、指南、連結、搜尋；desktop sidebar 則直接展開產品分類，分類內容與 mobile 首頁 category pills 一致。

這個 sprint 的重點是資料整理與資訊架構，不是新增大量 UI 功能。完成後，公開站仍維持 Nuxt SSG、Nuxt Content data collections 與 static search index。

## 非目標

- 不新增 CMS、inside editing UI、Discord bridge、opencode draft workflow 或 PR broker。
- 不新增 REST、SSE、WebSocket API。
- 不改 production deploy、正式網域或 GitHub Actions 部署策略。
- 不做新的視覺 redesign，不重做 006 的 compact app aesthetic。
- 不新增 guide detail route；指南頁先顯示 guide list，可連到外部來源。
- 不新增 link detail route；連結仍是外部入口。
- 不新增 `/guide` query filter；Guide 資料保留 `category_ids`，但本 sprint 暫不做 `/guide?category=` 或 `/guide?tags=` URL 契約。
- 不做價格監控、價格歷史、價格區間篩選或購物流程。
- 不把 tags 做成多語系或全文知識庫；本 sprint 只建立穩定 id、label、description 與排序。
- 不保留舊 `content/taxonomies/links.json` 作為連結資料來源；links 會升級為獨立 content domain。
- 不同步升級 legacy Google Sheet importer；`scripts/migrate-google-sheet-products.ts` 在本 sprint 後標記為 deprecated，不再支援新版 content schema。

## User Story

作為 DW嚴選讀者，我想清楚分辨產品、指南與連結，以便瀏覽時知道自己是在看可購買品項、研究文章，還是外部入口。

作為 DW嚴選維護者，我想把 category、tag、channel 與 content type 分清楚，以便後續新增內容時不再把平台、分類、指南文章與店家連結全部塞進 product tags。

作為桌機使用者，我想在左側 sidebar 直接看到產品分類列表，以便快速跳到想看的產品分類。

作為手機使用者，我想底部導覽只保留主要入口，並依首頁、指南、連結、搜尋排列，以便符合常用瀏覽順序。

### 驗收條件

- [x] `content/products/*.json` 只保留產品內容；`日本米入門篇` 必須移到 `content/guides/`，`Aeron Chair` 必須移到 `content/guides/`，`B18` 必須移到 `content/links/`，`Altwork Station` 必須移到 `content/links/`。
- [x] 新增 `content/guides/*.json` collection，guide content 至少支援 `id`、`status`、`title`、`summary`、`source_url`、`image_url`、`category_ids`、`tag_ids`、`created_at`、`updated_at`、`published_at`。
- [x] 新增 `content/links/*.json` collection，link content 至少支援 `id`、`status`、`title`、`summary`、`url`、`icon`、`category_ids`、`tag_ids`、`sort_order`、`created_at`、`updated_at`、`published_at`。
- [x] `content/taxonomies/links.json` 不再作為 runtime links SSOT；既有 `applepig-home` 需移到 `content/links/applepig-home.json`。
- [x] 新增 `content/taxonomies/tags.json`，所有 product、guide、link 的 `tag_ids` 都必須存在於 tags dictionary。
- [x] Product schema 移除自由字串 `tags`，改為 `tag_ids: string[]`；Guide 與 Link 也使用同一套 `tag_ids`。
- [x] legacy tags 中的 channel/platform label 不得留在 `tag_ids`：`PCHome`、`momo`、`日亞`、`美亞` 需由 `channel_id` 或 link URL 表達。
- [x] legacy tags 中的 root category label 不得留在 `tag_ids`：`居家`、`電腦`、`廚房`、`3C`、`影音`、`食材` 需由 `category_ids` 或 `category_id` 表達。
- [x] legacy tags 不自動升級為 child categories；`網路設備`、`線材`、`水波爐` 這類 noisy tags 必須經人工 mapping 才能進 `tag_ids`，不得產生新的 category URL。
- [x] `content/taxonomies/categories.json` 維持 mobile category pills 的分類集合，並補足 desktop navigation 所需的 `nav_visible` 與 `sort_order` metadata。
- [x] Product 的 `category_id` 必須指向存在的 category；Guide 與 Link 的 `category_ids` 必須全部指向存在的 category。
- [x] 首頁 product category filter 維持既有 flat category 行為；`/?category=<category_id>` 的可用 category ids 來自 `content/taxonomies/categories.json`，不是從目前有商品的 categories 推導。
- [x] Mobile `<768px` bottom nav 顯示且只顯示四個主要入口，順序為：首頁、指南、連結、搜尋。
- [x] Tablet `768–1199px` rail 顯示四個主要入口，順序與 mobile 一致，不顯示產品分類列表。
- [x] Desktop `>=1200px` sidebar 直接展開產品分類列表，分類內容與 mobile 首頁 category pills 一致，並保留指南、連結、搜尋入口；desktop sidebar 可以與 mobile bottom nav 呈現不同項目層級。
- [x] `AppNavigation` 仍使用 `NuxtLink`，active 狀態由 route 與 query 判斷，對目前分頁或目前 category 提供正確 `aria-current`。
- [x] `/guide` 改為顯示 published guides，不再把「指南」當作 product tag explorer；guide list 可顯示 category 或 tag metadata，但 008 不新增 guide query filter，也不新增 guide detail route。
- [x] `/links` 改為從 `content/links/*.json` 載入 published links，點擊外連使用 `target="_blank"` 與 `rel="noopener noreferrer"`。
- [x] `/search` 的 static search index 納入 published products、published guides 與 published links，搜尋結果需標示 content type，並能連到產品詳情或外部來源；product results 必須保留價格、通路與圖片資訊。
- [x] 非 published content 不得出現在首頁、指南、連結、category counts、desktop 分類列表 counts 或 search index。
- [x] `scripts/migrate-google-sheet-products.ts` 與其測試需標記為 deprecated 或 legacy-only，不得被視為新版 product content importer。
- [x] 所有新增或修改的驗收條件必須先有測試失敗，再實作到測試通過。
- [x] `pnpm test` 與 `pnpm generate` 通過。

## 相關檔案

- `docs/008-content-domain-taxonomy-navigation/spec.md` — 本 sprint 規格 SSOT。
- `content.config.ts` — 新增 guides、links、tags collections；調整 links collection 來源。
- `content/products/*.json` — 產品資料，migration 後只保留產品內容並使用 `tag_ids`。
- `content/guides/*.json` — 新增，指南資料。
- `content/links/*.json` — 新增，連結資料。
- `content/taxonomies/categories.json` — 補足 desktop navigation metadata，分類集合維持與 mobile 首頁 pills 一致。
- `content/taxonomies/channels.json` — 保持 channel taxonomy，用於 products 的購買通路。
- `content/taxonomies/tags.json` — 新增，tag dictionary。
- `app/utils/product-schema.ts` — 擴充 product、guide、link、category、tag schema。
- `app/utils/published-products.ts` — 調整 view-model helper，支援產品分類列表、guide list、link list 與 content type。
- `app/composables/use-catalog-data.ts` — 載入 products、guides、links、categories、channels、tags。
- `app/components/app-navigation.vue` — mobile／tablet top-level nav 與 desktop 產品分類列表 navigation。
- `app/pages/index.vue` — 首頁 category query 與 flat category filter。
- `app/pages/guide.vue` — 改為指南列表。
- `app/pages/links.vue` — 改為讀取 links content domain。
- `app/pages/search.vue` — 顯示 mixed content search results。
- `app/utils/search/search-index.ts` — 擴充 search document contract，支援 products、guides、links。
- `app/utils/search/client-search.ts` — 保持 client lazy load，調整 result shape。
- `scripts/build-search-index.ts` — 產生 mixed content static search index。
- `scripts/migrate-content-domain-taxonomy.ts` — 新增一次性 migration script，整理現有 66 筆 content。
- `public/search-index.json` — migration 後重新產生的 static search index artifact。
- `tests/product-schema.test.ts` — 擴充 schema 與真實 content validation。
- `tests/published-products.test.ts` — 擴充 view-model、flat category、guide、link、route state 測試。
- `tests/search-index.test.ts` — 驗證 mixed content search index。
- `tests/client-search.test.ts` — 驗證 client search result shape 與 fallback。
- `tests/nuxt-smoke.test.ts` — 驗證 collection、route、navigation source contract 與 static generate 設定。
- `tests/e2e/compact-app.spec.ts` — 擴充 mobile／tablet／desktop navigation smoke。

## 介面／資料結構（API / Data Structure）

本 sprint 不新增 REST、SSE 或 WebSocket。資料通訊協定維持 build-time filesystem JSON、Nuxt Content data collections 與 static `/search-index.json`。

### Product

Product 保留 006 的商品核心欄位，但將 `tags` 改為 `tag_ids`，並移除任何 guide／link 型內容。

```ts
type Product = {
  id: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  name: string
  price_text: string
  price: ProductPrice
  summary: string
  description: string
  purchase_url: string
  image_url: string
  channel_id: string
  category_id: string
  tag_ids: string[]
  reference_url: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  unpublished_at: string | null
  archived_at: string | null
}
```

Product 判定規則：主要內容是具體可推薦、可購買或可查詢的品項。`purchase_url` 可以指向單一商品頁、官方產品頁、商店商品頁，或使用者已確認可接受的商店分類頁／商品族群頁。品牌官網、店家首頁、Facebook post、粉專或研究文章不能為了保留商品卡而繼續塞在 products；品牌／店家入口先歸類到 links。

### Guide

Guide 是研究、入門、心得、比較或購買脈絡文章。008 不新增 guide detail route，因此 guide 可以先以外部 `source_url` 作為 CTA。

```ts
type Guide = {
  id: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  title: string
  summary: string
  source_url: string
  image_url: string | null
  category_ids: string[]
  tag_ids: string[]
  related_product_ids: string[]
  created_at: string
  updated_at: string
  published_at: string | null
  unpublished_at: string | null
  archived_at: string | null
}
```

Guide 判定規則：主要價值是說明、入門、比較、經驗或研究內容，而不是單一外部入口。現有 `日本米入門篇` 必須歸類為 guide。現有 `Aeron Chair` 在本 sprint 不補新 URL，必須歸類為 guide，因為目前 URL 是 Facebook share post。

### Link

Link 是外部入口、店家、網站、工具或個人站。它不是產品，也不是文章詳情。

```ts
type Link = {
  id: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  title: string
  summary: string
  url: string
  icon: string
  category_ids: string[]
  tag_ids: string[]
  sort_order: number
  created_at: string
  updated_at: string
  published_at: string | null
  unpublished_at: string | null
  archived_at: string | null
}
```

Link 判定規則：主要價值是帶使用者到外部站台、品牌官網或店家入口。現有 `B18` 與 `Altwork Station` 必須歸類為 link。現有 `applepig-home` 從 `content/taxonomies/links.json` 移到 links content domain。

### Category Definition

Category 是產品主要分類與 desktop sidebar 分類列表的來源。為了避免和 tags 混淆，category 負責「放在哪一類」，tag 負責「有什麼屬性」。008 第一版 category 集合需與 mobile 首頁 category pills 一致，不從 legacy tags 自動產生 child categories。

```ts
type CategoryDefinition = {
  id: string
  label: string
  short_label: string
  nav_visible: boolean
  sort_order: number
}
```

Category navigation 規則：desktop sidebar 直接列出 `nav_visible = true` 的 categories，內容與 mobile 首頁 category pills 一致。首頁 `?category=<id>` 指向存在的 category 時，只顯示該 category 的 products；不存在的 category fallback 到 `all`。

### Tag Definition

Tags 是穩定 dictionary，不再使用自由字串。Tag id 使用 kebab-case ASCII，legacy 中文或平台 label 可放在 `aliases` 供 migration 使用，但不可直接作為 content `tag_ids`。

```ts
type TagDefinition = {
  id: string
  label: string
  description: string
  aliases: string[]
  nav_visible: boolean
  sort_order: number
}
```

Tag cleanup 規則：`PCHome`、`momo`、`日亞`、`美亞` 這類平台字串不進 `tag_ids`。`居家`、`電腦`、`廚房`、`3C`、`影音`、`食材` 這類 root category label 不進 `tag_ids`。其他 legacy tags 只有在人工 mapping 判定為穩定屬性時才進 `tags.json`；noisy tags 不得自動產生 category URL，也可在 migration 中丟棄。

### Search Index Payload

Search index 從單一 product index 改為 mixed content index。

```ts
type SearchDocument = {
  document_id: string
  content_id: string
  type: 'product' | 'guide' | 'link'
  title: string
  summary: string
  category_ids: string[]
  category_labels: string[]
  tag_ids: string[]
  tag_labels: string[]
  image_url: string | null
  href: string
  external: boolean
  price_text?: string
  channel_id?: string
  channel_label?: string
  published_at: string | null
}
```

Search document id 規則：`document_id = "<type>:<content_id>"`，避免 products、guides、links 使用相同 id 時在 MiniSearch 中碰撞。Search result routing 規則：product result 連到 `/products/:id`，並保留價格、通路與圖片資訊。guide result 在 008 先連到 `source_url`。link result 連到 `url`。外部連結必須使用 `target="_blank"` 與 `rel="noopener noreferrer"`。

## 邊界案例

- Case 1：content 引用不存在的 `tag_id`。處理方式：schema/helper validation 測試失敗，CI 不通過。
- Case 2：content 引用不存在的 `category_id`。處理方式：schema/helper validation 測試失敗，CI 不通過。
- Case 3：category 存在於 taxonomy 但沒有 matching published products。處理方式：首頁顯示既有 empty state，不 fallback 到 all。
- Case 4：`?category=<id>` 指向不存在的 category。處理方式：route state fallback 到 `all`，維持 007 的 invalid query fallback 精神。
- Case 5：legacy tag 無法穩定 mapping。處理方式：不寫入 `tag_ids`，並在 migration summary 列出 discarded legacy tag。
- Case 6：guide 或 link 沒有 image。處理方式：列表使用文字 row 或 fallback visual，不要求外部圖片。
- Case 7：guide 或 link 的 `source_url`／`url` 不是 HTTP(S)。處理方式：schema validation 失敗。
- Case 8：`tag_ids` 經 migration 後為空陣列。處理方式：允許，因為 category 已足以表達主要分類，不應為了填滿 tag 而保留錯誤 tags。
- Case 9：search index 載入失敗。處理方式：搜尋頁維持既有 fallback，不白屏；products、guides、links 的靜態頁面仍可瀏覽。
- Case 10：desktop sidebar 的分類列表過長。處理方式：008 第一版只顯示與 mobile pills 一致的 categories，不新增搜尋式 category picker。
- Case 11：非 published guide/link。處理方式：不出現在 `/guide`、`/links`、navigation counts 或 search index。

## ADR（Architecture Decision Record）

### ADR 1：拆成三個 content domain，而不是在 Product 加 `content_type`

- 決策：建立 `products`、`guides`、`links` 三個 Nuxt Content data collections。
- 原因：產品、指南、連結的必填欄位、CTA 與 UI 行為不同；用同一個 Product schema 加 `content_type` 會讓大量欄位變 optional，重新製造混雜資料。
- 替代方案：單一 `content/items/*.json` 加 `type`。排除原因是 schema validation 會變複雜，且 product detail、guide list、link list 仍需分支處理。

### ADR 2：Tags dictionary 放在 `content/taxonomies/tags.json`

- 決策：`tags.json` 作為 tag id 與 label 的 SSOT，content 只儲存 `tag_ids`。
- 原因：現有 tags 混入 category 與 channel，導致指南、搜尋與分類導覽語意混亂；穩定 id 可以支撐後續內容維護與 search index mapping。
- 替代方案：TypeScript hardcoded enum。排除原因是內容維護者需要在 Git content diff 中看到 tag dictionary；硬編在程式碼會讓 taxonomy 與 content 分離。

### ADR 3：Category 第一版維持 flat taxonomy，不從 legacy tags 產生 child categories

- 決策：008 第一版 category 集合維持與 mobile 首頁 category pills 一致，只補 `nav_visible` 與排序 metadata；legacy tags 不自動升級為 child categories。
- 原因：使用者確認 desktop 側邊欄是「產品 > 分類」的直接展開，內容需與 mobile pill button 一致；把 noisy legacy tags 變成 URL category 會放大錯貼資料。
- 替代方案：建立多層 category tree。排除原因是 `網路設備`、`線材`、`水波爐` 等 legacy tags 已有錯貼風險，初版公開成 URL contract 會增加後續維護成本。

### ADR 4：Desktop sidebar 與 mobile nav 使用不同 navigation model

- 決策：mobile／tablet 只顯示四個 top-level route；desktop sidebar 直接展開產品分類列表，並保留指南、連結、搜尋入口。
- 原因：mobile bottom nav 空間有限，分類列表會造成 hit target 與可讀性問題；desktop 左側 sidebar 有足夠空間承載與 mobile pills 一致的產品分類。
- 替代方案：所有 breakpoint 顯示相同 nav。排除原因是使用者明確要求 mobile 下方 nav bar 與 desktop 左方 nav bar 顯示可以不一樣。

### ADR 5：Guide 先做外部來源列表，不新增 detail route

- 決策：008 的 guides 是 data collection 與列表頁，CTA 先連到 `source_url`。
- 原因：本 sprint 核心是整理資料與 IA；guide detail 會新增內容撰寫、route、SEO 與轉場 scope，應留到下一個 sprint。
- 替代方案：同時新增 `/guides/:id`。排除原因是會擴大 UI、routing 與 static prerender 範圍，偏離資料整理目標。

### ADR 6：Search index 納入三種 content type

- 決策：`/search-index.json` 改為 mixed content index，結果標示 `type`。
- 原因：使用者搜尋「米」時可能需要找到產品、米入門指南或相關連結；分 domain 不代表搜尋要分裂成三套。
- 替代方案：只搜尋 products。排除原因是指南與連結被整理出來後會從產品搜尋消失，降低可發現性。

### ADR 7：Legacy Google Sheet importer 標記 deprecated，不升級新版 schema

- 決策：008 不同步升級 `scripts/migrate-google-sheet-products.ts`，而是標記為 legacy-only / deprecated。
- 原因：Google Sheet cutover 已完成；新版資料整理以 Git-backed content migration 為主，繼續維護舊 importer 會擴大 scope，且容易重新引入平台／分類 tags。
- 替代方案：同步更新舊 importer 產生 `tag_ids`。排除原因是使用者確認先標記廢棄，不作為新版 content importer。

## Milestones

### Milestone 1：Schema、taxonomy 與 validation tests

> 預期結果：products、guides、links、categories、tags 的資料契約明確，且真實 content cross-reference 可被測試驗證。
> 驗證方式：`pnpm test tests/product-schema.test.ts tests/published-products.test.ts`

- [x] 撰寫／更新測試（Red）：覆蓋 product `tag_ids`、guide schema、link schema、tags dictionary、category nav metadata、missing tag/category reference。
- [x] 實作最小功能（Green）：更新 `product-schema.ts`、`content.config.ts` 與 taxonomy helper，新增 tags collection、guides collection、links collection。
- [x] Refactor 並確認測試維持通過：讓 schema 與 cross-reference validation 命名清楚，避免 UI helper 暗藏資料規則。

### Milestone 2：Content migration 與資料整理

> 預期結果：現有 content 被拆成 products／guides／links，legacy free-string tags 被轉成 `tag_ids` 或在 migration summary 中明確丟棄。
> 驗證方式：`pnpm test tests/product-schema.test.ts tests/search-index.test.ts`

- [x] 撰寫／更新測試（Red）：驗證 `日本米入門篇` 與 `Aeron Chair` 進 guides、`B18` 與 `Altwork Station` 進 links、`IKEA充電線` 與 `三菱重工冷氣` 留在 products、`applepig-home` 進 links、legacy platform/category tags 不再出現在 `tag_ids`。
- [x] 實作最小功能（Green）：新增並執行 `scripts/migrate-content-domain-taxonomy.ts`，產出 `content/guides/*.json`、`content/links/*.json`、`content/taxonomies/tags.json`，更新 products content。
- [x] Refactor 並確認測試維持通過：整理 migration summary，列出 moved content、removed legacy tags、discarded noisy tags、manual content-domain decisions 與 empty `tag_ids`。

### Milestone 3：View-model、pages 與 search index 更新

> 預期結果：首頁、指南、連結、搜尋都從新的 content domains 取得資料，且只顯示 published content。
> 驗證方式：`pnpm test tests/published-products.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts`

- [x] 撰寫／更新測試（Red）：覆蓋 flat category filter、guide list、link list、mixed content search documents、product search result price/channel fields、non-published exclusion、external result safety attributes。
- [x] 實作最小功能（Green）：更新 `useCatalogData`、`published-products.ts`、`guide.vue`、`links.vue`、`search.vue`、search utilities 與 build script。
- [x] Refactor 並確認測試維持通過：避免 pages 直接處理 raw taxonomy lookup，集中在 helper/view-model。

### Milestone 4：Responsive navigation IA

> 預期結果：mobile／tablet 顯示四個 top-level nav；desktop sidebar 直接展開產品分類，並顯示指南、連結、搜尋入口。
> 驗證方式：`pnpm test tests/nuxt-smoke.test.ts`、Playwright responsive smoke、`pnpm generate`

- [x] 撰寫／更新測試（Red）：覆蓋 mobile nav order、tablet rail order、desktop product category list、active route/query state、`aria-current`。
- [x] 實作最小功能（Green）：更新 `AppNavigation` 與必要 CSS，desktop category links 寫入 `/?category=<id>`，mobile 不顯示分類列表。
- [x] Refactor 並確認測試維持通過：清理舊 guide tag explorer 導覽假設，確認 touch target 與 sidebar 不重疊。

### Milestone 5：Static generate 與文件同步

> 預期結果：所有資料整理、navigation 與 search 變更可 static generate，文件記錄完成狀態。
> 驗證方式：`pnpm test`、`pnpm generate`

- [x] 撰寫／更新測試（Red）：補 static source contract 或 generated index smoke，確認 mixed content search index、Nuxt Content collections 與 legacy importer deprecated contract 存在。
- [x] 實作最小功能（Green）：重新產生 `public/search-index.json`，確認 static generate 不依賴舊 links taxonomy，並標記 legacy Google Sheet importer deprecated。
- [x] Refactor 並確認測試維持通過：更新 `works.md`，同步 Milestones 完成狀態，等待使用者確認後才 commit。
